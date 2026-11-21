import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lesson from './src/models/Lesson.js';
import Quiz from './src/models/Quiz.js';

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
    quizzesPreserved: 0
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
