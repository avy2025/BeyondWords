/**
 * Pure helpers for the ASL Level 1 alphabet classroom.
 *
 * All prompts come from the server-provided curriculum. These helpers never
 * generate handshape descriptions or pretend that the webcam/AI service can
 * recognise fingerspelling.
 */

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const ALPHABET_ACTIVITIES = [
  'LETTER_IDENTIFICATION',
  'ALPHABET_CHALLENGE',
  'REVISION'
] as const;

export type AlphabetActivity = (typeof ALPHABET_ACTIVITIES)[number];

export interface AlphabetLetter {
  letter: string;
  handshape: string;
  identification: string;
  orientation?: string;
  movement?: string;
  tip?: string;
  commonMistake: string;
  demonstration?: {
    status?: string;
    label?: string;
    referenceUrl?: string;
    description?: string;
  };
}

export interface AlphabetChallengeProgress {
  attempts: number;
  bestCorrect: number;
  bestTotal: number;
  lastCorrect: number;
  lastTotal: number;
  missedLetters: string[];
  updatedAt?: string | null;
}

export interface AlphabetProgress {
  studiedLetters: string[];
  completedActivities: AlphabetActivity[];
  challenge: AlphabetChallengeProgress;
  updatedAt?: string | null;
}

export interface AlphabetProgressPatch {
  studiedLetters?: string[];
  completedActivities?: AlphabetActivity[];
  challenge?: {
    lastCorrect: number;
    lastTotal: number;
    missedLetters: string[];
  };
}

export interface AlphabetQuestion {
  id: string;
  letter: string;
  cue: string;
  prompt: string;
  options: string[];
  correctLetter: string;
  explanation: string;
  referenceUrl?: string;
  referenceLabel?: string;
  movementFocus?: boolean;
}

export interface GradedAnswer {
  answered: boolean;
  correct: boolean;
  selectedLetter: string | null;
  correctLetter: string;
  feedback: string;
  explanation: string;
}

export interface ChallengeSummary {
  total: number;
  answered: number;
  correct: number;
  incorrect: number;
  missedLetters: string[];
  complete: boolean;
  perfect: boolean;
  percentage: number;
}

type RandomSource = () => number;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

const sortLetters = (letters: string[]): string[] =>
  ALPHABET.filter(letter => letters.includes(letter));

export const emptyAlphabetProgress = (): AlphabetProgress => ({
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

/** Keep only well-formed curriculum letters, in A–Z order, without duplicates. */
export const normalizeLetters = (letters: unknown): AlphabetLetter[] => {
  if (!Array.isArray(letters)) return [];

  const byLetter = new Map<string, AlphabetLetter>();
  for (const item of letters) {
    if (!isRecord(item)) continue;
    const letter = asString(item.letter).toUpperCase();
    if (!ALPHABET.includes(letter) || byLetter.has(letter)) continue;

    const demonstration = isRecord(item.demonstration) ? item.demonstration : {};
    byLetter.set(letter, {
      letter,
      handshape: asString(item.handshape),
      identification: asString(item.identification),
      orientation: asString(item.orientation) || undefined,
      movement: asString(item.movement) || undefined,
      tip: asString(item.tip) || undefined,
      commonMistake: asString(item.commonMistake),
      demonstration: {
        status: asString(demonstration.status) || undefined,
        label: asString(demonstration.label) || undefined,
        referenceUrl: asString(demonstration.referenceUrl) || undefined,
        description: asString(demonstration.description) || undefined
      }
    });
  }

  return ALPHABET.map(letter => byLetter.get(letter)).filter(
    (letter): letter is AlphabetLetter => Boolean(letter)
  );
};

export const getAlphabetCoverage = (letters: AlphabetLetter[]) => {
  const available = sortLetters(letters.map(letter => letter.letter));
  return {
    available,
    missing: ALPHABET.filter(letter => !available.includes(letter)),
    total: available.length,
    isComplete: available.length === ALPHABET.length
  };
};

export const findLetter = (letters: AlphabetLetter[], letter: string): AlphabetLetter | null =>
  letters.find(entry => entry.letter === letter) || null;

/** Move through the selector with wrap-around at A and Z. */
export const navigateLetter = (
  letters: AlphabetLetter[],
  currentLetter: string,
  direction: 1 | -1
): string | null => {
  if (letters.length === 0) return null;
  const currentIndex = letters.findIndex(letter => letter.letter === currentLetter);
  if (currentIndex === -1) return direction === 1 ? letters[0].letter : letters[letters.length - 1].letter;
  const nextIndex = (currentIndex + direction + letters.length) % letters.length;
  return letters[nextIndex].letter;
};

export const isMovementLetter = (letter: AlphabetLetter): boolean => {
  const movement = letter.movement || '';
  return movement.trim().length > 0 && !/does not add a tracing movement/i.test(movement);
};

const shuffle = <T>(items: T[], rng: RandomSource): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const sanitizeLetterCodes = (letters: unknown): string[] => {
  if (!Array.isArray(letters)) return [];
  return sortLetters(
    letters
      .filter((letter): letter is string => typeof letter === 'string')
      .map(letter => letter.toUpperCase())
  );
};

const buildQuestion = (
  entry: AlphabetLetter,
  pool: AlphabetLetter[],
  rng: RandomSource,
  idPrefix: string,
  cueLabel: string
): AlphabetQuestion => {
  const distractors = shuffle(
    pool.filter(candidate => candidate.letter !== entry.letter),
    rng
  ).slice(0, 3).map(candidate => candidate.letter);
  const explanation = [entry.identification, entry.tip]
    .filter(Boolean)
    .join(' ')
    .trim();
  const movementFocus = isMovementLetter(entry);

  return {
    id: `${idPrefix}-${entry.letter}`,
    letter: entry.letter,
    cue: `${cueLabel}: ${entry.handshape}`,
    prompt: movementFocus
      ? 'Which letter is described? (This handshape includes movement.)'
      : 'Which letter is described?',
    options: shuffle([entry.letter, ...distractors], rng),
    correctLetter: entry.letter,
    explanation: explanation || 'Compare this description with the linked ASL University reference.',
    referenceUrl: entry.demonstration?.referenceUrl,
    referenceLabel: entry.demonstration?.label,
    movementFocus
  };
};

/** A short, server-curriculum-backed identification set for guided practice. */
export const createIdentificationQuestions = (
  letters: AlphabetLetter[],
  rng: RandomSource = Math.random,
  count = 6
): AlphabetQuestion[] =>
  shuffle(letters, rng)
    .slice(0, Math.max(0, count))
    .map(entry => buildQuestion(entry, letters, rng, 'identify', 'HANDSHAPE CUE'));

/** A full 26-letter randomized challenge, or a focused retry of missed letters. */
export const createChallengeQuestions = (
  letters: AlphabetLetter[],
  rng: RandomSource = Math.random,
  retryLetters: string[] = []
): AlphabetQuestion[] => {
  const retryPool = sanitizeLetterCodes(retryLetters);
  const pool = retryPool.length > 0
    ? letters.filter(entry => retryPool.includes(entry.letter))
    : letters;
  return shuffle(pool, rng).map(entry =>
    buildQuestion(entry, letters, rng, 'challenge', 'IDENTIFICATION CUE')
  );
};

/** Revision questions are drawn only from letters the learner has studied. */
export const createRevisionQuestions = (
  letters: AlphabetLetter[],
  studiedLetters: string[],
  rng: RandomSource = Math.random
): AlphabetQuestion[] => {
  const studied = sanitizeLetterCodes(studiedLetters);
  return shuffle(
    letters.filter(entry => studied.includes(entry.letter)),
    rng
  ).map(entry => buildQuestion(entry, letters, rng, 'revise', 'REVIEW CUE'));
};

export const gradeQuestion = (
  question: AlphabetQuestion,
  selectedLetter: string | null | undefined
): GradedAnswer => {
  const answered = Boolean(selectedLetter);
  const correct = selectedLetter === question.correctLetter;
  const explanation = question.explanation;
  const feedback = !answered
    ? 'Choose a letter to check your answer.'
    : correct
      ? `Correct — ${question.correctLetter}. ${explanation}`
      : `Not quite. The correct letter is ${question.correctLetter}. ${explanation}`;

  return {
    answered,
    correct,
    selectedLetter: selectedLetter || null,
    correctLetter: question.correctLetter,
    feedback,
    explanation
  };
};

export const summarizeChallenge = (
  questions: AlphabetQuestion[],
  answers: Record<string, string | undefined>
): ChallengeSummary => {
  const graded = questions.map(question => gradeQuestion(question, answers[question.letter]));
  const correct = graded.filter(result => result.correct).length;
  const answered = graded.filter(result => result.answered).length;
  const missedLetters = sortLetters(
    questions
      .filter(question => !gradeQuestion(question, answers[question.letter]).correct)
      .map(question => question.letter)
  );

  return {
    total: questions.length,
    answered,
    correct,
    incorrect: questions.length - correct,
    missedLetters,
    complete: questions.length > 0 && answered === questions.length,
    perfect: questions.length > 0 && correct === questions.length,
    percentage: questions.length === 0 ? 0 : Math.round((correct / questions.length) * 100)
  };
};

/**
 * Local mirror of the server's monotonic merge. The server remains the source
 * of truth; this keeps the UI consistent while a save is in flight.
 */
export const mergeAlphabetProgress = (
  existing: AlphabetProgress,
  patch: AlphabetProgressPatch
): AlphabetProgress => {
  const current = existing || emptyAlphabetProgress();
  const studiedLetters = sortLetters([
    ...current.studiedLetters,
    ...sanitizeLetterCodes(patch.studiedLetters)
  ]);
  const completedActivities = ALPHABET_ACTIVITIES.filter(activity =>
    (current.completedActivities || []).includes(activity) ||
    (patch.completedActivities || []).includes(activity)
  );

  const challenge = { ...current.challenge, missedLetters: [...current.challenge.missedLetters] };
  if (patch.challenge) {
    const { lastCorrect, lastTotal, missedLetters } = patch.challenge;
    if (
      !Number.isInteger(lastCorrect) || !Number.isInteger(lastTotal) ||
      lastTotal < 0 || lastTotal > ALPHABET.length || lastCorrect < 0 || lastCorrect > lastTotal
    ) {
      throw new Error('INVALID_ALPHABET_CHALLENGE');
    }
    const fullChallenge = lastTotal === ALPHABET.length;
    challenge.attempts += 1;
    challenge.lastCorrect = lastCorrect;
    challenge.lastTotal = lastTotal;
    challenge.missedLetters = sanitizeLetterCodes(missedLetters);
    challenge.bestCorrect = fullChallenge
      ? Math.max(challenge.bestCorrect, lastCorrect)
      : challenge.bestCorrect;
    challenge.bestTotal = fullChallenge ? ALPHABET.length : challenge.bestTotal;
    challenge.updatedAt = new Date().toISOString();
  }

  return {
    studiedLetters,
    completedActivities,
    challenge,
    updatedAt: new Date().toISOString()
  };
};

export const getAlphabetStats = (progress: AlphabetProgress) => {
  const studied = sortLetters(progress?.studiedLetters || []).length;
  return {
    studied,
    total: ALPHABET.length,
    percentage: Math.round((studied / ALPHABET.length) * 100),
    activitiesCompleted: (progress?.completedActivities || []).length,
    challengeAttempts: progress?.challenge?.attempts || 0,
    bestScore:
      progress?.challenge?.bestTotal === ALPHABET.length
        ? `${progress.challenge.bestCorrect}/${ALPHABET.length}`
        : 'Not completed yet'
  };
};
