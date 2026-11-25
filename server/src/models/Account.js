import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const AccountSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  xp: { type: Number, default: 0 },
  rank: { type: String, default: 'Philologist Apprentice' },
  completedLessons: [{
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    score: { type: Number },
    status: { 
      type: String, 
      enum: ['PASSED', 'FAILED', 'LEGACY_UNKNOWN'] 
    },
    attemptsCount: { type: Number, default: 1 },
    bestScore: { type: Number },
    completedAt: { type: Date, default: Date.now }
  }],
  lessonStageProgress: [{
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    completedStages: [{
      type: String,
      enum: ['LEARN', 'GUIDED_PRACTICE', 'PRACTICE_CHALLENGE', 'REVISION']
    }]
  }],
  // Practice-only progress for the ASL alphabet classroom. Never awards XP.
  aslAlphabetProgress: [{
    lessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
    studiedLetters: [{ type: String, match: /^[A-Z]$/ }],
    completedActivities: [{
      type: String,
      enum: ['LETTER_IDENTIFICATION', 'ALPHABET_CHALLENGE', 'REVISION']
    }],
    challenge: {
      attempts: { type: Number, default: 0 },
      bestCorrect: { type: Number, default: 0 },
      bestTotal: { type: Number, default: 0 },
      lastCorrect: { type: Number, default: 0 },
      lastTotal: { type: Number, default: 0 },
      missedLetters: [{ type: String, match: /^[A-Z]$/ }],
      updatedAt: { type: Date, default: Date.now }
    },
    updatedAt: { type: Date, default: Date.now }
  }],
  achievements: [{
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String },
    unlockedAt: { type: Date, default: Date.now }
  }],
  // Atomic ledger tracking applied XP grants to prevent duplicate XP awarding
  appliedGrantKeys: [{
    type: String
  }],
  createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
AccountSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

// Compare password method
AccountSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Account = mongoose.model('Account', AccountSchema);
export default Account;
