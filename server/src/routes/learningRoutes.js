import express from 'express';
import Lesson from '../models/Lesson.js';
import Quiz from '../models/Quiz.js';
import Account from '../models/Account.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const getRank = (xp) => {
  if (xp <= 500) return 'Philologist Apprentice';
  if (xp <= 1500) return 'Linguistic Explorer';
  if (xp <= 3000) return 'Contextual Master';
  return 'Polyglot Sage';
};

const checkAndAwardAchievements = (user, lessonResult) => {
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
    if (!existingTitles.includes('Perfect Scholar') && lessonResult.score === lessonResult.maxScore) {
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

// @desc    Get all lessons for a language
// @route   GET /api/learning/lessons
// @access  Private
router.get('/lessons', protect, async (req, res) => {
  try {
    const { language = 'German' } = req.query;
    const lessons = await Lesson.find({ language }).sort({ order: 1 });
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get quiz for a specific lesson
// @route   GET /api/learning/quiz/:lessonId
// @access  Private
router.get('/quiz/:lessonId', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ lessonId: req.params.lessonId });
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Complete a lesson and update progress/XP
// @route   POST /api/learning/complete
// @access  Private
router.post('/complete', protect, async (req, res) => {
  const { lessonId, score, maxScore } = req.body;

  try {
    const user = await Account.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Calculate XP: 100 for completion + bonus based on score percentage
    const baseXP = 100;
    const scoreBonus = Math.floor((score / maxScore) * 100);
    const totalAwardedXP = baseXP + scoreBonus;

    // Update user stats
    user.xp += totalAwardedXP;
    user.rank = getRank(user.xp);

    // Track completion
    const existingCompletion = user.completedLessons.find(l => l.lessonId.toString() === lessonId);
    if (existingCompletion) {
        if (score > existingCompletion.score) {
            existingCompletion.score = score;
            existingCompletion.completedAt = Date.now();
        }
    } else {
        user.completedLessons.push({ lessonId, score });
    }

    // Award achievements
    checkAndAwardAchievements(user, { score, maxScore });

    await user.save();

    res.json({
      success: true,
      xpGained: totalAwardedXP,
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
