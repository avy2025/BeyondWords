import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import Lesson from '../src/models/Lesson.js';
import Quiz from '../src/models/Quiz.js';
import Account from '../src/models/Account.js';
import AssessmentAttempt from '../src/models/AssessmentAttempt.js';
import { seedDB } from '../seed.js';
import learningRoutes from '../src/routes/learningRoutes.js';
import errorMiddleware from '../src/middleware/errorMiddleware.js';
import { sanitizeQuiz } from '../src/utils/quizSanitizer.js';
import { gradeQuestion, gradeQuiz } from '../src/services/gradingService.js';

dotenv.config();

const answerFor = question => {
  if (question.type === 'MULTIPLE_CHOICE') return question.correct;
  if (question.type === 'MATCHING') {
    return question.matchingPairs.map(pair => ({ leftId: pair.leftId, rightId: pair.rightId }));
  }
  if (question.type === 'FILL_BLANK') return question.acceptedAnswers[0];
  return null;
};

test('1. Phase 4.3 practice stays client-side: seed quizzes only use supported, sanitized question types', () => {
  const unsupported = new Quiz({
    lessonId: new mongoose.Types.ObjectId(),
    questions: [{ type: 'CAMERA_ASSESSMENT', prompt: 'Show a sign to the camera' }]
  }).validateSync();
  assert.ok(unsupported, 'A camera assessment question must be rejected by the quiz schema');

  assert.equal(gradeQuestion({ type: 'CAMERA_ASSESSMENT' }, null).reason, 'UNSUPPORTED_QUESTION_TYPE');
  assert.equal(gradeQuestion({ type: 'SIGN_PRACTICE' }, {}).reason, 'SIGN_INFERENCE_UNAVAILABLE');

  const augmented = {
    passingPercentage: 70,
    questions: [
      { type: 'MULTIPLE_CHOICE', prompt: 'Pick one', options: ['a', 'b'], correct: 1 },
      { type: 'MATCHING', prompt: 'Match', matchingPairs: [{ leftId: 'l1', left: 'L1', rightId: 'r1', right: 'R1' }] },
      { type: 'FILL_BLANK', prompt: 'Fill', acceptedAnswers: ['answer'] },
      { type: 'CAMERA_ASSESSMENT', prompt: 'Camera' }
    ]
  };
  const sanitized = sanitizeQuiz(augmented);
  assert.equal(sanitized.questions.length, 4);
  sanitized.questions.forEach(question => {
    assert.equal(question.correct, undefined);
    assert.equal(question.acceptedAnswers, undefined);
    assert.equal(question.matchingPairs, undefined);
  });
  const graded = gradeQuiz(augmented, [1, [{ leftId: 'l1', rightId: 'r1' }], 'answer', null]);
  assert.equal(graded.results[3].reason, 'UNSUPPORTED_QUESTION_TYPE');
  assert.equal(graded.percentage, 75, 'Unsupported camera questions can never contribute passing points');
});

test('2. Stage completion and assessment remain authoritative, XP-neutral until final submission', { timeout: 30000 }, async t => {
  let testUri;
  try {
    const configured = new URL(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/beyond-words');
    configured.pathname = '/beyondwords_phase43_test';
    configured.search = '';
    testUri = configured.toString();
  } catch {
    testUri = 'mongodb://127.0.0.1:27017/beyondwords_phase43_test';
  }

  try {
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 2000 });
  } catch (error) {
    t.skip(`MongoDB integration unavailable: ${error.message}`);
    return;
  }

  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'phase43-test-secret';
  let httpServer;
  try {
    await mongoose.connection.dropDatabase();
    await seedDB({ log: false });

    const levelOne = await Lesson.findOne({ stableKey: 'asl_level_01' });
    const levelTwo = await Lesson.findOne({ stableKey: 'asl_level_02' });
    assert.ok(levelOne && levelTwo);

    const quizOne = await Quiz.findOne({ lessonId: levelOne._id });
    assert.ok(quizOne);
    assert.ok(quizOne.questions.every(question =>
      ['MULTIPLE_CHOICE', 'MATCHING', 'FILL_BLANK'].includes(question.type)
    ));

    const account = await Account.create({
      userName: 'phase43-practice-test',
      email: 'phase43-practice-test@example.com',
      password: 'local-test-password'
    });
    const token = jwt.sign({ id: String(account._id) }, process.env.JWT_SECRET);
    const authHeaders = { Authorization: `Bearer ${token}` };

    httpServer = createServer();
    const app = express();
    app.use(express.json());
    app.use('/api/learning', learningRoutes);
    app.use(errorMiddleware);
    httpServer.on('request', app);
    await new Promise(resolve => httpServer.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
    const stageUrl = lessonId => `${baseUrl}/api/learning/lesson/${lessonId}/stage-complete`;
    const postStage = (lessonId, stage) => fetch(stageUrl(lessonId), {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage })
    });

    const lockedLevelTwo = await postStage(levelTwo._id, 'LEARN');
    assert.equal(lockedLevelTwo.status, 403, 'Later levels must remain locked until Level 1 is passed');
    await lockedLevelTwo.text();

    const blockedQuiz = await fetch(`${baseUrl}/api/learning/quiz/${levelOne._id}`, { headers: authHeaders });
    assert.equal(blockedQuiz.status, 403, 'Final assessment must stay closed while stages are incomplete');
    await blockedQuiz.text();

    const invalidStage = await postStage(levelOne._id, 'SIGN_PRACTICE');
    assert.equal(invalidStage.status, 400);
    await invalidStage.text();

    const outOfOrder = await postStage(levelOne._id, 'REVISION');
    assert.equal(outOfOrder.status, 409);
    await outOfOrder.text();

    for (const stage of ['LEARN', 'GUIDED_PRACTICE', 'PRACTICE_CHALLENGE', 'REVISION']) {
      const response = await postStage(levelOne._id, stage);
      assert.equal(response.status, 200, `${stage} should complete in order`);
      const body = await response.json();
      assert.ok(body.completedStages.includes(stage));
    }

    const duplicate = await postStage(levelOne._id, 'LEARN');
    assert.equal(duplicate.status, 200);
    assert.equal((await duplicate.json()).completedStages.filter(stage => stage === 'LEARN').length, 1);

    const afterPractice = await Account.findById(account._id);
    assert.equal(afterPractice.xp, 0, 'Interactive practice and stage completion must never award XP');
    assert.equal(afterPractice.completedLessons.length, 0, 'Stage completion must not complete the assessment');
    assert.equal(await AssessmentAttempt.countDocuments({ userId: account._id }), 0);

    const quizResponse = await fetch(`${baseUrl}/api/learning/quiz/${levelOne._id}`, { headers: authHeaders });
    assert.equal(quizResponse.status, 200);
    const quizBody = await quizResponse.json();
    assert.deepEqual(quizBody.questions.map(question => question.type).filter(type =>
      !['MULTIPLE_CHOICE', 'MATCHING', 'FILL_BLANK'].includes(type)
    ), []);
    quizBody.questions.forEach(question => {
      assert.equal(question.correct, undefined);
      assert.equal(question.acceptedAnswers, undefined);
      assert.equal(question.matchingPairs, undefined);
    });

    const perfectAnswers = quizOne.questions.map(answerFor);
    assert.equal(gradeQuiz(quizOne, perfectAnswers).passed, true);

    const submitted = await fetch(`${baseUrl}/api/learning/quiz/${levelOne._id}/submit`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: perfectAnswers,
        idempotencyKey: 'phase43-perfect-level-one',
        xpGained: 99999,
        passed: false
      })
    });
    assert.equal(submitted.status, 200);
    const submittedBody = await submitted.json();
    assert.equal(submittedBody.passed, true);
    assert.ok(submittedBody.xpGained > 0, 'Only the authoritative final assessment grants XP');
    assert.notEqual(submittedBody.xpGained, 99999, 'Client-supplied XP must be ignored');

    const completed = await Account.findById(account._id);
    assert.equal(completed.xp, submittedBody.totalXp);
    assert.equal(completed.completedLessons.length, 1);
    assert.equal(completed.completedLessons[0].status, 'PASSED');

    const unlockedLevelTwo = await postStage(levelTwo._id, 'LEARN');
    assert.equal(unlockedLevelTwo.status, 200, 'Passing Level 1 must unlock Level 2 stages');
    await unlockedLevelTwo.text();

    const prematureLevelTwoAssessment = await fetch(`${baseUrl}/api/learning/quiz/${levelTwo._id}/submit`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: [],
        idempotencyKey: 'phase43-premature-level-two',
        passed: true,
        xpGained: 99999
      })
    });
    assert.equal(prematureLevelTwoAssessment.status, 403, 'Level 2 assessment still requires its own stages');
    await prematureLevelTwoAssessment.text();
    assert.equal((await Account.findById(account._id)).completedLessons.length, 1);
  } finally {
    if (httpServer?.listening) {
      httpServer.closeAllConnections?.();
      await new Promise(resolve => httpServer.close(resolve));
    }
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
