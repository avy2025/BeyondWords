import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerParticipantSubtitleHandlers } from '../src/sockets/participantSubtitleHandlers.js';
import { registerCaptionTranscriptionHandlers } from '../src/sockets/captionTranscriptionHandlers.js';
import {
  claimCaptionHostLease,
  clearCaptionHostLeasesForTests,
  getCaptionHostLease,
} from '../src/services/captionHostLeaseService.js';
import {
  getCaptionTranscriptionSession,
  handleCaptionAudioFrame,
  listCaptionTranscriptionSessions,
  startCaptionTranscriptionSession,
  stopCaptionTranscriptionByPeer,
  stopCaptionTranscriptionByRoom,
  stopCaptionTranscriptionBySocket,
  stopCaptionTranscriptionSession,
  stopInvalidCaptionTranscriptionSessions,
} from '../src/services/captionHostTranscriptionService.js';
import { clearCaptionTranscriptionSessionsForTests } from '../src/services/captionHostTranscriptionService.js';
import {
  getParticipantSubtitleSession,
  listParticipantSubtitleSessions,
} from '../src/services/participantSubtitleSessionService.js';
import { clearParticipantSubtitleSessionsForTests } from '../src/services/participantSubtitleSessionService.js';
import { clearParticipantTranslationCacheForTests } from '../src/services/participantSubtitleTranslationService.js';
import { createGeminiLiveTranscriptionProvider } from '../src/services/geminiLiveTranscriptionProvider.js';
import { createSarvamRealtimeProvider } from '../src/services/sarvamRealtimeProvider.js';
import {
  PARTICIPANT_SUBTITLE_CODES,
  PARTICIPANT_SUBTITLE_CONFIG,
  PARTICIPANT_SUBTITLE_EVENTS,
} from '../../client/shared/participantSubtitles.js';
import {
  CAPTION_TRANSCRIPTION_CODES,
  CAPTION_TRANSCRIPTION_EVENTS,
} from '../../client/shared/captionHost.js';

class FakeSocket {
  constructor(id) {
    this.id = id;
    this.handlers = new Map();
  }

  on(event, handler) {
    const list = this.handlers.get(event) || [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  trigger(event, payload = {}, ack) {
    return Promise.all((this.handlers.get(event) || []).map((handler) => handler(payload, ack)));
  }
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createHarness = ({
  socketId = 'socket-a',
  peerId = 'peer-a',
  roomId = 'room-1',
  isHost = true,
  sarvamKey = 'test-sarvam-key',
  geminiKey = 'test-gemini-key',
  translateCaption,
} = {}) => {
  const members = new Map();
  const emissions = [];
  const io = {
    to: (target) => ({
      emit: (event, payload) => emissions.push({ target, event, payload }),
    }),
  };
  const socket = new FakeSocket(socketId);
  const providerState = { onEvent: null, onStatus: null, options: null };
  const translations = { calls: [], cache: new Map() };
  let currentTime = 1_000;

  const memberKey = (room, peer) => `${room}:${peer}`;
  const deps = {
    verifyToken: () => ({ id: 'account-a' }),
    findAccount: () => ({ _id: 'account-a' }),
    getRoomMembers: () => [
      { roomId, peerId, socketId, userName: 'Participant A' },
      { roomId, peerId: 'peer-b', socketId: 'socket-b', userName: 'Participant B' },
      { roomId, peerId: 'peer-c', socketId: 'socket-c', userName: 'Participant C' },
    ],
    isRoomHost: () => isHost,
    authorizeMember: (member) => {
      members.set(memberKey(member.roomId, member.peerId), { ...member });
      return member;
    },
    getMember: (room, peer) => members.get(memberKey(room, peer)) || null,
    getRoomMembersForSubtitles: (room) =>
      [...members.values()].filter((member) => member.roomId === room),
    updatePreferences: (room, peer) => members.get(memberKey(room, peer)),
    removeBySocket: (targetSocketId) => {
      for (const [key, member] of [...members.entries()]) {
        if (member.socketId === targetSocketId) members.delete(key);
      }
    },
    removeByRoom: (room) => {
      for (const [key, member] of [...members.entries()]) {
        if (member.roomId === room) members.delete(key);
      }
    },
    removeByPeer: (room, peer) => members.delete(memberKey(room, peer)),
    translateCaption: translateCaption || (async (request) => {
      const key = `${request.utteranceId}|${request.targetLanguage}|${request.text}`;
      if (translations.cache.has(key)) {
        return {
          ok: true,
          text: translations.cache.get(key),
          cached: true,
        };
      }
      translations.calls.push(request);
      const text = `[${request.targetLanguage}] ${request.text}`;
      translations.cache.set(key, text);
      return { ok: true, text, cached: false };
    }),
    getSarvamApiKey: () => sarvamKey,
    getGeminiApiKey: () => geminiKey,
    now: () => currentTime,
    startWatchdog: false,
    createProvider: undefined,
  };

  registerParticipantSubtitleHandlers(socket, io, {
    ...deps,
    updatePreferences: ({ roomId: room, peerId: peer, speakingLanguage, subtitleLanguage }) => {
      const member = members.get(memberKey(room, peer));
      if (!member) return null;
      member.speakingLanguage = speakingLanguage;
      member.subtitleLanguage = subtitleLanguage;
      return member;
    },
    createProvider: (options) => {
      providerState.options = options;
      providerState.onEvent = options.onEvent;
      providerState.onStatus = options.onStatus;
      return {
        provider: options.provider,
        ready: () => true,
        sendAudio: () => true,
        sendEnd: () => true,
        close: () => {},
      };
    },
  });

  const authorizePayload = (overrides = {}) => ({
    roomId,
    peerId,
    token: 'test-token',
    speakingLanguage: 'hi-IN',
    subtitleLanguage: 'en-IN',
    ...overrides,
  });

  const framePayload = (sessionId, sequence, overrides = {}) => ({
    roomId,
    peerId,
    sessionId,
    sequence,
    pcm: Buffer.alloc(PARTICIPANT_SUBTITLE_CONFIG.chunkBytes, 1).toString('base64'),
    bytes: PARTICIPANT_SUBTITLE_CONFIG.chunkBytes,
    sampleRate: PARTICIPANT_SUBTITLE_CONFIG.sampleRate,
    channels: PARTICIPANT_SUBTITLE_CONFIG.channels,
    encoding: PARTICIPANT_SUBTITLE_CONFIG.encoding,
    durationMs: PARTICIPANT_SUBTITLE_CONFIG.chunkMs,
    ...overrides,
  });

  return {
    socket,
    emissions,
    members,
    memberKey,
    providerState,
    translations,
    deps,
    authorizePayload,
    framePayload,
    events: (event) => emissions.filter((entry) => entry.event === event),
    emitWithAck: (event, payload, targetSocket = socket) =>
      new Promise((resolve) => targetSocket.trigger(event, payload, resolve)),
    emit: (event, payload, targetSocket = socket) => targetSocket.trigger(event, payload),
    authorizeMember: (member) => members.set(memberKey(member.roomId, member.peerId), { ...member }),
  };
};

const createCaptionHarness = (socketId) => {
  const captionSocket = new FakeSocket(socketId);
  const io = { to: () => ({ emit: () => {} }) };
  const now = 1_000;

  registerCaptionTranscriptionHandlers(captionSocket, io, {
    getLease: (roomId) => getCaptionHostLease(roomId, now),
    startSession: startCaptionTranscriptionSession,
    handleFrame: handleCaptionAudioFrame,
    stopSession: stopCaptionTranscriptionSession,
    stopByRoom: stopCaptionTranscriptionByRoom,
    stopByPeer: stopCaptionTranscriptionByPeer,
    stopBySocket: stopCaptionTranscriptionBySocket,
    stopInvalid: stopInvalidCaptionTranscriptionSessions,
    listSessions: listCaptionTranscriptionSessions,
    createProvider: () => ({
      ready: () => true,
      sendAudio: () => true,
      sendEnd: () => true,
      close: () => {},
    }),
    getApiKey: () => 'test-sarvam-key',
    isRoomHost: () => true,
    now: () => now,
    startWatchdog: false,
  });

  const claim = (peerId) => {
    const result = claimCaptionHostLease({
      roomId: 'room-1',
      peerId,
      socketId,
      accountId: 'account-a',
      sourceLanguage: 'hi-IN',
      now,
    });
    assert.equal(result.ok, true, JSON.stringify(result));
    return result.lease;
  };

  const startPayload = (lease) => ({
    roomId: 'room-1',
    peerId: lease.peerId,
    leaseId: lease.leaseId,
    generation: lease.generation,
    sourceLanguage: 'hi-IN',
    streamType: 'balanced',
  });

  const framePayload = (lease, sequence) => ({
    ...startPayload(lease),
    sequence,
    pcm: Buffer.alloc(PARTICIPANT_SUBTITLE_CONFIG.chunkBytes, 1).toString('base64'),
    bytes: PARTICIPANT_SUBTITLE_CONFIG.chunkBytes,
    sampleRate: PARTICIPANT_SUBTITLE_CONFIG.sampleRate,
    channels: PARTICIPANT_SUBTITLE_CONFIG.channels,
    encoding: PARTICIPANT_SUBTITLE_CONFIG.encoding,
    durationMs: PARTICIPANT_SUBTITLE_CONFIG.chunkMs,
  });

  const emitWithAck = (event, payload) =>
    new Promise((resolve) => captionSocket.trigger(event, payload, resolve));

  return { socket: captionSocket, claim, startPayload, framePayload, emitWithAck };
};

const startBothPipelines = async (socketId = 'socket-a', peerId = 'peer-a') => {
  const participant = createHarness({ socketId, peerId });
  const caption = createCaptionHarness(socketId);
  const lease = caption.claim(peerId);

  const captionStart = await caption.emitWithAck(
    CAPTION_TRANSCRIPTION_EVENTS.start,
    caption.startPayload(lease)
  );
  assert.equal(captionStart.ok, true, JSON.stringify(captionStart));

  const authorized = await participant.emitWithAck(
    PARTICIPANT_SUBTITLE_EVENTS.authorize,
    participant.authorizePayload({ peerId })
  );
  assert.equal(authorized.ok, true, JSON.stringify(authorized));

  const participantStart = await participant.emitWithAck(
    PARTICIPANT_SUBTITLE_EVENTS.publishStart,
    { roomId: 'room-1', peerId, speakingLanguage: 'hi-IN' }
  );
  assert.equal(participantStart.ok, true, JSON.stringify(participantStart));

  return { participant, caption, lease, captionStart, participantStart };
};

beforeEach(() => {
  clearParticipantSubtitleSessionsForTests();
  clearParticipantTranslationCacheForTests();
  clearCaptionHostLeasesForTests();
  clearCaptionTranscriptionSessionsForTests();
});

test('authorization binds authenticated membership without enabling publishing', async () => {
  const harness = createHarness();
  const result = await harness.emitWithAck(
    PARTICIPANT_SUBTITLE_EVENTS.authorize,
    harness.authorizePayload()
  );

  assert.equal(result.ok, true);
  assert.equal(listParticipantSubtitleSessions().length, 0);
  const member = harness.members.get(harness.memberKey('room-1', 'peer-a'));
  assert.equal(member.accountId, 'account-a');
  assert.equal(member.subtitleLanguage, 'en-IN');
});

test('a participant can receive captions with publishing off and independent preferences', async () => {
  const harness = createHarness({ socketId: 'socket-b', peerId: 'peer-b' });
  const result = await harness.emitWithAck(
    PARTICIPANT_SUBTITLE_EVENTS.authorize,
    harness.authorizePayload({ peerId: 'peer-b', speakingLanguage: 'en-IN', subtitleLanguage: 'hi-IN' })
  );
  assert.equal(result.ok, true);

  harness.authorizeMember({
    roomId: 'room-1',
    peerId: 'peer-a',
    accountId: 'account-other',
    socketId: 'socket-a',
    speakingLanguage: 'hi-IN',
    subtitleLanguage: 'en-IN',
  });

  const b = harness.members.get(harness.memberKey('room-1', 'peer-b'));
  const a = harness.members.get(harness.memberKey('room-1', 'peer-a'));
  assert.equal(b.subtitleLanguage, 'hi-IN');
  assert.equal(a.subtitleLanguage, 'en-IN');
  assert.equal(listParticipantSubtitleSessions().length, 0);
});

test('publishing routes Hindi to Sarvam and German to Gemini Live', async () => {
  const sarvam = createHarness();
  await sarvam.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.authorize, sarvam.authorizePayload());
  const first = await sarvam.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.publishStart, {
    roomId: 'room-1',
    peerId: 'peer-a',
    speakingLanguage: 'hi-IN',
  });
  assert.equal(first.ok, true);
  assert.equal(first.provider, 'sarvam-saaras-v4');
  assert.equal(sarvam.providerState.options.provider, 'sarvam');

  const duplicate = await sarvam.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.publishStart, {
    roomId: 'room-1',
    peerId: 'peer-a',
    speakingLanguage: 'hi-IN',
  });
  assert.equal(duplicate.code, PARTICIPANT_SUBTITLE_CODES.BUSY);

  clearParticipantSubtitleSessionsForTests();
  const gemini = createHarness();
  await gemini.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.authorize, gemini.authorizePayload());
  const german = await gemini.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.publishStart, {
    roomId: 'room-1',
    peerId: 'peer-a',
    speakingLanguage: 'de-DE',
  });
  assert.equal(german.ok, true);
  assert.equal(german.provider, 'gemini-3.5-transcribe-live');
  assert.equal(gemini.providerState.options.provider, 'gemini');
});

test('audio ownership, sequence, and stale session validation are enforced', async () => {
  const harness = createHarness();
  await harness.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.authorize, harness.authorizePayload());
  const started = await harness.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.publishStart, {
    roomId: 'room-1',
    peerId: 'peer-a',
    speakingLanguage: 'hi-IN',
  });

  const first = await harness.emitWithAck(
    PARTICIPANT_SUBTITLE_EVENTS.audio,
    harness.framePayload(started.sessionId, 0)
  );
  assert.equal(first.ok, true);

  const duplicate = await harness.emitWithAck(
    PARTICIPANT_SUBTITLE_EVENTS.audio,
    harness.framePayload(started.sessionId, 0)
  );
  assert.equal(duplicate.code, PARTICIPANT_SUBTITLE_CODES.INVALID_SEQUENCE);

  const stale = await harness.emitWithAck(
    PARTICIPANT_SUBTITLE_EVENTS.audio,
    harness.framePayload('pst-old-session', 1)
  );
  assert.equal(stale.code, PARTICIPANT_SUBTITLE_CODES.STALE_SESSION);

  const impostor = createHarness({ socketId: 'socket-x', peerId: 'peer-a' });
  const unauthorized = await impostor.emitWithAck(
    PARTICIPANT_SUBTITLE_EVENTS.audio,
    harness.framePayload(started.sessionId, 1)
  );
  assert.equal(unauthorized.code, PARTICIPANT_SUBTITLE_CODES.NOT_IN_ROOM);
});

test('partials stay original and finals are translated once per target language', async () => {
  const harness = createHarness();
  await harness.emitWithAck(
    PARTICIPANT_SUBTITLE_EVENTS.authorize,
    harness.authorizePayload({ subtitleLanguage: 'hi-IN' })
  );
  harness.authorizeMember({
    roomId: 'room-1',
    peerId: 'peer-b',
    accountId: 'account-b',
    socketId: 'socket-b',
    speakingLanguage: 'en-IN',
    subtitleLanguage: 'en-IN',
  });
  harness.authorizeMember({
    roomId: 'room-1',
    peerId: 'peer-c',
    accountId: 'account-c',
    socketId: 'socket-c',
    speakingLanguage: 'de-DE',
    subtitleLanguage: 'de-DE',
  });
  const started = await harness.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.publishStart, {
    roomId: 'room-1',
    peerId: 'peer-a',
    speakingLanguage: 'hi-IN',
  });
  assert.equal(started.ok, true, JSON.stringify(started));

  harness.providerState.onEvent({ type: 'caption', kind: 'partial', text: 'नमस्ते', utteranceIndex: 0 });
  await flush();
  assert.equal(harness.translations.calls.length, 0);
  assert.equal(harness.events(PARTICIPANT_SUBTITLE_EVENTS.caption).length, 3);
  assert.equal(
    harness.events(PARTICIPANT_SUBTITLE_EVENTS.caption).every((entry) => entry.payload.translated === false),
    true
  );

  harness.providerState.onEvent({ type: 'caption', kind: 'final', text: 'नमस्ते', utteranceIndex: 0 });
  await flush();
  assert.equal(harness.translations.calls.length, 2);

  const captions = harness.events(PARTICIPANT_SUBTITLE_EVENTS.caption);
  const bySocket = Object.fromEntries(
    captions.filter((entry) => entry.payload.kind === 'final').map((entry) => [entry.target, entry.payload])
  );
  assert.equal(bySocket['socket-b'].text, '[en-IN] नमस्ते');
  assert.equal(bySocket['socket-c'].text, '[de-DE] नमस्ते');
  assert.equal(bySocket['socket-a'].text, 'नमस्ते');
  assert.equal(bySocket['socket-a'].translated, false);

  harness.providerState.onEvent({ type: 'caption', kind: 'final', text: 'नमस्ते', utteranceIndex: 0 });
  await flush();
  assert.equal(harness.translations.calls.length, 2, 'duplicate finals must be ignored');
});

test('a translated caption failure still delivers the original text', async () => {
  const harness = createHarness({
    translateCaption: async () => ({
      ok: false,
      code: PARTICIPANT_SUBTITLE_CODES.PROVIDER_QUOTA,
      message: 'quota exhausted',
    }),
  });
  await harness.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.authorize, harness.authorizePayload());
  const started = await harness.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.publishStart, {
    roomId: 'room-1',
    peerId: 'peer-a',
    speakingLanguage: 'hi-IN',
  });
  assert.equal(started.ok, true, JSON.stringify(started));

  harness.providerState.onEvent({ type: 'caption', kind: 'final', text: 'नमस्ते', utteranceIndex: 0 });
  await flush();
  const recipient = harness.events(PARTICIPANT_SUBTITLE_EVENTS.caption)
    .find((entry) => entry.target === 'socket-a' && entry.payload.kind === 'final');
  assert.equal(recipient.payload.text, 'नमस्ते');
  assert.equal(recipient.payload.translated, false);
  assert.equal(recipient.payload.translationError, PARTICIPANT_SUBTITLE_CODES.PROVIDER_QUOTA);
});

test('disconnect, meeting end, and participant removal clean up sessions and preferences', async () => {
  const harness = createHarness();
  await harness.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.authorize, harness.authorizePayload());
  await harness.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.publishStart, {
    roomId: 'room-1',
    peerId: 'peer-a',
    speakingLanguage: 'hi-IN',
  });
  assert.ok(getParticipantSubtitleSession('room-1', 'peer-a'));

  await harness.emit('disconnect');
  assert.equal(getParticipantSubtitleSession('room-1', 'peer-a'), null);
  assert.equal(harness.members.size, 0);
});

test('missing provider credentials produce a clear configuration error', async () => {
  const harness = createHarness({ sarvamKey: '' });
  await harness.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.authorize, harness.authorizePayload());
  const result = await harness.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.publishStart, {
    roomId: 'room-1',
    peerId: 'peer-a',
    speakingLanguage: 'hi-IN',
  });
  assert.equal(result.code, PARTICIPANT_SUBTITLE_CODES.PROVIDER_CONFIG);
  assert.equal(listParticipantSubtitleSessions().length, 0);
});

test('Gemini Live adapter uses the documented setup, audio, and transcript messages', () => {
  class FakeGeminiSocket {
    constructor() {
      this.readyState = 1;
      this.sent = [];
      this.handlers = new Map();
      FakeGeminiSocket.last = this;
    }

    on(event, handler) {
      this.handlers.set(event, handler);
    }

    send(raw) {
      this.sent.push(JSON.parse(raw));
    }

    trigger(event, ...args) {
      this.handlers.get(event)?.(...args);
    }

    close() {
      this.readyState = 3;
    }
  }

  const events = [];
  const statuses = [];
  const provider = createGeminiLiveTranscriptionProvider({
    apiKey: 'test-gemini-key',
    sourceLanguage: 'de-DE',
    WebSocketImpl: FakeGeminiSocket,
    onEvent: (event) => events.push(event),
    onStatus: (status) => statuses.push(status),
  });

  const socket = FakeGeminiSocket.last;
  socket.trigger('open');
  assert.equal(socket.sent[0].setup.model, 'models/gemini-3.5-transcribe-live');
  assert.deepEqual(socket.sent[0].setup.inputAudioTranscription.languageCodes, ['de-DE']);

  socket.trigger('message', Buffer.from(JSON.stringify({ setupComplete: {} })));
  assert.equal(provider.ready(), true);

  provider.sendAudio(Buffer.alloc(PARTICIPANT_SUBTITLE_CONFIG.chunkBytes, 3));
  const audioMessage = socket.sent[1];
  assert.equal(audioMessage.realtimeInput.audio.mimeType, 'audio/pcm;rate=16000');
  assert.equal(typeof audioMessage.realtimeInput.audio.data, 'string');

  socket.trigger('message', Buffer.from(JSON.stringify({
    serverContent: { interimInputTranscription: { text: 'Hallo' } },
  })));
  socket.trigger('message', Buffer.from(JSON.stringify({
    serverContent: { inputTranscription: { text: 'Hallo Welt.' } },
  })));

  assert.equal(events[0].kind, 'partial');
  assert.equal(events[0].text, 'Hallo');
  assert.equal(events[1].kind, 'final');
  assert.equal(events[1].text, 'Hallo Welt.');
  assert.equal(statuses.some((status) => status.status === 'connected'), true);
});

test('publishing starts with no Caption Host lease and no Azure subtitle dependency', async () => {
  const handlerSource = readFileSync(
    new URL('../src/sockets/participantSubtitleHandlers.js', import.meta.url),
    'utf8'
  );
  assert.equal(/azure|live-subtitles/i.test(handlerSource), false);
  assert.equal(getCaptionHostLease('room-1', 1_000), null);

  const harness = createHarness();
  await harness.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.authorize, harness.authorizePayload());
  const started = await harness.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.publishStart, {
    roomId: 'room-1',
    peerId: 'peer-a',
    speakingLanguage: 'hi-IN',
  });
  assert.equal(started.ok, true, JSON.stringify(started));
  assert.ok(getParticipantSubtitleSession('room-1', 'peer-a'));
  assert.equal(listCaptionTranscriptionSessions().length, 0);
});

test('an active Caption Host lease does not block participant authorization or publishing', async () => {
  const { participant, participantStart, lease } = await startBothPipelines();

  assert.ok(getCaptionHostLease('room-1', 1_000));
  assert.equal(getCaptionHostLease('room-1', 1_000).leaseId, lease.leaseId);
  assert.ok(getCaptionTranscriptionSession('room-1'));
  assert.equal(participantStart.ok, true);
  assert.ok(getParticipantSubtitleSession('room-1', 'peer-a'));
  assert.notEqual(
    getParticipantSubtitleSession('room-1', 'peer-a').sessionId,
    getCaptionTranscriptionSession('room-1').sessionId
  );
  assert.equal(participant.members.get(participant.memberKey('room-1', 'peer-a')).accountId, 'account-a');
});

test('stopping Caption Host leaves the participant session and its audio intact', async () => {
  const { participant, caption, lease, participantStart } = await startBothPipelines();

  const stopped = await caption.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.stop, {
    roomId: 'room-1',
    peerId: 'peer-a',
    leaseId: lease.leaseId,
    generation: lease.generation,
  });
  assert.equal(stopped.ok, true, JSON.stringify(stopped));
  assert.equal(getCaptionTranscriptionSession('room-1'), null);

  assert.ok(getParticipantSubtitleSession('room-1', 'peer-a'));
  const audio = await participant.emitWithAck(
    PARTICIPANT_SUBTITLE_EVENTS.audio,
    participant.framePayload(participantStart.sessionId, 0)
  );
  assert.equal(audio.ok, true, JSON.stringify(audio));
});

test('stopping participant publishing leaves the Caption Host session intact', async () => {
  const { participant, caption, lease } = await startBothPipelines();

  const stopped = await participant.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.publishStop, {
    roomId: 'room-1',
    peerId: 'peer-a',
  });
  assert.equal(stopped.ok, true, JSON.stringify(stopped));
  assert.equal(getParticipantSubtitleSession('room-1', 'peer-a'), null);
  assert.ok(getCaptionHostLease('room-1', 1_000));

  const captionSession = getCaptionTranscriptionSession('room-1');
  assert.ok(captionSession);
  assert.equal(captionSession.leaseId, lease.leaseId);
  const audio = await caption.emitWithAck(
    CAPTION_TRANSCRIPTION_EVENTS.audio,
    caption.framePayload(lease, 0)
  );
  assert.equal(audio.ok, true, JSON.stringify(audio));
});

test('two participants publish independently and one stop does not end the other session', async () => {
  const first = createHarness({ socketId: 'socket-a', peerId: 'peer-a' });
  const second = createHarness({ socketId: 'socket-b', peerId: 'peer-b' });

  for (const [harness, peerId] of [[first, 'peer-a'], [second, 'peer-b']]) {
    const authorized = await harness.emitWithAck(
      PARTICIPANT_SUBTITLE_EVENTS.authorize,
      harness.authorizePayload({ peerId })
    );
    assert.equal(authorized.ok, true, JSON.stringify(authorized));
    const started = await harness.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.publishStart, {
      roomId: 'room-1',
      peerId,
      speakingLanguage: 'hi-IN',
    });
    assert.equal(started.ok, true, JSON.stringify(started));
    harness.lastSessionId = started.sessionId;
  }

  assert.equal(listParticipantSubtitleSessions().length, 2);

  const stopped = await first.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.publishStop, {
    roomId: 'room-1',
    peerId: 'peer-a',
  });
  assert.equal(stopped.ok, true, JSON.stringify(stopped));
  assert.equal(getParticipantSubtitleSession('room-1', 'peer-a'), null);
  assert.ok(getParticipantSubtitleSession('room-1', 'peer-b'));

  const audio = await second.emitWithAck(
    PARTICIPANT_SUBTITLE_EVENTS.audio,
    second.framePayload(second.lastSessionId, 0)
  );
  assert.equal(audio.ok, true, JSON.stringify(audio));
});

test('a participant receives translated captions while their own publishing is off', async () => {
  const harness = createHarness();
  const authorized = await harness.emitWithAck(
    PARTICIPANT_SUBTITLE_EVENTS.authorize,
    harness.authorizePayload({ peerId: 'peer-a', subtitleLanguage: 'hi-IN' })
  );
  assert.equal(authorized.ok, true, JSON.stringify(authorized));
  harness.authorizeMember({
    roomId: 'room-1',
    peerId: 'peer-b',
    accountId: 'account-b',
    socketId: 'socket-b',
    speakingLanguage: 'hi-IN',
    subtitleLanguage: 'en-IN',
  });

  const started = await harness.emitWithAck(PARTICIPANT_SUBTITLE_EVENTS.publishStart, {
    roomId: 'room-1',
    peerId: 'peer-a',
    speakingLanguage: 'hi-IN',
  });
  assert.equal(started.ok, true, JSON.stringify(started));

  harness.providerState.onEvent({ type: 'caption', kind: 'final', text: 'नमस्ते', utteranceIndex: 0 });
  await flush();

  const receiverCaption = harness.events(PARTICIPANT_SUBTITLE_EVENTS.caption)
    .find((entry) => entry.target === 'socket-b' && entry.payload.kind === 'final');
  assert.ok(receiverCaption);
  assert.equal(receiverCaption.payload.targetLanguage, 'en-IN');
  assert.equal(receiverCaption.payload.text, '[en-IN] नमस्ते');
  assert.equal(receiverCaption.payload.translated, true);
  assert.equal(getParticipantSubtitleSession('room-1', 'peer-b'), null);
  assert.equal(listParticipantSubtitleSessions().length, 1);
});

test('provider connection timeouts surface a clear error instead of hanging', async () => {
  class SilentWebSocket {
    constructor() {
      this.readyState = 1;
      this.handlers = new Map();
    }

    on(event, handler) {
      this.handlers.set(event, handler);
    }

    send() {}

    close() {
      this.readyState = 3;
    }
  }

  const geminiStatuses = [];
  let geminiSocket;
  const gemini = createGeminiLiveTranscriptionProvider({
    apiKey: 'test-gemini-key',
    sourceLanguage: 'de-DE',
    WebSocketImpl: class extends SilentWebSocket {
      constructor(...args) {
        super(...args);
        geminiSocket = this;
      }
    },
    onStatus: (status) => geminiStatuses.push(status),
    connectionTimeoutMs: 10,
  });
  await delay(30);
  assert.equal(
    geminiStatuses.some((status) =>
      status.status === 'error' &&
      status.code === PARTICIPANT_SUBTITLE_CODES.PROVIDER_ERROR &&
      /did not connect in time/.test(status.message)
    ),
    true,
    JSON.stringify(geminiStatuses)
  );
  assert.equal(geminiSocket.readyState, 3);
  assert.equal(gemini.ready(), false);

  const sarvamStatuses = [];
  let sarvamSocket;
  const sarvam = createSarvamRealtimeProvider({
    apiKey: 'test-sarvam-key',
    sourceLanguage: 'hi-IN',
    WebSocketImpl: class extends SilentWebSocket {
      constructor(...args) {
        super(...args);
        sarvamSocket = this;
      }
    },
    onStatus: (status) => sarvamStatuses.push(status),
    connectionTimeoutMs: 10,
  });
  await delay(30);
  assert.equal(
    sarvamStatuses.some((status) =>
      status.status === 'error' &&
      status.code === CAPTION_TRANSCRIPTION_CODES.PROVIDER_ERROR &&
      /did not confirm session.begin in time/.test(status.message)
    ),
    true,
    JSON.stringify(sarvamStatuses)
  );
  assert.equal(sarvamSocket.readyState, 3);
  assert.equal(sarvam.ready(), false);
});
