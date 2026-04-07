import mongoose from 'mongoose';

const signGestureSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  peerId: { type: String, default: '' },
  userName: { type: String, default: 'Guest' },
  label: { type: String, default: '' },
  confidence: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('SignGesture', signGestureSchema);
