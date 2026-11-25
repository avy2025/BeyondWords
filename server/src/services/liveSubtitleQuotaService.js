import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { F0_LIMITS } from '../../../client/shared/liveSubtitles.js';
import LiveSubtitleUsage from '../models/LiveSubtitleUsage.js';

const MAX_REPORT_SECONDS = 15 * 60;
const MONTHLY_LIMIT = F0_LIMITS.monthlyAudioSeconds;
const SESSION_MS = F0_LIMITS.tokenValiditySeconds * 1000;

const activeSessions = new Map();
const fallbackMonthlyUsage = new Map();
const pendingReports = new Map();

const monthKey = (now = Date.now()) => {
  const date = new Date(now);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const pruneExpiredSessions = (now = Date.now()) => {
  for (const [id, session] of activeSessions.entries()) {
    if (session.expiresAt <= now) activeSessions.delete(id);
  }
};

const dbReady = () => mongoose.connection.readyState === 1;

const readUsedSeconds = async (key) => {
  if (dbReady()) {
    const record = await LiveSubtitleUsage.findOne({ monthKey: key }).lean();
    return record?.usedSeconds || 0;
  }
  return fallbackMonthlyUsage.get(key) || 0;
};

const addUsedSeconds = async (key, seconds) => {
  if (seconds <= 0) return readUsedSeconds(key);
  if (dbReady()) {
    const record = await LiveSubtitleUsage.findOneAndUpdate(
      { monthKey: key },
      { $inc: { usedSeconds: seconds } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return record?.usedSeconds || 0;
  }
  const next = (fallbackMonthlyUsage.get(key) || 0) + seconds;
  fallbackMonthlyUsage.set(key, next);
  return next;
};

const makeError = (code, message, status) => {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
};

export const issueLiveSubtitleSession = async ({
  accountId,
  roomId,
  peerId,
  sessionId,
  now = Date.now(),
}) => {
  pruneExpiredSessions(now);

  // A renewal reuses the same F0 lease instead of requesting a second concurrent stream.
  if (sessionId && activeSessions.has(sessionId)) {
    const existing = activeSessions.get(sessionId);
    if (existing.accountId !== String(accountId) || existing.roomId !== roomId || existing.peerId !== peerId) {
      throw makeError('INVALID_SUBTITLE_SESSION', 'Unknown or expired subtitle session.', 401);
    }
    const used = await readUsedSeconds(monthKey(now));
    return {
      sessionId: existing.sessionId,
      expiresAt: existing.expiresAt,
      renewed: true,
      quota: {
        usedSeconds: used,
        limitSeconds: MONTHLY_LIMIT,
        remainingSeconds: Math.max(0, MONTHLY_LIMIT - used),
      },
      limits: {
        maxConcurrentRequests: F0_LIMITS.maxConcurrentRequests,
        monthlyAudioSeconds: MONTHLY_LIMIT,
        renewAfterMs: F0_LIMITS.recommendedRenewAfterSeconds * 1000,
      },
    };
  }

  const used = await readUsedSeconds(monthKey(now));
  if (used >= MONTHLY_LIMIT) {
    throw makeError(
      'F0_QUOTA_EXHAUSTED',
      'The monthly Azure Speech F0 audio quota is exhausted. Live subtitles are unavailable until the next billing month.',
      429
    );
  }

  if (activeSessions.size >= F0_LIMITS.maxConcurrentRequests) {
    throw makeError(
      'F0_CONCURRENCY_LIMIT',
      'Azure Speech F0 allows one live subtitle session at a time. Wait for the active session to end.',
      409
    );
  }

  const session = {
    sessionId: randomUUID(),
    accountId: String(accountId),
    roomId,
    peerId,
    startedAt: now,
    expiresAt: now + SESSION_MS,
    reportedSeconds: 0,
  };
  activeSessions.set(session.sessionId, session);

  return {
    sessionId: session.sessionId,
    expiresAt: session.expiresAt,
    quota: {
      usedSeconds: used,
      limitSeconds: MONTHLY_LIMIT,
      remainingSeconds: Math.max(0, MONTHLY_LIMIT - used),
    },
    limits: {
      maxConcurrentRequests: F0_LIMITS.maxConcurrentRequests,
      monthlyAudioSeconds: MONTHLY_LIMIT,
      renewAfterMs: F0_LIMITS.recommendedRenewAfterSeconds * 1000,
    },
  };
};

export const releaseLiveSubtitleSession = ({ sessionId, accountId }) => {
  const session = activeSessions.get(sessionId);
  if (!session) return false;
  if (accountId && session.accountId !== String(accountId)) return false;
  activeSessions.delete(sessionId);
  return true;
};

export const releaseLiveSubtitleSessionsForAccount = (accountId) => {
  let released = 0;
  for (const [id, session] of activeSessions.entries()) {
    if (session.accountId === String(accountId)) {
      activeSessions.delete(id);
      released += 1;
    }
  }
  return released;
};

export const reportLiveSubtitleUsage = async ({
  sessionId,
  accountId,
  audioSeconds,
  now = Date.now(),
}) => {
  pruneExpiredSessions(now);

  const session = activeSessions.get(sessionId);
  if (!session || (accountId && session.accountId !== String(accountId))) {
    throw makeError('INVALID_SUBTITLE_SESSION', 'Unknown or expired subtitle session.', 401);
  }
  if (typeof audioSeconds !== 'number' || !Number.isFinite(audioSeconds) || audioSeconds < 0) {
    throw makeError('INVALID_USAGE_REPORT', 'Invalid audio usage report.', 400);
  }

  if (pendingReports.has(sessionId)) {
    await pendingReports.get(sessionId).catch(() => {});
  }

  const task = (async () => {
    const current = activeSessions.get(sessionId);
    if (!current) {
      throw makeError('INVALID_SUBTITLE_SESSION', 'Unknown or expired subtitle session.', 401);
    }

    const cumulative = Math.min(audioSeconds, current.reportedSeconds + MAX_REPORT_SECONDS);
    const delta = Math.max(0, cumulative - current.reportedSeconds);
    const key = monthKey(now);
    const used = await readUsedSeconds(key);
    const allowance = Math.max(0, MONTHLY_LIMIT - used);
    const counted = Math.min(delta, allowance);

    let total;
    try {
      total = await addUsedSeconds(key, counted);
    } catch {
      throw makeError(
        'USAGE_TRACKING_FAILED',
        'Live subtitle usage could not be recorded. Subtitles were stopped to protect the F0 quota.',
        503
      );
    }
    current.reportedSeconds = cumulative;

    if (delta > allowance) {
      throw makeError(
        'F0_QUOTA_EXHAUSTED',
        'The monthly Azure Speech F0 audio quota was reached. Live subtitles have stopped.',
        429
      );
    }

    return {
      usedSeconds: total,
      limitSeconds: MONTHLY_LIMIT,
      remainingSeconds: Math.max(0, MONTHLY_LIMIT - total),
    };
  })();

  pendingReports.set(sessionId, task);
  try {
    return await task;
  } finally {
    pendingReports.delete(sessionId);
  }
};

export const getLiveSubtitleQuotaStatus = async ({ accountId, now = Date.now() } = {}) => {
  pruneExpiredSessions(now);
  const used = await readUsedSeconds(monthKey(now));
  const active = accountId
    ? [...activeSessions.values()].find((session) => session.accountId === String(accountId))
    : [...activeSessions.values()][0];

  return {
    usedSeconds: used,
    limitSeconds: MONTHLY_LIMIT,
    remainingSeconds: Math.max(0, MONTHLY_LIMIT - used),
    maxConcurrentRequests: F0_LIMITS.maxConcurrentRequests,
    activeSession: active
      ? {
          sessionId: active.sessionId,
          roomId: active.roomId,
          expiresAt: active.expiresAt,
        }
      : null,
  };
};

export const resetLiveSubtitleQuotaForTests = () => {
  activeSessions.clear();
  fallbackMonthlyUsage.clear();
  pendingReports.clear();
};

export const liveSubtitleQuotaService = {
  issue: issueLiveSubtitleSession,
  release: releaseLiveSubtitleSession,
  releaseForAccount: releaseLiveSubtitleSessionsForAccount,
  reportUsage: reportLiveSubtitleUsage,
  status: getLiveSubtitleQuotaStatus,
  resetForTests: resetLiveSubtitleQuotaForTests,
};

export default liveSubtitleQuotaService;
