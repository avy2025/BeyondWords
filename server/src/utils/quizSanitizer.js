import crypto from 'crypto';

/**
 * Fisher-Yates unbiased shuffle.
 * Creates a new array without mutating the source array.
 */
export function unbiasedShuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Sanitize a Quiz document into a secure client-facing DTO.
 * Guarantees that:
 * 1. 'correct' answer indexes are NEVER present.
 * 2. 'acceptedAnswers' are NEVER present.
 * 3. Matching answer pairs are severed and right-side items are safely shuffled.
 * 4. Stored MongoDB documents are never mutated.
 *
 * @param {Object} quizDoc - Raw Mongoose document or plain object.
 * @returns {Object} Sanitized Quiz DTO.
 */
export function sanitizeQuiz(quizDoc) {
  if (!quizDoc) return null;

  const raw = typeof quizDoc.toObject === 'function' ? quizDoc.toObject() : JSON.parse(JSON.stringify(quizDoc));

  return {
    _id: raw._id,
    lessonId: raw.lessonId,
    passingPercentage: raw.passingPercentage || 70,
    questions: (raw.questions || []).map((q, idx) => {
      const type = q.type || 'MULTIPLE_CHOICE';

      const baseQuestion = {
        _id: q._id,
        questionIndex: idx,
        type,
        prompt: q.prompt || q.idiom || 'Answer the following question:',
        // Nuance Game metadata (safe to display before answering)
        idiom: q.idiom,
        origin: q.origin
      };

      if (type === 'MULTIPLE_CHOICE') {
        return {
          ...baseQuestion,
          options: Array.isArray(q.options) ? [...q.options] : []
        };
      }

      if (type === 'MATCHING') {
        const matchingPairs = Array.isArray(q.matchingPairs) ? q.matchingPairs : [];
        const leftItems = matchingPairs.map(p => ({
          id: p.leftId || String(p.left),
          text: p.left
        }));

        const rightItems = matchingPairs.map(p => ({
          id: p.rightId || String(p.right),
          text: p.right
        }));

        return {
          ...baseQuestion,
          leftItems,
          rightItems: unbiasedShuffle(rightItems) // Safely shuffled, mapping severed!
        };
      }

      if (type === 'FILL_BLANK') {
        return {
          ...baseQuestion,
          blankText: q.blankText
        };
      }

      if (type === 'SIGN_PRACTICE') {
        return {
          ...baseQuestion,
          targetGestures: Array.isArray(q.targetGestures) ? [...q.targetGestures] : [],
          minConfidence: q.minConfidence || 75
        };
      }

      return baseQuestion;
    })
  };
}
