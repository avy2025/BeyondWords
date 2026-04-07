import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/beyond-words';
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    console.log(`📡 MongoDB Connected: ${conn.connection.host}`);

    // Drop stale indexes if found
    try {
      const collections = await conn.connection.db.listCollections({ name: 'users' }).toArray();
      if (collections.length > 0) {
        await conn.connection.db.collection('users').dropIndex('username_1').catch(() => {});
        await conn.connection.db.collection('users').dropIndex('email_1').catch(() => {});
        console.log('✅ Cleaned up stale user indexes (if any)');
      }
    } catch (e) {
      // Ignore errors if indexes don't exist
    }
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    console.log('⚠️ Running in signaling-only mode (No DB persistence)');
  }
};

export default connectDB;
