// Independent, room-scoped transcription sessions owned by a single meeting
// participant. No Caption Host lease is involved, and each participant only
// publishes their own local microphone frames.

import { createHash } from 'node:crypto';
import {
  PARTICIPANT_SUBTITLE_CODES,
  PARTICIPANT_SUBTITLE_CONFIG,
  PARTICIPANT_SUBTITLE_PROVIDERS,
  isParticipantSubtitleLanguage,
} from '../../../client/shared/participantSubtitles.js';

const sessions = new Map();
const MAX_FINAL_KEYS = 200;

const keyFor = (roomId, peerId) => `${roomId}:${peerId}`;
const nowMs = () => Date.now();
const textHash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 24);

const safeText = (value) =>
  typeof value === 'string' && value.trim()
    ? value.trim().slice(0, PARTICIPANT_SUBTITLE_CONFIG.maxCaptionChars)
    : '';

export const resolveSttProvider = (sourceLanguage) => {
  if (sourceLanguage === 'de-DE') return 'gemini';
  if (sourceLanguage === 'hi-IN' || sourceLanguage === 'en-IN') return 'sarvam';
  return null;
};

const publicSession = (session) => (session ? {
  roomId: session.roomId,
  peerId: session.peerId,
  accountId: session.accountId,
  socketId: session.socketId,
  sessionId: session.sessionId,
  provider: session.providerName,
  sourceLanguage: session.sourceLanguage,
  startedAt: session.startedAt,
  expectedSequence: session.expectedSequence,
  audioFrames: session.audioFrames,
  queuedFrames: session.queue.length,
  droppedFrames: session.droppedFrames,
  utterance: session.utterance,
  closed: session.closed,
} : null);

const emitStatus = (session, status) => {
  if (!session) return;
  session.onStatus?.({
    ...status,
    roomId: session.roomId,
    peerId: session.peerId,
    accountId: session.accountId,
    sessionId: session.sessionId,
  });
};

const drainQueue = (session) => {
  if (session.draining || session.closed) return;
  session.draining = true;
  try {
    while (session.queue.length > 0) {
      if (session.closed) break;
      const frame = session.queue[0];
      if (!session.providerAdapter?.sendAudio?.(frame.pcm)) break;
      session.queue.shift();
      session.audioFrames += 1;
    }
  } finally {
    session.draining = false;
  }
};

export const startParticipantSubtitleSession = ({
  member,
  sourceLanguage,
  apiKey,
  providerFactory,
  onCaption = () => {},
  onStatus = () => {},
  now = nowMs(),
}) => {
  if (!member || !providerFactory || !isParticipantSubtitleLanguage(sourceLanguage)) {
    return { ok: false, code: PARTICIPANT_SUBTITLE_CODES.INVALID_REQUEST };
  }
  const provider = resolveSttProvider(sourceLanguage);
  if (!provider) {
    return {
      ok: false,
      code: PARTICIPANT_SUBTITLE_CODES.UNSUPPORTED_LANGUAGE,
      message: 'German speech uses Gemini; Hindi and English use Sarvam.',
    };
  }
  const key = keyFor(member.roomId, member.peerId);
  if (sessions.has(key)) {
    return { ok: false, code: PARTICIPANT_SUBTITLE_CODES.BUSY };
  }
  for (const session of sessions.values()) {
    if (session.socketId === member.socketId) {
      return { ok: false, code: PARTICIPANT_SUBTITLE_CODES.BUSY };
    }
  }

  const session = {
    roomId: member.roomId,
    peerId: member.peerId,
    accountId: member.accountId,
    socketId: member.socketId,
    sessionId: `pst-${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    provider,
    providerName: provider === 'sarvam'
      ? PARTICIPANT_SUBTITLE_PROVIDERS.sarvam
      : PARTICIPANT_SUBTITLE_PROVIDERS.geminiLive,
    sourceLanguage,
    startedAt: now,
    expectedSequence: 0,
    lastFrameAt: now,
    audioFrames: 0,
    droppedFrames: 0,
    queue: [],
    draining: false,
    closed: false,
    utterance: provider === 'sarvam' ? 0 : 0,
    activeUtteranceId: null,
    finalSeen: new Set(),
    providerAdapter: null,
    onCaption,
    onStatus,
  };

  try {
    session.providerAdapter = providerFactory({
      provider,
      apiKey,
      sourceLanguage,
      streamType: 'balanced',
      onEvent: (event) => {
        if (session.closed || sessions.get(key) !== session) return;
        if (event?.type !== 'caption') return;
        const text = safeText(event.text);
        if (!text) return;

        let utteranceId;
        if (provider === 'sarvam') {
          const index = Number.isInteger(event.utteranceIndex) ? event.utteranceIndex : session.utterance;
          utteranceId = `${session.sessionId}:u${index}`;
        } else {
          if (session.activeUtteranceId === null) {
            session.activeUtteranceId = `${session.sessionId}:u${session.utterance}`;
          }
          utteranceId = session.activeUtteranceId;
        }

        if (event.kind === 'final') {
          const finalKey = `${utteranceId}:${textHash(text)}`;
          if (session.finalSeen.has(finalKey)) return;
          session.finalSeen.add(finalKey);
          if (session.finalSeen.size > MAX_FINAL_KEYS) {
            const oldest = session.finalSeen.values().next().value;
            if (oldest) session.finalSeen.delete(oldest);
          }
        }

        onCaption({
          roomId: session.roomId,
          peerId: session.peerId,
          accountId: session.accountId,
          socketId: session.socketId,
          sessionId: session.sessionId,
          provider: session.providerName,
          sourceLanguage: session.sourceLanguage,
          utteranceId,
          kind: event.kind === 'final' ? 'final' : 'partial',
          text,
        });

        if (event.kind === 'final') {
          if (provider === 'gemini') {
            session.utterance += 1;
            session.activeUtteranceId = null;
          } else {
            session.utterance = Math.max(session.utterance, Number(event.utteranceIndex ?? 0) + 1);
          }
        }
      },
      onStatus: (status) => {
        if (!session.closed) emitStatus(session, status);
      },
    });
  } catch (error) {
    return {
      ok: false,
      code: PARTICIPANT_SUBTITLE_CODES.PROVIDER_CONFIG,
      message: error?.message || 'The transcription provider could not be configured.',
    };
  }

  sessions.set(key, session);
  emitStatus(session, {
    status: 'starting',
    provider: session.providerName,
    sourceLanguage,
  });
  return { ok: true, session: publicSession(session) };
};

export const handleParticipantSubtitleAudio = ({
  roomId,
  peerId,
  socketId,
  sessionId,
  sequence,
  pcm,
  now = nowMs(),
}) => {
  const session = sessions.get(keyFor(roomId, peerId));
  if (!session || session.closed || session.sessionId !== sessionId) {
    return { ok: false, code: PARTICIPANT_SUBTITLE_CODES.STALE_SESSION };
  }
  if (session.peerId !== peerId || session.socketId !== socketId) {
    return { ok: false, code: PARTICIPANT_SUBTITLE_CODES.NOT_PUBLISHER };
  }
  if (!Buffer.isBuffer(pcm) || pcm.length !== PARTICIPANT_SUBTITLE_CONFIG.chunkBytes) {
    return { ok: false, code: PARTICIPANT_SUBTITLE_CODES.AUDIO_FORMAT };
  }
  if (!Number.isSafeInteger(sequence) || sequence !== session.expectedSequence) {
    return { ok: false, code: PARTICIPANT_SUBTITLE_CODES.INVALID_SEQUENCE };
  }
  if (session.queue.length >= PARTICIPANT_SUBTITLE_CONFIG.maxQueuedFrames) {
    session.droppedFrames += 1;
    return {
      ok: false,
      code: PARTICIPANT_SUBTITLE_CODES.BUSY,
      message: 'Audio queue is full.',
    };
  }

  session.queue.push({ sequence, pcm, receivedAt: now });
  session.expectedSequence += 1;
  session.lastFrameAt = now;
  drainQueue(session);
  return {
    ok: true,
    acceptedSequence: sequence,
    queuedFrames: session.queue.length,
  };
};

export const stopParticipantSubtitleSession = ({
  roomId,
  peerId,
  socketId,
  reason = 'stopped',
}) => {
  const session = sessions.get(keyFor(roomId, peerId));
  if (!session || session.closed) {
    return { ok: false, code: PARTICIPANT_SUBTITLE_CODES.STALE_SESSION };
  }
  if (socketId && session.socketId !== socketId) {
    return { ok: false, code: PARTICIPANT_SUBTITLE_CODES.NOT_PUBLISHER };
  }

  session.closed = true;
  session.queue.length = 0;
  try {
    session.providerAdapter?.sendEnd?.();
    session.providerAdapter?.close?.();
  } catch {
    // Provider cleanup is best-effort; local state is always released.
  }
  sessions.delete(keyFor(session.roomId, session.peerId));
  emitStatus(session, { status: 'stopped', reason });
  return { ok: true, session: publicSession(session) };
};

export const stopParticipantSubtitleBySocket = (socketId, reason = 'socket cleanup') => {
  const stopped = [];
  for (const session of [...sessions.values()]) {
    if (session.socketId === socketId) {
      stopped.push(stopParticipantSubtitleSession({ roomId: session.roomId, peerId: session.peerId, socketId, reason }));
    }
  }
  return stopped;
};

export const stopParticipantSubtitleByRoom = (roomId, reason = 'room cleanup') => {
  const stopped = [];
  for (const session of [...sessions.values()]) {
    if (session.roomId === roomId) {
      stopped.push(stopParticipantSubtitleSession({ roomId, peerId: session.peerId, reason }));
    }
  }
  return stopped;
};

export const stopParticipantSubtitleByPeer = (roomId, peerId, reason = 'participant removed') =>
  stopParticipantSubtitleSession({ roomId, peerId, reason });

export const stopExpiredParticipantSubtitleSessions = ({
  isSessionValid,
  reason = 'session expired',
  now = nowMs(),
} = {}) => {
  const stopped = [];
  for (const session of [...sessions.values()]) {
    const expired = now - session.startedAt >= PARTICIPANT_SUBTITLE_CONFIG.maxSessionMs;
    const invalid = typeof isSessionValid === 'function' && !isSessionValid(publicSession(session));
    if (expired || invalid) {
      stopped.push(stopParticipantSubtitleSession({ roomId: session.roomId, peerId: session.peerId, reason }));
    }
  }
  return stopped;
};

export const getParticipantSubtitleSession = (roomId, peerId) =>
  publicSession(sessions.get(keyFor(roomId, peerId)));

export const listParticipantSubtitleSessions = () =>
  [...sessions.values()].map(publicSession);

export const clearParticipantSubtitleSessionsForTests = () => {
  for (const session of [...sessions.values()]) {
    session.closed = true;
    session.queue.length = 0;
    try { session.providerAdapter?.close?.(); } catch { /* test cleanup */ }
  }
  sessions.clear();
};
