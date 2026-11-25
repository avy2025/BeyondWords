/**
 * Phase 4.3 learning-experience helpers for the ASL Academy.
 *
 * Everything here is derived from content that is already supplied by the
 * server curriculum. No sign description, hand image, or movement is invented,
 * and no XP/assessment state is created. These helpers only power practice UI.
 */

export interface CurriculumBlock {
  type?: string;
  data?: {
    stage?: string;
    enrichmentKey?: string;
    title?: string;
    body?: string;
    notice?: string;
    visualNotice?: string;
    terms?: Array<{ term?: string; context?: string }>;
    signs?: Array<{
      label?: string;
      handshape?: string;
      palmOrientation?: string;
      movement?: string;
      nonManualMarkers?: string;
      commonMistake?: string;
      source?: string;
      verification?: string;
    }>;
    markers?: Array<{ cue?: string; use?: string; example?: string; caution?: string }>;
    examples?: Array<{ situation?: string; gloss?: string; meaning?: string; tip?: string }>;
    references?: Array<{ name?: string; url?: string; note?: string }>;
    exercises?: Array<{
      prompt?: string;
      options?: string[];
      answer?: number;
      hint?: string;
      feedback?: string;
    }>;
    [key: string]: unknown;
  };
}

export interface VocabularyReference {
  label: string;
  url?: string;
  verification?: string;
  note?: string;
}

export interface VocabularyCard {
  id: string;
  term: string;
  meaning: string;
  explanation: string;
  handshape: string;
  palmOrientation: string;
  movement: string;
  nonManualMarkers: string;
  example: string;
  commonMistake: string;
  reference: VocabularyReference;
  visualNotice: string;
  levelKey: string;
}

export type PracticeKind =
  | 'MATCHING'
  | 'MULTIPLE_CHOICE'
  | 'FILL_BLANK'
  | 'CONTEXT_CHOICE'
  | 'ORDERING';

export interface PracticeItem {
  id: string;
  text: string;
  explanation?: string;
}

export interface PracticeMatchingPair {
  leftId: string;
  rightId: string;
  explanation?: string;
}

export interface PracticeActivity {
  id: string;
  kind: PracticeKind;
  levelKey: string;
  conceptIds: string[];
  prompt: string;
  instruction?: string;
  hint?: string;
  explanation: string;
  options?: PracticeItem[];
  correctOptionId?: string;
  leftItems?: PracticeItem[];
  rightItems?: PracticeItem[];
  expectedPairs?: PracticeMatchingPair[];
  blankText?: string;
  acceptedAnswers?: string[];
  steps?: PracticeItem[];
  correctOrder?: string[];
  reference?: VocabularyReference;
  sourceLabel?: string;
  practiceOnly: true;
}

export type PracticeAnswer = number | string | PracticeMatchingPair[] | string[] | null;

export interface PracticeGrade {
  answered: boolean;
  correct: boolean;
  feedback: string;
  explanation: string;
  missedConceptIds: string[];
}

export interface PracticeRecord {
  activityId: string;
  conceptIds: string[];
  correct: boolean;
  attempts: number;
  lastCorrect: boolean;
  updatedAt: string;
}

export interface PracticeJournal {
  records: Record<string, PracticeRecord>;
  revisionMarks: string[];
  updatedAt: string | null;
}

type RandomSource = () => number;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const unique = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)));

const truncate = (value: string, max = 92): string =>
  value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;

export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic PRNG so a level + seed always produces the same exercise set. */
export function seededRandom(seed: number | string): RandomSource {
  let state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], rng: RandomSource): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

const STOP_WORDS = new Set([
  'asl',
  'university',
  'introduction',
  'lesson',
  'lessons',
  'video',
  'videos',
  'page',
  'pages',
  'guidance',
  'common',
  'sentence',
  'sentences',
  'types',
  'overview',
  'and',
  'the'
]);

/**
 * Match a written source note from the curriculum to one of that level's
 * already-vetted reference URLs. No URL is guessed when no match is found.
 */
export function findReferenceForSource(
  source: string,
  references: Array<{ name?: string; url?: string }>
): { name?: string; url?: string } | null {
  if (!references.length) return null;
  const tokens = unique(
    source
      .toLowerCase()
      .split(/[^a-z0-9–-]+/)
      .filter(token => token.length > 2 && !STOP_WORDS.has(token))
  );
  const gallaudet = /gallaudet/i.test(source);

  let best: { name?: string; url?: string } | null = null;
  let bestScore = 0;
  for (const reference of references) {
    const name = text(reference.name).toLowerCase();
    const score = tokens.reduce((total, token) => total + (name.includes(token) ? token.length : 0), 0);
    const gallaudetBonus = gallaudet && /gallaudet/.test(name) ? 20 : 0;
    const total = score + gallaudetBonus;
    if (total > bestScore && text(reference.url).startsWith('https://')) {
      best = reference;
      bestScore = total;
    }
  }
  return best;
}

const blockData = (block: CurriculumBlock) => block.data || {};

const findBlock = (blocks: CurriculumBlock[], predicate: (data: NonNullable<CurriculumBlock['data']>) => boolean) =>
  blocks.find(block => predicate(blockData(block)));

export function buildVocabularyCards(blocks: CurriculumBlock[], levelKey: string): VocabularyCard[] {
  const data = blocks.map(blockData);
  const terms = data.flatMap(entry => entry.terms || []);
  const signs = data.flatMap(entry => entry.signs || []);
  const examples = data.flatMap(entry => entry.examples || []);
  const references = data.flatMap(entry => entry.references || []).filter(entry => text(entry.url));
  const notes = findBlock(blocks, entry => Array.isArray(entry.signs));
  const visualNotice =
    text(blockData(notes || {}).visualNotice) ||
    text(blockData(notes || {}).notice) ||
    'Open the linked educational reference for the visual demonstration. Written notes support, but do not replace, seeing the sign.';

  return signs
    .filter(sign => text(sign.label))
    .map((sign, index) => {
      const label = text(sign.label);
      const labelTokens = unique(
        label
          .toUpperCase()
          .split(/[^A-Z0-9]+/)
          .filter(token => token.length <= 3)
      );
      const matchingExample = examples.find(example => {
        const gloss = text(example.gloss).toUpperCase();
        return labelTokens.some(token => gloss.includes(token));
      });
      const fallbackExample = examples[0];
      const example = matchingExample || fallbackExample;
      const matchedReference = findReferenceForSource(text(sign.source), references);
      const generalReference = references.find(entry => text(entry.url).startsWith('https://'));
      const referenceLabel = text(sign.source) || 'Lesson reference list';
      const reference: VocabularyReference = {
        label: matchedReference ? referenceLabel : `${generalReference?.name || 'Lesson reference list'} (general reference)`,
        url: matchedReference?.url || generalReference?.url,
        verification: text(sign.verification) || undefined,
        note: matchedReference
          ? undefined
          : `The exact page for “${referenceLabel}” is not listed in this lesson; use the general reference and the lesson source list.`
      };
      const firstVocabularyContext = terms.find(term =>
        labelTokens.some(token => text(term.term).toUpperCase() === token)
      );

      return {
        id: `${levelKey}-vocab-${index + 1}-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`,
        term: label,
        meaning:
          text(matchingExample?.meaning) ||
          text(firstVocabularyContext?.context) ||
          `A production feature taught in this level: ${label}.`,
        explanation: truncate(`${text(sign.handshape)} ${text(sign.palmOrientation)}`.trim(), 220),
        handshape: text(sign.handshape) || 'See the linked reference.',
        palmOrientation: text(sign.palmOrientation) || 'See the linked reference.',
        movement: text(sign.movement) || 'See the linked reference.',
        nonManualMarkers: text(sign.nonManualMarkers) || 'No non-manual marker noted for this item.',
        example: example
          ? `${text(example.gloss)}${text(example.meaning) ? ` — ${text(example.meaning)}` : ''}`
          : 'Open the linked reference for a visual demonstration.',
        commonMistake: text(sign.commonMistake) || 'Check the linked reference before practising.',
        reference,
        visualNotice,
        levelKey
      };
    });
}

export function navigateVocabularyCards(
  cards: VocabularyCard[],
  currentId: string | null,
  direction: 1 | -1
): string | null {
  if (!cards.length) return null;
  const currentIndex = cards.findIndex(card => card.id === currentId);
  if (currentIndex === -1) return direction === 1 ? cards[0].id : cards[cards.length - 1].id;
  const nextIndex = (currentIndex + direction + cards.length) % cards.length;
  return cards[nextIndex].id;
}

export function toggleRevisionMark(journal: PracticeJournal, cardId: string): PracticeJournal {
  const marked = journal.revisionMarks.includes(cardId);
  return {
    ...journal,
    revisionMarks: marked
      ? journal.revisionMarks.filter(id => id !== cardId)
      : [...journal.revisionMarks, cardId],
    updatedAt: new Date().toISOString()
  };
}

const normalizeAnswer = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const meaningfulTokens = (value: string): string[] =>
  value
    .replace(/[\[\]()]/g, ' ')
    .split(/\s+/)
    .map(token => token.replace(/[^a-z0-9’'-]/gi, ''))
    .filter(token => token.length >= 3);

const pairWith = <T>(items: T[], rng: RandomSource): T[] => seededShuffle(items, rng);

/** Distinguish matching-pair answers from ordering answers (both are arrays). */
export const asMatchingPairs = (answer: PracticeAnswer): PracticeMatchingPair[] =>
  Array.isArray(answer) &&
  answer.every(
    pair =>
      isRecord(pair) &&
      typeof pair.leftId === 'string' &&
      typeof pair.rightId === 'string'
  )
    ? (answer as PracticeMatchingPair[])
    : [];

interface ExtractedContent {
  exercises: Array<{ id: string; prompt: string; options: string[]; answer: number; hint?: string; feedback?: string; stage?: string }>;
  examples: Array<{ situation: string; gloss: string; meaning: string; tip: string }>;
  markers: Array<{ cue: string; use: string; example: string; caution: string }>;
  vocabulary: Array<{ term: string; context: string }>;
  references: Array<{ name: string; url: string; note?: string }>;
  cards: VocabularyCard[];
}

function extractContent(blocks: CurriculumBlock[], levelKey: string): ExtractedContent {
  const exercises: ExtractedContent['exercises'] = [];
  blocks.forEach((block, blockIndex) => {
    const data = blockData(block);
    (data.exercises || []).forEach((exercise, exerciseIndex) => {
      const prompt = text(exercise.prompt);
      const options = (exercise.options || []).map(text).filter(Boolean);
      const answer = typeof exercise.answer === 'number' ? exercise.answer : -1;
      if (!prompt || options.length < 2 || answer < 0 || answer >= options.length) return;
      exercises.push({
        id: `${levelKey}-${text(data.stage) || 'practice'}-${blockIndex}-${exerciseIndex}`,
        prompt,
        options,
        answer,
        hint: text(exercise.hint) || undefined,
        feedback: text(exercise.feedback) || undefined,
        stage: text(data.stage) || undefined
      });
    });
  });

  const data = blocks.map(blockData);
  return {
    exercises,
    examples: data
      .flatMap(entry => entry.examples || [])
      .map(example => ({
        situation: text(example.situation),
        gloss: text(example.gloss),
        meaning: text(example.meaning),
        tip: text(example.tip)
      }))
      .filter(example => example.gloss),
    markers: data
      .flatMap(entry => entry.markers || [])
      .map(marker => ({
        cue: text(marker.cue),
        use: text(marker.use),
        example: text(marker.example),
        caution: text(marker.caution)
      }))
      .filter(marker => marker.cue || marker.use),
    vocabulary: data
      .flatMap(entry => entry.terms || [])
      .map(term => ({ term: text(term.term), context: text(term.context) }))
      .filter(term => term.term && term.context),
    references: data
      .flatMap(entry => entry.references || [])
      .filter(reference => text(reference.url))
      .map(reference => ({
        name: text(reference.name),
        url: text(reference.url),
        note: text(reference.note) || undefined
      })),
    cards: buildVocabularyCards(blocks, levelKey)
  };
}

const referenceFor = (content: ExtractedContent): VocabularyReference | undefined => {
  const first = content.references[0];
  return first ? { label: first.name, url: first.url } : undefined;
};

const matchingActivity = (
  id: string,
  levelKey: string,
  prompt: string,
  instruction: string,
  pairs: Array<{ left: PracticeItem; right: PracticeItem; explanation?: string }>,
  rng: RandomSource,
  explanation: string,
  reference?: VocabularyReference
): PracticeActivity | null => {
  if (pairs.length < 3) return null;
  const selected = pairWith(pairs, rng).slice(0, 4);
  const rightItems = pairWith(selected.map(pair => pair.right), rng);
  return {
    id,
    kind: 'MATCHING',
    levelKey,
    conceptIds: unique(selected.map(pair => pair.left.id)),
    prompt,
    instruction,
    explanation,
    leftItems: pairWith(selected.map(pair => pair.left), rng),
    rightItems,
    expectedPairs: selected.map(pair => ({
      leftId: pair.left.id,
      rightId: pair.right.id,
      explanation: pair.explanation
    })),
    reference,
    practiceOnly: true
  };
};

const multipleChoiceActivity = (
  id: string,
  levelKey: string,
  prompt: string,
  options: string[],
  answer: number,
  rng: RandomSource,
  explanation: string,
  hint?: string,
  reference?: VocabularyReference,
  kind: PracticeKind = 'MULTIPLE_CHOICE'
): PracticeActivity | null => {
  if (options.length < 2 || answer < 0 || answer >= options.length) return null;
  const shuffled = pairWith(
    options.map((option, index) => ({ id: `${id}-o${index + 1}`, text: option })),
    rng
  );
  const correct = options[answer];
  return {
    id,
    kind,
    levelKey,
    conceptIds: [`${id}-${normalizeAnswer(correct)}`],
    prompt,
    instruction: 'Choose the best answer, then check your reasoning.',
    hint,
    explanation,
    options: shuffled,
    correctOptionId: shuffled.find(option => option.text === correct)?.id,
    reference,
    practiceOnly: true
  };
};

const fillBlankActivity = (
  id: string,
  levelKey: string,
  example: ExtractedContent['examples'][number],
  answer: string,
  explanation: string,
  reference?: VocabularyReference
): PracticeActivity | null => {
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blankText = example.gloss.replace(new RegExp(`\\b${escaped}\\b`, 'i'), '____');
  if (blankText === example.gloss) return null;
  return {
    id,
    kind: 'FILL_BLANK',
    levelKey,
    conceptIds: [`${id}-${normalizeAnswer(answer)}`],
    prompt: `Complete the expression for: ${example.situation}`,
    instruction: 'Type the missing expression. Capitalisation does not matter.',
    explanation,
    blankText,
    acceptedAnswers: [answer],
    reference,
    practiceOnly: true
  };
};

const contextActivity = (
  id: string,
  levelKey: string,
  example: ExtractedContent['examples'][number],
  pool: ExtractedContent['examples'],
  rng: RandomSource,
  reference?: VocabularyReference
): PracticeActivity | null => {
  const distractors = pairWith(
    pool.filter(candidate => normalizeAnswer(candidate.meaning) !== normalizeAnswer(example.meaning)),
    rng
  ).slice(0, 2);
  if (distractors.length < 2) return null;
  return multipleChoiceActivity(
    id,
    levelKey,
    `In this situation — ${example.situation} — which meaning fits?`,
    [example.meaning, ...distractors.map(candidate => candidate.meaning)],
    0,
    rng,
    `${example.gloss}${example.tip ? ` Tip: ${example.tip}` : ''}`,
    'Look at the situation before choosing a meaning.',
    reference,
    'CONTEXT_CHOICE'
  );
};

const orderingActivity = (
  id: string,
  levelKey: string,
  content: ExtractedContent,
  rng: RandomSource,
  reference?: VocabularyReference
): PracticeActivity | null => {
  const example = pairWith(content.examples, rng)[0];
  if (!example) return null;
  const attention = content.markers.find(marker => /attention|eye/i.test(`${marker.cue} ${marker.use}`));
  const response = content.markers.find(marker => /turn|respond|response|confirmation/i.test(`${marker.cue} ${marker.use}`));
  if (!attention || !response) return null;

  const steps: PracticeItem[] = [
    { id: `${id}-attention`, text: `${attention.cue}: ${attention.use}` },
    { id: `${id}-expression`, text: `Use the expression: ${example.gloss}` },
    { id: `${id}-response`, text: `${response.cue}: ${response.use}` }
  ];

  return {
    id,
    kind: 'ORDERING',
    levelKey,
    conceptIds: [`${id}-sequence`, `${id}-expression`],
    prompt: 'Put this short visual exchange in a sensible order.',
    instruction: 'Use the arrows to move steps. The written gloss is from this level\'s examples.',
    explanation: `${example.meaning}${example.tip ? ` Tip: ${example.tip}` : ''}`,
    steps: pairWith(steps, rng),
    correctOrder: steps.map(step => step.id),
    reference,
    practiceOnly: true
  };
};

function prioritize<T extends { id: string; conceptIds: string[] }>(
  activities: T[],
  missedConceptIds: string[],
  rng: RandomSource
): T[] {
  const missed = new Set(missedConceptIds);
  const priority = activities.filter(activity => activity.conceptIds.some(id => missed.has(id)));
  const rest = seededShuffle(
    activities.filter(activity => !priority.includes(activity)),
    rng
  );
  return [...seededShuffle(priority, rng), ...rest];
}

export function createPracticeActivities(
  blocks: CurriculumBlock[],
  levelKey: string,
  seed: number | string = 0,
  options: { missedConceptIds?: string[]; limit?: number; revisionOnly?: boolean } = {}
): PracticeActivity[] {
  const rng = seededRandom(`${levelKey}:practice:${seed}`);
  const content = extractContent(blocks, levelKey);
  const reference = referenceFor(content);
  const activities: PracticeActivity[] = [];
  const exercisePool = options.revisionOnly
    ? content.exercises.filter(exercise => exercise.stage === 'REVISION')
    : content.exercises;

  // Existing curriculum exercises first: their prompts and feedback are unchanged.
  exercisePool.forEach(exercise => {
    const activity = multipleChoiceActivity(
      exercise.id,
      levelKey,
      exercise.prompt,
      exercise.options,
      exercise.answer,
      rng,
      exercise.feedback || exercise.prompt,
      exercise.hint,
      reference
    );
    if (activity) activities.push(activity);
  });

  const vocabularyMatching = matchingActivity(
    `${levelKey}-practice-vocab-meaning`,
    levelKey,
    'Match each vocabulary item with the beginner-friendly explanation from this lesson.',
    'Select a cue on the left, then choose its matching explanation.',
    content.cards.map(card => ({
      left: { id: card.id, text: card.term },
      right: { id: `${card.id}-meaning`, text: truncate(card.explanation), explanation: card.handshape },
      explanation: card.explanation
    })),
    rng,
    'These explanations reuse the handshape and palm-orientation notes supplied with the lesson. Open the linked reference for the visual demonstration.',
    reference
  );
  if (vocabularyMatching) activities.push(vocabularyMatching);

  const exampleMatching = matchingActivity(
    `${levelKey}-practice-meaning-expression`,
    levelKey,
    'Match each situation with the expression taught for it.',
    'Select a situation, then choose the matching written gloss.',
    content.examples.map((example, index) => ({
      left: { id: `${levelKey}-example-${index + 1}-situation`, text: truncate(example.situation) },
      right: { id: `${levelKey}-example-${index + 1}-gloss`, text: example.gloss, explanation: example.meaning },
      explanation: `${example.gloss} — ${example.meaning}`
    })),
    rng,
    'Situations are matched using the level\'s own examples. A written gloss is a study aid, not a replacement for watching a sign.',
    reference
  );
  if (exampleMatching) activities.push(exampleMatching);

  const answerTokens = unique([
    ...content.cards.map(card => card.term),
    ...content.vocabulary.map(item => item.term),
    ...content.examples.flatMap(example => meaningfulTokens(example.gloss))
  ]);
  content.examples.forEach((example, index) => {
    const tokens = meaningfulTokens(example.gloss);
    const candidate = tokens.find(token => answerTokens.some(answer => normalizeAnswer(answer) === normalizeAnswer(token)));
    if (!candidate) return;
    const activity = fillBlankActivity(
      `${levelKey}-practice-fill-${index + 1}`,
      levelKey,
      example,
      candidate,
      `${example.meaning}${example.tip ? ` Tip: ${example.tip}` : ''}`,
      reference
    );
    if (activity) activities.push(activity);
  });

  content.examples.forEach((example, index) => {
    const activity = contextActivity(
      `${levelKey}-practice-context-${index + 1}`,
      levelKey,
      example,
      content.examples,
      rng,
      reference
    );
    if (activity) activities.push(activity);
  });

  const sequence = orderingActivity(`${levelKey}-practice-order`, levelKey, content, rng, reference);
  if (sequence) activities.push(sequence);

  const ordered = prioritize(activities, options.missedConceptIds || [], rng);
  return typeof options.limit === 'number' ? ordered.slice(0, options.limit) : ordered;
}

export function createRevisionActivities(
  blocks: CurriculumBlock[],
  levelKey: string,
  seed: number | string,
  missedConceptIds: string[] = [],
  limit = 8
): PracticeActivity[] {
  return createPracticeActivities(blocks, levelKey, `revision:${seed}`, {
    missedConceptIds,
    limit,
    revisionOnly: false
  });
}

export function gradePracticeActivity(
  activity: PracticeActivity,
  answer: PracticeAnswer
): PracticeGrade {
  const missedConceptIds: string[] = [];
  const base = { explanation: activity.explanation };

  if (activity.kind === 'MATCHING') {
    const pairs = asMatchingPairs(answer);
    const expected = activity.expectedPairs || [];
    const answered = pairs.length > 0;
    const byLeft = new Map(pairs.map(pair => [pair.leftId, pair.rightId]));
    const wrong = expected.filter(pair => byLeft.get(pair.leftId) !== pair.rightId);
    wrong.forEach(pair => missedConceptIds.push(pair.leftId));
    const correct = answered && pairs.length === expected.length && wrong.length === 0;
    return {
      ...base,
      answered,
      correct,
      missedConceptIds,
      feedback: !answered
        ? 'Connect the pairs, then check your work.'
        : correct
          ? `Correct — all ${expected.length} pairs match. ${activity.explanation}`
          : `Not quite — ${wrong.length} ${wrong.length === 1 ? 'pair needs' : 'pairs need'} another look. ${wrong
              .map(pair => pair.explanation)
              .filter(Boolean)
              .join(' ')}`.trim()
    };
  }

  if (activity.kind === 'ORDERING') {
    const order = Array.isArray(answer) ? answer : [];
    const expected = activity.correctOrder || [];
    const answered = order.length > 0;
    const correct = answered && order.length === expected.length && order.every((id, index) => id === expected[index]);
    if (!correct) missedConceptIds.push(...activity.conceptIds);
    return {
      ...base,
      answered,
      correct,
      missedConceptIds,
      feedback: !answered
        ? 'Move the steps into an order, then check your work.'
        : correct
          ? `Correct order. ${activity.explanation}`
          : `Not quite. The learning sequence is: ${expected
              .map(id => activity.steps?.find(step => step.id === id)?.text || id)
              .join(' → ')}. ${activity.explanation}`
    };
  }

  if (activity.kind === 'FILL_BLANK') {
    const given = typeof answer === 'string' ? answer : '';
    const answered = given.trim().length > 0;
    const accepted = activity.acceptedAnswers || [];
    const correct = accepted.some(value => normalizeAnswer(value) === normalizeAnswer(given));
    if (answered && !correct) missedConceptIds.push(...activity.conceptIds);
    return {
      ...base,
      answered,
      correct,
      missedConceptIds,
      feedback: !answered
        ? 'Type the missing expression, then check your answer.'
        : correct
          ? `Correct — “${accepted[0]}”. ${activity.explanation}`
          : `Not quite. The missing expression is “${accepted[0]}”. ${activity.explanation}`
    };
  }

  const options = activity.options || [];
  const selected = typeof answer === 'number' ? options[answer] : undefined;
  const correctOption = options.find(option => option.id === activity.correctOptionId);
  const answered = Boolean(selected);
  const correct = answered && selected?.id === activity.correctOptionId;
  if (answered && !correct) missedConceptIds.push(...activity.conceptIds);
  return {
    ...base,
    answered,
    correct,
    missedConceptIds,
    feedback: !answered
      ? 'Choose an answer, then check your reasoning.'
      : correct
        ? `Correct. ${activity.explanation}`
        : `Not quite — “${correctOption?.text || 'the highlighted answer'}” fits better. ${activity.explanation}`
  };
}

export function emptyPracticeJournal(): PracticeJournal {
  return { records: {}, revisionMarks: [], updatedAt: null };
}

export function recordPracticeResult(
  journal: PracticeJournal,
  activity: PracticeActivity,
  grade: PracticeGrade
): PracticeJournal {
  const previous = journal.records[activity.id];
  return {
    ...journal,
    records: {
      ...journal.records,
      [activity.id]: {
        activityId: activity.id,
        conceptIds: activity.conceptIds,
        correct: grade.correct,
        attempts: (previous?.attempts || 0) + 1,
        lastCorrect: grade.correct,
        updatedAt: new Date().toISOString()
      }
    },
    updatedAt: new Date().toISOString()
  };
}

export function getMissedConceptIds(journal: PracticeJournal): string[] {
  return unique(
    Object.values(journal.records || {})
      .filter(record => !record.lastCorrect)
      .flatMap(record => record.conceptIds)
  );
}

export function getRevisionRecommendations(
  journal: PracticeJournal,
  cards: VocabularyCard[]
): string[] {
  const missed = getMissedConceptIds(journal);
  const normalizedMissed = new Set(missed.map(normalizeAnswer));
  const marked = new Set(journal.revisionMarks || []);
  return cards
    .filter(card =>
      marked.has(card.id) ||
      missed.some(id => id.includes(card.id)) ||
      normalizedMissed.has(normalizeAnswer(card.term))
    )
    .map(card => card.term);
}

export function summarizePractice(journal: PracticeJournal, activities: PracticeActivity[]) {
  const relevant = activities.map(activity => journal.records[activity.id]).filter(Boolean) as PracticeRecord[];
  const answered = relevant.length;
  const correct = relevant.filter(record => record.lastCorrect).length;
  const missedConceptIds = unique(relevant.filter(record => !record.lastCorrect).flatMap(record => record.conceptIds));
  return {
    total: activities.length,
    answered,
    correct,
    incorrect: answered - correct,
    percentage: answered === 0 ? 0 : Math.round((correct / answered) * 100),
    complete: activities.length > 0 && answered === activities.length,
    missedConceptIds
  };
}

/** Validate localStorage data before it reaches React state. */
export function parsePracticeJournal(value: string | null): PracticeJournal {
  if (!value) return emptyPracticeJournal();
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return emptyPracticeJournal();
    const records: PracticeJournal['records'] = {};
    if (isRecord(parsed.records)) {
      Object.entries(parsed.records).forEach(([key, entry]) => {
        if (!isRecord(entry) || typeof entry.activityId !== 'string') return;
        records[key] = {
          activityId: entry.activityId,
          conceptIds: Array.isArray(entry.conceptIds)
            ? entry.conceptIds.filter((id): id is string => typeof id === 'string')
            : [],
          correct: entry.correct === true,
          attempts: typeof entry.attempts === 'number' ? entry.attempts : 0,
          lastCorrect: entry.lastCorrect === true,
          updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date().toISOString()
        };
      });
    }
    return {
      records,
      revisionMarks: Array.isArray(parsed.revisionMarks)
        ? parsed.revisionMarks.filter((id): id is string => typeof id === 'string')
        : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null
    };
  } catch {
    return emptyPracticeJournal();
  }
}
