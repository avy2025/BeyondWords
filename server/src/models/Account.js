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
    completedAt: { type: Date, default: Date.now }
  }],
  achievements: [{
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String },
    unlockedAt: { type: Date, default: Date.now }
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
