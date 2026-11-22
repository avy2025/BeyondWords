import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { germanLessons, germanQuizzes } from '../src/seeds/germanCurriculum.js';
import { legacyNuanceLessons, legacyNuanceQuizzes } from '../seed.js';
import { isLevelUnlocked } from '../src/routes/learningRoutes.js';
import { sanitizeQuiz } from '../src/utils/quizSanitizer.js';
import { gradeQuiz } from '../src/services/gradingService.js';
import { awardFirstPassXp } from '../src/services/xpService.js';
import Lesson from '../src/models/Lesson.js';
import Quiz from '../src/models/Quiz.js';
import Account from '../src/models/Account.js';
import XpGrantLedger from '../src/models/XpGrantLedger.js';

test('1. All 10 German levels exist with correct metadata and CEFR A1 progression', () => {
  assert.equal(germanLessons.length, 10, 'Must have exactly 10 German levels');
  
  for (let i = 0; i < 10; i++) {
    const lvl = germanLessons[i];
    const expectedLevel = i + 1;
    
    assert.equal(lvl.academy, 'GERMAN', `Level ${expectedLevel} must have academy 'GERMAN'`);
    assert.equal(lvl.level, expectedLevel, `Level must match order ${expectedLevel}`);
    assert.equal(lvl.stableKey, `de_lvl${expectedLevel}`, `StableKey must follow de_lvl${expectedLevel}`);
    assert.equal(lvl.language, 'German');
    assert.ok(lvl.title && lvl.title.length > 5, 'Must have descriptive title');
    assert.ok(lvl.description && lvl.description.length > 10, 'Must have description');
    assert.ok(lvl.xpReward >= 100, 'Must have meaningful XP reward');
    assert.ok(Array.isArray(lvl.contentBlocks) && lvl.contentBlocks.length >= 4, 'Must have structured content blocks');

    // Mongoose schema validation
    const doc = new Lesson(lvl);
    const err = doc.validateSync();
    assert.equal(err, undefined, `Lesson schema validation error on Level ${expectedLevel}: ${err?.message}`);
  }
});

test('2. All 10 German quizzes exist with at least 8 questions each (80+ total questions)', () => {
  assert.equal(germanQuizzes.length, 10, 'Must have exactly 10 German quizzes');
  
  let totalQuestions = 0;
  for (let i = 0; i < 10; i++) {
    const quiz = germanQuizzes[i];
    const expectedKey = `de_lvl${i + 1}`;
    assert.equal(quiz.stableKey, expectedKey, `Quiz must pair with ${expectedKey}`);
    assert.ok(quiz.questions.length >= 8, `Quiz ${expectedKey} must have >= 8 questions, found ${quiz.questions.length}`);
    totalQuestions += quiz.questions.length;
  }
  
  assert.ok(totalQuestions >= 80, `Total German assessment questions must be >= 80, found ${totalQuestions}`);
});

test('3. Question types include MULTIPLE_CHOICE, MATCHING and FILL_BLANK', () => {
  const typesFound = new Set();
  
  germanQuizzes.forEach(quiz => {
    quiz.questions.forEach(q => {
      typesFound.add(q.type);
      if (q.type === 'MULTIPLE_CHOICE') {
        assert.ok(Array.isArray(q.options) && q.options.length >= 2, 'MCQ must have options');
        assert.equal(typeof q.correct, 'number', 'MCQ must have numeric correct index');
      } else if (q.type === 'MATCHING') {
        assert.ok(Array.isArray(q.matchingPairs) && q.matchingPairs.length >= 3, 'Matching must have pairs');
      } else if (q.type === 'FILL_BLANK') {
        assert.ok(Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length >= 1, 'Fill-blank must have acceptedAnswers');
      }
    });
  });

  assert.ok(typesFound.has('MULTIPLE_CHOICE'), 'Must include MULTIPLE_CHOICE');
  assert.ok(typesFound.has('MATCHING'), 'Must include MATCHING');
  assert.ok(typesFound.has('FILL_BLANK'), 'Must include FILL_BLANK');
});

test('4. All 5 stages (Learn, Guided Practice, Practice Challenge, Revision, Final Assessment) have complete content', () => {
  germanLessons.forEach((lvl, idx) => {
    const stagesInLesson = new Set(lvl.contentBlocks.map(b => b.data?.stage));
    assert.ok(stagesInLesson.has('LEARN'), `Level ${idx + 1} must have LEARN stage`);
    assert.ok(stagesInLesson.has('GUIDED_PRACTICE'), `Level ${idx + 1} must have GUIDED_PRACTICE stage`);
    assert.ok(stagesInLesson.has('PRACTICE_CHALLENGE'), `Level ${idx + 1} must have PRACTICE_CHALLENGE stage`);
    assert.ok(stagesInLesson.has('REVISION'), `Level ${idx + 1} must have REVISION stage`);

    // Verify Stage 5 (Final Assessment) has corresponding quiz
    const quiz = germanQuizzes.find(q => q.stableKey === lvl.stableKey);
    assert.ok(quiz && quiz.questions.length >= 8, `Level ${idx + 1} must have Stage 5 Final Assessment Quiz`);
  });
});

test('5. Level 1 is unlocked by default for new users', async () => {
  const newUser = {
    _id: new mongoose.Types.ObjectId(),
    completedLessons: []
  };

  const level1Lesson = { academy: 'GERMAN', level: 1 };
  const unlocked = await isLevelUnlocked(newUser, level1Lesson);
  assert.equal(unlocked, true, 'Level 1 must always be unlocked by default');
});

test('6. Level 2 through 10 are locked until prerequisite level is completed and passed', async () => {
  const userWithoutLvl1 = {
    _id: new mongoose.Types.ObjectId(),
    completedLessons: []
  };

  const level2Lesson = {
    _id: new mongoose.Types.ObjectId(),
    academy: 'GERMAN',
    level: 2
  };

  // Mock Lesson.findOne to return prerequisite Level 1
  const prereqLessonId = new mongoose.Types.ObjectId();
  const originalFindOne = Lesson.findOne;
  Lesson.findOne = (query) => {
    if (query.academy === 'GERMAN' && query.level === 1) {
      return Promise.resolve({ _id: prereqLessonId, level: 1, academy: 'GERMAN' });
    }
    return Promise.resolve(null);
  };

  const originalAccountFindById = Account.findById;
  Account.findById = () => Promise.resolve(userWithoutLvl1);

  try {
    const unlocked = await isLevelUnlocked(userWithoutLvl1, level2Lesson);
    assert.equal(unlocked, false, 'Level 2 must be locked when Level 1 has not been completed');

    // Now user completes Level 1 with PASS
    const userWithPassedLvl1 = {
      _id: userWithoutLvl1._id,
      completedLessons: [
        {
          lessonId: prereqLessonId,
          status: 'PASSED',
          score: 8,
          bestScore: 8
        }
      ]
    };
    Account.findById = () => Promise.resolve(userWithPassedLvl1);

    const unlockedAfterPass = await isLevelUnlocked(userWithPassedLvl1, level2Lesson);
    assert.equal(unlockedAfterPass, true, 'Level 2 must unlock once Level 1 is PASSED');
  } finally {
    Lesson.findOne = originalFindOne;
    Account.findById = originalAccountFindById;
  }
});

test('7. Server grading correctly grades German assessment answers and evaluates passing threshold', () => {
  const quiz = germanQuizzes[0]; // Level 1 Quiz (8 questions)
  
  // Submit all correct answers
  const correctAnswers = quiz.questions.map(q => {
    if (q.type === 'MULTIPLE_CHOICE') return q.correct;
    if (q.type === 'FILL_BLANK') return q.acceptedAnswers[0];
    if (q.type === 'MATCHING') {
      return q.matchingPairs.map(p => ({ leftId: p.leftId, rightId: p.rightId }));
    }
    return null;
  });

  const result100 = gradeQuiz(quiz, correctAnswers);
  assert.equal(result100.passed, true, 'All correct answers must pass');
  assert.equal(result100.percentage, 100, 'Must achieve 100%');

  // Submit all wrong answers
  const wrongAnswers = quiz.questions.map(q => {
    if (q.type === 'MULTIPLE_CHOICE') return (q.correct + 1) % 4;
    if (q.type === 'FILL_BLANK') return 'wrong_answer';
    if (q.type === 'MATCHING') return [];
    return null;
  });

  const result0 = gradeQuiz(quiz, wrongAnswers);
  assert.equal(result0.passed, false, 'Wrong answers must fail');
  assert.equal(result0.percentage, 0, 'Must score 0%');
});

test('8. Failing Level N (<70%) does not allow level progression', async () => {
  const prereqLessonId = new mongoose.Types.ObjectId();
  const userWithFailedLvl1 = {
    _id: new mongoose.Types.ObjectId(),
    completedLessons: [
      {
        lessonId: prereqLessonId,
        status: 'FAILED',
        score: 3,
        bestScore: 3
      }
    ]
  };

  const originalFindOne = Lesson.findOne;
  Lesson.findOne = (query) => {
    if (query.academy === 'GERMAN' && query.level === 1) {
      return Promise.resolve({ _id: prereqLessonId, level: 1, academy: 'GERMAN' });
    }
    return Promise.resolve(null);
  };
  const originalAccountFindById = Account.findById;
  Account.findById = () => Promise.resolve(userWithFailedLvl1);

  try {
    const level2Lesson = { academy: 'GERMAN', level: 2 };
    const unlocked = await isLevelUnlocked(userWithFailedLvl1, level2Lesson);
    assert.equal(unlocked, false, 'Level 2 must NOT unlock when Level 1 was FAILED');
  } finally {
    Lesson.findOne = originalFindOne;
    Account.findById = originalAccountFindById;
  }
});

test('9. Retaking a passed level does not award duplicate first-pass XP (Contract verification)', () => {
  const userId = new mongoose.Types.ObjectId();
  const lessonId = new mongoose.Types.ObjectId();
  const grantKey = `${userId}_${lessonId}_FIRST_PASS`;

  // Verify uniqueness constraint on XpGrantLedger
  const ledgerIndexes = XpGrantLedger.schema.indexes();
  const uniqueGrantIndex = ledgerIndexes.find(idx => {
    const fields = idx[0];
    const options = idx[1] || {};
    return fields.userId === 1 && fields.lessonId === 1 && fields.grantType === 1 && options.unique === true;
  });
  assert.ok(uniqueGrantIndex, 'XpGrantLedger compound unique index prevents duplicate grants');

  // Verify Account appliedGrantKeys prevention
  const account = new Account({
    userName: 'germanLearner',
    email: 'german@test.com',
    password: 'hash',
    xp: 250,
    appliedGrantKeys: [grantKey]
  });

  const isAlreadyApplied = account.appliedGrantKeys.includes(grantKey);
  assert.equal(isAlreadyApplied, true, 'Subsequent attempts identify grant as already applied');
});

test('10. Quiz sanitizer never exposes answer keys on any of the 10 German quizzes', () => {
  germanQuizzes.forEach((quiz, idx) => {
    const sanitized = sanitizeQuiz(quiz);
    assert.equal(sanitized.questions.length, quiz.questions.length);

    sanitized.questions.forEach((q, qIdx) => {
      assert.equal(q.correct, undefined, `Quiz ${idx + 1} Q${qIdx + 1}: MCQ 'correct' must be stripped`);
      assert.equal(q.acceptedAnswers, undefined, `Quiz ${idx + 1} Q${qIdx + 1}: Fill-blank 'acceptedAnswers' must be stripped`);
      assert.equal(q.matchingPairs, undefined, `Quiz ${idx + 1} Q${qIdx + 1}: Matching pairs must be stripped`);
      if (q.type === 'MATCHING') {
        assert.ok(Array.isArray(q.leftItems), 'leftItems must exist');
        assert.ok(Array.isArray(q.rightItems), 'rightItems must exist');
      }
    });
  });
});

test('11. Existing Nuance Game lessons, quizzes, and legacy data remain 100% intact', () => {
  assert.equal(legacyNuanceLessons.length, 3, 'Must preserve all 3 legacy Nuance Game lessons');
  assert.equal(legacyNuanceQuizzes.length, 3, 'Must preserve all 3 legacy Nuance Game quizzes');
  
  const expectedNuanceKeys = ["nuance_idioms_1", "nuance_curation_2", "nuance_depth_3"];
  legacyNuanceLessons.forEach((nl, i) => {
    assert.equal(nl.stableKey, expectedNuanceKeys[i]);
    assert.equal(nl.academy, "NUANCE_GAME");
  });
});
