// Bounded, room-scoped Caption Host transcription sessions.
// This service never sees API keys or provider credentials.

import { randomUUID } from 'node:crypto';
import {
  CAPTION_TRANSCRIPTION_CODES,
  SARVAM_CONFIG,
} from '../../../client/shared/captionHost.js';

const sessions = new Map();
const MAX_QUEUED_FRAMES = 20;

const nowMs = () => Date.now();

const publicSession = (session) => (session ? {
  roomId: session.roomId,
  peerId: session.peerId,
  socketId: session.socketId,
  leaseId: session.leaseId,
  generation: session.generation,
  sessionId: session.sessionId,
  provider: session.provider,
  sourceLanguage: session.sourceLanguage,
  streamType: session.streamType,
  startedAt: session.startedAt,
  expectedSequence: session.expectedSequence,
  audioFrames: session.audioFrames,
  queuedFrames: session.queue.length,
  droppedFrames: session.droppedFrames,
  closed: session.closed,
} : null);

const sameIdentity = (session, { roomId, peerId, socketId, leaseId, generation }) =>
  Boolean(
    session &&
      session.roomId === roomId &&
      session.peerId === peerId &&
      session.socketId === socketId &&
      session.leaseId === leaseId &&
      session.generation === generation
  );

const emitStatus = (session, status) => {
  if (!session) return;
  session.onStatus?.({
    ...status,
    roomId: session.roomId,
    generation: session.generation,
    leaseId: session.leaseId,
    sessionId: session.sessionId,
    peerId: session.peerId,
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

export const startCaptionTranscriptionSession = ({
  lease,
  sourceLanguage,
  streamType = 'balanced',
  apiKey,
  providerFactory,
  onCaption = () => {},
  onStatus = () => {},
  now = nowMs(),
}) => {
  if (!lease || !providerFactory) {
    return { ok: false, code: CAPTION_TRANSCRIPTION_CODES.INVALID_REQUEST };
  }
  if (sessions.has(lease.roomId)) {
    return { ok: false, code: CAPTION_TRANSCRIPTION_CODES.BUSY };
  }
  for (const session of sessions.values()) {
    if (session.socketId === lease.socketId) {
      return { ok: false, code: CAPTION_TRANSCRIPTION_CODES.BUSY };
    }
  }

  const session = {
    roomId: lease.roomId,
    peerId: lease.peerId,
    socketId: lease.socketId,
    leaseId: lease.leaseId,
    generation: lease.generation,
    sessionId: randomUUID(),
    provider: SARVAM_CONFIG.provider,
    sourceLanguage,
    streamType,
    startedAt: now,
    expectedSequence: 0,
    lastFrameAt: now,
    audioFrames: 0,
    droppedFrames: 0,
    queue: [],
    draining: false,
    closed: false,
    providerAdapter: null,
    onCaption,
    onStatus,
  };

  try {
    session.providerAdapter = providerFactory({
      apiKey,
      sourceLanguage,
      streamType,
      onEvent: (event) => {
        if (session.closed || sessions.get(session.roomId) !== session) return;
        if (event?.type !== 'caption' || typeof event.text !== 'string') return;
        onCaption({
          ...event,
          roomId: session.roomId,
          generation: session.generation,
          leaseId: session.leaseId,
          peerId: session.peerId,
          sessionId: session.sessionId,
          provider: session.provider,
          sourceLanguage: session.sourceLanguage,
        });
      },
      onStatus: (status) => {
        if (!session.closed) emitStatus(session, status);
      },
    });
  } catch (error) {
    return {
      ok: false,
      code: CAPTION_TRANSCRIPTION_CODES.PROVIDER_CONFIG,
      message: error?.message || 'Transcription provider could not be configured.',
    };
  }

  sessions.set(session.roomId, session);
  emitStatus(session, { status: 'starting', sourceLanguage, streamType });
  return { ok: true, session: publicSession(session) };
};

export const handleCaptionAudioFrame = ({
  roomId,
  peerId,
  socketId,
  leaseId,
  generation,
  sequence,
  pcm,
  now = nowMs(),
}) => {
  const session = sessions.get(roomId);
  if (!session || session.closed || session.generation !== generation) {
    return { ok: false, code: CAPTION_TRANSCRIPTION_CODES.STALE_GENERATION };
  }
  if (
    session.peerId !== peerId ||
    session.socketId !== socketId ||
    session.leaseId !== leaseId
  ) {
    return { ok: false, code: CAPTION_TRANSCRIPTION_CODES.NOT_HOST };
  }
  if (!Buffer.isBuffer(pcm) || pcm.length !== SARVAM_CONFIG.chunkBytes) {
    return { ok: false, code: CAPTION_TRANSCRIPTION_CODES.AUDIO_FORMAT };
  }
  if (!Number.isSafeInteger(sequence) || sequence !== session.expectedSequence) {
    return { ok: false, code: CAPTION_TRANSCRIPTION_CODES.INVALID_SEQUENCE };
  }
  if (session.queue.length >= MAX_QUEUED_FRAMES) {
    session.droppedFrames += 1;
    return { ok: false, code: CAPTION_TRANSCRIPTION_CODES.BUSY, message: 'Audio queue is full.' };
  }

  session.queue.push({ sequence, pcm, receivedAt: now });
  session.expectedSequence += 1;
  session.lastFrameAt = now;
  drainQueue(session);
  return { ok: true, acceptedSequence: sequence, queuedFrames: session.queue.length };
};

export const stopCaptionTranscriptionSession = ({
  roomId,
  peerId,
  socketId,
  leaseId,
  generation,
  reason = 'stopped',
}) => {
  const session = sessions.get(roomId);
  if (!session || session.closed) {
    return { ok: false, code: CAPTION_TRANSCRIPTION_CODES.STALE_GENERATION };
  }
  if (
    (peerId && session.peerId !== peerId) ||
    (socketId && session.socketId !== socketId) ||
    (leaseId && session.leaseId !== leaseId) ||
    (generation && session.generation !== generation)
  ) {
    return { ok: false, code: CAPTION_TRANSCRIPTION_CODES.STALE_GENERATION };
  }

  session.closed = true;
  session.queue.length = 0;
  try {
    session.providerAdapter?.sendEnd?.();
    session.providerAdapter?.close?.();
  } catch {
    // Provider cleanup is best-effort; local state is always released.
  }
  sessions.delete(roomId);
  emitStatus(session, { status: 'stopped', reason });
  return { ok: true, session: publicSession(session) };
};

export const stopCaptionTranscriptionByRoom = (roomId, reason = 'room cleanup') => {
  const session = sessions.get(roomId);
  if (!session) return null;
  return stopCaptionTranscriptionSession({ roomId, reason });
};

export const stopCaptionTranscriptionByPeer = (roomId, peerId, reason = 'participant removed') => {
  const session = sessions.get(roomId);
  if (!session || session.peerId !== peerId) return null;
  return stopCaptionTranscriptionSession({ roomId, peerId, reason });
};

export const stopCaptionTranscriptionBySocket = (socketId, reason = 'socket cleanup') => {
  const stopped = [];
  for (const session of [...sessions.values()]) {
    if (session.socketId === socketId) {
      stopped.push(
        stopCaptionTranscriptionSession({ roomId: session.roomId, socketId, reason })
      );
    }
  }
  return stopped;
};

export const stopInvalidCaptionTranscriptionSessions = ({ isSessionValid, reason = 'lease expired' }) => {
  if (typeof isSessionValid !== 'function') return [];
  const stopped = [];
  for (const session of [...sessions.values()]) {
    if (!isSessionValid(publicSession(session))) {
      stopped.push(stopCaptionTranscriptionSession({ roomId: session.roomId, reason }));
    }
  }
  return stopped;
};

export const getCaptionTranscriptionSession = (roomId) => publicSession(sessions.get(roomId));

export const listCaptionTranscriptionSessions = () =>
  [...sessions.values()].map(publicSession);

export const clearCaptionTranscriptionSessionsForTests = () => {
  for (const session of [...sessions.values()]) {
    session.closed = true;
    session.queue.length = 0;
    try {
      session.providerAdapter?.close?.();
    } catch {
      // Ignore test cleanup errors.
    }
  }
  sessions.clear();
};
