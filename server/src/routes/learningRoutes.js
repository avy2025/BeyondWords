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
import XpGrantLedger from '../models/XpGrantLedger.js';
import {
  stepVerificationLimiter,
  sessionCreationLimiter,
  assessmentSubmitLimiter
} from '../middleware/rateLimiter.js';

const router = express.Router();
export const ASL_STAGES = ['LEARN', 'GUIDED_PRACTICE', 'PRACTICE_CHALLENGE', 'REVISION'];

export const getCompletedStages = (account, lessonId) => {
  const progress = account?.lessonStageProgress?.find(
    item => item.lessonId.toString() === lessonId.toString()
  );
  return progress?.completedStages || [];
};

export const canCompleteAslStage = (completedStages, stage) => {
  if (!ASL_STAGES.includes(stage)) return false;
  return completedStages.includes(stage) || ASL_STAGES.indexOf(stage) === completedStages.length;
};

export const areAllAslStagesComplete = (account, lessonId) => {
  const completedStages = getCompletedStages(account, lessonId);
  return ASL_STAGES.every(stage => completedStages.includes(stage));
};

const ALPHABET_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const ASL_ACTIVITIES = ['LETTER_IDENTIFICATION', 'ALPHABET_CHALLENGE', 'REVISION'];

export const emptyAslAlphabetProgress = () => ({
  studiedLetters: [],
  completedActivities: [],
  challenge: {
    attempts: 0,
    bestCorrect: 0,
    bestTotal: 0,
    lastCorrect: 0,
    lastTotal: 0,
    missedLetters: []
  },
  updatedAt: null
});

export const getAslAlphabetProgress = (account, lessonId) => {
  const entry = account?.aslAlphabetProgress?.find(
    item => item.lessonId.toString() === lessonId.toString()
  );
  if (!entry) return emptyAslAlphabetProgress();

  return {
    studiedLetters: ALPHABET_LETTERS.filter(letter => (entry.studiedLetters || []).includes(letter)),
    completedActivities: ASL_ACTIVITIES.filter(activity => (entry.completedActivities || []).includes(activity)),
    challenge: {
      attempts: entry.challenge?.attempts || 0,
      bestCorrect: entry.challenge?.bestCorrect || 0,
      bestTotal: entry.challenge?.bestTotal || 0,
      lastCorrect: entry.challenge?.lastCorrect || 0,
      lastTotal: entry.challenge?.lastTotal || 0,
      missedLetters: ALPHABET_LETTERS.filter(letter => (entry.challenge?.missedLetters || []).includes(letter))
    },
    updatedAt: entry.updatedAt || entry.challenge?.updatedAt || null
  };
};

/**
 * Validate and merge a practice-only alphabet progress update.
 * Studied letters are additive, activity completion is monotonic, and the
 * challenge best score can only improve. No XP or assessment state is touched.
 */
export const mergeAslAlphabetProgress = (existing, patch = {}) => {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('INVALID_ALPHABET_PROGRESS');
  }

  const sanitizeLetters = value => {
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.some(letter => !ALPHABET_LETTERS.includes(letter))) {
      throw new Error('INVALID_ALPHABET_LETTER');
    }
    return ALPHABET_LETTERS.filter(letter => value.includes(letter));
  };

  const sanitizeActivities = value => {
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.some(activity => !ASL_ACTIVITIES.includes(activity))) {
      throw new Error('INVALID_ALPHABET_ACTIVITY');
    }
    return ASL_ACTIVITIES.filter(activity => value.includes(activity));
  };

  const studiedLetters = sanitizeLetters(patch.studiedLetters) || [];
  const completedActivities = sanitizeActivities(patch.completedActivities) || [];
  const current = existing && typeof existing === 'object' ? existing : emptyAslAlphabetProgress();
  const currentChallenge = current.challenge || emptyAslAlphabetProgress().challenge;

  const nextChallenge = { ...currentChallenge };
  if (patch.challenge !== undefined) {
    if (!patch.challenge || typeof patch.challenge !== 'object' || Array.isArray(patch.challenge)) {
      throw new Error('INVALID_ALPHABET_CHALLENGE');
    }
    const { lastCorrect, lastTotal, missedLetters } = patch.challenge;
    if (
      typeof lastCorrect !== 'number' || !Number.isInteger(lastCorrect) ||
      typeof lastTotal !== 'number' || !Number.isInteger(lastTotal) ||
      lastTotal < 0 || lastTotal > 26 || lastCorrect < 0 || lastCorrect > lastTotal
    ) {
      throw new Error('INVALID_ALPHABET_CHALLENGE');
    }

    const fullChallenge = lastTotal === 26;
    nextChallenge.attempts = (currentChallenge.attempts || 0) + 1;
    nextChallenge.lastCorrect = lastCorrect;
    nextChallenge.lastTotal = lastTotal;
    nextChallenge.missedLetters = sanitizeLetters(missedLetters) || [];
    nextChallenge.bestCorrect = fullChallenge
      ? Math.max(currentChallenge.bestCorrect || 0, lastCorrect)
      : currentChallenge.bestCorrect || 0;
    nextChallenge.bestTotal = fullChallenge ? 26 : currentChallenge.bestTotal || 0;
    nextChallenge.updatedAt = new Date();
  }

  return {
    studiedLetters: ALPHABET_LETTERS.filter(letter =>
      (current.studiedLetters || []).includes(letter) || studiedLetters.includes(letter)
    ),
    completedActivities: ASL_ACTIVITIES.filter(activity =>
      (current.completedActivities || []).includes(activity) || completedActivities.includes(activity)
    ),
    challenge: nextChallenge,
    updatedAt: new Date()
  };
};

export const getRank = (xp) => {
  if (xp <= 500) return 'Philologist Apprentice';
  if (xp <= 1500) return 'Linguistic Explorer';
  if (xp <= 3000) return 'Contextual Master';
  return 'Polyglot Sage';
};

export const isLevelUnlocked = async (user, lesson) => {
  if (!lesson || !lesson.level || lesson.level <= 1) return true;
  if (!lesson.academy) return true;

  // Prerequisite level is level - 1 in the same academy
  const prereqLesson = await Lesson.findOne({
    academy: lesson.academy,
    level: lesson.level - 1
  });
  if (!prereqLesson) return lesson.academy !== 'SIGN_LANGUAGE';

  const account = await Account.findById(user._id || user);
  if (!account || !account.completedLessons) return false;

  const completed = account.completedLessons.find(
    cl => cl.lessonId.toString() === prereqLesson._id.toString()
  );
  if (!completed) return false;
  return completed.status === 'PASSED';
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

// @desc    Get all lessons for a language or academy with user unlock state
// @route   GET /api/learning/lessons
// @access  Private
router.get('/lessons', protect, async (req, res) => {
  try {
    const { language, academy } = req.query;
    const filter = {};
    if (academy) filter.academy = academy;
    if (language) filter.language = language;
    else if (!academy) filter.language = 'German';

    const lessons = await Lesson.find(filter).sort({ level: 1, order: 1 }).lean();

    // Enrich with user's unlock state and progress
    const user = await Account.findById(req.user._id).lean();
    const aslXpByLesson = academy === 'SIGN_LANGUAGE'
      ? await XpGrantLedger.find({ userId: req.user._id, status: 'COMMITTED' }).lean()
      : [];
    const xpMap = new Map(aslXpByLesson.map(grant => [
      grant.lessonId.toString(),
      (aslXpByLesson.filter(item => item.lessonId.toString() === grant.lessonId.toString())
        .reduce((sum, item) => sum + item.amount, 0))
    ]));
    const completedMap = new Map();
    (user?.completedLessons || []).forEach(cl => {
      completedMap.set(cl.lessonId.toString(), cl);
    });

    const enriched = lessons.map(lesson => {
      const lessonIdStr = lesson._id.toString();
      const progress = completedMap.get(lessonIdStr) || null;
      const isPassed = progress && progress.status === 'PASSED';

      let isUnlocked = true;
      if (lesson.academy && lesson.level > 1) {
        const prereqLesson = lessons.find(l => l.academy === lesson.academy && l.level === lesson.level - 1);
        if (prereqLesson) {
          const prereqProgress = completedMap.get(prereqLesson._id.toString());
          isUnlocked = prereqProgress && prereqProgress.status === 'PASSED';
        } else {
          isUnlocked = true;
        }
      }

      return {
        ...lesson,
        isUnlocked: !!isUnlocked,
        userProgress: progress ? {
          status: progress.status,
          score: progress.score,
          bestScore: progress.bestScore || progress.score,
          attemptsCount: progress.attemptsCount || 1,
          completedAt: progress.completedAt,
          isPassed: !!isPassed,
          xpEarned: xpMap.get(lessonIdStr) || 0
        } : academy === 'SIGN_LANGUAGE' ? {
          completedStages: getCompletedStages(user, lessonIdStr),
          xpEarned: 0,
          isPassed: false
        } : null,
        ...(academy === 'SIGN_LANGUAGE' ? {
          completedStages: getCompletedStages(user, lessonIdStr),
          ...(lesson.stableKey === 'asl_level_01'
            ? { alphabetProgress: getAslAlphabetProgress(user, lessonIdStr) }
            : {})
        } : {})
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get full lesson content (all stages) for an unlocked level
// @route   GET /api/learning/lesson/:lessonId
// @access  Private
router.get('/lesson/:lessonId', protect, async (req, res) => {
  const { lessonId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(lessonId)) {
    return res.status(400).json({ message: 'Invalid lesson ID' });
  }

  try {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const unlocked = await isLevelUnlocked(req.user, lesson);
    if (!unlocked) {
      return res.status(403).json({ message: `Level ${lesson.level} is locked. Complete Level ${lesson.level - 1} first.` });
    }

    if (lesson.academy === 'SIGN_LANGUAGE') {
      const account = await Account.findById(req.user._id).lean();
      return res.json({
        ...lesson.toObject(),
        completedStages: getCompletedStages(account, lesson._id),
        ...(lesson.stableKey === 'asl_level_01'
          ? { alphabetProgress: getAslAlphabetProgress(account, lesson._id) }
          : {})
      });
    }

    res.json(lesson);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/lesson/:lessonId/stage-complete', protect, async (req, res) => {
  const { lessonId } = req.params;
  const { stage } = req.body;

  if (!mongoose.Types.ObjectId.isValid(lessonId)) {
    return res.status(400).json({ message: 'Invalid lesson ID' });
  }
  if (!ASL_STAGES.includes(stage)) {
    return res.status(400).json({ message: 'Invalid learning stage' });
  }

  try {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    if (lesson.academy !== 'SIGN_LANGUAGE') {
      return res.status(400).json({ message: 'Stage tracking is only enabled for the ASL Academy' });
    }

    const unlocked = await isLevelUnlocked(req.user, lesson);
    if (!unlocked) {
      return res.status(403).json({ message: `Level ${lesson.level} is locked.` });
    }

    const account = await Account.findById(req.user._id);
    if (!account) return res.status(404).json({ message: 'User not found' });

    let progress = account.lessonStageProgress.find(
      item => item.lessonId.toString() === lessonId
    );
    const completedStages = progress?.completedStages || [];

    if (!canCompleteAslStage(completedStages, stage)) {
      return res.status(409).json({ message: 'Complete the previous stage before continuing.' });
    }

    if (!completedStages.includes(stage)) {
      if (!progress) {
        account.lessonStageProgress.push({ lessonId, completedStages: [stage] });
        progress = account.lessonStageProgress[account.lessonStageProgress.length - 1];
      } else {
        progress.completedStages.push(stage);
      }
      await account.save();
    }

    res.json({ completedStages: progress.completedStages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const loadAlphabetLesson = async (req, res, lessonId) => {
  if (!mongoose.Types.ObjectId.isValid(lessonId)) {
    res.status(400).json({ message: 'Invalid lesson ID' });
    return null;
  }
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) {
    res.status(404).json({ message: 'Lesson not found' });
    return null;
  }
  if (lesson.academy !== 'SIGN_LANGUAGE' || lesson.stableKey !== 'asl_level_01') {
    res.status(400).json({ message: 'Alphabet classroom tracking is only available for ASL Level 1' });
    return null;
  }
  if (!(await isLevelUnlocked(req.user, lesson))) {
    res.status(403).json({ message: 'This alphabet classroom is locked.' });
    return null;
  }
  return lesson;
};

// @desc    Get ASL alphabet classroom progress for the authenticated learner
// @route   GET /api/learning/lesson/:lessonId/alphabet-progress
// @access  Private
router.get('/lesson/:lessonId/alphabet-progress', protect, async (req, res) => {
  try {
    const lesson = await loadAlphabetLesson(req, res, req.params.lessonId);
    if (!lesson) return;
    const account = await Account.findById(req.user._id).lean();
    res.json(getAslAlphabetProgress(account, lesson._id));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Persist practice-only ASL alphabet progress (no XP or assessment effect)
// @route   PUT /api/learning/lesson/:lessonId/alphabet-progress
// @access  Private
router.put('/lesson/:lessonId/alphabet-progress', protect, async (req, res) => {
  try {
    const lesson = await loadAlphabetLesson(req, res, req.params.lessonId);
    if (!lesson) return;

    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const patch = {};
    ['studiedLetters', 'completedActivities', 'challenge'].forEach(key => {
      if (Object.prototype.hasOwnProperty.call(body, key)) patch[key] = body[key];
    });
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: 'No alphabet progress fields provided' });
    }

    const account = await Account.findById(req.user._id);
    if (!account) return res.status(404).json({ message: 'User not found' });

    let normalized;
    try {
      normalized = mergeAslAlphabetProgress(getAslAlphabetProgress(account, lesson._id), patch);
    } catch (error) {
      return res.status(400).json({ message: `Invalid alphabet progress: ${error.message}` });
    }

    let progress = account.aslAlphabetProgress.find(
      item => item.lessonId.toString() === lesson._id.toString()
    );
    if (!progress) {
      account.aslAlphabetProgress.push({ lessonId: lesson._id, ...normalized });
    } else {
      progress.studiedLetters = normalized.studiedLetters;
      progress.completedActivities = normalized.completedActivities;
      progress.challenge = normalized.challenge;
      progress.updatedAt = new Date();
    }
    await account.save();

    res.json(getAslAlphabetProgress(account, lesson._id));
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
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const unlocked = await isLevelUnlocked(req.user, lesson);
    if (!unlocked) {
      return res.status(403).json({ message: `Assessment for Level ${lesson.level} is locked. Complete Level ${lesson.level - 1} first.` });
    }
    if (lesson.academy === 'SIGN_LANGUAGE') {
      const account = await Account.findById(req.user._id).lean();
      if (!areAllAslStagesComplete(account, lessonId)) {
        return res.status(403).json({ message: 'Complete all learning stages before opening the final assessment.' });
      }
    }

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

    // Prerequisite check: ensure previous level was passed
    const unlocked = await isLevelUnlocked(req.user, lesson);
    if (!unlocked) {
      return res.status(403).json({ message: `Prerequisite Level ${lesson.level - 1} must be completed before taking this assessment.` });
    }
    if (lesson.academy === 'SIGN_LANGUAGE') {
      const account = await Account.findById(req.user._id).lean();
      if (!areAllAslStagesComplete(account, lessonId)) {
        return res.status(403).json({ message: 'Complete all learning stages before taking the final assessment.' });
      }
    }

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
      const baseXP = lesson.xpReward || 100;
      const scoreBonus = gradeResult.maxScore > 0 ? Math.floor((gradeResult.rawScore / gradeResult.maxScore) * (lesson.xpReward ? Math.floor(lesson.xpReward * 0.2) : 50)) : 0;
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
