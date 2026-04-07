import express from 'express';
import cors from 'cors';
import { ExpressPeerServer } from 'peer';
import roomRoutes from './routes/roomRoutes.js';
import authRoutes from './routes/authRoutes.js';
import learningRoutes from './routes/learningRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';
import errorMiddleware from './middleware/errorMiddleware.js';

const initApp = (httpServer) => {
  const app = express();

  // ── Middleware ────────────────
  app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'https://beyond-words-app.vercel.app',
    ],
    credentials: true,
  }));
  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // ── PeerJS Server ──────────────
  const peerServer = ExpressPeerServer(httpServer, {
    debug: true,
    path: '/',
    proxied: true, // Mark as proxied if behind Vite or Nginx
  });

  peerServer.on('error', (err) => {
    console.error('❌ PeerJS background error:', err.message);
  });

  peerServer.on('connection', (client) => {
    console.log(`🔗 PeerJS client connected: ${client.getId()}`);
  });

  app.use('/peerjs', peerServer);

  // ── Routes ───────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/learning', learningRoutes);
  app.use('/api/voice', voiceRoutes);

  // ── Error Handling ────────────
  app.use(errorMiddleware);

  return app;
};

export default initApp;
