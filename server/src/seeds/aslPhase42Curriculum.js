/**
 * Phase 4.2 ASL curriculum enrichment aggregator.
 *
 * The output is additive-only. `seedDB` appends blocks/questions only when their
 * stable `enrichmentKey` or prompt is missing, so lesson IDs, stable keys,
 * editorial edits, and user progress are never replaced.
 */
import { PHASE42_BLOCKS_A } from './aslPhase42BlocksA.js';
import { PHASE42_BLOCKS_B } from './aslPhase42BlocksB.js';
import { PHASE42_QUESTIONS_A } from './aslPhase42QuestionsA.js';
import { PHASE42_QUESTIONS_B } from './aslPhase42QuestionsB.js';
import { ASL42_LINKED_NOTICE } from './aslPhase42Sources.js';

const CONTENT = { ...PHASE42_BLOCKS_A, ...PHASE42_BLOCKS_B };
const QUESTIONS = { ...PHASE42_QUESTIONS_A, ...PHASE42_QUESTIONS_B };

const orderedKeys = Object.keys(CONTENT).sort(
  (a, b) => CONTENT[a].level - CONTENT[b].level
);

const linkedNoticeBlock = () => ({
  type: 'EXPLANATION',
  data: {
    stage: 'LEARN',
    suite: 'PHASE_4_2',
    phase: '4.2',
    enrichmentKey: 'asl42_visual_reference_notice',
    title: 'About the visual references',
    body: ASL42_LINKED_NOTICE
  }
});

function buildBlocks(stableKey, item) {
  const base = {
    suite: 'PHASE_4_2',
    phase: '4.2',
    stableKey,
    level: item.level,
    title: item.title
  };

  return [
    linkedNoticeBlock(),
    {
      type: 'CONCEPT_INTRO',
      data: {
        ...base,
        stage: 'LEARN',
        enrichmentKey: 'asl42_objectives',
        title: 'Learning objectives',
        items: item.objectives
      }
    },
    {
      type: 'VOCABULARY_DECK',
      data: {
        ...base,
        stage: 'LEARN',
        enrichmentKey: 'asl42_vocabulary',
        title: 'Concepts and vocabulary',
        terms: item.vocabulary
      }
    },
    {
      type: 'EXPLANATION',
      data: {
        ...base,
        stage: 'LEARN',
        enrichmentKey: 'asl42_sign_parameters',
        title: 'Production notes: handshape, palm, movement',
        signs: item.signNotes,
        notice: ASL42_LINKED_NOTICE
      }
    },
    {
      type: 'GRAMMAR_RULE',
      data: {
        ...base,
        stage: 'LEARN',
        enrichmentKey: 'asl42_nonmanual_markers',
        title: 'Non-manual markers and common mistakes',
        markers: item.markers
      }
    },
    {
      type: 'DIALOGUE_CONTEXT',
      data: {
        ...base,
        stage: 'LEARN',
        enrichmentKey: 'asl42_examples',
        title: 'Examples in context',
        examples: item.examples
      }
    },
    {
      type: 'EXPLANATION',
      data: {
        ...base,
        stage: 'LEARN',
        enrichmentKey: 'asl42_sources',
        title: 'Sources and further study',
        references: item.sources
      }
    },
    {
      type: 'FORMATIVE_DRILL',
      data: {
        ...base,
        stage: 'GUIDED_PRACTICE',
        enrichmentKey: 'asl42_guided_practice',
        title: 'Guided practice: explain the choice',
        exercises: item.guided
      }
    },
    {
      type: 'PRACTICE_DRILL',
      data: {
        ...base,
        stage: 'PRACTICE_CHALLENGE',
        enrichmentKey: 'asl42_practice_challenge',
        title: 'Challenge: apply the foundation',
        exercises: item.challenge
      }
    },
    {
      type: 'REVISION_SUMMARY',
      data: {
        ...base,
        stage: 'REVISION',
        enrichmentKey: 'asl42_revision_checklist',
        title: 'Revision checklist',
        items: item.revision,
        references: item.sources.slice(0, 2)
      }
    },
    {
      type: 'REVISION_RECAP',
      data: {
        ...base,
        stage: 'REVISION',
        enrichmentKey: 'asl42_revision_exercises',
        title: 'Retrieval practice',
        exercises: item.revisionExercises
      }
    }
  ];
}

export const aslPhase42Lessons = orderedKeys.map(stableKey => ({
  stableKey,
  level: CONTENT[stableKey].level,
  contentBlocks: buildBlocks(stableKey, CONTENT[stableKey])
}));

export const aslPhase42Quizzes = orderedKeys.map(stableKey => ({
  stableKey,
  level: CONTENT[stableKey].level,
  questions: QUESTIONS[stableKey]
}));

export const aslPhase42BaseExplanations = orderedKeys.reduce((map, stableKey) => {
  map[stableKey] = CONTENT[stableKey].explanations;
  return map;
}, {});

export const ASL42_ENRICHMENT_KEYS = Array.from(
  new Set(aslPhase42Lessons.flatMap(lesson => lesson.contentBlocks.map(block => block.data.enrichmentKey)))
);
