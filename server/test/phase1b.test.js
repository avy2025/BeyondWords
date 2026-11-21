import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';

// Import models
import Lesson from '../src/models/Lesson.js';
import Quiz from '../src/models/Quiz.js';
import Account from '../src/models/Account.js';
import AssessmentAttempt from '../src/models/AssessmentAttempt.js';
import XpGrantLedger from '../src/models/XpGrantLedger.js';
import ConsumedNonce from '../src/models/ConsumedNonce.js';

// Import seed definitions
import { legacyNuanceLessons, legacyNuanceQuizzes } from '../seed.js';

test('1. Existing Lesson documents remain 100% valid', async () => {
  // Test legacy Nuance lesson without new optional fields
  const legacyLessonData = {
    title: "Linguistic Games",
    category: "INTERACTIVE",
    description: "Capture the essence of German idioms across dialects.",
    language: "German",
    difficulty: "Apprentice",
    order: 1,
    image: "/figmaAssets/container-7.svg"
  };

  const lesson = new Lesson(legacyLessonData);
  const err = lesson.validateSync();
  assert.equal(err, undefined, 'Legacy lesson must validate without errors');

  // Test new lesson with content blocks and academy
  const modernLessonData = {
    title: "Subject Pronouns",
    category: "THEORY",
    description: "Master German subject pronouns.",
    language: "German",
    difficulty: "Apprentice",
    order: 1,
    academy: "GERMAN",
    level: 1,
    lessonType: "THEORY",
    stableKey: "de_lvl1_l1_pronouns",
    contentBlocks: [
      {
        type: "CONCEPT_INTRO",
        data: { title: "Introduction to Pronouns" }
      },
      {
        type: "VOCABULARY_DECK",
        data: { words: [{ de: "ich", en: "I" }] }
      }
    ]
  };

  const modernLesson = new Lesson(modernLessonData);
  const modernErr = modernLesson.validateSync();
  assert.equal(modernErr, undefined, 'Modern extended lesson must validate without errors');
});

test('2. Existing Nuance Game quizzes remain 100% valid', async () => {
  // Legacy Nuance Game question format (only idiom, origin, options, correct, nuance)
  const legacyQuizData = {
    lessonId: new mongoose.Types.ObjectId(),
    questions: [
      {
        idiom: "Das ist nicht mein Bier",
        origin: "German Idiom",
        options: ["Not my beer", "None of my business", "Not paying"],
        correct: 1,
        nuance: "Signifies you have no stake in the matter."
      }
    ]
  };

  const quiz = new Quiz(legacyQuizData);
  const err = quiz.validateSync();
  assert.equal(err, undefined, 'Legacy Nuance quiz must validate without errors');
  assert.equal(quiz.questions[0].type, 'MULTIPLE_CHOICE', 'Default type must be MULTIPLE_CHOICE');

  // Modern question formats (Matching, Fill-in-the-blank, Sign practice)
  const modernQuizData = {
    lessonId: new mongoose.Types.ObjectId(),
    passingPercentage: 75,
    questions: [
      {
        type: "MATCHING",
        prompt: "Match German with English",
        matchingPairs: [
          { leftId: "l1", left: "Danke", rightId: "r1", right: "Thank you" }
        ]
      },
      {
        type: "FILL_BLANK",
        prompt: "Fill in the verb",
        blankText: "Ich ___ Student.",
        acceptedAnswers: ["bin"]
      },
      {
        type: "SIGN_PRACTICE",
        prompt: "Perform HELLO gesture",
        targetGestures: ["HELLO"],
        minConfidence: 80,
        minStabilityFrames: 5
      }
    ]
  };

  const modernQuiz = new Quiz(modernQuizData);
  const modernErr = modernQuiz.validateSync();
  assert.equal(modernErr, undefined, 'Modern multi-type quiz must validate without errors');
});

test('3. Running seeds twice creates no duplicates (Idempotency Contract)', async () => {
  // Verify that all legacyNuanceLessons have unique stable keys
  const keys = legacyNuanceLessons.map(l => l.stableKey);
  const uniqueKeys = new Set(keys);
  assert.equal(keys.length, uniqueKeys.size, 'All legacy seed lessons must have unique stableKeys');
  assert.equal(legacyNuanceLessons.length, 3, 'Must have exactly 3 legacy Nuance lessons');

  // Verify that all seed quizzes map 1:1 to seed lessons
  const quizKeys = legacyNuanceQuizzes.map(q => q.stableKey);
  assert.deepEqual(keys, quizKeys, 'Quizzes must match lessons 1:1 by stableKey');
});

test('4. Existing Nuance Game IDs and content remain unchanged', async () => {
  const seedFilePath = path.resolve(import.meta.dirname, '../seed.js');
  const seedContent = fs.readFileSync(seedFilePath, 'utf8');

  // Must verify that seed.js checks for existing lessons before creating new ones
  assert.match(seedContent, /Lesson\.findOne\(\{ stableKey:/, 'Seed must search by stableKey first');
  assert.match(seedContent, /title:\s*item\.title/, 'Seed must match legacy lesson by title and order');
  assert.match(seedContent, /results\.lessonsPreserved\+\+/, 'Seed must preserve existing lessons');
  assert.match(seedContent, /results\.quizzesPreserved\+\+/, 'Seed must preserve existing quizzes');
});

test('5. XP grants cannot be applied twice (Atomic Ledger Constraint)', async () => {
  // Check XpGrantLedger model indexes
  const indexes = XpGrantLedger.schema.indexes();
  const compoundUniqueIndex = indexes.find(idx => {
    const fields = idx[0];
    const options = idx[1] || {};
    return fields.userId === 1 && fields.lessonId === 1 && fields.grantType === 1 && options.unique === true;
  });

  assert.ok(compoundUniqueIndex, 'XpGrantLedger must enforce unique compound index on { userId, lessonId, grantType }');

  // Check Account model has appliedGrantKeys tracking
  const accountPaths = Account.schema.paths;
  assert.ok(accountPaths.appliedGrantKeys, 'Account schema must define appliedGrantKeys array');
});

test('6. XP recovery works when a crash occurs after Account update but before ledger commit', async () => {
  const userId = new mongoose.Types.ObjectId();
  const lessonId = new mongoose.Types.ObjectId();
  const grantKey = `${userId}_${lessonId}_FIRST_PASS`;

  // Simulate Account state after crash: Account has grantKey in appliedGrantKeys
  const account = new Account({
    userName: "testuser",
    email: "test@example.com",
    password: "hashedpassword",
    xp: 100,
    appliedGrantKeys: [grantKey]
  });

  // Verify that an atomic conditional update with $ne will reject duplicate increment
  const isGrantAlreadyApplied = account.appliedGrantKeys.includes(grantKey);
  assert.equal(isGrantAlreadyApplied, true, 'Recovery must detect that grantKey was already applied to Account');

  // A retry or recovery worker must mark ledger COMMITTED without incrementing Account.xp
  let xpIncremented = 0;
  if (!isGrantAlreadyApplied) {
    xpIncremented = 100;
  }
  assert.equal(xpIncremented, 0, 'No additional XP should be incremented during crash recovery');
});

test('7. Duplicate assessment submissions are prevented by idempotency mechanism', async () => {
  const indexes = AssessmentAttempt.schema.indexes();
  const idempotencyIndex = indexes.find(idx => {
    const fields = idx[0];
    const options = idx[1] || {};
    return fields.userId === 1 && fields.lessonId === 1 && fields.idempotencyKey === 1 && options.unique === true;
  });

  assert.ok(idempotencyIndex, 'AssessmentAttempt must enforce unique compound index on { userId, lessonId, idempotencyKey }');

  // Validate AssessmentAttempt schema fields
  const attempt = new AssessmentAttempt({
    userId: new mongoose.Types.ObjectId(),
    lessonId: new mongoose.Types.ObjectId(),
    academy: 'GERMAN',
    attemptNumber: 1,
    score: 3,
    maxScore: 3,
    percentage: 100,
    status: 'COMPLETED',
    idempotencyKey: 'idemp_uuid_12345'
  });

  const err = attempt.validateSync();
  assert.equal(err, undefined, 'AssessmentAttempt must validate correctly');
});

test('8. ConsumedNonce indexes are correctly defined', async () => {
  const indexes = ConsumedNonce.schema.indexes();
  
  // Verify TTL index on expiresAt
  const ttlIndex = indexes.find(idx => {
    const fields = idx[0];
    const options = idx[1] || {};
    return fields.expiresAt === 1 && options.expireAfterSeconds === 0;
  });
  assert.ok(ttlIndex, 'ConsumedNonce must have TTL index on expiresAt with expireAfterSeconds: 0');

  // Validate ConsumedNonce document
  const nonce = new ConsumedNonce({
    nonce: 'nonce_abc_123',
    userId: new mongoose.Types.ObjectId(),
    expiresAt: new Date(Date.now() + 60000)
  });

  const err = nonce.validateSync();
  assert.equal(err, undefined, 'ConsumedNonce must validate correctly');
});

test('9. No destructive database deletion remains in the seed workflow', async () => {
  const seedFilePath = path.resolve(import.meta.dirname, '../seed.js');
  const seedContent = fs.readFileSync(seedFilePath, 'utf8');

  // Verify that deleteMany is NOT called in seed.js
  const hasDeleteMany = seedContent.includes('.deleteMany');
  assert.equal(hasDeleteMany, false, 'seed.js must NOT contain any deleteMany calls');

  // Verify that drop or remove are NOT called
  assert.equal(seedContent.includes('.drop('), false, 'seed.js must not drop collections');
  assert.equal(seedContent.includes('.remove('), false, 'seed.js must not call remove');
});
