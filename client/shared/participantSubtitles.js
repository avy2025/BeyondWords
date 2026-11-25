// Dependency-free contract for independent, participant-level live translated
// subtitles. No provider keys, tokens, audio, or transcript text cross this
// boundary in configuration payloads.

import {
  isSafeCaptionIdentifier,
  SARVAM_CONFIG,
} from './captionHost.js';

export const PARTICIPANT_SUBTITLE_EVENTS = Object.freeze({
  authorize: 'participant-subtitles:authorize',
  preferences: 'participant-subtitles:preferences',
  publishStart: 'participant-subtitles:publish-start',
  publishStop: 'participant-subtitles:publish-stop',
  audio: 'participant-subtitles:audio',
  caption: 'participant-subtitles:caption',
  status: 'participant-subtitles:status',
});

export const PARTICIPANT_SUBTITLE_CODES = Object.freeze({
  ACK_TIMEOUT: 'PARTICIPANT_SUBTITLE_ACK_TIMEOUT',
  AUDIO_FORMAT: 'PARTICIPANT_SUBTITLE_AUDIO_INVALID_FORMAT',
  BUSY: 'PARTICIPANT_SUBTITLE_BUSY',
  INVALID_REQUEST: 'PARTICIPANT_SUBTITLE_INVALID_REQUEST',
  INVALID_SEQUENCE: 'PARTICIPANT_SUBTITLE_INVALID_SEQUENCE',
  INVALID_TOKEN: 'PARTICIPANT_SUBTITLE_INVALID_TOKEN',
  NOT_IN_ROOM: 'PARTICIPANT_SUBTITLE_NOT_IN_ROOM',
  NOT_PUBLISHER: 'PARTICIPANT_SUBTITLE_NOT_PUBLISHER',
  PROVIDER_AUTH: 'PARTICIPANT_SUBTITLE_PROVIDER_AUTH_ERROR',
  PROVIDER_CONFIG: 'PARTICIPANT_SUBTITLE_PROVIDER_CONFIG_ERROR',
  PROVIDER_ERROR: 'PARTICIPANT_SUBTITLE_PROVIDER_ERROR',
  PROVIDER_QUOTA: 'PARTICIPANT_SUBTITLE_PROVIDER_QUOTA_ERROR',
  STALE_SESSION: 'PARTICIPANT_SUBTITLE_STALE_SESSION',
  TRANSLATION_ERROR: 'PARTICIPANT_SUBTITLE_TRANSLATION_ERROR',
  UNSUPPORTED_LANGUAGE: 'PARTICIPANT_SUBTITLE_UNSUPPORTED_LANGUAGE',
});

export const PARTICIPANT_SUBTITLE_LANGUAGES = Object.freeze([
  'hi-IN',
  'en-IN',
  'de-DE',
]);

export const PARTICIPANT_SUBTITLE_LANGUAGE_LABELS = Object.freeze({
  'hi-IN': 'Hindi',
  'en-IN': 'English',
  'de-DE': 'German',
});

// Verified provider routing. Sarvam remains the STT provider for its supported
// Indian languages; Gemini Live handles German STT. Text translation is handled
// by the verified free-tier Gemini Flash-Lite model.
export const PARTICIPANT_SUBTITLE_PROVIDERS = Object.freeze({
  sarvam: 'sarvam-saaras-v4',
  geminiLive: 'gemini-3.5-transcribe-live',
  geminiTranslate: 'gemini-3.5-flash-lite',
});

export const PARTICIPANT_SUBTITLE_TIMING = Object.freeze({
  authorizationAckMs: 8_000,
  publishAckMs: 10_000,
  stopAckMs: 4_000,
  providerConnectMs: 10_000,
});

// Explicit independence contract. None of the legacy caption systems are
// authorization gates for participant-level publishing or caption receiving.
export const PARTICIPANT_SUBTITLE_INDEPENDENCE = Object.freeze({
  requiresCaptionHostLease: false,
  requiresAzureSubtitles: false,
  requiresOwnPublishingToReceive: false,
  opensSecondMicrophone: false,
});

export const PARTICIPANT_SUBTITLE_CONFIG = Object.freeze({
  sampleRate: SARVAM_CONFIG.sampleRate,
  channels: SARVAM_CONFIG.channels,
  encoding: SARVAM_CONFIG.encoding,
  bytesPerSample: SARVAM_CONFIG.bytesPerSample,
  chunkMs: SARVAM_CONFIG.chunkMs,
  chunkBytes: SARVAM_CONFIG.chunkBytes,
  maxFrameBytes: SARVAM_CONFIG.maxFrameBytes,
  maxSessionMs: 9 * 60 * 1000,
  maxQueuedFrames: 20,
  maxDisplayedCaptions: 20,
  maxCaptionChars: 600,
  cacheLimit: 500,
});

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export const isParticipantSubtitleLanguage = (value) =>
  PARTICIPANT_SUBTITLE_LANGUAGES.includes(value);

const requireSafeIds = ({ roomId, peerId }) =>
  isSafeCaptionIdentifier(roomId) && isSafeCaptionIdentifier(peerId);

const requireToken = (token) =>
  typeof token === 'string' && token.length > 0 && token.length <= 4096;

export const buildParticipantSubtitleAuthorizeRequest = ({
  roomId,
  peerId,
  token,
  speakingLanguage,
  subtitleLanguage,
} = {}) => {
  if (!requireSafeIds({ roomId, peerId })) {
    throw new Error('Invalid meeting participant identifiers.');
  }
  if (!requireToken(token)) {
    throw new Error('A valid auth token is required.');
  }
  if (!isParticipantSubtitleLanguage(speakingLanguage)) {
    throw new Error('Select a supported speaking language.');
  }
  if (!isParticipantSubtitleLanguage(subtitleLanguage)) {
    throw new Error('Select a supported subtitle language.');
  }
  return { roomId, peerId, token, speakingLanguage, subtitleLanguage };
};

export const buildParticipantSubtitlePreferencesRequest = ({
  roomId,
  peerId,
  speakingLanguage,
  subtitleLanguage,
} = {}) => {
  if (!requireSafeIds({ roomId, peerId })) {
    throw new Error('Invalid meeting participant identifiers.');
  }
  if (!isParticipantSubtitleLanguage(speakingLanguage)) {
    throw new Error('Select a supported speaking language.');
  }
  if (!isParticipantSubtitleLanguage(subtitleLanguage)) {
    throw new Error('Select a supported subtitle language.');
  }
  return { roomId, peerId, speakingLanguage, subtitleLanguage };
};

export const buildParticipantSubtitlePublishRequest = ({
  roomId,
  peerId,
  speakingLanguage,
} = {}) => {
  if (!requireSafeIds({ roomId, peerId })) {
    throw new Error('Invalid meeting participant identifiers.');
  }
  if (!isParticipantSubtitleLanguage(speakingLanguage)) {
    throw new Error('Select a supported speaking language.');
  }
  return { roomId, peerId, speakingLanguage };
};

export const buildParticipantSubtitleStopRequest = ({ roomId, peerId } = {}) => {
  if (!requireSafeIds({ roomId, peerId })) {
    throw new Error('Invalid meeting participant identifiers.');
  }
  return { roomId, peerId };
};

export const isParticipantSubtitleAudioFrameValid = (frame) => {
  if (!frame || typeof frame !== 'object') return false;
  if (!BASE64_PATTERN.test(frame.pcm || '') || frame.pcm.length % 4 !== 0) return false;
  return (
    frame.bytes === PARTICIPANT_SUBTITLE_CONFIG.chunkBytes &&
    frame.sampleRate === PARTICIPANT_SUBTITLE_CONFIG.sampleRate &&
    frame.channels === PARTICIPANT_SUBTITLE_CONFIG.channels &&
    frame.encoding === PARTICIPANT_SUBTITLE_CONFIG.encoding &&
    frame.durationMs === PARTICIPANT_SUBTITLE_CONFIG.chunkMs
  );
};

export const buildParticipantSubtitleAudioFrame = ({
  roomId,
  peerId,
  sessionId,
  sequence,
  pcm,
  bytes,
  sampleRate = PARTICIPANT_SUBTITLE_CONFIG.sampleRate,
  channels = PARTICIPANT_SUBTITLE_CONFIG.channels,
  encoding = PARTICIPANT_SUBTITLE_CONFIG.encoding,
  durationMs = PARTICIPANT_SUBTITLE_CONFIG.chunkMs,
} = {}) => {
  if (
    !requireSafeIds({ roomId, peerId }) ||
    !isSafeCaptionIdentifier(sessionId)
  ) {
    throw new Error('Invalid participant subtitle session identifiers.');
  }
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new Error('Invalid audio sequence number.');
  }
  const frame = { pcm, bytes, sampleRate, channels, encoding, durationMs };
  if (!isParticipantSubtitleAudioFrameValid(frame)) {
    throw new Error('Invalid PCM audio frame.');
  }
  return { roomId, peerId, sessionId, sequence, ...frame };
};

// Framework-free acknowledgement coordinator. A late acknowledgement from a
// cancelled or timed-out attempt is ignored, so rapid toggles and reconnects
// cannot leave the UI stuck or adopt a stale session id.
export class ParticipantSubtitleAckCoordinator {
  constructor({
    schedule = (fn, ms) => setTimeout(fn, ms),
    cancel = (timer) => clearTimeout(timer),
    onLog = () => {},
  } = {}) {
    this.schedule = schedule;
    this.cancel = cancel;
    this.onLog = onLog;
    this.attempt = 0;
    this.pending = null;
  }

  get pendingAttempt() {
    return this.pending?.attempt ?? null;
  }

  start({
    operation = 'operation',
    emit,
    onAck = () => {},
    onTimeout = () => {},
    timeoutMs = PARTICIPANT_SUBTITLE_TIMING.authorizationAckMs,
    timeoutMessage = 'The live translation request timed out. Try again.',
  } = {}) {
    this.invalidate();
    if (typeof emit !== 'function') return () => {};

    const pending = {
      operation,
      attempt: ++this.attempt,
      onAck,
      onTimeout,
      settled: false,
      timer: null,
    };
    pending.timer = this.schedule(() => {
      if (pending.settled || this.pending !== pending) return;
      pending.settled = true;
      this.pending = null;
      this.onLog('ack timeout', { operation });
      onTimeout({
        ok: false,
        code: PARTICIPANT_SUBTITLE_CODES.ACK_TIMEOUT,
        message: timeoutMessage,
      });
    }, timeoutMs);
    this.pending = pending;

    try {
      emit((result) => this.ack(pending, result));
    } catch {
      this.ack(pending, {
        ok: false,
        code: PARTICIPANT_SUBTITLE_CODES.INVALID_REQUEST,
        message: 'The live translation request could not be sent.',
      });
    }
    return () => this.invalidate(pending);
  }

  ack(pending, result) {
    if (!pending || pending.settled || this.pending !== pending) return;
    pending.settled = true;
    this.cancel(pending.timer);
    this.pending = null;
    pending.onAck(result);
  }

  invalidate(pending = this.pending) {
    if (!pending) return;
    pending.settled = true;
    this.cancel(pending.timer);
    if (this.pending === pending) this.pending = null;
  }
};

export const shouldAcceptParticipantSubtitleCaption = ({
  event,
  roomId,
  subtitleLanguage,
} = {}) => {
  if (!event || event.roomId !== roomId) return false;
  if (event.kind !== 'partial' && event.kind !== 'final') return false;
  if (event.targetLanguage && event.targetLanguage !== subtitleLanguage) return false;
  return typeof event.utteranceId === 'string' && typeof event.text === 'string';
};
