import mongoose from 'mongoose';

const AssessmentAttemptSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account', 
    required: true,
    index: true 
  },
  lessonId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Lesson', 
    required: true,
    index: true 
  },
  academy: { 
    type: String, 
    enum: ['SIGN_LANGUAGE', 'GERMAN', 'NUANCE_GAME'], 
    required: true,
    index: true 
  },
  attemptNumber: { 
    type: Number, 
    required: true 
  },
  answers: { 
    type: mongoose.Schema.Types.Mixed 
  },
  score: { 
    type: Number, 
    required: true 
  },
  maxScore: { 
    type: Number, 
    required: true 
  },
  percentage: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['STARTED', 'SUBMITTED', 'EVALUATED', 'COMPLETED', 'FAILED'], 
    default: 'SUBMITTED',
    required: true,
    index: true 
  },
  startedAt: { 
    type: Date, 
    default: Date.now 
  },
  submittedAt: { 
    type: Date, 
    default: Date.now 
  },
  idempotencyKey: { 
    type: String, 
    required: true 
  }
}, { timestamps: true });

// Prevent duplicate submission evaluations for the same client idempotency key
AssessmentAttemptSchema.index(
  { userId: 1, lessonId: 1, idempotencyKey: 1 }, 
  { unique: true }
);

// Fast lookups for user attempts on a lesson in order
AssessmentAttemptSchema.index(
  { userId: 1, lessonId: 1, attemptNumber: 1 }
);

const AssessmentAttempt = mongoose.model('AssessmentAttempt', AssessmentAttemptSchema);
export default AssessmentAttempt;
