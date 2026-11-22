import crypto from 'crypto';

export const PASSING_THRESHOLD_PERCENT = 70;

/**
 * Grade an individual question based on its discriminant type.
 *
 * @param {Object} question - The Question subdocument from Quiz.
 * @param {*} submittedAnswer - The raw client-submitted answer.
 * @returns {{ isCorrect: boolean, score: number, maxScore: number, reason?: string }}
 */
export function gradeQuestion(question, submittedAnswer) {
  const type = question.type || 'MULTIPLE_CHOICE';

  switch (type) {
    case 'MULTIPLE_CHOICE': {
      // Client submitted index (number or object with selectedIndex)
      let selectedIndex = submittedAnswer;
      if (typeof submittedAnswer === 'object' && submittedAnswer !== null) {
        selectedIndex = submittedAnswer.selectedIndex;
      }

      if (typeof selectedIndex !== 'number' || !Number.isInteger(selectedIndex)) {
        return { isCorrect: false, score: 0, maxScore: 1, reason: 'INVALID_OPTION_INDEX' };
      }

      if (!question.options || selectedIndex < 0 || selectedIndex >= question.options.length) {
        return { isCorrect: false, score: 0, maxScore: 1, reason: 'OPTION_INDEX_OUT_OF_BOUNDS' };
      }

      const isCorrect = selectedIndex === question.correct;
      return { isCorrect, score: isCorrect ? 1 : 0, maxScore: 1 };
    }

    case 'MATCHING': {
      // Expected pairs in question.matchingPairs: [{ leftId, rightId, left, right }]
      if (!Array.isArray(question.matchingPairs) || question.matchingPairs.length === 0) {
        return { isCorrect: false, score: 0, maxScore: 1, reason: 'NO_PAIRS_DEFINED' };
      }

      // Submitted pairs must be an array of { leftId, rightId }
      let submittedPairs = submittedAnswer;
      if (typeof submittedAnswer === 'object' && submittedAnswer !== null && Array.isArray(submittedAnswer.pairs)) {
        submittedPairs = submittedAnswer.pairs;
      }

      if (!Array.isArray(submittedPairs)) {
        return { isCorrect: false, score: 0, maxScore: 1, reason: 'MALFORMED_MATCHING_PAYLOAD' };
      }

      const expectedCount = question.matchingPairs.length;
      if (submittedPairs.length !== expectedCount) {
        return { isCorrect: false, score: 0, maxScore: 1, reason: 'PAIR_COUNT_MISMATCH' };
      }

      const expectedLeftIds = new Set(question.matchingPairs.map(p => p.leftId));
      const expectedRightIds = new Set(question.matchingPairs.map(p => p.rightId));
      const expectedMap = new Map(question.matchingPairs.map(p => [p.leftId, p.rightId]));

      const seenLeft = new Set();
      const seenRight = new Set();

      for (const pair of submittedPairs) {
        if (!pair || typeof pair.leftId !== 'string' || typeof pair.rightId !== 'string') {
          return { isCorrect: false, score: 0, maxScore: 1, reason: 'INVALID_PAIR_STRUCTURE' };
        }

        // Reject unknown IDs
        if (!expectedLeftIds.has(pair.leftId) || !expectedRightIds.has(pair.rightId)) {
          return { isCorrect: false, score: 0, maxScore: 1, reason: 'UNKNOWN_PAIR_ID' };
        }

        // Reject duplicates (enforcing bijection)
        if (seenLeft.has(pair.leftId) || seenRight.has(pair.rightId)) {
          return { isCorrect: false, score: 0, maxScore: 1, reason: 'DUPLICATE_PAIR_ID' };
        }

        seenLeft.add(pair.leftId);
        seenRight.add(pair.rightId);

        // Check relationship match
        if (expectedMap.get(pair.leftId) !== pair.rightId) {
          return { isCorrect: false, score: 0, maxScore: 1, reason: 'INCORRECT_MATCH' };
        }
      }

      return { isCorrect: true, score: 1, maxScore: 1 };
    }

    case 'FILL_BLANK': {
      let text = submittedAnswer;
      if (typeof submittedAnswer === 'object' && submittedAnswer !== null) {
        text = submittedAnswer.text;
      }

      if (typeof text !== 'string') {
        return { isCorrect: false, score: 0, maxScore: 1, reason: 'INVALID_TEXT_TYPE' };
      }

      const normalizedSubmitted = text.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!normalizedSubmitted) {
        return { isCorrect: false, score: 0, maxScore: 1, reason: 'EMPTY_TEXT' };
      }

      const accepted = (question.acceptedAnswers || []).map(a =>
        String(a).trim().toLowerCase().replace(/\s+/g, ' ')
      );

      const isCorrect = accepted.includes(normalizedSubmitted);
      return { isCorrect, score: isCorrect ? 1 : 0, maxScore: 1 };
    }

    case 'SIGN_PRACTICE': {
      // Phase 2 specification: SIGN_PRACTICE is unavailable for verified grading
      // until Phase 4 connects the trusted inference pipeline.
      return {
        isCorrect: false,
        score: 0,
        maxScore: 1,
        reason: 'SIGN_INFERENCE_UNAVAILABLE'
      };
    }

    default:
      return { isCorrect: false, score: 0, maxScore: 1, reason: 'UNSUPPORTED_QUESTION_TYPE' };
  }
}

/**
 * Authoritatively grade a full quiz.
 *
 * @param {Object} quizDoc - The full Quiz document from MongoDB.
 * @param {Array} submittedAnswers - Client-submitted answers array.
 * @returns {{ rawScore: number, maxScore: number, percentage: number, passed: boolean, results: Array }}
 */
export function gradeQuiz(quizDoc, submittedAnswers = []) {
  if (!quizDoc || !Array.isArray(quizDoc.questions)) {
    throw new Error('Invalid quiz document for grading');
  }

  const results = [];
  let rawScore = 0;
  let maxScore = 0;

  for (let i = 0; i < quizDoc.questions.length; i++) {
    const question = quizDoc.questions[i];
    const answer = submittedAnswers[i];
    const grade = gradeQuestion(question, answer);

    rawScore += grade.score;
    maxScore += grade.maxScore;

    results.push({
      questionIndex: i,
      questionId: question._id,
      type: question.type || 'MULTIPLE_CHOICE',
      isCorrect: grade.isCorrect,
      score: grade.score,
      maxScore: grade.maxScore,
      reason: grade.reason
    });
  }

  const percentage = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
  const passThreshold = typeof quizDoc.passingPercentage === 'number'
    ? quizDoc.passingPercentage
    : PASSING_THRESHOLD_PERCENT;

  const passed = percentage >= passThreshold;

  return {
    rawScore,
    maxScore,
    percentage,
    passed,
    passThreshold,
    results
  };
}
