import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  // Question discriminant
  type: {
    type: String,
    enum: ['MULTIPLE_CHOICE', 'MATCHING', 'FILL_BLANK', 'SIGN_PRACTICE'],
    default: 'MULTIPLE_CHOICE'
  },
  prompt: { type: String },
  explanation: { type: String },

  // Legacy Nuance Game question fields (Preserved for 100% backward compatibility)
  idiom: { type: String },
  origin: { type: String },
  options: [{ type: String }],
  correct: { type: Number },
  nuance: { type: String },

  // Matching Question Fields
  matchingPairs: [{
    leftId: { type: String },
    left: { type: String },
    rightId: { type: String },
    right: { type: String }
  }],

  // Fill in the Blank Fields
  blankText: { type: String },
  acceptedAnswers: [{ type: String }],

  // Sign Practice Fields
  targetGestures: [{ type: String }],
  minConfidence: { type: Number, default: 75 },
  minStabilityFrames: { type: Number, default: 5 }
}, { _id: true });

const QuizSchema = new mongoose.Schema({
  lessonId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Lesson', 
    required: true,
    unique: true 
  },
  passingPercentage: {
    type: Number,
    default: 70
  },
  questions: [QuestionSchema]
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', QuizSchema);
export default Quiz;
