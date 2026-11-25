import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canSubmitAssessment,
  createEmptyAssessmentAnswers,
  isAssessmentAnswerComplete,
  isMatchingAnswerComplete,
  type AssessmentQuestionLike
} from '../client/src/lib/aslAssessment';

const matchingQuestion: AssessmentQuestionLike = {
  type: 'MATCHING',
  leftItems: [{ id: 'l1' }, { id: 'l2' }],
  rightItems: [{ id: 'r1' }, { id: 'r2' }]
};

test('assessment completeness matches the supported answer shapes', () => {
  assert.equal(isAssessmentAnswerComplete(0, { type: 'MULTIPLE_CHOICE', options: ['a', 'b'] }), true);
  assert.equal(isAssessmentAnswerComplete(null, { type: 'MULTIPLE_CHOICE', options: ['a', 'b'] }), false);
  assert.equal(isAssessmentAnswerComplete('  ', { type: 'FILL_BLANK' }), false);
  assert.equal(isAssessmentAnswerComplete(' clarity ', { type: 'FILL_BLANK' }), true);
  assert.equal(isAssessmentAnswerComplete([], matchingQuestion), false);
});

test('matching answers require a complete bijection', () => {
  assert.equal(
    isMatchingAnswerComplete(
      [
        { leftId: 'l1', rightId: 'r2' },
        { leftId: 'l2', rightId: 'r1' }
      ],
      matchingQuestion
    ),
    true
  );
  assert.equal(
    isMatchingAnswerComplete([{ leftId: 'l1', rightId: 'r1' }], matchingQuestion),
    false,
    'A partial match is not submittable'
  );
  assert.equal(
    isMatchingAnswerComplete(
      [
        { leftId: 'l1', rightId: 'r1' },
        { leftId: 'l1', rightId: 'r2' }
      ],
      matchingQuestion
    ),
    false,
    'Duplicate left IDs are rejected'
  );
  assert.equal(
    isMatchingAnswerComplete(
      [
        { leftId: 'l1', rightId: 'r1' },
        { leftId: 'l2', rightId: 'r1' }
      ],
      matchingQuestion
    ),
    false,
    'Duplicate right IDs are rejected'
  );
});

test('submission is blocked until every question has a valid answer', () => {
  const questions: AssessmentQuestionLike[] = [
    { type: 'MULTIPLE_CHOICE', options: ['a', 'b'] },
    { type: 'FILL_BLANK' },
    matchingQuestion
  ];
  const answers = createEmptyAssessmentAnswers(questions.length);
  assert.deepEqual(answers, [null, null, null]);
  assert.equal(canSubmitAssessment(answers, questions), false);

  answers[0] = 1;
  answers[1] = 'clarity';
  answers[2] = [
    { leftId: 'l1', rightId: 'r2' },
    { leftId: 'l2', rightId: 'r1' }
  ];
  assert.equal(canSubmitAssessment(answers, questions), true);
  assert.equal(canSubmitAssessment(answers.slice(0, 2), questions), false);
});
