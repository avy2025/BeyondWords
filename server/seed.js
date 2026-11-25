import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lesson from './src/models/Lesson.js';
import Quiz from './src/models/Quiz.js';
import { germanLessons, germanQuizzes } from './src/seeds/germanCurriculum.js';
import { aslLessons, aslQuizzes } from './src/seeds/aslCurriculum.js';
import {
  aslPhase42Lessons,
  aslPhase42Quizzes,
  aslPhase42BaseExplanations
} from './src/seeds/aslPhase42Curriculum.js';

dotenv.config();

export const legacyNuanceLessons = [
  {
    stableKey: "nuance_idioms_1",
    academy: "NUANCE_GAME",
    level: 1,
    lessonType: "ASSESSMENT",
    title: "Linguistic Games",
    category: "INTERACTIVE",
    description: "Capture the essence of German idioms and preserve the 'unclothed' thought across dialects.",
    language: "German",
    difficulty: "Apprentice",
    order: 1,
    image: "/figmaAssets/container-7.svg"
  },
  {
    stableKey: "nuance_curation_2",
    academy: "NUANCE_GAME",
    level: 2,
    lessonType: "ASSESSMENT",
    title: "Curation MCQs",
    category: "THEORY",
    description: "Master the editorial policy of BeyondWords through nuanced scenario-based tests.",
    language: "German",
    difficulty: "Explorer",
    order: 2,
    image: "/figmaAssets/container.svg"
  },
  {
    stableKey: "nuance_depth_3",
    academy: "NUANCE_GAME",
    level: 3,
    lessonType: "ASSESSMENT",
    title: "Contextual Depth",
    category: "MASTERY",
    description: "Identify tone, cultural gravitas, and philological mastery in synchronized dialogue.",
    language: "German",
    difficulty: "Master",
    order: 3,
    image: "/figmaAssets/container-5.svg"
  }
];

export const legacyNuanceQuizzes = [
  {
    stableKey: "nuance_idioms_1",
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        idiom: "Das ist nicht mein Bier",
        origin: "German Idiom",
        options: [
          "I don't like beer",
          "That's none of my business",
          "I'm not paying for this",
          "That's not my problem"
        ],
        correct: 1,
        nuance: "Literally 'That is not my beer'. It signifies that you have no stake or interest in a particular matter."
      },
      {
        type: "MULTIPLE_CHOICE",
        idiom: "Um den heißen Brei herumreden",
        origin: "German Idiom",
        options: [
          "To talk about food",
          "To beat around the bush",
          "To be hungry",
          "To speak quickly"
        ],
        correct: 1,
        nuance: "Literally 'To talk around the hot porridge'. It refers to avoiding the main point of a conversation."
      },
      {
        type: "MULTIPLE_CHOICE",
        idiom: "Da steppt der Bär",
        origin: "German Idiom",
        options: [
          "The bear is dancing",
          "It's a boring party",
          "It's going to be a great party",
          "Watch out for bears"
        ],
        correct: 2,
        nuance: "Literally 'The bear is tap-dancing there'. Used when a place is very lively or a party is great."
      }
    ]
  },
  {
    stableKey: "nuance_curation_2",
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        idiom: "Gedanken sind frei",
        origin: "Philosophy",
        options: [
          "Thoughts are expensive",
          "Thoughts are free",
          "Think before you speak",
          "Freedom of speech"
        ],
        correct: 1,
        nuance: "A famous German song and philosophical concept: no one can know what you think, and thus your thoughts are truly free."
      },
      {
        type: "MULTIPLE_CHOICE",
        idiom: "Wer rastet, der rostet",
        origin: "Proverb",
        options: [
          "Rest is good",
          "Use it or lose it",
          "Rust is dangerous",
          "Don't stop moving"
        ],
        correct: 1,
        nuance: "Literally 'He who rests, rusts'. It encourages continuous activity and self-improvement."
      }
    ]
  },
  {
    stableKey: "nuance_depth_3",
    questions: [
      {
        type: "MULTIPLE_CHOICE",
        idiom: "Schadenfreude",
        origin: "Cultural Nuance",
        options: [
          "Joy in someone's success",
          "Joy in someone's misfortune",
          "Crying for help",
          "Fear of shadows"
        ],
        correct: 1,
        nuance: "One of the most famous German words. It describes the complex emotion of finding pleasure in others' troubles."
      },
      {
        type: "MULTIPLE_CHOICE",
        idiom: "Fernweh",
        origin: "Cultural Nuance",
        options: [
          "Homesickness",
          "Fear of traveling",
          "Longing for distant places",
          "Pain in the distance"
        ],
        correct: 2,
        nuance: "The opposite of homesickness (Heimweh). It's the ache to travel and see the world."
      }
    ]
  }
];

/**
 * Idempotent, safe seed function.
 * Never deletes records.
 * Preserves existing MongoDB _id values.
 * Does not overwrite manual editorial revisions.
 */
export async function seedDB({ log = true } = {}) {
  const results = {
    lessonsCreated: 0,
    lessonsUpdated: 0,
    lessonsPreserved: 0,
    quizzesCreated: 0,
    quizzesPreserved: 0,
    aslEnrichmentBlocksAdded: 0,
    aslEnrichmentQuestionsAdded: 0,
    aslExplanationsImproved: 0
  };

  for (let i = 0; i < legacyNuanceLessons.length; i++) {
    const item = legacyNuanceLessons[i];
    let lessonDoc = null;

    // 1. Try finding by stableKey first
    if (item.stableKey) {
      lessonDoc = await Lesson.findOne({ stableKey: item.stableKey });
    }

    // 2. If not found by stableKey, attempt matching legacy document by exact composite criteria
    if (!lessonDoc) {
      const legacyQuery = {
        language: "German",
        order: item.order,
        category: item.category,
        title: item.title
      };

      const matches = await Lesson.find(legacyQuery);
      if (matches.length > 1) {
        throw new Error(
          `[SEED ABORTED] Ambiguous duplicate legacy lessons found for order ${item.order} (${item.title}). Manual inspection required.`
        );
      }

      if (matches.length === 1) {
        // Exactly one match found: attach stableKey and academy metadata while preserving existing _id and content
        lessonDoc = matches[0];
        lessonDoc.stableKey = item.stableKey;
        lessonDoc.academy = item.academy;
        lessonDoc.level = item.level;
        lessonDoc.lessonType = item.lessonType;
        await lessonDoc.save();
        results.lessonsUpdated++;
        if (log) console.log(`[SEED] Linked existing legacy lesson: "${lessonDoc.title}" (ID: ${lessonDoc._id}) to ${item.stableKey}`);
      }
    } else {
      results.lessonsPreserved++;
    }

    // 3. If still not found, create new lesson safely with setOnInsert
    if (!lessonDoc) {
      lessonDoc = await Lesson.create(item);
      results.lessonsCreated++;
      if (log) console.log(`[SEED] Created new lesson: "${lessonDoc.title}" with stableKey: ${item.stableKey}`);
    }

    // 4. Handle Quiz idempotently
    const quizData = legacyNuanceQuizzes[i];
    if (quizData && lessonDoc) {
      const existingQuiz = await Quiz.findOne({ lessonId: lessonDoc._id });
      if (!existingQuiz) {
        await Quiz.create({
          lessonId: lessonDoc._id,
          passingPercentage: 70,
          questions: quizData.questions
        });
        results.quizzesCreated++;
        if (log) console.log(`[SEED] Created quiz for: "${lessonDoc.title}"`);
      } else {
        results.quizzesPreserved++;
      }
    }
  }

  // 5. Handle German Academy Curriculum (Levels 1 - 10) Idempotently
  for (let i = 0; i < germanLessons.length; i++) {
    const item = germanLessons[i];
    let lessonDoc = await Lesson.findOne({ stableKey: item.stableKey });

    if (!lessonDoc) {
      lessonDoc = await Lesson.create(item);
      results.lessonsCreated++;
      if (log) console.log(`[SEED] Created German Academy lesson: "${lessonDoc.title}" (${item.stableKey})`);
    } else {
      // Keep existing record updated with curriculum blocks while preserving its _id
      lessonDoc.title = item.title;
      lessonDoc.description = item.description;
      lessonDoc.academy = item.academy;
      lessonDoc.level = item.level;
      lessonDoc.lessonType = item.lessonType;
      lessonDoc.xpReward = item.xpReward;
      lessonDoc.contentBlocks = item.contentBlocks;
      await lessonDoc.save();
      results.lessonsPreserved++;
    }

    // 6. German Quiz idempotent handling
    const quizData = germanQuizzes.find(q => q.stableKey === item.stableKey);
    if (quizData && lessonDoc) {
      const existingQuiz = await Quiz.findOne({ lessonId: lessonDoc._id });
      if (!existingQuiz) {
        await Quiz.create({
          lessonId: lessonDoc._id,
          passingPercentage: 70,
          questions: quizData.questions
        });
        results.quizzesCreated++;
        if (log) console.log(`[SEED] Created German Quiz for: "${lessonDoc.title}" (${quizData.questions.length} questions)`);
      } else {
        existingQuiz.questions = quizData.questions;
        existingQuiz.passingPercentage = 70;
        await existingQuiz.save();
        results.quizzesPreserved++;
      }
    }
  }

  // 7. ASL Academy Curriculum (Levels 1 - 10), insert-only to preserve editorial work and IDs
  for (let i = 0; i < aslLessons.length; i++) {
    const item = aslLessons[i];
    let lessonDoc = await Lesson.findOne({ stableKey: item.stableKey });

    if (!lessonDoc) {
      lessonDoc = await Lesson.create(item);
      results.lessonsCreated++;
      if (log) console.log(`[SEED] Created ASL Academy lesson: "${lessonDoc.title}" (${item.stableKey})`);
    } else {
      results.lessonsPreserved++;
    }

    const quizData = aslQuizzes[i];
    const existingQuiz = await Quiz.findOne({ lessonId: lessonDoc._id });
    if (!existingQuiz) {
      await Quiz.create({
        lessonId: lessonDoc._id,
        passingPercentage: 70,
        questions: quizData.questions
      });
      results.quizzesCreated++;
      if (log) console.log(`[SEED] Created ASL Quiz for: "${lessonDoc.title}"`);
    } else {
      results.quizzesPreserved++;
    }
  }

  // 8. Phase 4.1: backfill only missing alphabet-classroom fields on the
  // existing Level 1 lesson. Editorial text, IDs, progress, and quiz data stay
  // untouched; a missing visual notice is restored as an honest placeholder.
  const alphabetTemplate = aslLessons[0]?.contentBlocks?.find(block => block.type === 'GESTURE_GUIDE');
  const existingLevelOne = alphabetTemplate
    ? await Lesson.findOne({ stableKey: 'asl_level_01' })
    : null;
  const existingGuide = existingLevelOne?.contentBlocks?.find(block => block.type === 'GESTURE_GUIDE');
  if (existingGuide) {
    let guideChanged = false;
    const templateData = alphabetTemplate.data;

    for (const canonicalLetter of templateData.letters || []) {
      const existingLetter = (existingGuide.data?.letters || []).find(
        letter => letter.letter === canonicalLetter.letter
      );
      if (!existingLetter) continue;
      for (const field of ['orientation', 'movement', 'tip']) {
        const value = existingLetter[field];
        if (value === undefined || value === null || value === '') {
          existingLetter[field] = canonicalLetter[field];
          guideChanged = true;
        }
      }
    }

    if (!existingGuide.data?.visualNotice && templateData.visualNotice) {
      existingGuide.data.visualNotice = templateData.visualNotice;
      guideChanged = true;
    }

    if (guideChanged) {
      existingLevelOne.markModified?.('contentBlocks');
      await existingLevelOne.save();
      results.lessonsUpdated++;
      if (log) console.log('[SEED] Backfilled missing ASL Level 1 alphabet fields without overwriting editorial values.');
    }
  }

  // 9. Phase 4.2: additive ASL enrichment. Only append blocks/questions whose
  // stable key or prompt is missing. Existing IDs, editorial text, quiz answer
  // keys, account progress, and German/Nuance data are not touched.
  for (const enrichment of aslPhase42Lessons) {
    const lessonDoc = await Lesson.findOne({ stableKey: enrichment.stableKey });
    if (!lessonDoc) continue;

    const contentBlocks = Array.isArray(lessonDoc.contentBlocks) ? [...lessonDoc.contentBlocks] : [];
    const canonicalPairs = [
      ['LEARN', 'CONCEPT_INTRO'],
      ['LEARN', 'EXPLANATION'],
      ['GUIDED_PRACTICE', 'FORMATIVE_DRILL'],
      ['PRACTICE_CHALLENGE', 'PRACTICE_DRILL'],
      ['REVISION', 'REVISION_RECAP']
    ];
    const isCanonicalLesson = canonicalPairs.every(([stage, type]) =>
      contentBlocks.some(block => block?.data?.stage === stage && block?.type === type)
    );
    if (!isCanonicalLesson) {
      // Do not enrich a lesson whose original teaching structure was replaced.
      continue;
    }
    let lessonChanged = false;

    for (const block of enrichment.contentBlocks) {
      const enrichmentKey = block.data?.enrichmentKey;
      const alreadyPresent = contentBlocks.some(
        existing => existing?.data?.enrichmentKey === enrichmentKey
      );
      if (alreadyPresent) continue;
      contentBlocks.push(block);
      lessonChanged = true;
      results.aslEnrichmentBlocksAdded++;
    }

    if (lessonChanged) {
      lessonDoc.contentBlocks = contentBlocks;
      lessonDoc.markModified?.('contentBlocks');
      await lessonDoc.save();
      results.lessonsUpdated++;
      if (log) console.log(`[SEED] Added Phase 4.2 enrichment to ASL ${enrichment.stableKey}.`);
    }
  }

  for (const enrichment of aslPhase42Quizzes) {
    const lessonDoc = await Lesson.findOne({ stableKey: enrichment.stableKey });
    if (!lessonDoc) continue;
    const quizDoc = await Quiz.findOne({ lessonId: lessonDoc._id });
    if (!quizDoc) continue;

    const questions = Array.isArray(quizDoc.questions) ? [...quizDoc.questions] : [];
    const canonicalPrompts = (aslQuizzes.find(quiz => quiz.stableKey === enrichment.stableKey)?.questions || [])
      .map(question => question.prompt);
    const isCanonicalQuiz = canonicalPrompts.length > 0 &&
      canonicalPrompts.every(prompt => questions.some(question => question?.prompt === prompt));
    if (!isCanonicalQuiz) {
      // An editorially revised quiz is left completely alone.
      continue;
    }
    let quizChanged = false;

    for (const question of enrichment.questions) {
      if (questions.some(existing => existing?.prompt === question.prompt)) continue;
      questions.push(question);
      quizChanged = true;
      results.aslEnrichmentQuestionsAdded++;
    }

    const explanationMap = aslPhase42BaseExplanations[enrichment.stableKey] || {};
    for (const question of questions) {
      const improved = explanationMap[question?.prompt];
      if (!improved) continue;
      const isGeneric = !question.explanation || /^Review Level \d+:/.test(question.explanation);
      if (!isGeneric) continue;
      question.explanation = improved;
      quizChanged = true;
      results.aslExplanationsImproved++;
    }

    if (quizChanged) {
      quizDoc.questions = questions;
      quizDoc.markModified?.('questions');
      await quizDoc.save();
      if (log) console.log(`[SEED] Added Phase 4.2 questions to ASL ${enrichment.stableKey}.`);
    }
  }

  return results;
}

// Direct execution guard
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  (async () => {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/beyond-words';
      await mongoose.connect(uri);
      console.log("Connected to MongoDB for safe seeding...");
      const summary = await seedDB({ log: true });
      console.log("Safe seeding complete summary:", summary);
      await mongoose.disconnect();
    } catch (err) {
      console.error("Safe seeding error:", err);
      process.exit(1);
    }
  })();
}
