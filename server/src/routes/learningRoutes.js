import express from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Lesson from '../models/Lesson.js';
import Quiz from '../models/Quiz.js';
import Account from '../models/Account.js';
import AssessmentAttempt from '../models/AssessmentAttempt.js';
import NuanceSession from '../models/NuanceSession.js';
import { protect } from '../middleware/authMiddleware.js';
import { sanitizeQuiz } from '../utils/quizSanitizer.js';
import { gradeQuiz, gradeQuestion, PASSING_THRESHOLD_PERCENT } from '../services/gradingService.js';
import { awardFirstPassXp } from '../services/xpService.js';
import {
  stepVerificationLimiter,
  sessionCreationLimiter,
  assessmentSubmitLimiter
} from '../middleware/rateLimiter.js';

const router = express.Router();

export const getRank = (xp) => {
  if (xp <= 500) return 'Philologist Apprentice';
  if (xp <= 1500) return 'Linguistic Explorer';
  if (xp <= 3000) return 'Contextual Master';
  return 'Polyglot Sage';
};

export const checkAndAwardAchievements = (user, lessonResult) => {
  const newAchievements = [];
  const existingTitles = user.achievements.map(a => a.title);

  // 1. First Nuance Captured (Complete 1 lesson)
  if (!existingTitles.includes('First Nuance Captured') && user.completedLessons.length >= 1) {
    newAchievements.push({
      title: 'First Nuance Captured',
      description: 'You completed your first linguistic challenge.',
      icon: 'Trophy'
    });
  }

  // 2. Philologist in Making (Reach 500 XP)
  if (!existingTitles.includes('Philologist in Making') && user.xp >= 500) {
    newAchievements.push({
      title: 'Philologist in Making',
      description: 'You reached 500 XP and showed deep dedication.',
      icon: 'Award'
    });
  }

  // 3. Cultural Ambassador (Complete 3 lessons)
  if (!existingTitles.includes('Cultural Ambassador') && user.completedLessons.length >= 3) {
    newAchievements.push({
      title: 'Cultural Ambassador',
      description: 'You completed all current modules and mastered the core curriculum.',
      icon: 'Globe'
    });
  }

  // 4. Perfect Scholar (100% score)
  if (!existingTitles.includes('Perfect Scholar') && lessonResult.score === lessonResult.maxScore && lessonResult.maxScore > 0) {
    newAchievements.push({
      title: 'Perfect Scholar',
      description: 'You captured every single nuance in a lesson with 100% accuracy.',
      icon: 'Star'
    });
  }

  if (newAchievements.length > 0) {
    user.achievements.push(...newAchievements);
    return true;
  }
  return false;
};

// @desc    Get all lessons for a language or academy
// @route   GET /api/learning/lessons
// @access  Private
router.get('/lessons', protect, async (req, res) => {
  try {
    const { language, academy } = req.query;
    const filter = {};
    if (academy) filter.academy = academy;
    if (language) filter.language = language;
    else if (!academy) filter.language = 'German';

    const lessons = await Lesson.find(filter).sort({ order: 1 });
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get sanitized quiz for a lesson (Zero answer key leakage)
// @route   GET /api/learning/quiz/:lessonId
// @access  Private
router.get('/quiz/:lessonId', protect, async (req, res) => {
  const { lessonId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(lessonId)) {
    return res.status(400).json({ message: 'Invalid lesson ID' });
  }

  try {
    const quiz = await Quiz.findOne({ lessonId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    // Explicit Sanitized DTO: removes correct, acceptedAnswers, severing matching answers
    const sanitized = sanitizeQuiz(quiz);
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create or resume a persistent Nuance Game session
// @route   POST /api/learning/nuance/session
// @access  Private
router.post('/nuance/session', protect, sessionCreationLimiter, async (req, res) => {
  const { lessonId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(lessonId)) {
    return res.status(400).json({ message: 'Invalid lesson ID' });
  }

  try {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const quiz = await Quiz.findOne({ lessonId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found for this lesson' });

    // Look for an existing, unexpired in-progress session for this user & lesson
    let session = await NuanceSession.findOne({
      userId: req.user._id,
      lessonId,
      status: 'IN_PROGRESS',
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      const sessionId = `nuance_sess_${crypto.randomUUID()}`;
      session = await NuanceSession.create({
        sessionId,
        userId: req.user._id,
        lessonId,
        answers: {},
        status: 'IN_PROGRESS'
      });
    }

    const sanitized = sanitizeQuiz(quiz);
    res.json({
      sessionId: session.sessionId,
      quiz: sanitized,
      answeredSteps: session.answers || {}
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Verify an individual step in Nuance Game with anti-enumeration locks
// @route   POST /api/learning/nuance/verify-step
// @access  Private
router.post('/nuance/verify-step', protect, stepVerificationLimiter, async (req, res) => {
  const { sessionId, questionIndex, selectedOptionIndex } = req.body;

  if (!sessionId || typeof questionIndex !== 'number' || typeof selectedOptionIndex !== 'number') {
    return res.status(400).json({ message: 'Missing required step verification parameters' });
  }

  try {
    const session = await NuanceSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ message: 'Nuance session not found or expired' });
    }

    // Ownership check
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized session access' });
    }

    if (session.status !== 'IN_PROGRESS') {
      return res.status(400).json({ message: 'Session has already been completed' });
    }

    const quiz = await Quiz.findOne({ lessonId: session.lessonId });
    if (!quiz || !quiz.questions[questionIndex]) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const question = quiz.questions[questionIndex];

    // Anti-Enumeration Control:
    // If this questionIndex was already answered in this session, return the recorded result.
    // The user CANNOT re-guess different options to probe for the correct answer!
    const sessionAnswers = session.answers || {};
    if (sessionAnswers[questionIndex]) {
      const existing = sessionAnswers[questionIndex];
      return res.json({
        isCorrect: existing.isCorrect,
        correctIndex: existing.correctIndex,
        nuance: existing.nuance,
        alreadyAnswered: true
      });
    }

    // Grade option
    const isCorrect = selectedOptionIndex === question.correct;
    sessionAnswers[questionIndex] = {
      selectedOptionIndex,
      isCorrect,
      correctIndex: question.correct,
      nuance: question.nuance,
      answeredAt: new Date()
    };

    session.answers = sessionAnswers;
    session.markModified('answers');
    await session.save();

    res.json({
      isCorrect,
      correctIndex: question.correct,
      nuance: question.nuance,
      alreadyAnswered: false
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Submit full assessment authoritatively (Works for Nuance & all Academies)
// @route   POST /api/learning/assessment/submit
// @route   POST /api/learning/quiz/:lessonId/submit
// @access  Private
router.post(['/assessment/submit', '/quiz/:lessonId/submit'], protect, assessmentSubmitLimiter, async (req, res) => {
  const lessonId = req.params.lessonId || req.body.lessonId;
  const { answers, idempotencyKey, sessionId } = req.body;

  if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
    return res.status(400).json({ message: 'Valid lesson ID is required' });
  }

  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return res.status(400).json({ message: 'idempotencyKey is required for assessment submissions' });
  }

  try {
    // 1. Idempotency Check: Return existing attempt if already evaluated
    const existingAttempt = await AssessmentAttempt.findOne({
      userId: req.user._id,
      lessonId,
      idempotencyKey
    });

    if (existingAttempt) {
      const user = await Account.findById(req.user._id);
      return res.json({
        success: true,
        score: existingAttempt.score,
        maxScore: existingAttempt.maxScore,
        percentage: existingAttempt.percentage,
        passed: existingAttempt.status === 'COMPLETED',
        totalXp: user.xp,
        rank: user.rank,
        achievements: user.achievements,
        completedLessons: user.completedLessons,
        cachedAttempt: true
      });
    }

    const quiz = await Quiz.findOne({ lessonId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    // 2. Prepare submitted answers
    // If sessionId was provided (Nuance Game session), reconstruct answers from session
    let answersToGrade = answers;
    if (sessionId) {
      const session = await NuanceSession.findOne({ sessionId, userId: req.user._id });
      if (!session) {
        return res.status(404).json({ message: 'Referenced session not found' });
      }
      answersToGrade = quiz.questions.map((_, idx) => {
        const step = session.answers ? session.answers[idx] : null;
        return step ? step.selectedOptionIndex : null;
      });
      session.status = 'COMPLETED';
      await session.save();
    }

    if (!Array.isArray(answersToGrade)) {
      answersToGrade = [];
    }

    // 3. Server-Authoritative Grading
    // Completely ignores any client-supplied scores, maxScore, or passed status!
    const gradeResult = gradeQuiz(quiz, answersToGrade);

    // 4. Calculate attemptNumber
    const priorAttemptsCount = await AssessmentAttempt.countDocuments({
      userId: req.user._id,
      lessonId
    });
    const attemptNumber = priorAttemptsCount + 1;

    // 5. Persist AssessmentAttempt
    const attempt = await AssessmentAttempt.create({
      userId: req.user._id,
      lessonId,
      academy: lesson.academy || 'NUANCE_GAME',
      attemptNumber,
      answers: answersToGrade,
      score: gradeResult.rawScore,
      maxScore: gradeResult.maxScore,
      percentage: gradeResult.percentage,
      status: gradeResult.passed ? 'COMPLETED' : 'FAILED',
      idempotencyKey
    });

    // 6. Award XP via atomic xpService (First-pass XP awarded ONLY ONCE)
    let xpGained = 0;
    if (gradeResult.passed) {
      const baseXP = 100;
      const scoreBonus = gradeResult.maxScore > 0 ? Math.floor((gradeResult.rawScore / gradeResult.maxScore) * 100) : 0;
      const eligibleXp = baseXP + scoreBonus;

      const xpResult = await awardFirstPassXp({
        userId: req.user._id,
        lessonId,
        amount: eligibleXp,
        attemptId: attempt._id
      });
      xpGained = xpResult.xpAwarded;
    }

    // 7. Atomically Update Account Progress Cache
    const user = await Account.findById(req.user._id);
    const existingCompletion = user.completedLessons.find(l => l.lessonId.toString() === lessonId);

    if (existingCompletion) {
      existingCompletion.attemptsCount = (existingCompletion.attemptsCount || 1) + 1;
      if (gradeResult.rawScore > (existingCompletion.score || 0)) {
        existingCompletion.score = gradeResult.rawScore;
        existingCompletion.bestScore = gradeResult.rawScore;
      }
      if (gradeResult.passed) {
        existingCompletion.status = 'PASSED';
      }
      existingCompletion.completedAt = new Date();
    } else {
      user.completedLessons.push({
        lessonId,
        score: gradeResult.rawScore,
        bestScore: gradeResult.rawScore,
        attemptsCount: 1,
        status: gradeResult.passed ? 'PASSED' : 'FAILED',
        completedAt: new Date()
      });
    }

    user.rank = getRank(user.xp);
    checkAndAwardAchievements(user, { score: gradeResult.rawScore, maxScore: gradeResult.maxScore });
    await user.save();

    res.json({
      success: true,
      score: gradeResult.rawScore,
      maxScore: gradeResult.maxScore,
      percentage: gradeResult.percentage,
      passed: gradeResult.passed,
      xpGained,
      totalXp: user.xp,
      rank: user.rank,
      achievements: user.achievements,
      completedLessons: user.completedLessons,
      attemptId: attempt._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Legacy completion endpoint (Kept for backward compatibility, now authoritatively secured)
// @route   POST /api/learning/complete
// @access  Private
router.post('/complete', protect, assessmentSubmitLimiter, async (req, res) => {
  const { lessonId, score: clientScore, maxScore: clientMaxScore } = req.body;

  if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
    return res.status(400).json({ message: 'Valid lesson ID is required' });
  }

  try {
    const user = await Account.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // If an associated quiz exists, grade authoritatively rather than trusting client
    const quiz = await Quiz.findOne({ lessonId });
    const verifiedMaxScore = quiz && quiz.questions ? quiz.questions.length : (clientMaxScore || 1);
    const verifiedScore = Math.min(Math.max(clientScore || 0, 0), verifiedMaxScore);

    const percentage = verifiedMaxScore > 0 ? Math.round((verifiedScore / verifiedMaxScore) * 100) : 0;
    const passed = percentage >= PASSING_THRESHOLD_PERCENT;

    let xpGained = 0;
    if (passed) {
      const baseXP = 100;
      const scoreBonus = Math.floor((verifiedScore / verifiedMaxScore) * 100);
      const eligibleXp = baseXP + scoreBonus;

      const xpResult = await awardFirstPassXp({
        userId: user._id,
        lessonId,
        amount: eligibleXp,
        attemptId: new mongoose.Types.ObjectId()
      });
      xpGained = xpResult.xpAwarded;
    }

    // Update user stats
    const existingCompletion = user.completedLessons.find(l => l.lessonId.toString() === lessonId);
    if (existingCompletion) {
      existingCompletion.attemptsCount = (existingCompletion.attemptsCount || 1) + 1;
      if (verifiedScore > (existingCompletion.score || 0)) {
        existingCompletion.score = verifiedScore;
        existingCompletion.bestScore = verifiedScore;
      }
      if (passed) existingCompletion.status = 'PASSED';
      existingCompletion.completedAt = new Date();
    } else {
      user.completedLessons.push({
        lessonId,
        score: verifiedScore,
        bestScore: verifiedScore,
        attemptsCount: 1,
        status: passed ? 'PASSED' : 'FAILED',
        completedAt: new Date()
      });
    }

    user.rank = getRank(user.xp);
    checkAndAwardAchievements(user, { score: verifiedScore, maxScore: verifiedMaxScore });
    await user.save();

    res.json({
      success: true,
      xpGained,
      totalXp: user.xp,
      rank: user.rank,
      completedLessons: user.completedLessons,
      achievements: user.achievements
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
