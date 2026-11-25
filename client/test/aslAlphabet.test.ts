import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALPHABET,
  createChallengeQuestions,
  createIdentificationQuestions,
  createRevisionQuestions,
  emptyAlphabetProgress,
  getAlphabetCoverage,
  getAlphabetStats,
  gradeQuestion,
  isMovementLetter,
  mergeAlphabetProgress,
  navigateLetter,
  normalizeLetters,
  summarizeChallenge,
  type AlphabetLetter
} from '../client/src/lib/aslAlphabet';

const makeLetters = (): AlphabetLetter[] =>
  ALPHABET.map(letter => ({
    letter,
    handshape: `Handshape cue for ${letter}`,
    identification: `Identification cue for ${letter}`,
    orientation: 'Palm and fingers aligned for the reference handshape.',
    movement:
      letter === 'J'
        ? 'Trace a J-shaped curve in the air with the little fingertip.'
        : letter === 'Z'
          ? 'Trace a Z in the air: across, diagonal back, then across again.'
          : 'Hold the handshape steady; this letter does not add a tracing movement.',
    tip: `Learning tip for ${letter}`,
    commonMistake: `Common mistake for ${letter}`,
    demonstration: {
      status: 'LINKED_REFERENCE',
      label: `Verified ${letter} handshape reference`,
      referenceUrl: 'https://www.lifeprint.com/asl101/fingerspelling/abc.htm'
    }
  }));

const seededRandom = (initialSeed: number) => {
  let seed = initialSeed >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
};

test('the classroom exposes all 26 letters in A-Z order', () => {
  const letters = normalizeLetters(makeLetters().reverse());
  assert.deepEqual(
    letters.map(letter => letter.letter),
    ALPHABET
  );
  assert.deepEqual(getAlphabetCoverage(letters), {
    available: ALPHABET,
    missing: [],
    total: 26,
    isComplete: true
  });
});

test('selection and previous/next navigation jump correctly across J and Z', () => {
  const letters = makeLetters();
  assert.equal(navigateLetter(letters, 'A', 1), 'B');
  assert.equal(navigateLetter(letters, 'I', 1), 'J');
  assert.equal(navigateLetter(letters, 'Y', 1), 'Z');
  assert.equal(navigateLetter(letters, 'Z', 1), 'A');
  assert.equal(navigateLetter(letters, 'A', -1), 'Z');
  assert.equal(navigateLetter(letters, 'J', -1), 'I');
  assert.equal(navigateLetter([], 'A', 1), null);
});

test('J and Z retain their movement guidance; static letters do not', () => {
  const letters = makeLetters();
  assert.equal(isMovementLetter(letters.find(letter => letter.letter === 'J')!), true);
  assert.equal(isMovementLetter(letters.find(letter => letter.letter === 'Z')!), true);
  assert.equal(isMovementLetter(letters.find(letter => letter.letter === 'A')!), false);
  assert.match(letters.find(letter => letter.letter === 'Z')!.movement || '', /across/);
});

test('progress tracking is additive and activity completion is monotonic', () => {
  const first = mergeAlphabetProgress(emptyAlphabetProgress(), {
    studiedLetters: ['A', 'C'],
    completedActivities: ['LETTER_IDENTIFICATION']
  });
  const second = mergeAlphabetProgress(first, {
    studiedLetters: ['A', 'B'],
    completedActivities: ['LETTER_IDENTIFICATION', 'REVISION']
  });

  assert.deepEqual(second.studiedLetters, ['A', 'B', 'C']);
  assert.deepEqual(second.completedActivities, ['LETTER_IDENTIFICATION', 'REVISION']);
  assert.equal(getAlphabetStats(second).studied, 3);
});

test('the alphabet challenge covers all 26 letters and randomizes order', () => {
  const letters = makeLetters();
  const first = createChallengeQuestions(letters, seededRandom(42));
  const second = createChallengeQuestions(letters, seededRandom(42));
  const third = createChallengeQuestions(letters, seededRandom(7));

  assert.equal(first.length, 26);
  assert.deepEqual(
    first.map(question => question.correctLetter).sort(),
    ALPHABET
  );
  assert.deepEqual(
    first.map(question => question.correctLetter),
    second.map(question => question.correctLetter)
  );
  assert.notDeepEqual(
    first.map(question => question.correctLetter),
    third.map(question => question.correctLetter)
  );
  assert.ok(first.every(question => question.options.includes(question.correctLetter)));
});

test('incorrect answers produce clear corrective feedback', () => {
  const question = createChallengeQuestions(makeLetters(), seededRandom(1), ['A'])[0];
  const wrongLetter = ALPHABET.find(letter => letter !== question.correctLetter)!;
  const graded = gradeQuestion(question, wrongLetter);

  assert.equal(graded.correct, false);
  assert.equal(graded.selectedLetter, wrongLetter);
  assert.match(graded.feedback, new RegExp(`correct letter is ${question.correctLetter}`));
  assert.equal(graded.explanation, question.explanation);
});

test('challenge summaries track mistakes and support focused retries', () => {
  const letters = makeLetters();
  const questions = createChallengeQuestions(letters, seededRandom(11));
  const answers: Record<string, string> = {};
  questions.forEach((question, index) => {
    answers[question.letter] = index === 0
      ? ALPHABET.find(letter => letter !== question.letter)!
      : question.letter;
  });

  const summary = summarizeChallenge(questions, answers);
  assert.equal(summary.total, 26);
  assert.equal(summary.answered, 26);
  assert.equal(summary.correct, 25);
  assert.equal(summary.incorrect, 1);
  assert.equal(summary.complete, true);
  assert.equal(summary.missedLetters.length, 1);

  const retry = createChallengeQuestions(letters, seededRandom(3), summary.missedLetters);
  assert.equal(retry.length, 1);
  assert.equal(retry[0].correctLetter, summary.missedLetters[0]);
});

test('identification and revision questions only use curriculum-backed letters', () => {
  const letters = makeLetters();
  const identification = createIdentificationQuestions(letters, seededRandom(9), 6);
  assert.equal(identification.length, 6);
  assert.ok(identification.every(question => question.cue.includes('Handshape cue for')));

  const revision = createRevisionQuestions(letters, ['J', 'Z'], seededRandom(5));
  assert.deepEqual(
    revision.map(question => question.letter).sort(),
    ['J', 'Z']
  );
  assert.ok(revision.every(question => question.movementFocus));
});

test('challenge results improve best score only on a full 26-letter run', () => {
  const partial = mergeAlphabetProgress(emptyAlphabetProgress(), {
    completedActivities: ['ALPHABET_CHALLENGE'],
    challenge: { lastCorrect: 5, lastTotal: 5, missedLetters: [] }
  });
  assert.equal(partial.challenge.bestTotal, 0);

  const full = mergeAlphabetProgress(partial, {
    challenge: { lastCorrect: 23, lastTotal: 26, missedLetters: ['J', 'Z', 'Q'] }
  });
  assert.equal(full.challenge.attempts, 2);
  assert.equal(full.challenge.bestCorrect, 23);
  assert.equal(full.challenge.bestTotal, 26);
  assert.deepEqual(full.challenge.missedLetters, ['J', 'Q', 'Z']);

  assert.throws(
    () => mergeAlphabetProgress(full, {
      challenge: { lastCorrect: 27, lastTotal: 26, missedLetters: [] }
    }),
    /INVALID_ALPHABET_CHALLENGE/
  );
});
