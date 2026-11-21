import mongoose from 'mongoose';

const XpGrantLedgerSchema = new mongoose.Schema({
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
  grantType: { 
    type: String, 
    enum: ['FIRST_PASS', 'PERFECT_SCORE', 'STREAK'],
    default: 'FIRST_PASS',
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'COMMITTED'], 
    default: 'PENDING',
    required: true,
    index: true 
  },
  attemptId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AssessmentAttempt' 
  },
  grantKey: { 
    type: String, 
    required: true,
    unique: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  committedAt: { 
    type: Date 
  }
}, { timestamps: true });

// Enforce that each XP grant type can only be granted ONCE per user and lesson
XpGrantLedgerSchema.index(
  { userId: 1, lessonId: 1, grantType: 1 }, 
  { unique: true }
);

const XpGrantLedger = mongoose.model('XpGrantLedger', XpGrantLedgerSchema);
export default XpGrantLedger;
