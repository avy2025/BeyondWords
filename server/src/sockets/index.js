import { Server } from 'socket.io';
import { registerCaptionHandlers } from './captionHandlers.js';
import { registerCaptionTranscriptionHandlers } from './captionTranscriptionHandlers.js';
import { registerParticipantSubtitleHandlers } from './participantSubtitleHandlers.js';
import { registerSocketHandlers } from './socketHandlers.js';

export const initSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'https://beyond-words-app.vercel.app',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Allow both polling and websocket so the client can upgrade gracefully.
    // In development with Vite proxy, 'polling' provides the initial handshake,
    // and 'websocket' provides the high-performance signaling needed for WebRTC.
    transports: ['polling', 'websocket'],
  });

  io.on('connection', (socket) => {
    // Caption Host handlers are additive and run first so meeting-end cleanup
    // can validate room host membership before the legacy handler clears it.
    registerCaptionHandlers(socket, io);
    registerCaptionTranscriptionHandlers(socket, io);
    registerParticipantSubtitleHandlers(socket, io);
    registerSocketHandlers(socket, io);
  });

  return io;
};
