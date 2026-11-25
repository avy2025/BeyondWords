// Dependency-free contract for the explicit Caption Host lifecycle and the
// isolated Sarvam-only transcription transport. No API keys cross this boundary.

export const CAPTION_HOST_EVENTS = Object.freeze({
  claim: 'caption-host:claim',
  heartbeat: 'caption-host:heartbeat',
  release: 'caption-host:release',
  status: 'caption-host:status',
});

export const CAPTION_HOST_CODES = Object.freeze({
  BUSY: 'CAPTION_HOST_BUSY',
  INVALID_REQUEST: 'CAPTION_HOST_INVALID_REQUEST',
  INVALID_TOKEN: 'CAPTION_HOST_INVALID_TOKEN',
  NOT_IN_ROOM: 'CAPTION_HOST_NOT_IN_ROOM',
  STALE_GENERATION: 'CAPTION_HOST_STALE_GENERATION',
});

export const CAPTION_HOST_TIMING = Object.freeze({
  leaseMs: 15_000,
  heartbeatMs: 5_000,
  claimAckMs: 8_000,
});

// Development-only diagnostics. Deliberately limited to identifiers and
// status codes; no tokens, headers, transcript text, or audio data.
export const captionHostDebug = (event, details = {}) => {
  if (import.meta.env?.DEV) console.debug(`[caption-host] ${event}`, details);
};

export const CAPTION_HOST_SOURCE_LANGUAGES = Object.freeze([
  'hi-IN',
  'en-IN',
  'de-DE',
]);

export const CAPTION_TRANSCRIPTION_EVENTS = Object.freeze({
  start: 'caption-transcription:start',
  audio: 'caption-transcription:audio',
  stop: 'caption-transcription:stop',
  caption: 'caption-transcription:caption',
  status: 'caption-transcription:status',
});

export const CAPTION_TRANSCRIPTION_CODES = Object.freeze({
  AUDIO_FORMAT: 'CAPTION_AUDIO_INVALID_FORMAT',
  BUSY: 'CAPTION_TRANSCRIPTION_BUSY',
  INVALID_REQUEST: 'CAPTION_TRANSCRIPTION_INVALID_REQUEST',
  INVALID_SEQUENCE: 'CAPTION_TRANSCRIPTION_INVALID_SEQUENCE',
  NOT_HOST: 'CAPTION_TRANSCRIPTION_NOT_HOST',
  PROVIDER_AUTH: 'CAPTION_PROVIDER_AUTH_ERROR',
  PROVIDER_CONFIG: 'CAPTION_PROVIDER_CONFIG_ERROR',
  PROVIDER_ERROR: 'CAPTION_PROVIDER_ERROR',
  PROVIDER_INACTIVE: 'CAPTION_PROVIDER_INACTIVE',
  PROVIDER_QUOTA: 'CAPTION_PROVIDER_QUOTA_ERROR',
  STALE_GENERATION: 'CAPTION_TRANSCRIPTION_STALE_GENERATION',
});

// Sarvam realtime transcription surface verified from the official docs.
export const SARVAM_CONFIG = Object.freeze({
  provider: 'sarvam',
  endpoint: 'wss://api.sarvam.ai/speech-to-text-realtime/ws',
  model: 'saaras:v4',
  mode: 'transcribe',
  encoding: 'linear16',
  sampleRate: 16_000,
  channels: 1,
  bytesPerSample: 2,
  chunkMs: 100,
  chunkBytes: 3_200,
  maxFrameBytes: 16_000,
  pingMs: 30_000,
  connectionTimeoutMs: 10_000,
});

export const SARVAM_SOURCE_LANGUAGES = Object.freeze(['hi-IN', 'en-IN']);
export const SARVAM_STREAM_TYPES = Object.freeze(['balanced', 'fast']);

const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export const isSafeCaptionIdentifier = (value) =>
  typeof value === 'string' && SAFE_ID_PATTERN.test(value);

// Room membership is confirmed by the existing room-users event. Passing that
// confirmation in explicitly prevents a socket-only connection from being
// treated as a joined room.
export const isCaptionHostClaimReady = ({
  isConnected,
  roomJoined,
  roomId,
  peerId,
  hasAuthToken,
  claiming,
  statusActive,
} = {}) =>
  Boolean(
    isConnected &&
      roomJoined &&
      hasAuthToken &&
      isSafeCaptionIdentifier(roomId) &&
      isSafeCaptionIdentifier(peerId) &&
      !claiming &&
      !statusActive
  );

// Small, framework-free claim acknowledgement state machine. The React hook
// owns rendering; this object owns attempt identity, the single pending timer,
// and late-ack rejection so those rules are directly testable.
export class CaptionHostClaimCoordinator {
  constructor({
    ackTimeoutMs = CAPTION_HOST_TIMING.claimAckMs,
    schedule = (fn, ms) => setTimeout(fn, ms),
    cancel = (timer) => clearTimeout(timer),
    onClaimingChange = () => {},
    onTimeout = () => {},
    onLog = () => {},
  } = {}) {
    this.ackTimeoutMs = ackTimeoutMs;
    this.schedule = schedule;
    this.cancel = cancel;
    this.onClaimingChange = onClaimingChange;
    this.onTimeout = onTimeout;
    this.onLog = onLog;
    this.attemptCounter = 0;
    this.pending = null;
    this.claiming = false;
  }

  get isClaiming() {
    return this.claiming;
  }

  setClaiming(value) {
    this.claiming = value;
    this.onClaimingChange(value);
  }

  start({ emit, onAck } = {}) {
    if (this.claiming || this.pending) {
      this.onLog('duplicate claim ignored', {
        attempt: this.pending?.attempt ?? null,
      });
      return { ok: false, reason: 'duplicate' };
    }

    const attempt = ++this.attemptCounter;
    this.pending = { attempt, onAck, timer: null };
    this.setClaiming(true);
    this.onLog('claim started', { attempt });

    // Schedule before emitting so a synchronous acknowledgement still has a
    // matching pending attempt to clear.
    this.pending.timer = this.schedule(
      () => this.handleTimeout(attempt),
      this.ackTimeoutMs
    );

    try {
      emit((result) => this.accept(attempt, result), attempt);
    } catch (error) {
      this.cancelPending('emit failed');
      throw error;
    }

    return { ok: true, attempt };
  }

  accept(attempt, result) {
    if (!this.pending || this.pending.attempt !== attempt) {
      this.onLog('late claim ack ignored', {
        attempt,
        currentAttempt: this.pending?.attempt ?? null,
      });
      return false;
    }

    const { onAck, timer } = this.pending;
    this.cancel(timer);
    this.pending = null;
    this.setClaiming(false);
    this.onLog('claim ack received', {
      attempt,
      ok: Boolean(result?.ok),
      code: result?.ok ? null : result?.code ?? null,
    });
    if (typeof onAck === 'function') onAck(result, attempt);
    return true;
  }

  handleTimeout(attempt) {
    if (!this.pending || this.pending.attempt !== attempt) return false;
    this.pending = null;
    this.setClaiming(false);
    this.onLog('claim ack timeout', { attempt, timeoutMs: this.ackTimeoutMs });
    this.onTimeout(attempt);
    return true;
  }

  cancelPending(reason = 'cancelled') {
    if (!this.pending) return false;
    const { attempt, timer } = this.pending;
    this.cancel(timer);
    this.pending = null;
    this.setClaiming(false);
    this.onLog('claim pending cancelled', { attempt, reason });
    return true;
  }

  dispose() {
    this.cancelPending('unmounted');
  }
}

export const isCaptionSourceLanguage = (value) =>
  CAPTION_HOST_SOURCE_LANGUAGES.includes(value);

export const isSarvamSourceLanguage = (value) =>
  SARVAM_SOURCE_LANGUAGES.includes(value);

export const isSarvamStreamType = (value) => SARVAM_STREAM_TYPES.includes(value);

export const isCaptionAudioFrameValid = (frame) => {
  if (!frame || typeof frame !== 'object') return false;
  if (!BASE64_PATTERN.test(frame.pcm || '') || frame.pcm.length % 4 !== 0) return false;
  return (
    frame.bytes === SARVAM_CONFIG.chunkBytes &&
    frame.sampleRate === SARVAM_CONFIG.sampleRate &&
    frame.channels === SARVAM_CONFIG.channels &&
    frame.encoding === SARVAM_CONFIG.encoding &&
    frame.durationMs === SARVAM_CONFIG.chunkMs
  );
};

export const buildCaptionAudioFrame = ({
  roomId,
  peerId,
  leaseId,
  generation,
  sequence,
  pcm,
  bytes,
  sampleRate = SARVAM_CONFIG.sampleRate,
  channels = SARVAM_CONFIG.channels,
  encoding = SARVAM_CONFIG.encoding,
  durationMs = SARVAM_CONFIG.chunkMs,
} = {}) => {
  if (
    !isSafeCaptionIdentifier(roomId) ||
    !isSafeCaptionIdentifier(peerId) ||
    !isSafeCaptionIdentifier(leaseId) ||
    !isSafeCaptionIdentifier(generation)
  ) {
    throw new Error('Invalid Caption Host identifiers.');
  }
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new Error('Invalid audio sequence number.');
  }

  const frame = {
    pcm,
    bytes,
    sampleRate,
    channels,
    encoding,
    durationMs,
  };
  if (!isCaptionAudioFrameValid(frame)) {
    throw new Error('Invalid PCM audio frame.');
  }

  // No keys or provider metadata are forwarded with the audio frame.
  return { roomId, peerId, leaseId, generation, sequence, ...frame };
};

export const buildCaptionTranscriptionStartRequest = ({
  roomId,
  peerId,
  leaseId,
  generation,
  sourceLanguage,
  streamType = 'balanced',
} = {}) => {
  if (
    !isSafeCaptionIdentifier(roomId) ||
    !isSafeCaptionIdentifier(peerId) ||
    !isSafeCaptionIdentifier(leaseId) ||
    !isSafeCaptionIdentifier(generation)
  ) {
    throw new Error('Invalid Caption Host identifiers.');
  }
  if (!isSarvamSourceLanguage(sourceLanguage)) {
    throw new Error('Select Hindi or English before starting transcription.');
  }
  if (!isSarvamStreamType(streamType)) {
    throw new Error('Invalid Sarvam stream type.');
  }
  return { roomId, peerId, leaseId, generation, sourceLanguage, streamType };
};

export const shouldAcceptCaptionEvent = ({ event, roomId, generation } = {}) =>
  Boolean(
    event &&
      event.roomId === roomId &&
      event.generation === generation &&
      (event.kind === 'partial' || event.kind === 'final') &&
      typeof event.text === 'string'
  );

export const buildCaptionHostClaimRequest = ({
  roomId,
  peerId,
  token,
  sourceLanguage = 'hi-IN',
} = {}) => {
  if (!isSafeCaptionIdentifier(roomId)) {
    throw new Error('Invalid room identifier.');
  }
  if (!isSafeCaptionIdentifier(peerId)) {
    throw new Error('Invalid participant identifier.');
  }
  if (typeof token !== 'string' || token.length === 0 || token.length > 4096) {
    throw new Error('Missing authentication token.');
  }
  if (!isCaptionSourceLanguage(sourceLanguage)) {
    throw new Error('Unsupported caption source language.');
  }

  // Deliberately no keys, audio data, or extra fields are forwarded.
  return { roomId, peerId, token, sourceLanguage };
};
