// Isolated Sarvam-only Caption Host transcription transport.
// Never touches Azure subtitles, legacy subtitle events, or meeting host logic.

import {
  getCaptionHostLease,
} from '../services/captionHostLeaseService.js';
import {
  handleCaptionAudioFrame,
  listCaptionTranscriptionSessions,
  startCaptionTranscriptionSession,
  stopCaptionTranscriptionByPeer,
  stopCaptionTranscriptionByRoom,
  stopCaptionTranscriptionBySocket,
  stopCaptionTranscriptionSession,
  stopInvalidCaptionTranscriptionSessions,
} from '../services/captionHostTranscriptionService.js';
import { createSarvamRealtimeProvider } from '../services/sarvamRealtimeProvider.js';
import {
  getUsersInInMemRoom,
  isSocketHost,
} from '../services/roomService.js';
import {
  CAPTION_TRANSCRIPTION_CODES,
  CAPTION_TRANSCRIPTION_EVENTS,
  SARVAM_CONFIG,
  buildCaptionTranscriptionStartRequest,
  isCaptionAudioFrameValid,
  isSafeCaptionIdentifier,
} from '../../../client/shared/captionHost.js';

let watchdogStarted = false;

const defaultDependencies = {
  getLease: getCaptionHostLease,
  startSession: startCaptionTranscriptionSession,
  handleFrame: handleCaptionAudioFrame,
  stopSession: stopCaptionTranscriptionSession,
  stopByRoom: stopCaptionTranscriptionByRoom,
  stopByPeer: stopCaptionTranscriptionByPeer,
  stopBySocket: stopCaptionTranscriptionBySocket,
  stopInvalid: stopInvalidCaptionTranscriptionSessions,
  listSessions: listCaptionTranscriptionSessions,
  createProvider: createSarvamRealtimeProvider,
  getApiKey: () => process.env.SARVAM_API_KEY,
  getRoomMembers: (roomId) => getUsersInInMemRoom(roomId),
  isRoomHost: (roomId, socketId) => isSocketHost(roomId, socketId),
  now: () => Date.now(),
};

const respond = (ack, payload) => {
  if (typeof ack === 'function') ack(payload);
};

const failure = (code, message) => ({ ok: false, code, message });

const emitStatus = (io, status) => {
  if (!status?.roomId) return;
  io.to(status.roomId).emit(CAPTION_TRANSCRIPTION_EVENTS.status, status);
};

const emitCaption = (io, caption) => {
  if (!caption?.roomId) return;
  io.to(caption.roomId).emit(CAPTION_TRANSCRIPTION_EVENTS.caption, {
    roomId: caption.roomId,
    generation: caption.generation,
    leaseId: caption.leaseId,
    peerId: caption.peerId,
    sessionId: caption.sessionId,
    provider: caption.provider,
    sourceLanguage: caption.sourceLanguage,
    kind: caption.kind,
    text: caption.text,
    utteranceIndex: caption.utteranceIndex ?? null,
  });
};

export const startCaptionTranscriptionWatchdog = (io, deps) => {
  if (deps.startWatchdog === false || watchdogStarted) return;
  watchdogStarted = true;

  const timer = setInterval(() => {
    const now = deps.now();
    deps.stopInvalid({
      reason: 'caption host lease expired',
      isSessionValid: (session) => {
        const lease = deps.getLease(session.roomId, now);
        return Boolean(
          lease &&
            lease.leaseId === session.leaseId &&
            lease.generation === session.generation &&
            lease.peerId === session.peerId &&
            lease.socketId === session.socketId &&
            now < lease.expiresAt
        );
      },
    });
  }, 1_000);

  if (typeof timer.unref === 'function') timer.unref();
};

export const registerCaptionTranscriptionHandlers = (socket, io, dependencyOverrides = {}) => {
  const deps = { ...defaultDependencies, ...dependencyOverrides };
  const now = () => deps.now();

  startCaptionTranscriptionWatchdog(io, deps);

  const validateLease = ({ roomId, peerId, leaseId, generation }) => {
    const current = now();
    const lease = deps.getLease(roomId, current);
    if (!lease || lease.leaseId !== leaseId || lease.generation !== generation) {
      return { error: failure(CAPTION_TRANSCRIPTION_CODES.STALE_GENERATION, 'Caption Host lease is no longer active.') };
    }
    if (
      lease.peerId !== peerId ||
      lease.socketId !== socket.id ||
      current >= lease.expiresAt
    ) {
      return { error: failure(CAPTION_TRANSCRIPTION_CODES.NOT_HOST, 'Only the active Caption Host may use this transport.') };
    }
    return { lease };
  };

  socket.on(
    CAPTION_TRANSCRIPTION_EVENTS.start,
    async (payload = {}, ack) => {
      let request;
      try {
        request = buildCaptionTranscriptionStartRequest(payload);
      } catch (error) {
        return respond(ack, failure(CAPTION_TRANSCRIPTION_CODES.INVALID_REQUEST, error.message));
      }

      const { error, lease } = validateLease(request);
      if (error) return respond(ack, error);

      const apiKey = deps.getApiKey();
      if (!apiKey) {
        return respond(
          ack,
          failure(
            CAPTION_TRANSCRIPTION_CODES.PROVIDER_CONFIG,
            'SARVAM_API_KEY is not configured on the server.'
          )
        );
      }

      const result = deps.startSession({
        lease,
        sourceLanguage: request.sourceLanguage,
        streamType: request.streamType,
        apiKey,
        providerFactory: deps.createProvider,
        onCaption: (caption) => emitCaption(io, caption),
        onStatus: (status) => {
          emitStatus(io, status);
          if (status?.status === 'error' && status?.fatal) {
            deps.stopSession({ roomId: request.roomId, reason: 'provider error' });
          }
        },
        now: now(),
      });

      if (!result?.ok) {
        return respond(
          ack,
          failure(
            result?.code || CAPTION_TRANSCRIPTION_CODES.PROVIDER_ERROR,
            result?.message || 'Could not start Sarvam transcription.'
          )
        );
      }

      return respond(ack, {
        ok: true,
        sessionId: result.session.sessionId,
        provider: SARVAM_CONFIG.provider,
        sourceLanguage: request.sourceLanguage,
        streamType: request.streamType,
      });
    }
  );

  socket.on(CAPTION_TRANSCRIPTION_EVENTS.audio, (payload = {}, ack) => {
    const frame = {
      pcm: payload.pcm,
      bytes: payload.bytes,
      sampleRate: payload.sampleRate,
      channels: payload.channels,
      encoding: payload.encoding,
      durationMs: payload.durationMs,
    };
    if (
      !isSafeCaptionIdentifier(payload.roomId) ||
      !isSafeCaptionIdentifier(payload.peerId) ||
      !isSafeCaptionIdentifier(payload.leaseId) ||
      !isSafeCaptionIdentifier(payload.generation) ||
      !Number.isSafeInteger(payload.sequence) ||
      payload.sequence < 0
    ) {
      return respond(
        ack,
        failure(CAPTION_TRANSCRIPTION_CODES.INVALID_REQUEST, 'Invalid audio frame metadata.')
      );
    }
    if (!isCaptionAudioFrameValid(frame)) {
      return respond(
        ack,
        failure(CAPTION_TRANSCRIPTION_CODES.AUDIO_FORMAT, 'Audio must be 16 kHz mono linear16 PCM.')
      );
    }

    const pcm = Buffer.from(payload.pcm, 'base64');
    if (pcm.length !== payload.bytes || pcm.toString('base64') !== payload.pcm) {
      return respond(
        ack,
        failure(CAPTION_TRANSCRIPTION_CODES.AUDIO_FORMAT, 'Invalid PCM audio payload.')
      );
    }

    const { error } = validateLease(payload);
    if (error) return respond(ack, error);

    const result = deps.handleFrame({
      roomId: payload.roomId,
      peerId: payload.peerId,
      socketId: socket.id,
      leaseId: payload.leaseId,
      generation: payload.generation,
      sequence: payload.sequence,
      pcm,
      now: now(),
    });

    if (!result?.ok) {
      return respond(
        ack,
        failure(result?.code || CAPTION_TRANSCRIPTION_CODES.INVALID_REQUEST, result?.message || 'Audio frame rejected.')
      );
    }
    return respond(ack, {
      ok: true,
      acceptedSequence: result.acceptedSequence,
      queuedFrames: result.queuedFrames ?? 0,
    });
  });

  socket.on(CAPTION_TRANSCRIPTION_EVENTS.stop, (payload = {}, ack) => {
    if (
      !isSafeCaptionIdentifier(payload.roomId) ||
      !isSafeCaptionIdentifier(payload.peerId) ||
      !isSafeCaptionIdentifier(payload.leaseId) ||
      !isSafeCaptionIdentifier(payload.generation)
    ) {
      return respond(ack, failure(CAPTION_TRANSCRIPTION_CODES.INVALID_REQUEST, 'Invalid stop request.'));
    }

    const result = deps.stopSession({
      roomId: payload.roomId,
      peerId: payload.peerId,
      socketId: socket.id,
      leaseId: payload.leaseId,
      generation: payload.generation,
      reason: 'explicit stop',
    });

    if (!result?.ok) {
      return respond(ack, failure(result?.code || CAPTION_TRANSCRIPTION_CODES.STALE_GENERATION, 'No active transcription session.'));
    }
    return respond(ack, { ok: true });
  });

  socket.on('leave-room', () => {
    deps.stopBySocket(socket.id, 'left room');
  });

  socket.on('disconnect', () => {
    deps.stopBySocket(socket.id, 'socket disconnected');
  });

  socket.on('end-meeting', ({ roomId } = {}) => {
    if (!isSafeCaptionIdentifier(roomId) || !deps.isRoomHost(roomId, socket.id)) return;
    deps.stopByRoom(roomId, 'meeting ended');
  });

  socket.on('remove-participant', ({ roomId, peerId } = {}) => {
    if (
      !isSafeCaptionIdentifier(roomId) ||
      !isSafeCaptionIdentifier(peerId) ||
      !deps.isRoomHost(roomId, socket.id)
    ) {
      return;
    }
    deps.stopByPeer(roomId, peerId, 'participant removed');
  });
};
