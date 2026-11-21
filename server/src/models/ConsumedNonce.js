import mongoose from 'mongoose';

const ConsumedNonceSchema = new mongoose.Schema({
  nonce: { 
    type: String, 
    required: true, 
    unique: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account', 
    required: true,
    index: true 
  },
  lessonId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Lesson' 
  },
  consumedAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date, 
    required: true 
  }
});

// TTL index to automatically purge expired nonces after expiresAt has passed
ConsumedNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ConsumedNonce = mongoose.model('ConsumedNonce', ConsumedNonceSchema);
export default ConsumedNonce;
