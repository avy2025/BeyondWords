/**
 * Sliding-window rate limiter per user ID across sessions.
 * Independent of client sessions, preventing abuse via session rotation or browser restarts.
 */
export function createRateLimiter({ windowMs = 60000, maxRequests = 30, message = 'Too many requests. Please try again later.' } = {}) {
  const requestHistory = new Map(); // Map<string, number[]>

  // Periodic cleanup of expired entries
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of requestHistory.entries()) {
      const valid = timestamps.filter(t => now - t < windowMs);
      if (valid.length === 0) {
        requestHistory.delete(key);
      } else {
        requestHistory.set(key, valid);
      }
    }
  }, Math.max(windowMs, 30000));

  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    const key = req.user && req.user._id ? String(req.user._id) : (req.ip || 'anonymous');
    const now = Date.now();
    const timestamps = requestHistory.get(key) || [];

    // Filter to current window
    const recent = timestamps.filter(t => now - t < windowMs);

    if (recent.length >= maxRequests) {
      return res.status(429).json({
        message,
        retryAfterMs: windowMs - (now - recent[0])
      });
    }

    recent.push(now);
    requestHistory.set(key, recent);
    next();
  };
}

// Pre-configured rate limiters
export const stepVerificationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 40,
  message: 'Verification rate limit exceeded across sessions. Please pause before trying again.'
});

export const sessionCreationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many assessment sessions created. Please complete your existing session.'
});

export const assessmentSubmitLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  message: 'Assessment submission rate limit exceeded. Please wait a moment.'
});
