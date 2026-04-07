import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Lesson from './src/models/Lesson.js';
import Quiz from './src/models/Quiz.js';

dotenv.config();

const lessons = [
  {
    title: "Linguistic Games",
    category: "INTERACTIVE",
    description: "Capture the essence of German idioms and preserve the 'unclothed' thought across dialects.",
    language: "German",
    difficulty: "Apprentice",
    order: 1,
    image: "/figmaAssets/container-7.svg"
  },
  {
    title: "Curation MCQs",
    category: "THEORY",
    description: "Master the editorial policy of BeyondWords through nuanced scenario-based tests.",
    language: "German",
    difficulty: "Explorer",
    order: 2,
    image: "/figmaAssets/container.svg"
  },
  {
    title: "Contextual Depth",
    category: "MASTERY",
    description: "Identify tone, cultural gravitas, and philological mastery in synchronized dialogue.",
    language: "German",
    difficulty: "Master",
    order: 3,
    image: "/figmaAssets/container-5.svg"
  }
];

const quizzes = [
  {
    // Questions for "Linguistic Games"
    questions: [
      {
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
    // Questions for "Curation MCQs"
    questions: [
      {
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
    // Questions for "Contextual Depth"
    questions: [
      {
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

const seedDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/beyond-words';
    await mongoose.connect(uri);
    console.log("Connected to MongoDB for seeding...");

    await Lesson.deleteMany({});
    await Quiz.deleteMany({});

    const createdLessons = await Lesson.insertMany(lessons);
    console.log(`Seeded ${createdLessons.length} lessons!`);

    for (let i = 0; i < createdLessons.length; i++) {
        if (quizzes[i]) {
            const quizData = {
                ...quizzes[i],
                lessonId: createdLessons[i]._id
            };
            await Quiz.create(quizData);
            console.log(`Seeded quiz for: ${createdLessons[i].title}`);
        }
    }

    console.log("Seeding complete.");
    mongoose.connection.close();
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedDB();

