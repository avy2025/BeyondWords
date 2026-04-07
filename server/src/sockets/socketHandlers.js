import {
  addUserToInMemRoom,
  removeUserFromInMemRoom,
  getInMemHost,
  isSocketHost,
  clearInMemRoom,
  getUsersInInMemRoom,
} from '../services/roomService.js';
import Message from '../models/Message.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import { sanitizeUserName, sanitizeText, sanitizeEmoji, sanitizeGestureLabel } from '../utils/sanitize.js';
import SignGesture from '../models/SignGesture.js';

const lastSignGesturePersisted = new Map();

export const registerSocketHandlers = (socket, io) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  // ── Join Room ──────────────────
  socket.on('join-room', async ({ roomId: rawRoomId, userName: rawUserName, peerId }) => {
    try {
      const roomId = sanitizeText(rawRoomId);
      const userName = sanitizeUserName(rawUserName);

      // Check room capacity
      const currentUsers = getUsersInInMemRoom(roomId);
      if (currentUsers.length >= 5) {
        return socket.emit('room-full', { message: 'This room is at its maximum capacity of 5 participants.' });
      }

      // 1. In-memory update
      const { users, isHost, hostPeerId } = addUserToInMemRoom(roomId, {
        peerId,
        userName,
        socketId: socket.id,
      });

      // 2. Persist room in DB asynchronously (if it doesn't already exist or to update its status)
      // We don't want to block the join with a DB write
      Room.findOneAndUpdate(
        { roomId },
        { $setOnInsert: { hostId: hostPeerId, status: 'active' } },
        { upsert: true, returnDocument: 'after' }
      ).catch((err) => console.error('❌ Error persisting Room metadata:', err));

      // 3. User persist logic
      User.findOneAndUpdate(
        { peerId },
        { userName, socketId: socket.id, lastSeen: Date.now() },
        { upsert: true, returnDocument: 'after' }
      ).catch((err) => console.error('❌ Error updating User metadata:', err));

      // 4. Socket operations
      socket.join(roomId);

      // Send current users already in the room back to the joiner
      const existingUsers = users.filter((u) => u.peerId !== peerId);
      socket.emit('room-users', existingUsers, hostPeerId);

      // Notify others in the room
      socket.to(roomId).emit('user-joined', { peerId, userName, hostPeerId });

      console.log(`👤 ${userName} (${isHost ? 'Host' : 'User'}) joined room: ${roomId}`);
    } catch (error) {
      console.error('❌ Join-room socket error:', error);
    }
  });

  // ── Chat Message ──────────────
  socket.on('chat-message', ({ roomId: rawRoomId, message: rawMessage, userName: rawUserName }) => {
    const roomId = sanitizeText(rawRoomId);
    const message = sanitizeText(rawMessage);
    const userName = sanitizeUserName(rawUserName);

    const payload = {
      userName,
      message,
      timestamp: Date.now(),
    };

    // 1. Instant broadcast to everyone in the room
    io.to(roomId).emit('chat-message', payload);

    // 2. Background DB save (non-blocking)
    const chatMsg = new Message({
      roomId,
      senderName: userName,
      text: message,
    });
    chatMsg.save().catch((err) => console.error('❌ Error saving chat message:', err));
  });

  // ── Host Controls ─────────────
  socket.on('end-meeting', ({ roomId }) => {
    if (isSocketHost(roomId, socket.id)) {
      console.log(`🛑 Host ended meeting in room: ${roomId}`);

      // 1. Notify all participants
      io.to(roomId).emit('meeting-ended', { message: 'The host has ended the meeting.' });

      // 2. Update DB status asynchronously
      Room.updateOne({ roomId }, { status: 'ended' }).catch(console.error);

      // 3. Clear from memory
      clearInMemRoom(roomId);
    }
  });

  socket.on('remove-participant', ({ roomId, peerId }) => {
    if (isSocketHost(roomId, socket.id)) {
      const roomUsers = getUsersInInMemRoom(roomId);
      const targetUser = roomUsers.find(u => u.peerId === peerId);
      
      if (targetUser) {
        console.log(`⚠️ Host removed participant: ${peerId} from room: ${roomId}`);
        // 1. Notify the specific user they were removed
        io.to(targetUser.socketId).emit('you-were-removed');
        // 2. Broadcast to everyone else
        io.to(roomId).emit('user-removed', { peerId });
      }
    }
  });

  socket.on('send-reaction', ({ roomId: rawRoomId, emoji: rawEmoji, peerId }) => {
    const roomId = sanitizeText(rawRoomId);
    const emoji = sanitizeEmoji(rawEmoji);

    // Broadcast reaction to everyone in the room (including sender)
    io.to(roomId).emit('receive-reaction', { emoji, peerId });
  });

  // ── Translation Subtitles (Relay) ──
  socket.on('send-subtitle', ({ roomId, peerId, translated, type }) => {
    // Simply relay the translated text from one client to all others in the room
    socket.to(roomId).emit('subtitle_update', {
      peerId,
      translated,
      type,
      latency: Date.now()
    });
  });

  // ── Sign language gestures (relay + optional MongoDB log) ──
  socket.on(
    'send-sign-gesture',
    ({
      roomId: rawRoomId,
      peerId,
      userName: rawUserName,
      label: rawLabel,
      confidence: rawConf,
      sentence: rawSentence,
    }) => {
      const roomId = sanitizeText(rawRoomId);
      const userName = sanitizeUserName(rawUserName);
      const label = sanitizeGestureLabel(rawLabel || '');
      const confidence =
        typeof rawConf === 'number' && !Number.isNaN(rawConf)
          ? Math.min(100, Math.max(0, rawConf))
          : 0;
      const sentence = typeof rawSentence === 'string' ? rawSentence.slice(0, 500) : '';

      socket.to(roomId).emit('sign_gesture_update', {
        peerId,
        label,
        confidence,
        sentence,
      });

      if (roomId && label && peerId) {
        const key = `${roomId}:${peerId}`;
        if (lastSignGesturePersisted.get(key) !== label) {
          lastSignGesturePersisted.set(key, label);
          SignGesture.create({
            roomId,
            peerId,
            userName,
            label,
            confidence,
          }).catch((err) => console.error('❌ Error saving sign gesture:', err));
        }
      }
    }
  );

  // ── Leave / Disconnect ────────
  const handleLeaveAction = () => {
    const { roomId, removedUser, newHost } = removeUserFromInMemRoom(socket.id);

    if (removedUser && roomId) {
      console.log(`👋 ${removedUser.userName} left room: ${roomId}`);

      // Notify others in the room
      socket.to(roomId).emit('user-left', {
        peerId: removedUser.peerId,
        userName: removedUser.userName,
        newHostPeerId: newHost ? newHost.peerId : null,
      });

      // Update room metadata if the last person left
      Room.findOne({ roomId }).then((room) => {
        if (room && room.status === 'active') {
          // You could optionally update the hostId here if it changed
        }
      });

      socket.leave(roomId);
    }
  };

  socket.on('leave-room', handleLeaveAction);
  socket.on('disconnect', () => {
    handleLeaveAction();
    console.log(`💔 Socket disconnected: ${socket.id}`);
  });
};
