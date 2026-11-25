import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AslVocabularyCards } from '../client/src/components/AslVocabularyCards';
import { AslPracticeActivities } from '../client/src/components/AslPracticeActivities';
import {
  buildVocabularyCards,
  createPracticeActivities,
  createRevisionActivities,
  emptyPracticeJournal,
  findReferenceForSource,
  getMissedConceptIds,
  gradePracticeActivity,
  navigateVocabularyCards,
  parsePracticeJournal,
  recordPracticeResult,
  summarizePractice,
  toggleRevisionMark,
  type PracticeActivity,
  type VocabularyCard
} from '../client/src/lib/aslLearningExperience';
import { aslPhase42Lessons } from '../../server/src/seeds/aslPhase42Curriculum.js';

type SeedLesson = (typeof aslPhase42Lessons)[number];
type SeedBlock = SeedLesson['contentBlocks'][number];

const blocksFor = (index: number) => aslPhase42Lessons[index].contentBlocks as unknown as Parameters<
  typeof buildVocabularyCards
>[0];
const levelKey = (index: number) => aslPhase42Lessons[index].stableKey;

const firstKind = (activities: PracticeActivity[], kind: PracticeActivity['kind']) =>
  activities.find(activity => activity.kind === kind);

const noop = () => {};

test('vocabulary cards render every required learning field and attribution', () => {
  const cards = buildVocabularyCards(blocksFor(0), levelKey(0));
  assert.ok(cards.length > 0);
  const card = cards[0];
  for (const field of [
    'term',
    'meaning',
    'explanation',
    'handshape',
    'palmOrientation',
    'movement',
    'nonManualMarkers',
    'example',
    'commonMistake'
  ]) {
    assert.ok(card[field as keyof VocabularyCard], `Card is missing ${field}`);
  }

  const html = renderToStaticMarkup(
    createElement(AslVocabularyCards, {
      cards,
      activeCardId: card.id,
      expandedIds: [card.id],
      revealedIds: [card.id],
      revisionMarks: [card.id],
      recommendations: [],
      onActiveCardChange: noop,
      onToggleExpand: noop,
      onToggleReveal: noop,
      onToggleRevisionMark: noop
    })
  );

  assert.match(html, /Interactive vocabulary cards/);
  assert.match(html, /Beginner explanation/);
  assert.match(html, /Palm orientation/);
  assert.match(html, /non-manual markers/i);
  assert.match(html, /Common mistake/);
  assert.match(html, /Verified educational reference/);
  assert.match(html, /Marked/);
  if (card.reference.url) {
    assert.match(html, new RegExp(`href="${card.reference.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
    assert.match(html, /rel="noreferrer noopener"/);
  }
});

test('expanded and revealed state is controlled by accessible interactions', () => {
  const cards = buildVocabularyCards(blocksFor(3), levelKey(3));
  const collapsed = renderToStaticMarkup(
    createElement(AslVocabularyCards, {
      cards,
      activeCardId: cards[0].id,
      expandedIds: [],
      revealedIds: [],
      revisionMarks: [],
      recommendations: [],
      onActiveCardChange: noop,
      onToggleExpand: noop,
      onToggleReveal: noop,
      onToggleRevisionMark: noop
    })
  );
  assert.doesNotMatch(collapsed, /Beginner explanation/);
  assert.match(collapsed, /aria-label="Previous vocabulary item"/);
  assert.match(collapsed, /aria-label="Next vocabulary item"/);
  assert.match(collapsed, /aria-label="Mark .* for revision"/);
  assert.match(collapsed, /aria-expanded="false"/);

  const expanded = renderToStaticMarkup(
    createElement(AslVocabularyCards, {
      cards,
      activeCardId: cards[1].id,
      expandedIds: [cards[1].id],
      revealedIds: [cards[1].id],
      revisionMarks: [cards[1].id],
      recommendations: [],
      onActiveCardChange: noop,
      onToggleExpand: noop,
      onToggleReveal: noop,
      onToggleRevisionMark: noop
    })
  );
  assert.match(expanded, new RegExp(`aria-selected="true"[^>]*>\\d+\\.\\s*${cards[1].term}`));
  assert.match(expanded, /aria-label="Remove .* from revision"/);
  assert.equal(navigateVocabularyCards(cards, cards[0].id, 1), cards[1].id);
  assert.equal(navigateVocabularyCards(cards, cards[0].id, -1), cards[cards.length - 1].id);
  assert.equal(navigateVocabularyCards([], null, 1), null);
});

test('all ten levels attribute cards to credible linked sources', () => {
  aslPhase42Lessons.forEach((_, index) => {
    const cards = buildVocabularyCards(blocksFor(index), levelKey(index));
    assert.ok(cards.length >= 2, `Level ${index + 1} needs vocabulary cards`);
    cards.forEach(card => {
      assert.ok(card.reference.label.length > 3);
      assert.ok(card.reference.url, `${card.id} needs a linked educational reference`);
      assert.match(card.reference.url, /^https:\/\//);
      assert.ok(
        card.reference.url.includes('lifeprint.com') || card.reference.url.includes('gallaudet.edu'),
        `${card.id} must use a credible source`
      );
      assert.ok(['WRITTEN_REFERENCE', 'LINKED_REFERENCE / REQUIRES_VIDEO_REVIEW'].includes(
        card.reference.verification || ''
      ));
      assert.match(card.visualNotice, /reference|reference\./i);
    });
  });

  const alphabetSource = findReferenceForSource('ASL University alphabet chart', [
    { name: 'ASL University (Lifeprint) — ASL alphabet / fingerspelling', url: 'https://www.lifeprint.com/a' },
    { name: 'Gallaudet University — ASL Connect', url: 'https://gallaudet.edu/asl-connect' }
  ]);
  assert.equal(alphabetSource?.url, 'https://www.lifeprint.com/a');
});

test('matching exercises use curriculum pairs and explain mistakes', () => {
  const activities = createPracticeActivities(blocksFor(4), levelKey(4), 'matching-test');
  const matching = firstKind(activities, 'MATCHING');
  assert.ok(matching?.leftItems && matching.rightItems && matching.expectedPairs);
  assert.ok(matching.leftItems.length >= 3);

  const correctAnswer = matching.expectedPairs.map(pair => ({ leftId: pair.leftId, rightId: pair.rightId }));
  const correct = gradePracticeActivity(matching, correctAnswer);
  assert.equal(correct.correct, true);
  assert.match(correct.feedback, /Correct/);

  const wrongAnswer = matching.expectedPairs.map(pair => ({
    leftId: pair.leftId,
    rightId: matching.rightItems!.find(item => item.id !== pair.rightId)!.id
  }));
  const wrong = gradePracticeActivity(matching, wrongAnswer);
  assert.equal(wrong.correct, false);
  assert.match(wrong.feedback, /Not quite/);
  assert.ok(wrong.missedConceptIds.length > 0);

  const html = renderToStaticMarkup(
    createElement(AslPracticeActivities, {
      activities: [matching],
      title: 'Guided practice',
      description: 'Match the pairs.',
      onResult: noop
    })
  );
  assert.match(html, /Matching/);
  assert.match(html, /Select a cue/);
  assert.match(html, /Practice is XP-neutral/);
});

test('fill-in-the-blank exercises validate normalised answers and retry feedback', () => {
  const activities = createPracticeActivities(blocksFor(5), levelKey(5), 'fill-test');
  const fill = firstKind(activities, 'FILL_BLANK');
  assert.ok(fill?.acceptedAnswers && fill.acceptedAnswers.length > 0);
  assert.match(fill.blankText || '', /____/);

  const correct = gradePracticeActivity(fill, `  ${fill.acceptedAnswers[0].toUpperCase()}  `);
  assert.equal(correct.correct, true);
  assert.match(correct.feedback, /Correct/);

  const incorrect = gradePracticeActivity(fill, 'a completely different expression');
  assert.equal(incorrect.correct, false);
  assert.match(incorrect.feedback, new RegExp(fill.acceptedAnswers[0]));
  assert.deepEqual(incorrect.missedConceptIds, fill.conceptIds);
});

test('contextual exercises validate interpretation and ordering exercises use only existing steps', () => {
  const activities = createPracticeActivities(blocksFor(7), levelKey(7), 'context-test');
  const context = firstKind(activities, 'CONTEXT_CHOICE');
  assert.ok(context?.options && context.options.length >= 3);
  const correctOption = context.options.find(option => option.id === context.correctOptionId);
  assert.ok(correctOption);

  const correct = gradePracticeActivity(context, context.options!.indexOf(correctOption));
  assert.equal(correct.correct, true);
  const wrong = gradePracticeActivity(
    context,
    context.options!.findIndex(option => option.id !== context.correctOptionId)
  );
  assert.equal(wrong.correct, false);
  assert.match(wrong.feedback, /Not quite/);

  const order = firstKind(activities, 'ORDERING');
  if (order) {
    assert.equal(order.steps?.length, order.correctOrder?.length);
    assert.deepEqual(
      [...(order.steps || [])].map(step => step.id).sort(),
      [...(order.correctOrder || [])].sort()
    );
    const badOrder = [...(order.correctOrder || [])].reverse();
    assert.equal(gradePracticeActivity(order, badOrder).correct, false);
    assert.equal(gradePracticeActivity(order, order.correctOrder || []).correct, true);
  }
});

test('revision sets are reproducible, prioritise missed concepts, and carry no XP fields', () => {
  const blocks = blocksFor(2);
  const key = levelKey(2);
  const first = createRevisionActivities(blocks, key, 42);
  const again = createRevisionActivities(blocks, key, 42);
  const different = createRevisionActivities(blocks, key, 7);
  assert.deepEqual(first.map(activity => activity.id), again.map(activity => activity.id));
  assert.notDeepEqual(first.map(activity => activity.id), different.map(activity => activity.id));

  const firstActivity = first[0];
  const journal = recordPracticeResult(
    emptyPracticeJournal(),
    firstActivity,
    gradePracticeActivity(firstActivity, null)
  );
  assert.ok(getMissedConceptIds(journal).length > 0);
  const prioritized = createRevisionActivities(blocks, key, 42, getMissedConceptIds(journal));
  assert.deepEqual(prioritized.slice(0, firstActivity.conceptIds.length).map(activity => activity.id), [firstActivity.id]);

  const serialized = JSON.stringify({ first, journal });
  assert.doesNotMatch(serialized, /"xp"|xpGained|awardFirstPassXp|completedLessons/);
});

test('practice journal persists only validated, XP-neutral records', () => {
  const stored = JSON.stringify({
    records: {
      'a-1': { activityId: 'a-1', conceptIds: ['c1'], correct: false, attempts: 2, lastCorrect: false, updatedAt: 'now' },
      'a-2': { activityId: 'a-2', conceptIds: 'bad', attempts: 99 }
    },
    revisionMarks: ['card-1', 42],
    updatedAt: 'now',
    xp: 999
  });
  const parsed = parsePracticeJournal(stored);
  assert.deepEqual(parsed.revisionMarks, ['card-1']);
  assert.equal(parsed.records['a-2'].activityId, 'a-2');
  assert.deepEqual(parsed.records['a-2'].conceptIds, []);
  assert.equal('xp' in parsed, false);

  const marked = toggleRevisionMark(parsed, 'card-2');
  assert.deepEqual(marked.revisionMarks, ['card-1', 'card-2']);
  assert.deepEqual(toggleRevisionMark(marked, 'card-2').revisionMarks, ['card-1']);
  assert.deepEqual(parsePracticeJournal('not json'), emptyPracticeJournal());

  const activities = createPracticeActivities(blocksFor(0), levelKey(0), 'summary');
  const summary = summarizePractice(marked, activities);
  assert.equal(summary.total, activities.length);
  assert.equal(summary.complete, false);
  assert.equal(summary.percentage, 0);
});
