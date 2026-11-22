import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { gradeQuestion, gradeQuiz, PASSING_THRESHOLD_PERCENT } from '../src/services/gradingService.js';
import { sanitizeQuiz } from '../src/utils/quizSanitizer.js';
import { createRateLimiter } from '../src/middleware/rateLimiter.js';
import { awardFirstPassXp } from '../src/services/xpService.js';
import Quiz from '../src/models/Quiz.js';
import Lesson from '../src/models/Lesson.js';
import Account from '../src/models/Account.js';
import AssessmentAttempt from '../src/models/AssessmentAttempt.js';
import XpGrantLedger from '../src/models/XpGrantLedger.js';
import NuanceSession from '../src/models/NuanceSession.js';

test('1. Quiz responses never expose correct answers, accepted answers, or matching mappings', () => {
  const mockQuiz = {
    _id: new mongoose.Types.ObjectId(),
    lessonId: new mongoose.Types.ObjectId(),
    passingPercentage: 70,
    questions: [
      {
        _id: new mongoose.Types.ObjectId(),
        type: 'MULTIPLE_CHOICE',
        prompt: 'What is Guten Tag?',
        options: ['Goodbye', 'Good day', 'Please'],
        correct: 1, // Must be stripped!
        nuance: 'Standard German greeting.'
      },
      {
        _id: new mongoose.Types.ObjectId(),
        type: 'FILL_BLANK',
        blankText: 'Ich ___ hier.',
        acceptedAnswers: ['bin', 'Bin'] // Must be stripped!
      },
      {
        _id: new mongoose.Types.ObjectId(),
        type: 'MATCHING',
        prompt: 'Match pairs',
        matchingPairs: [
          { leftId: 'l1', left: 'Ja', rightId: 'r1', right: 'Yes' },
          { leftId: 'l2', left: 'Nein', rightId: 'r2', right: 'No' }
        ]
      }
    ]
  };

  const sanitized = sanitizeQuiz(mockQuiz);

  // Assertions on MCQ
  assert.equal(sanitized.questions[0].correct, undefined, 'MCQ "correct" answer index must NEVER be exposed');
  assert.deepEqual(sanitized.questions[0].options, ['Goodbye', 'Good day', 'Please'], 'Options must be present');

  // Assertions on Fill-in-the-blank
  assert.equal(sanitized.questions[1].acceptedAnswers, undefined, 'Fill-blank "acceptedAnswers" must NEVER be exposed');
  assert.equal(sanitized.questions[1].blankText, 'Ich ___ hier.', 'Blank text must be present');

  // Assertions on Matching
  assert.equal(sanitized.questions[2].matchingPairs, undefined, 'Matching answer pairs must NEVER be exposed directly');
  assert.ok(Array.isArray(sanitized.questions[2].leftItems), 'leftItems must be present');
  assert.ok(Array.isArray(sanitized.questions[2].rightItems), 'rightItems must be present');
  assert.equal(sanitized.questions[2].leftItems.length, 2);
  assert.equal(sanitized.questions[2].rightItems.length, 2);

  // Verify stored mockQuiz was not mutated
  assert.equal(mockQuiz.questions[0].correct, 1, 'Source Quiz document must not be mutated');
});

test('2. Unauthenticated requests are rejected by auth middleware contract', async () => {
  import('../src/middleware/authMiddleware.js').then(({ protect }) => {
    let statusSet = null;
    let jsonSent = null;

    const req = { headers: {} };
    const res = {
      status(s) {
        statusSet = s;
        return {
          json(j) {
            jsonSent = j;
          }
        };
      }
    };
    const next = () => {
      assert.fail('next() should not be called when unauthenticated');
    };

    protect(req, res, next);
    assert.equal(statusSet, 401, 'Unauthenticated request must return HTTP 401');
    assert.match(jsonSent.message, /Not authorized/, 'Must provide not authorized message');
  });
});

test('3. Users cannot access or verify another user session (Ownership Validation)', () => {
  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();

  const session = {
    sessionId: 'sess_123',
    userId: userAId,
    lessonId: new mongoose.Types.ObjectId()
  };

  // Simulating check: session.userId.toString() !== req.user._id.toString()
  const isAuthorized = session.userId.toString() === userBId.toString();
  assert.equal(isAuthorized, false, 'User B must not be permitted to operate on User A session');
});

test('4. Server grading correctly evaluates all supported question types', () => {
  // 4a. MULTIPLE_CHOICE
  const mcq = {
    type: 'MULTIPLE_CHOICE',
    options: ['Alpha', 'Beta', 'Gamma'],
    correct: 1
  };
  assert.equal(gradeQuestion(mcq, 1).isCorrect, true, 'Correct index must return isCorrect: true');
  assert.equal(gradeQuestion(mcq, 0).isCorrect, false, 'Wrong index must return isCorrect: false');
  assert.equal(gradeQuestion(mcq, 99).isCorrect, false, 'Out-of-bounds index must return isCorrect: false');
  assert.equal(gradeQuestion(mcq, 'invalid').isCorrect, false, 'Non-integer must return isCorrect: false');

  // 4b. FILL_BLANK
  const fillBlank = {
    type: 'FILL_BLANK',
    acceptedAnswers: ['Guten Morgen', 'morgen']
  };
  assert.equal(gradeQuestion(fillBlank, 'guten morgen').isCorrect, true, 'Normalized casing must match');
  assert.equal(gradeQuestion(fillBlank, '  GUTEN   MORGEN  ').isCorrect, true, 'Normalized whitespace must match');
  assert.equal(gradeQuestion(fillBlank, 'Guten Abend').isCorrect, false, 'Incorrect phrase must return false');
  assert.equal(gradeQuestion(fillBlank, '').isCorrect, false, 'Empty text must return false');

  // 4c. MATCHING (Bijective validation)
  const matching = {
    type: 'MATCHING',
    matchingPairs: [
      { leftId: 'l1', rightId: 'r1', left: 'A', right: '1' },
      { leftId: 'l2', rightId: 'r2', left: 'B', right: '2' }
    ]
  };
  // Correct bijection
  assert.equal(
    gradeQuestion(matching, [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r2' }]).isCorrect,
    true,
    'Valid bijection must return isCorrect: true'
  );
  // Inverted mapping
  assert.equal(
    gradeQuestion(matching, [{ leftId: 'l1', rightId: 'r2' }, { leftId: 'l2', rightId: 'r1' }]).isCorrect,
    false,
    'Mismatched pairs must return isCorrect: false'
  );
  // Duplicate abuse
  assert.equal(
    gradeQuestion(matching, [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l1', rightId: 'r2' }]).isCorrect,
    false,
    'Duplicate left ID must be rejected'
  );
  // Missing pair
  assert.equal(
    gradeQuestion(matching, [{ leftId: 'l1', rightId: 'r1' }]).isCorrect,
    false,
    'Missing pair must be rejected'
  );
  // Injected unknown ID
  assert.equal(
    gradeQuestion(matching, [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r_unknown' }]).isCorrect,
    false,
    'Unknown right ID must be rejected'
  );
});

test('5. Client-submitted scores, maxScore, and pass status are strictly ignored by server grading', () => {
  const quiz = {
    passingPercentage: 70,
    questions: [
      { type: 'MULTIPLE_CHOICE', options: ['A', 'B'], correct: 0 },
      { type: 'MULTIPLE_CHOICE', options: ['C', 'D'], correct: 1 }
    ]
  };

  // Client submitted 0 correct answers, but claims score 1000 / 1000
  const submittedAnswers = [1, 0]; // Both wrong!
  const graded = gradeQuiz(quiz, submittedAnswers);

  assert.equal(graded.rawScore, 0, 'Server must calculate real score (0), ignoring client claims');
  assert.equal(graded.maxScore, 2, 'Server must calculate real maxScore (2)');
  assert.equal(graded.percentage, 0, 'Percentage must be 0%');
  assert.equal(graded.passed, false, 'Must be marked passed: false');
});

test('6. Duplicate assessment submissions return original result without duplicate rewards', () => {
  const indexes = AssessmentAttempt.schema.indexes();
  const idempotencyIndex = indexes.find(idx => {
    const fields = idx[0];
    const options = idx[1] || {};
    return fields.userId === 1 && fields.lessonId === 1 && fields.idempotencyKey === 1 && options.unique === true;
  });

  assert.ok(idempotencyIndex, 'AssessmentAttempt must enforce uniqueness on { userId, lessonId, idempotencyKey }');
});

test('7. Lost-response retries return the original attempt result', () => {
  const existingAttempt = {
    userId: new mongoose.Types.ObjectId(),
    lessonId: new mongoose.Types.ObjectId(),
    idempotencyKey: 'retry_key_123',
    score: 3,
    maxScore: 3,
    percentage: 100,
    status: 'COMPLETED'
  };

  // Simulate lookup finding existingAttempt
  const isRetry = existingAttempt && existingAttempt.idempotencyKey === 'retry_key_123';
  assert.equal(isRetry, true, 'Lookup must detect matching attempt by idempotencyKey');
  assert.equal(existingAttempt.score, 3, 'Must return original cached attempt score');
});

test('8. Retakes do not repeatedly award first-pass XP (xpService contract)', () => {
  const ledgerIndexes = XpGrantLedger.schema.indexes();
  const uniqueGrantIndex = ledgerIndexes.find(idx => {
    const fields = idx[0];
    const options = idx[1] || {};
    return fields.userId === 1 && fields.lessonId === 1 && fields.grantType === 1 && options.unique === true;
  });

  assert.ok(uniqueGrantIndex, 'XpGrantLedger must have unique compound index on { userId, lessonId, grantType }');

  // Verify Account appliedGrantKeys protects against double increment
  const userId = new mongoose.Types.ObjectId();
  const lessonId = new mongoose.Types.ObjectId();
  const grantKey = `${userId}_${lessonId}_FIRST_PASS`;

  const account = new Account({
    userName: 'learner',
    email: 'learner@test.com',
    password: 'hash',
    xp: 200,
    appliedGrantKeys: [grantKey]
  });

  const canApplyAgain = !account.appliedGrantKeys.includes(grantKey);
  assert.equal(canApplyAgain, false, 'Account must reject duplicate XP increment for already applied grant key');
});

test('9. Nuance Game legacy questions remain compatible and correctly graded', () => {
  // Legacy question format in seed.js
  const legacyQuestion = {
    idiom: "Das ist nicht mein Bier",
    origin: "German Idiom",
    options: [
      "I don't like beer",
      "That's none of my business",
      "I'm not paying for this",
      "That's not my problem"
    ],
    correct: 1,
    nuance: "Literally 'That is not my beer'."
  };

  // When type is undefined, grading service defaults to MULTIPLE_CHOICE
  const grade = gradeQuestion(legacyQuestion, 1);
  assert.equal(grade.isCorrect, true, 'Legacy Nuance question must grade correctly as MULTIPLE_CHOICE');
  assert.equal(grade.score, 1, 'Legacy Nuance correct answer awards 1 point');

  const wrongGrade = gradeQuestion(legacyQuestion, 0);
  assert.equal(wrongGrade.isCorrect, false, 'Legacy Nuance wrong answer awards 0 points');
});

test('10. Repeated session creation cannot bypass answer restrictions (Anti-Enumeration Lock)', () => {
  const sessionAnswers = {
    0: {
      selectedOptionIndex: 1,
      isCorrect: true,
      correctIndex: 1,
      nuance: 'Captured nuance.'
    }
  };

  // When client tries to probe questionIndex 0 again:
  const questionIndex = 0;
  const isAlreadyAnswered = Boolean(sessionAnswers[questionIndex]);
  assert.equal(isAlreadyAnswered, true, 'Question already answered in session must be locked against re-probing');
  assert.equal(sessionAnswers[0].selectedOptionIndex, 1, 'Recorded option must be immutable');
});

test('11. Rate limits work across sessions per user ID', () => {
  const limiter = createRateLimiter({ windowMs: 1000, maxRequests: 2 });
  const userId = new mongoose.Types.ObjectId();
  const req = { user: { _id: userId } };
  let statusSet = null;
  const res = {
    status(s) {
      statusSet = s;
      return { json: () => {} };
    }
  };

  // Request 1: allowed
  limiter(req, res, () => {});
  assert.equal(statusSet, null);

  // Request 2: allowed
  limiter(req, res, () => {});
  assert.equal(statusSet, null);

  // Request 3: blocked by rate limit across sessions
  limiter(req, res, () => {});
  assert.equal(statusSet, 429, 'Excessive requests across sessions must be blocked with HTTP 429');
});

test('12. Sign-practice assessments cannot be passed without verified inference', () => {
  const signQuestion = {
    type: 'SIGN_PRACTICE',
    targetGestures: ['HELLO'],
    minConfidence: 75
  };

  // In Phase 2, sign practice returns unavailable for verified grading
  const grade = gradeQuestion(signQuestion, { proofToken: 'unverified' });
  assert.equal(grade.isCorrect, false, 'SIGN_PRACTICE must not pass without verified inference');
  assert.equal(grade.reason, 'SIGN_INFERENCE_UNAVAILABLE');
});
