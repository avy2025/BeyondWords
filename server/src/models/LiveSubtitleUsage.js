import mongoose from 'mongoose';

// Usage metadata only. No transcript text, audio, or participant content is stored.
const LiveSubtitleUsageSchema = new mongoose.Schema({
  monthKey: { type: String, required: true, unique: true },
  usedSeconds: { type: Number, default: 0, min: 0 },
});

const LiveSubtitleUsage = mongoose.model('LiveSubtitleUsage', LiveSubtitleUsageSchema);
export default LiveSubtitleUsage;
