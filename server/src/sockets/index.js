import { Server } from 'socket.io';
import { registerSocketHandlers } from './socketHandlers.js';

export const initSockets = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
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
    registerSocketHandlers(socket, io);
  });

  return io;
};
