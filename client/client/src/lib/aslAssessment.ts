export interface AssessmentMatchingPair {
  leftId: string;
  rightId: string;
}

export interface AssessmentQuestionLike {
  type: string;
  options?: unknown[];
  leftItems?: Array<{ id: string; text?: string }>;
  rightItems?: Array<{ id: string; text?: string }>;
}

export type AssessmentAnswer = number | string | AssessmentMatchingPair[] | null;

export function isMatchingAnswerComplete(
  answer: AssessmentAnswer,
  question: AssessmentQuestionLike
): boolean {
  if (!Array.isArray(answer) || !Array.isArray(question.leftItems)) return false;
  const leftIds = question.leftItems.map(item => item.id);
  if (answer.length !== leftIds.length) return false;
  const lefts = new Set<string>();
  const rights = new Set<string>();
  for (const pair of answer) {
    if (!pair || typeof pair.leftId !== 'string' || typeof pair.rightId !== 'string') return false;
    if (!leftIds.includes(pair.leftId)) return false;
    if (lefts.has(pair.leftId) || rights.has(pair.rightId)) return false;
    lefts.add(pair.leftId);
    rights.add(pair.rightId);
  }
  return lefts.size === leftIds.length;
}

export function isAssessmentAnswerComplete(
  answer: AssessmentAnswer,
  question: AssessmentQuestionLike
): boolean {
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
      return typeof answer === 'number' && Number.isInteger(answer);
    case 'FILL_BLANK':
      return typeof answer === 'string' && answer.trim().length > 0;
    case 'MATCHING':
      return isMatchingAnswerComplete(answer, question);
    default:
      return false;
  }
}

export function canSubmitAssessment(
  answers: AssessmentAnswer[],
  questions: AssessmentQuestionLike[]
): boolean {
  return (
    questions.length > 0 &&
    answers.length === questions.length &&
    questions.every((question, index) => isAssessmentAnswerComplete(answers[index], question))
  );
}

export function createEmptyAssessmentAnswers(count: number): AssessmentAnswer[] {
  return Array.from({ length: count }, () => null);
}
