import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { aslLessons, aslQuizzes } from '../src/seeds/aslCurriculum.js';
import {
  aslPhase42Lessons,
  aslPhase42Quizzes,
  aslPhase42BaseExplanations,
  ASL42_ENRICHMENT_KEYS
} from '../src/seeds/aslPhase42Curriculum.js';
import { seedDB } from '../seed.js';
import learningRoutes from '../src/routes/learningRoutes.js';
import errorMiddleware from '../src/middleware/errorMiddleware.js';
import Lesson from '../src/models/Lesson.js';
import Quiz from '../src/models/Quiz.js';
import Account from '../src/models/Account.js';
import {
  ASL_STAGES,
  areAllAslStagesComplete,
  canCompleteAslStage,
  emptyAslAlphabetProgress,
  getCompletedStages,
  getAslAlphabetProgress,
  isLevelUnlocked,
  mergeAslAlphabetProgress
} from '../src/routes/learningRoutes.js';
import { sanitizeQuiz } from '../src/utils/quizSanitizer.js';
import { gradeQuestion, gradeQuiz } from '../src/services/gradingService.js';
import { awardFirstPassXp } from '../src/services/xpService.js';

dotenv.config();

const EXPECTED_TITLES = [
  'ASL Alphabet A–Z',
  'Fingerspelling and Word Formation',
  'Numbers and Counting',
  'Basic Greetings',
  'Everyday Vocabulary',
  'People, Family and Relationships',
  'Actions and Daily Activities',
  'Questions and Useful Expressions',
  'Guided Conversations',
  'Revision and Practical Challenges'
];

test('1. All 10 ASL levels have stable keys, valid schemas and five-stage content', () => {
  assert.equal(aslLessons.length, 10);
  assert.deepEqual(aslLessons.map(lesson => lesson.title), EXPECTED_TITLES);

  aslLessons.forEach((lesson, index) => {
    const level = index + 1;
    assert.equal(lesson.academy, 'SIGN_LANGUAGE');
    assert.equal(lesson.level, level);
    assert.equal(lesson.order, level);
    assert.equal(lesson.stableKey, `asl_level_${String(level).padStart(2, '0')}`);
    assert.equal(lesson.language, 'ASL');
    assert.ok(lesson.xpReward >= 100);
    assert.ok(lesson.description.length > 25);

    const validationError = new Lesson(lesson).validateSync();
    assert.equal(validationError, undefined, `Schema error on ASL level ${level}: ${validationError?.message}`);

    const stages = new Set(lesson.contentBlocks.map(block => block.data?.stage));
    ASL_STAGES.forEach(stage => {
      assert.ok(stages.has(stage), `ASL level ${level} must teach the ${stage} stage`);
    });
    const blockTypes = lesson.contentBlocks.map(block => block.type);
    assert.ok(blockTypes.includes('FORMATIVE_DRILL'), `Level ${level} needs guided practice exercises`);
    assert.ok(blockTypes.includes('PRACTICE_DRILL'), `Level ${level} needs a practice challenge`);
    assert.ok(blockTypes.includes('REVISION_RECAP'), `Level ${level} needs revision exercises`);
    const learnBlocks = lesson.contentBlocks.filter(block => block.data?.stage === 'LEARN');
    assert.ok(learnBlocks.length >= 2, `Level ${level} needs structured Learn content`);
    assert.ok(learnBlocks.every(block => (block.data.body || block.data.letters || block.data.terms)));

    ASL_STAGES.filter(stage => stage !== 'LEARN').forEach(stage => {
      const drills = lesson.contentBlocks.filter(
        block => block.data?.stage === stage && Array.isArray(block.data.exercises)
      );
      assert.ok(drills.length > 0, `Level ${level} needs interactive exercises for ${stage}`);
      drills.forEach(drill => {
        drill.data.exercises.forEach(exercise => {
          assert.ok(Array.isArray(exercise.options) && exercise.options.length >= 2);
          assert.equal(typeof exercise.answer, 'number');
          assert.ok(exercise.answer >= 0 && exercise.answer < exercise.options.length);
          assert.ok(exercise.hint && exercise.feedback);
        });
      });
    });
  });
});

test('2. Level 1 teaches all 26 letters with honest, linked visual references', () => {
  const guide = aslLessons[0].contentBlocks.find(block => block.type === 'GESTURE_GUIDE');
  assert.ok(guide, 'Level 1 must include a gesture guide');
  const letters = guide.data.letters;
  assert.equal(letters.length, 26);
  assert.deepEqual(letters.map(entry => entry.letter), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));

  letters.forEach(entry => {
    assert.ok(entry.handshape.length > 25, `${entry.letter} needs a handshape description`);
    assert.ok(entry.identification.length > 15, `${entry.letter} needs identification guidance`);
    assert.ok(entry.orientation && entry.orientation.length > 15, `${entry.letter} needs orientation guidance`);
    assert.ok(entry.movement && entry.movement.length > 15, `${entry.letter} needs movement guidance`);
    assert.ok(entry.tip && entry.tip.length > 15, `${entry.letter} needs a learning tip`);
    assert.ok(entry.commonMistake.length > 15, `${entry.letter} needs a common mistake note`);
    assert.equal(entry.demonstration.status, 'LINKED_REFERENCE');
    assert.match(entry.demonstration.referenceUrl, /^https:\/\/www\.lifeprint\.com\/asl101\/fingerspelling/);
    assert.equal(entry.demonstration.imageUrl, undefined, 'No unverified handshape image may be bundled');
  });

  const letter = key => letters.find(entry => entry.letter === key);
  assert.match(letter('J').handshape, /movement|Move/);
  assert.match(letter('J').identification, /movement/);
  assert.match(letter('J').movement, /J-shaped/);
  assert.match(letter('Z').handshape, /trace|Trace/);
  assert.match(letter('Z').identification, /movement/);
  assert.match(letter('Z').movement, /Z/);
  assert.equal(letter('A').movement, letter('B').movement, 'Static letters share an honest steady-hold note');
  assert.match(letter('M').identification, /three fingers/);
  assert.match(letter('N').identification, /two fingers/);
  assert.match(guide.data.visualNotice, /links to the verified ASL University alphabet chart/);
  assert.doesNotMatch(guide.data.visualNotice, /placeholder/i);
  assert.ok(guide.data.source.url.startsWith('https://www.lifeprint.com/'));
});

test('3. ASL quizzes are sanitized and grade authoritatively', () => {
  assert.equal(aslQuizzes.length, 10);

  aslQuizzes.forEach((quiz, index) => {
    assert.equal(quiz.stableKey, aslLessons[index].stableKey);
    assert.ok(quiz.questions.length >= 8, `ASL quiz ${index + 1} must have at least 8 questions`);
    quiz.questions.forEach(question => {
      assert.equal(question.type, 'MULTIPLE_CHOICE');
      assert.ok(question.options.length >= 3);
      assert.ok(question.correct >= 0 && question.correct < question.options.length);
      assert.ok(question.prompt.length > 10);
    });

    const sanitized = sanitizeQuiz(quiz);
    sanitized.questions.forEach(question => {
      assert.equal(question.correct, undefined, 'Answer key must never be sent to the client');
      assert.equal(question.acceptedAnswers, undefined);
      assert.equal(question.matchingPairs, undefined);
      assert.ok(Array.isArray(question.options));
    });

    const perfect = gradeQuiz(quiz, quiz.questions.map(question => question.correct));
    assert.equal(perfect.percentage, 100);
    assert.equal(perfect.passed, true);

    const empty = gradeQuiz(quiz, []);
    assert.equal(empty.percentage, 0);
    assert.equal(empty.passed, false);
  });
});

test('4. Sequential unlock and ASL stage order are enforced by backend helpers', async () => {
  const level1 = { _id: new mongoose.Types.ObjectId(), academy: 'SIGN_LANGUAGE', level: 1 };
  const level2 = { _id: new mongoose.Types.ObjectId(), academy: 'SIGN_LANGUAGE', level: 2 };
  const prereqId = level1._id;
  const userId = new mongoose.Types.ObjectId();

  const originalLessonFindOne = Lesson.findOne;
  const originalAccountFindById = Account.findById;
  try {
    assert.equal(await isLevelUnlocked({ _id: userId, completedLessons: [] }, level1), true);

    Lesson.findOne = query =>
      Promise.resolve(query.academy === 'SIGN_LANGUAGE' && query.level === 1 ? level1 : null);
    Account.findById = () => Promise.resolve({ _id: userId, completedLessons: [] });
    assert.equal(await isLevelUnlocked({ _id: userId, completedLessons: [] }, level2), false);

    Account.findById = () => Promise.resolve({
      _id: userId,
      completedLessons: [{ lessonId: prereqId, status: 'PASSED' }]
    });
    assert.equal(await isLevelUnlocked({ _id: userId, completedLessons: [] }, level2), true);

    Account.findById = () => Promise.resolve({
      _id: userId,
      completedLessons: [{ lessonId: prereqId, status: 'FAILED' }]
    });
    assert.equal(await isLevelUnlocked({ _id: userId, completedLessons: [] }, level2), false);

    Lesson.findOne = () => Promise.resolve(null);
    assert.equal(
      await isLevelUnlocked({ _id: userId, completedLessons: [] }, level2),
      false,
      'A missing ASL prerequisite must not silently unlock later levels'
    );
  } finally {
    Lesson.findOne = originalLessonFindOne;
    Account.findById = originalAccountFindById;
  }

  assert.equal(canCompleteAslStage([], 'LEARN'), true);
  assert.equal(canCompleteAslStage(['LEARN'], 'LEARN'), true);
  assert.equal(canCompleteAslStage(['LEARN'], 'GUIDED_PRACTICE'), true);
  assert.equal(canCompleteAslStage(['LEARN'], 'REVISION'), false);
  assert.equal(canCompleteAslStage(['LEARN', 'GUIDED_PRACTICE'], 'PRACTICE_CHALLENGE'), true);
  assert.equal(canCompleteAslStage(ASL_STAGES, 'REVISION'), true);
  assert.equal(canCompleteAslStage([], 'FINAL_ASSESSMENT'), false);

  const account = {
    lessonStageProgress: [{ lessonId: level1._id, completedStages: ['LEARN', 'GUIDED_PRACTICE'] }]
  };
  assert.deepEqual(getCompletedStages(account, level1._id), ['LEARN', 'GUIDED_PRACTICE']);
  assert.equal(areAllAslStagesComplete(account, level1._id), false);
  account.lessonStageProgress[0].completedStages = [...ASL_STAGES];
  assert.equal(areAllAslStagesComplete(account, level1._id), true);
  assert.equal(areAllAslStagesComplete({ lessonStageProgress: [] }, level1._id), false);
});

test('5. Real MongoDB seed is idempotent and ASL XP is granted exactly once', { timeout: 30000 }, async t => {
  let testUri;
  try {
    const configured = new URL(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/beyond-words');
    configured.pathname = '/beyondwords_phase4_test';
    configured.search = '';
    testUri = configured.toString();
  } catch {
    testUri = 'mongodb://127.0.0.1:27017/beyondwords_phase4_test';
  }

  try {
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 2000 });
  } catch (error) {
    t.skip(`MongoDB integration unavailable: ${error.message}`);
    return;
  }

  try {
    await mongoose.connection.dropDatabase();

    const first = await seedDB({ log: false });
    assert.equal(first.lessonsCreated, 23);
    assert.equal(first.quizzesCreated, 23);
    assert.equal(await Lesson.countDocuments({ academy: 'SIGN_LANGUAGE' }), 10);
    assert.equal(await Lesson.countDocuments({ academy: 'GERMAN' }), 10);
    assert.equal(await Lesson.countDocuments({ academy: 'NUANCE_GAME' }), 3);
    assert.equal(await Quiz.countDocuments({}), 23);

    const aslLesson = await Lesson.findOne({ stableKey: 'asl_level_01' });
    assert.ok(aslLesson);
    const aslQuiz = await Quiz.findOne({ lessonId: aslLesson._id });
    assert.ok(aslQuiz);
    assert.equal(
      aslQuiz.questions.length,
      aslQuizzes[0].questions.length + aslPhase42Quizzes[0].questions.length
    );

    const account = await Account.create({
      userName: 'phase4-test',
      email: 'phase4-test@example.com',
      password: 'local-test-password'
    });
    const firstGrant = await awardFirstPassXp({
      userId: account._id,
      lessonId: aslLesson._id,
      amount: aslLesson.xpReward,
      attemptId: new mongoose.Types.ObjectId()
    });
    assert.equal(firstGrant.xpAwarded, aslLesson.xpReward);
    const secondGrant = await awardFirstPassXp({
      userId: account._id,
      lessonId: aslLesson._id,
      amount: aslLesson.xpReward,
      attemptId: new mongoose.Types.ObjectId()
    });
    assert.equal(secondGrant.xpAwarded, 0, 'Replaying an ASL XP grant must not award XP twice');
    const freshAccount = await Account.findById(account._id);
    assert.equal(freshAccount.xp, aslLesson.xpReward);

    const secondSeed = await seedDB({ log: false });
    assert.equal(secondSeed.lessonsCreated, 0);
    assert.equal(secondSeed.quizzesCreated, 0);
    const preservedLesson = await Lesson.findOne({ stableKey: 'asl_level_01' });
    assert.equal(String(preservedLesson._id), String(aslLesson._id), 'Seeding must preserve lesson IDs');
    assert.equal(await Lesson.countDocuments({ academy: 'SIGN_LANGUAGE' }), 10);
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

test('6. Alphabet progress is validated, authenticated, persisted, and XP-neutral', { timeout: 30000 }, async t => {
  const empty = emptyAslAlphabetProgress();
  assert.deepEqual(empty.studiedLetters, []);
  assert.equal(empty.challenge.attempts, 0);

  const merged = mergeAslAlphabetProgress(empty, {
    studiedLetters: ['J', 'Z'],
    completedActivities: ['LETTER_IDENTIFICATION'],
    challenge: { lastCorrect: 24, lastTotal: 26, missedLetters: ['J', 'Z'] }
  });
  assert.deepEqual(getAslAlphabetProgress({ aslAlphabetProgress: [] }, 'lesson-1'), empty);
  assert.deepEqual(merged.studiedLetters, ['J', 'Z']);
  assert.equal(merged.challenge.bestCorrect, 24);
  assert.equal(merged.challenge.attempts, 1);
  assert.throws(
    () => mergeAslAlphabetProgress(empty, { studiedLetters: ['AA'] }),
    /INVALID_ALPHABET_LETTER/
  );
  assert.throws(
    () => mergeAslAlphabetProgress(empty, { completedActivities: ['FAKE'] }),
    /INVALID_ALPHABET_ACTIVITY/
  );
  assert.throws(
    () => mergeAslAlphabetProgress(empty, {
      challenge: { lastCorrect: 27, lastTotal: 26, missedLetters: [] }
    }),
    /INVALID_ALPHABET_CHALLENGE/
  );

  let testUri;
  try {
    const configured = new URL(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/beyond-words');
    configured.pathname = '/beyondwords_phase41_test';
    configured.search = '';
    testUri = configured.toString();
  } catch {
    testUri = 'mongodb://127.0.0.1:27017/beyondwords_phase41_test';
  }

  try {
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 2000 });
  } catch (error) {
    t.skip(`MongoDB integration unavailable: ${error.message}`);
    return;
  }

  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'phase41-test-secret';
  let httpServer;
  try {
    await mongoose.connection.dropDatabase();
    await seedDB({ log: false });

    const levelOne = await Lesson.findOne({ stableKey: 'asl_level_01' });
    const levelTwo = await Lesson.findOne({ stableKey: 'asl_level_02' });
    assert.ok(levelOne && levelTwo);

    const account = await Account.create({
      userName: 'phase41-progress-test',
      email: 'phase41-progress-test@example.com',
      password: 'local-test-password'
    });
    const otherAccount = await Account.create({
      userName: 'phase41-other-test',
      email: 'phase41-other-test@example.com',
      password: 'local-test-password'
    });
    const token = jwt.sign({ id: String(account._id) }, process.env.JWT_SECRET);
    const otherToken = jwt.sign({ id: String(otherAccount._id) }, process.env.JWT_SECRET);

    httpServer = createServer();
    const app = express();
    app.use(express.json());
    app.use('/api/learning', learningRoutes);
    app.use(errorMiddleware);
    httpServer.on('request', app);
    await new Promise(resolve => httpServer.listen(0, '127.0.0.1', resolve));
    const baseUrl = `http://127.0.0.1:${httpServer.address().port}`;
    const progressUrl = `${baseUrl}/api/learning/lesson/${levelOne._id}/alphabet-progress`;
    const authHeaders = { Authorization: `Bearer ${token}` };

    const unauthenticated = await fetch(progressUrl);
    assert.equal(unauthenticated.status, 401);
    await unauthenticated.text();

    const initial = await fetch(progressUrl, { headers: authHeaders });
    assert.equal(initial.status, 200);
    const initialBody = await initial.json();
    assert.deepEqual(initialBody.studiedLetters, []);
    assert.equal(initialBody.challenge.attempts, 0);

    const other = await fetch(progressUrl, {
      headers: { Authorization: `Bearer ${otherToken}` }
    });
    assert.equal(other.status, 200);
    assert.deepEqual((await other.json()).studiedLetters, [], 'Progress must not leak between accounts');

    const saved = await fetch(progressUrl, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studiedLetters: ['A', 'Z'],
        completedActivities: ['LETTER_IDENTIFICATION', 'ALPHABET_CHALLENGE'],
        challenge: { lastCorrect: 24, lastTotal: 26, missedLetters: ['J', 'Z'] }
      })
    });
    assert.equal(saved.status, 200);
    const savedBody = await saved.json();
    assert.deepEqual(savedBody.studiedLetters, ['A', 'Z']);
    assert.equal(savedBody.challenge.bestCorrect, 24);
    assert.deepEqual(savedBody.challenge.missedLetters, ['J', 'Z']);

    const invalidLetter = await fetch(progressUrl, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ studiedLetters: ['AA'] })
    });
    assert.equal(invalidLetter.status, 400);
    await invalidLetter.text();
    const invalidChallenge = await fetch(progressUrl, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge: { lastCorrect: 30, lastTotal: 26, missedLetters: [] }
      })
    });
    assert.equal(invalidChallenge.status, 400);
    await invalidChallenge.text();

    const retry = await fetch(progressUrl, {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studiedLetters: ['A', 'B'],
        challenge: { lastCorrect: 2, lastTotal: 2, missedLetters: [] }
      })
    });
    assert.equal(retry.status, 200);
    const retryBody = await retry.json();
    assert.deepEqual(retryBody.studiedLetters, ['A', 'B', 'Z'], 'Studied letters stay additive');
    assert.equal(retryBody.challenge.attempts, 2);
    assert.equal(retryBody.challenge.bestCorrect, 24, 'A focused retry cannot overwrite the full-challenge best');
    assert.equal(retryBody.challenge.lastTotal, 2);

    const wrongLesson = await fetch(
      `${baseUrl}/api/learning/lesson/${levelTwo._id}/alphabet-progress`,
      { headers: authHeaders }
    );
    assert.equal(wrongLesson.status, 400, 'The alphabet progress API is limited to ASL Level 1');
    await wrongLesson.text();

    const persisted = await Account.findById(account._id);
    assert.equal(persisted.aslAlphabetProgress.length, 1);
    assert.equal(persisted.xp, 0, 'Alphabet practice must never award XP');
    assert.equal(persisted.completedLessons.length, 0);
    assert.equal(persisted.lessonStageProgress.length, 0);

    const firstGrant = await awardFirstPassXp({
      userId: account._id,
      lessonId: levelOne._id,
      amount: levelOne.xpReward,
      attemptId: new mongoose.Types.ObjectId()
    });
    assert.equal(firstGrant.xpAwarded, levelOne.xpReward);
    const secondGrant = await awardFirstPassXp({
      userId: account._id,
      lessonId: levelOne._id,
      amount: levelOne.xpReward,
      attemptId: new mongoose.Types.ObjectId()
    });
    assert.equal(secondGrant.xpAwarded, 0, 'Existing XP idempotency must remain intact');

    const otherAfter = await Account.findById(otherAccount._id);
    assert.equal(otherAfter.xp, 0);
    assert.equal(otherAfter.aslAlphabetProgress.length, 0);
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

test('7. Phase 4.2 curriculum is complete, sourced, and question-quality checked', () => {
  assert.equal(aslPhase42Lessons.length, 10);
  assert.equal(aslPhase42Quizzes.length, 10);

  aslPhase42Lessons.forEach((enrichment, index) => {
    const level = index + 1;
    assert.equal(enrichment.stableKey, aslLessons[index].stableKey);
    assert.equal(enrichment.level, level);

    const keys = enrichment.contentBlocks.map(block => block.data?.enrichmentKey);
    assert.deepEqual(keys.slice().sort(), ASL42_ENRICHMENT_KEYS.slice().sort());

    const stages = new Set(enrichment.contentBlocks.map(block => block.data?.stage));
    ['LEARN', 'GUIDED_PRACTICE', 'PRACTICE_CHALLENGE', 'REVISION'].forEach(stage => {
      assert.ok(stages.has(stage), `Phase 4.2 level ${level} must teach ${stage}`);
    });

    const find = key => enrichment.contentBlocks.find(block => block.data?.enrichmentKey === key);
    const objectives = find('asl42_objectives').data.items;
    const vocabulary = find('asl42_vocabulary').data.terms;
    const signs = find('asl42_sign_parameters').data.signs;
    const markers = find('asl42_nonmanual_markers').data.markers;
    const examples = find('asl42_examples').data.examples;
    const references = find('asl42_sources').data.references;
    const revision = find('asl42_revision_checklist').data.items;

    assert.ok(objectives.length >= 3 && objectives.every(item => item.text && item.success));
    assert.ok(vocabulary.length >= 3 && vocabulary.every(item => item.term.length > 2 && item.context.length > 10));
    assert.ok(signs.length > 0);
    signs.forEach(sign => {
      ['handshape', 'palmOrientation', 'movement', 'nonManualMarkers', 'commonMistake', 'source'].forEach(field => {
        assert.ok(sign[field] && sign[field].length > 8, `Level ${level} sign ${sign.label} needs ${field}`);
      });
      assert.ok(
        ['WRITTEN_REFERENCE', 'LINKED_REFERENCE / REQUIRES_VIDEO_REVIEW'].includes(sign.verification),
        `Level ${level} sign ${sign.label} needs honest verification status`
      );
    });
    assert.ok(markers.length >= 3 && markers.every(marker => marker.cue && marker.use && marker.example && marker.caution));
    assert.ok(examples.length >= 3 && examples.every(example => example.situation && example.gloss && example.meaning && example.tip));
    assert.ok(revision.length >= 4 && revision.every(item => item.text && item.detail));

    references.forEach(reference => {
      assert.ok(reference.name && reference.url);
      assert.ok(reference.url.startsWith('https://'), `Source must use HTTPS on level ${level}`);
      assert.ok(
        reference.url.includes('lifeprint.com') || reference.url.includes('gallaudet.edu'),
        `Source must be credible on level ${level}: ${reference.url}`
      );
    });

    const exerciseBlocks = enrichment.contentBlocks.filter(
      block => Array.isArray(block.data?.exercises)
    );
    assert.equal(exerciseBlocks.length, 3);
    const exercises = exerciseBlocks.flatMap(block => block.data.exercises);
    assert.ok(exercises.length >= 9);
    exercises.forEach(exercise => {
      assert.ok(exercise.prompt.length > 15);
      assert.ok(Array.isArray(exercise.options) && exercise.options.length >= 3);
      assert.equal(new Set(exercise.options).size, exercise.options.length, 'Distractors must be unique');
      assert.ok(Number.isInteger(exercise.answer));
      assert.ok(exercise.answer >= 0 && exercise.answer < exercise.options.length);
      assert.ok(exercise.hint && exercise.feedback);
    });
    assert.ok(exercises.some(exercise => exercise.answer !== 0), 'Answer positions must not all be index 0');

    const quiz = aslPhase42Quizzes[index];
    assert.equal(quiz.stableKey, enrichment.stableKey);
    assert.ok(quiz.questions.length >= 5);
    const types = new Set(quiz.questions.map(question => question.type));
    ['MULTIPLE_CHOICE', 'MATCHING', 'FILL_BLANK'].forEach(type => assert.ok(types.has(type)));
    assert.ok(!types.has('SIGN_PRACTICE'));

    quiz.questions.forEach(question => {
      assert.ok(question.prompt.length > 15);
      assert.ok(question.explanation && question.explanation.length > 30, 'Every question needs a teaching explanation');
      if (question.type === 'MULTIPLE_CHOICE') {
        assert.equal(new Set(question.options).size, question.options.length);
        assert.ok(question.options.length >= 3);
        assert.ok(question.correct >= 0 && question.correct < question.options.length);
      }
      if (question.type === 'MATCHING') {
        const leftIds = question.matchingPairs.map(pair => pair.leftId);
        const rightIds = question.matchingPairs.map(pair => pair.rightId);
        assert.ok(question.matchingPairs.length >= 3);
        assert.equal(new Set(leftIds).size, leftIds.length);
        assert.equal(new Set(rightIds).size, rightIds.length);
        assert.ok(question.matchingPairs.every(pair => pair.left && pair.right));
      }
      if (question.type === 'FILL_BLANK') {
        assert.match(question.blankText, /____/);
        assert.ok(question.acceptedAnswers.length >= 1);
      }
    });

    assert.equal(Object.keys(aslPhase42BaseExplanations[enrichment.stableKey] || {}).length, 8);
  });

  const allMultipleChoice = aslPhase42Quizzes.flatMap(quiz =>
    quiz.questions.filter(question => question.type === 'MULTIPLE_CHOICE')
  );
  assert.ok(new Set(allMultipleChoice.map(question => question.correct)).size >= 3, 'Correct options should be varied');
});

test('8. Phase 4.2 question types sanitize cleanly and grade authoritatively', () => {
  aslPhase42Quizzes.forEach(quiz => {
    const sanitized = sanitizeQuiz(quiz);
    sanitized.questions.forEach(question => {
      assert.equal(question.correct, undefined);
      assert.equal(question.acceptedAnswers, undefined);
      assert.equal(question.matchingPairs, undefined);
    });

    const perfectAnswers = quiz.questions.map(question => {
      if (question.type === 'MULTIPLE_CHOICE') return question.correct;
      if (question.type === 'MATCHING') {
        return question.matchingPairs.map(pair => ({ leftId: pair.leftId, rightId: pair.rightId }));
      }
      return question.acceptedAnswers[0];
    });
    const perfect = gradeQuiz(quiz, perfectAnswers);
    assert.equal(perfect.percentage, 100, `Perfect answer key should pass ${quiz.stableKey}`);
    const empty = gradeQuiz(quiz, []);
    assert.equal(empty.percentage, 0);
    assert.equal(empty.passed, false);
  });

  const matching = aslPhase42Quizzes[0].questions.find(question => question.type === 'MATCHING');
  const wrongMatch = gradeQuestion(matching, matching.matchingPairs.map(pair => ({
    leftId: pair.leftId,
    rightId: matching.matchingPairs.find(candidate => candidate.leftId !== pair.leftId).rightId
  })));
  assert.equal(wrongMatch.isCorrect, false);
  assert.equal(wrongMatch.reason, 'INCORRECT_MATCH');

  const fill = aslPhase42Quizzes[0].questions.find(question => question.type === 'FILL_BLANK');
  assert.equal(gradeQuestion(fill, `  ${fill.acceptedAnswers[0].toUpperCase()}  `).isCorrect, true);
  assert.equal(gradeQuestion({ type: 'SIGN_PRACTICE' }, {}).reason, 'SIGN_INFERENCE_UNAVAILABLE');
});

test('9. Phase 4.2 seed backfill is idempotent and preserves editorial work and progress', { timeout: 30000 }, async t => {
  let testUri;
  try {
    const configured = new URL(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/beyond-words');
    configured.pathname = '/beyondwords_phase42_test';
    configured.search = '';
    testUri = configured.toString();
  } catch {
    testUri = 'mongodb://127.0.0.1:27017/beyondwords_phase42_test';
  }

  try {
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 2000 });
  } catch (error) {
    t.skip(`MongoDB integration unavailable: ${error.message}`);
    return;
  }

  try {
    await mongoose.connection.dropDatabase();

    const first = await seedDB({ log: false });
    assert.equal(first.lessonsCreated, 23);
    assert.equal(first.quizzesCreated, 23);
    assert.equal(first.aslEnrichmentBlocksAdded, 110);
    assert.equal(first.aslEnrichmentQuestionsAdded, 50);
    assert.equal(first.aslExplanationsImproved, 80);
    assert.equal(first.lessonsUpdated, 10);

    const lessonOne = await Lesson.findOne({ stableKey: 'asl_level_01' });
    const lessonTwo = await Lesson.findOne({ stableKey: 'asl_level_02' });
    const germanLesson = await Lesson.findOne({ academy: 'GERMAN', level: 1 });
    const nuanceLesson = await Lesson.findOne({ academy: 'NUANCE_GAME', level: 1 });
    assert.ok(lessonOne && lessonTwo && germanLesson && nuanceLesson);

    const lessonIds = [lessonOne._id, lessonTwo._id, germanLesson._id, nuanceLesson._id].map(String);
    const quizzes = await Quiz.find({ lessonId: { $in: lessonIds } });
    const quizIds = quizzes.map(quiz => String(quiz._id));
    const oneQuiz = quizzes.find(quiz => String(quiz.lessonId) === String(lessonOne._id));
    assert.ok(oneQuiz);
    assert.equal(
      oneQuiz.questions.filter(question => aslPhase42Quizzes[0].questions.some(q => q.prompt === question.prompt)).length,
      aslPhase42Quizzes[0].questions.length
    );
    for (const question of oneQuiz.questions) {
      if (aslPhase42BaseExplanations.asl_level_01[question.prompt]) {
        assert.equal(question.explanation, aslPhase42BaseExplanations.asl_level_01[question.prompt]);
      }
    }

    const account = await Account.create({
      userName: 'phase42-seed-test',
      email: 'phase42-seed-test@example.com',
      password: 'local-test-password',
      xp: 275,
      aslAlphabetProgress: [{
        lessonId: lessonOne._id,
        studiedLetters: ['J', 'Z'],
        completedActivities: ['LETTER_IDENTIFICATION'],
        challenge: { attempts: 2, bestCorrect: 24, lastCorrect: 2, lastTotal: 2, missedLetters: ['J', 'Z'] }
      }],
      completedLessons: [{ lessonId: lessonOne._id, status: 'PASSED', score: 100 }],
      lessonStageProgress: [{ lessonId: lessonOne._id, completedStages: ['LEARN', 'GUIDED_PRACTICE'] }]
    });

    const baseBlock = lessonOne.contentBlocks.find(block => block.type === 'CONCEPT_INTRO');
    baseBlock.data.body = 'Editorial body that must survive reseeding.';
    const enrichedBlock = lessonOne.contentBlocks.find(
      block => block.data?.enrichmentKey === 'asl42_objectives'
    );
    enrichedBlock.data.title = 'Editorial objectives title.';
    lessonOne.markModified('contentBlocks');
    await lessonOne.save();

    const editorialQuestion = oneQuiz.questions.find(
      question => question.prompt === 'Which letter is made with an L-shaped thumb and index?'
    );
    editorialQuestion.explanation = 'Editorial explanation that must survive reseeding.';
    oneQuiz.markModified('questions');
    await oneQuiz.save();

    const second = await seedDB({ log: false });
    assert.equal(second.lessonsCreated, 0);
    assert.equal(second.quizzesCreated, 0);
    assert.equal(second.aslEnrichmentBlocksAdded, 0);
    assert.equal(second.aslEnrichmentQuestionsAdded, 0);
    assert.equal(second.aslExplanationsImproved, 0);
    assert.equal(second.lessonsUpdated, 0);

    const reloadedLesson = await Lesson.findOne({ stableKey: 'asl_level_01' });
    assert.equal(String(reloadedLesson._id), String(lessonOne._id));
    assert.equal(
      reloadedLesson.contentBlocks.find(block => block.type === 'CONCEPT_INTRO').data.body,
      'Editorial body that must survive reseeding.'
    );
    assert.equal(
      reloadedLesson.contentBlocks.find(block => block.data?.enrichmentKey === 'asl42_objectives').data.title,
      'Editorial objectives title.'
    );

    const reloadedQuiz = await Quiz.findOne({ _id: oneQuiz._id });
    assert.equal(
      reloadedQuiz.questions.find(question => question.prompt === editorialQuestion.prompt).explanation,
      'Editorial explanation that must survive reseeding.'
    );
    assert.deepEqual(
      (await Quiz.find({ lessonId: { $in: lessonIds } })).map(quiz => String(quiz._id)).sort(),
      quizIds.slice().sort()
    );
    assert.equal(await Lesson.countDocuments({ academy: 'SIGN_LANGUAGE' }), 10);
    assert.equal(await Lesson.countDocuments({ academy: 'GERMAN' }), 10);
    assert.equal(await Lesson.countDocuments({ academy: 'NUANCE_GAME' }), 3);

    const preservedAccount = await Account.findById(account._id);
    assert.equal(preservedAccount.xp, 275);
    assert.equal(preservedAccount.completedLessons.length, 1);
    assert.equal(preservedAccount.lessonStageProgress.length, 1);
    assert.equal(preservedAccount.aslAlphabetProgress.length, 1);
    assert.deepEqual(preservedAccount.aslAlphabetProgress[0].studiedLetters, ['J', 'Z']);
    assert.equal(preservedAccount.aslAlphabetProgress[0].challenge.bestCorrect, 24);
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
