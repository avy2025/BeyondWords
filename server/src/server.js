import { createServer } from 'http';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import initApp from './app.js';
import { initSockets } from './sockets/index.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ UNHANDLED REJECTION:', reason);
});

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Create HTTP Server
    const httpServer = createServer();

    // 3. Initialize App Logic
    const app = initApp(httpServer);
    httpServer.on('request', app);

    // 4. Initialize Sockets
    initSockets(httpServer);

    // 5. Listen
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`📡 PeerJS server ready at http://localhost:${PORT}/peerjs`);
      console.log(`🔌 Socket.IO ready`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
