import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  hostId: { type: String, default: null }, // peerId of the host
  status: { type: String, enum: ['active', 'ended'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  endedAt: { type: Date }
});

const Room = mongoose.model('Room', RoomSchema);
export default Room;
