import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  peerId: { type: String, required: true },
  socketId: { type: String, required: true },
  lastSeen: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
export default User;
