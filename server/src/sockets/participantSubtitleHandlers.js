// Independent participant-level translated subtitle transport.
// Each authenticated participant publishes only their own microphone audio;
// no Caption Host lease is used and receiving captions never requires publishing.

import jwt from 'jsonwebtoken';
import Account from '../models/Account.js';
import { getUsersInInMemRoom, isSocketHost } from '../services/roomService.js';
import {
  authorizeParticipantSubtitleMember,
  getParticipantSubtitleMember,
  getRoomParticipantSubtitleMembers,
  removeParticipantSubtitleMemberByPeer,
  removeParticipantSubtitleMembersByRoom,
  removeParticipantSubtitleMembersBySocket,
  updateParticipantSubtitlePreferences,
} from '../services/participantSubtitleMembershipService.js';
import {
  getParticipantSubtitleSession,
  handleParticipantSubtitleAudio,
  listParticipantSubtitleSessions,
  resolveSttProvider,
  startParticipantSubtitleSession,
  stopExpiredParticipantSubtitleSessions,
  stopParticipantSubtitleByPeer,
  stopParticipantSubtitleByRoom,
  stopParticipantSubtitleBySocket,
  stopParticipantSubtitleSession,
} from '../services/participantSubtitleSessionService.js';
import { translateParticipantCaption } from '../services/participantSubtitleTranslationService.js';
import { createSarvamRealtimeProvider } from '../services/sarvamRealtimeProvider.js';
import { createGeminiLiveTranscriptionProvider } from '../services/geminiLiveTranscriptionProvider.js';
import {
  PARTICIPANT_SUBTITLE_CODES,
  PARTICIPANT_SUBTITLE_EVENTS,
  buildParticipantSubtitleAuthorizeRequest,
  buildParticipantSubtitleAudioFrame,
  buildParticipantSubtitlePreferencesRequest,
  buildParticipantSubtitlePublishRequest,
  buildParticipantSubtitleStopRequest,
  isParticipantSubtitleAudioFrameValid,
  isParticipantSubtitleLanguage,
} from '../../../client/shared/participantSubtitles.js';
import { isSafeCaptionIdentifier } from '../../../client/shared/captionHost.js';

let watchdogStarted = false;

const defaultDependencies = {
  verifyToken: (token, secret) => jwt.verify(token, secret),
  findAccount: (accountId) => Account.findById(accountId).select('_id'),
  getRoomMembers: (roomId) => getUsersInInMemRoom(roomId),
  isRoomHost: (roomId, socketId) => isSocketHost(roomId, socketId),
  authorizeMember: authorizeParticipantSubtitleMember,
  getMember: getParticipantSubtitleMember,
  getRoomMembersForSubtitles: getRoomParticipantSubtitleMembers,
  updatePreferences: updateParticipantSubtitlePreferences,
  removeBySocket: removeParticipantSubtitleMembersBySocket,
  removeByRoom: removeParticipantSubtitleMembersByRoom,
  removeByPeer: removeParticipantSubtitleMemberByPeer,
  startSession: startParticipantSubtitleSession,
  handleFrame: handleParticipantSubtitleAudio,
  stopSession: stopParticipantSubtitleSession,
  stopBySocket: stopParticipantSubtitleBySocket,
  stopByRoom: stopParticipantSubtitleByRoom,
  stopByPeer: stopParticipantSubtitleByPeer,
  stopExpired: stopExpiredParticipantSubtitleSessions,
  listSessions: listParticipantSubtitleSessions,
  getSession: getParticipantSubtitleSession,
  translateCaption: translateParticipantCaption,
  createProvider: (options) => {
    if (options.provider === 'sarvam') {
      return createSarvamRealtimeProvider({
        apiKey: options.apiKey,
        sourceLanguage: options.sourceLanguage,
        streamType: options.streamType,
        onEvent: options.onEvent,
        onStatus: options.onStatus,
      });
    }
    return createGeminiLiveTranscriptionProvider({
      apiKey: options.apiKey,
      sourceLanguage: options.sourceLanguage,
      onEvent: options.onEvent,
      onStatus: options.onStatus,
    });
  },
  getSarvamApiKey: () => process.env.SARVAM_API_KEY,
  getGeminiApiKey: () => process.env.GEMINI_API_KEY,
  now: () => Date.now(),
};

const respond = (ack, payload) => {
  if (typeof ack === 'function') ack(payload);
};

const failure = (code, message) => ({ ok: false, code, message });

export const startParticipantSubtitleWatchdog = (deps) => {
  if (deps.startWatchdog === false || watchdogStarted) return;
  watchdogStarted = true;
  const timer = setInterval(() => {
    deps.stopExpired({
      reason: 'participant subtitle session expired',
      isSessionValid: (session) => {
        const member = deps.getMember(session.roomId, session.peerId);
        return Boolean(member && member.socketId === session.socketId);
      },
      now: deps.now(),
    });
  }, 1_000);
  if (typeof timer.unref === 'function') timer.unref();
};

export const registerParticipantSubtitleHandlers = (socket, io, dependencyOverrides = {}) => {
  const deps = { ...defaultDependencies, ...dependencyOverrides };
  startParticipantSubtitleWatchdog(deps);

  const authenticate = async (token) => {
    try {
      const decoded = deps.verifyToken(token, process.env.JWT_SECRET);
      const account = await Promise.resolve(deps.findAccount(decoded?.id));
      return account?._id ? String(account._id) : null;
    } catch {
      return null;
    }
  };

  const isActiveMember = (roomId, peerId) =>
    deps.getRoomMembers(roomId).some(
      (member) => member.peerId === peerId && member.socketId === socket.id
    );

  const currentMember = (roomId, peerId) => {
    const member = deps.getMember(roomId, peerId);
    if (!member || member.socketId !== socket.id) return null;
    return member;
  };

  const emitStatus = (status) => {
    if (!status?.roomId || !status?.peerId) return;
    io.to(socket.id).emit(PARTICIPANT_SUBTITLE_EVENTS.status, status);
  };

  const speakerNameFor = (roomId, peerId) =>
    deps.getRoomMembers(roomId).find((member) => member.peerId === peerId)?.userName || 'Participant';

  const emitTranslatedCaption = async (caption, member) => {
    const targetLanguage = member.subtitleLanguage;
    const isOriginal = caption.sourceLanguage === targetLanguage;
    let text = caption.text;
    let translationError = null;

    if (!isOriginal) {
      const result = await deps.translateCaption({
        apiKey: deps.getGeminiApiKey(),
        roomId: caption.roomId,
        peerId: caption.peerId,
        utteranceId: caption.utteranceId,
        sourceLanguage: caption.sourceLanguage,
        targetLanguage,
        text: caption.text,
      });
      if (result?.ok && result.text) {
        text = result.text;
      } else {
        translationError = result?.code || PARTICIPANT_SUBTITLE_CODES.TRANSLATION_ERROR;
      }
    }

    io.to(member.socketId).emit(PARTICIPANT_SUBTITLE_EVENTS.caption, {
      roomId: caption.roomId,
      sessionId: caption.sessionId,
      speakerPeerId: caption.peerId,
      speakerName: speakerNameFor(caption.roomId, caption.peerId),
      sourceLanguage: caption.sourceLanguage,
      targetLanguage,
      utteranceId: caption.utteranceId,
      kind: caption.kind,
      text,
      originalText: caption.text,
      translated: !isOriginal && !translationError,
      translationError,
      sttProvider: caption.provider,
      timestamp: deps.now(),
    });
  };

  const deliverCaption = (caption) => {
    if (!caption?.roomId || !caption?.peerId) return;
    const recipients = deps.getRoomMembersForSubtitles(caption.roomId);
    // Partial captions stay original-language; only finalized utterances are
    // translated, so no paid/free-tier call is made per audio chunk.
    if (caption.kind !== 'final') {
      recipients.forEach((member) => {
        io.to(member.socketId).emit(PARTICIPANT_SUBTITLE_EVENTS.caption, {
          roomId: caption.roomId,
          sessionId: caption.sessionId,
          speakerPeerId: caption.peerId,
          speakerName: speakerNameFor(caption.roomId, caption.peerId),
          sourceLanguage: caption.sourceLanguage,
          targetLanguage: member.subtitleLanguage,
          utteranceId: caption.utteranceId,
          kind: 'partial',
          text: caption.text,
          originalText: caption.text,
          translated: false,
          translationError: null,
          sttProvider: caption.provider,
          timestamp: deps.now(),
        });
      });
      return;
    }
    Promise.all(recipients.map((member) => emitTranslatedCaption(caption, member))).catch(() => {
      // Delivery failures are per-recipient; never log transcript content.
    });
  };

  socket.on(
    PARTICIPANT_SUBTITLE_EVENTS.authorize,
    async (payload = {}, ack) => {
      let request;
      try {
        request = buildParticipantSubtitleAuthorizeRequest(payload);
      } catch (error) {
        return respond(ack, failure(PARTICIPANT_SUBTITLE_CODES.INVALID_REQUEST, error.message));
      }

      const accountId = await authenticate(request.token);
      if (!accountId) {
        return respond(ack, failure(
          PARTICIPANT_SUBTITLE_CODES.INVALID_TOKEN,
          'Sign in again before enabling live translation.'
        ));
      }
      if (!isActiveMember(request.roomId, request.peerId)) {
        return respond(ack, failure(
          PARTICIPANT_SUBTITLE_CODES.NOT_IN_ROOM,
          'Join the meeting before enabling live translation.'
        ));
      }

      deps.stopByPeer(request.roomId, request.peerId, 'participant reauthorized');
      deps.authorizeMember({
        roomId: request.roomId,
        peerId: request.peerId,
        accountId,
        socketId: socket.id,
        speakingLanguage: request.speakingLanguage,
        subtitleLanguage: request.subtitleLanguage,
        now: deps.now(),
      });

      return respond(ack, {
        ok: true,
        speakingLanguage: request.speakingLanguage,
        subtitleLanguage: request.subtitleLanguage,
      });
    }
  );

  socket.on(PARTICIPANT_SUBTITLE_EVENTS.preferences, (payload = {}, ack) => {
    let request;
    try {
      request = buildParticipantSubtitlePreferencesRequest(payload);
    } catch (error) {
      return respond(ack, failure(PARTICIPANT_SUBTITLE_CODES.INVALID_REQUEST, error.message));
    }
    const member = currentMember(request.roomId, request.peerId);
    if (!member) {
      return respond(ack, failure(
        PARTICIPANT_SUBTITLE_CODES.NOT_IN_ROOM,
        'Live translation is not authorized for this participant.'
      ));
    }
    deps.updatePreferences({
      roomId: request.roomId,
      peerId: request.peerId,
      socketId: socket.id,
      speakingLanguage: request.speakingLanguage,
      subtitleLanguage: request.subtitleLanguage,
    });
    return respond(ack, { ok: true });
  });

  socket.on(PARTICIPANT_SUBTITLE_EVENTS.publishStart, async (payload = {}, ack) => {
    let request;
    try {
      request = buildParticipantSubtitlePublishRequest(payload);
    } catch (error) {
      return respond(ack, failure(PARTICIPANT_SUBTITLE_CODES.INVALID_REQUEST, error.message));
    }
    const member = currentMember(request.roomId, request.peerId);
    if (!member) {
      return respond(ack, failure(
        PARTICIPANT_SUBTITLE_CODES.NOT_IN_ROOM,
        'Live translation is not authorized for this participant.'
      ));
    }

    const provider = resolveSttProvider(request.speakingLanguage);
    if (!provider) {
      return respond(ack, failure(
        PARTICIPANT_SUBTITLE_CODES.UNSUPPORTED_LANGUAGE,
        'This speaking language is not supported for live transcription.'
      ));
    }

    deps.updatePreferences({
      roomId: request.roomId,
      peerId: request.peerId,
      socketId: socket.id,
      speakingLanguage: request.speakingLanguage,
      subtitleLanguage: member.subtitleLanguage,
    });

    const apiKey = provider === 'sarvam'
      ? deps.getSarvamApiKey()
      : deps.getGeminiApiKey();
    if (!apiKey) {
      return respond(ack, failure(
        PARTICIPANT_SUBTITLE_CODES.PROVIDER_CONFIG,
        provider === 'sarvam'
          ? 'SARVAM_API_KEY is not configured on the server.'
          : 'GEMINI_API_KEY is not configured on the server.'
      ));
    }

    const result = deps.startSession({
      member: { ...member, speakingLanguage: request.speakingLanguage },
      sourceLanguage: request.speakingLanguage,
      apiKey,
      providerFactory: deps.createProvider,
      onCaption: deliverCaption,
      onStatus: (status) => {
        emitStatus(status);
        if (status?.status === 'error' && status?.fatal) {
          deps.stopSession({ roomId: request.roomId, peerId: request.peerId, reason: 'provider error' });
        }
      },
      now: deps.now(),
    });

    if (!result?.ok) {
      return respond(ack, failure(
        result?.code || PARTICIPANT_SUBTITLE_CODES.PROVIDER_ERROR,
        result?.message || 'Could not start live transcription.'
      ));
    }

    return respond(ack, {
      ok: true,
      sessionId: result.session.sessionId,
      provider: result.session.provider,
      sourceLanguage: request.speakingLanguage,
    });
  });

  socket.on(PARTICIPANT_SUBTITLE_EVENTS.audio, (payload = {}, ack) => {
    let frame;
    try {
      frame = buildParticipantSubtitleAudioFrame(payload);
    } catch (error) {
      return respond(ack, failure(PARTICIPANT_SUBTITLE_CODES.INVALID_REQUEST, error.message));
    }
    if (!isSafeCaptionIdentifier(payload.sessionId)) {
      return respond(ack, failure(
        PARTICIPANT_SUBTITLE_CODES.INVALID_REQUEST,
        'Invalid audio session metadata.'
      ));
    }
    if (!isParticipantSubtitleAudioFrameValid({
      pcm: frame.pcm,
      bytes: frame.bytes,
      sampleRate: frame.sampleRate,
      channels: frame.channels,
      encoding: frame.encoding,
      durationMs: frame.durationMs,
    })) {
      return respond(ack, failure(
        PARTICIPANT_SUBTITLE_CODES.AUDIO_FORMAT,
        'Audio must be 16 kHz mono linear16 PCM.'
      ));
    }

    const pcm = Buffer.from(frame.pcm, 'base64');
    if (pcm.length !== frame.bytes || pcm.toString('base64') !== frame.pcm) {
      return respond(ack, failure(
        PARTICIPANT_SUBTITLE_CODES.AUDIO_FORMAT,
        'Invalid PCM audio payload.'
      ));
    }

    const member = currentMember(frame.roomId, frame.peerId);
    if (!member) {
      return respond(ack, failure(
        PARTICIPANT_SUBTITLE_CODES.NOT_IN_ROOM,
        'Live translation is not authorized for this participant.'
      ));
    }

    const result = deps.handleFrame({
      roomId: frame.roomId,
      peerId: frame.peerId,
      socketId: socket.id,
      sessionId: frame.sessionId,
      sequence: frame.sequence,
      pcm,
      now: deps.now(),
    });
    if (!result?.ok) {
      return respond(ack, failure(
        result?.code || PARTICIPANT_SUBTITLE_CODES.INVALID_REQUEST,
        result?.message || 'Audio frame rejected.'
      ));
    }
    return respond(ack, {
      ok: true,
      acceptedSequence: result.acceptedSequence,
      queuedFrames: result.queuedFrames ?? 0,
    });
  });

  socket.on(PARTICIPANT_SUBTITLE_EVENTS.publishStop, (payload = {}, ack) => {
    let request;
    try {
      request = buildParticipantSubtitleStopRequest(payload);
    } catch (error) {
      return respond(ack, failure(PARTICIPANT_SUBTITLE_CODES.INVALID_REQUEST, error.message));
    }
    const member = currentMember(request.roomId, request.peerId);
    if (!member) {
      return respond(ack, failure(
        PARTICIPANT_SUBTITLE_CODES.NOT_IN_ROOM,
        'Live translation is not authorized for this participant.'
      ));
    }
    const result = deps.stopSession({
      roomId: request.roomId,
      peerId: request.peerId,
      socketId: socket.id,
      reason: 'explicit stop',
    });
    if (!result?.ok) {
      return respond(ack, failure(
        result?.code || PARTICIPANT_SUBTITLE_CODES.STALE_SESSION,
        'No active transcription session.'
      ));
    }
    return respond(ack, { ok: true });
  });

  socket.on('leave-room', ({ roomId } = {}) => {
    if (!isSafeCaptionIdentifier(roomId)) return;
    deps.stopBySocket(socket.id, 'left room');
    deps.removeBySocket(socket.id);
  });

  socket.on('disconnect', () => {
    deps.stopBySocket(socket.id, 'socket disconnected');
    deps.removeBySocket(socket.id);
  });

  socket.on('end-meeting', ({ roomId } = {}) => {
    if (!isSafeCaptionIdentifier(roomId) || !deps.isRoomHost(roomId, socket.id)) return;
    deps.stopByRoom(roomId, 'meeting ended');
    deps.removeByRoom(roomId);
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
    deps.removeByPeer(roomId, peerId);
  });
};
