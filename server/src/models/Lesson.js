import mongoose from 'mongoose';

const ContentBlockSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'CONCEPT_INTRO',
      'EXPLANATION',
      'VOCABULARY_DECK',
      'VOCABULARY',
      'GRAMMAR_ANALYSIS',
      'GRAMMAR_RULE',
      'PRONUNCIATION',
      'DIALOGUE_CONTEXT',
      'EXAMPLE_DIALOGUE',
      'GESTURE_GUIDE',
      'FORMATIVE_DRILL',
      'PRACTICE_DRILL',
      'REVISION_RECAP',
      'REVISION_SUMMARY'
    ],
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, { _id: false });

const LessonSchema = new mongoose.Schema({
  // Existing fields (100% preserved)
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['INTERACTIVE', 'THEORY', 'MASTERY'], 
    required: true 
  },
  language: { type: String, default: 'German' },
  difficulty: { 
    type: String, 
    enum: ['Apprentice', 'Explorer', 'Master', 'Sage'], 
    default: 'Apprentice' 
  },
  order: { type: Number, required: true },
  image: { type: String },

  // Phase 1B extensions (All optional to preserve existing records)
  academy: {
    type: String,
    enum: ['SIGN_LANGUAGE', 'GERMAN', 'NUANCE_GAME'],
    index: true
  },
  level: {
    type: Number,
    index: true
  },
  xpReward: {
    type: Number,
    min: 0
  },
  lessonType: {
    type: String,
    enum: ['THEORY', 'PRACTICE', 'REVISION', 'ASSESSMENT'],
    default: 'THEORY'
  },
  stableKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  contentBlocks: {
    type: [ContentBlockSchema],
    default: undefined
  }
}, { timestamps: true });

const Lesson = mongoose.model('Lesson', LessonSchema);
export default Lesson;
