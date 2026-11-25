import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerCaptionTranscriptionHandlers } from '../src/sockets/captionTranscriptionHandlers.js';
import {
  claimCaptionHostLease,
  getCaptionHostLease,
  releaseCaptionHostLeaseByRoom,
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
import {
  buildSarvamRealtimeUrl,
  createSarvamRealtimeProvider,
} from '../src/services/sarvamRealtimeProvider.js';
import { clearCaptionHostLeasesForTests } from '../src/services/captionHostLeaseService.js';
import { clearCaptionTranscriptionSessionsForTests } from '../src/services/captionHostTranscriptionService.js';
import {
  CAPTION_TRANSCRIPTION_CODES,
  CAPTION_TRANSCRIPTION_EVENTS,
  SARVAM_CONFIG,
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

const createFakeProvider = (state) => ({
  sent: [],
  closeCalled: false,
  ready: () => state.ready,
  sendAudio(pcm) {
    if (!state.ready || !Buffer.isBuffer(pcm)) return false;
    this.sent.push(Buffer.from(pcm));
    return true;
  },
  close() {
    this.closeCalled = true;
    state.ready = false;
  },
  emitEvent(event) {
    state.onEvent?.(event);
  },
  emitStatus(status) {
    state.onStatus?.(status);
  },
});

const createHarness = ({
  socketId = 'socket-2',
  isHost = true,
  apiKey = 'test-sarvam-key',
  providerReady = true,
} = {}) => {
  let currentTime = 1_000;
  const emissions = [];
  const io = {
    to: (roomId) => ({
      emit: (event, payload) => emissions.push({ roomId, event, payload }),
    }),
  };
  const socket = new FakeSocket(socketId);
  const providerState = { ready: providerReady, onEvent: null, onStatus: null };
  const provider = createFakeProvider(providerState);

  registerCaptionTranscriptionHandlers(socket, io, {
    getLease: (roomId) => getCaptionHostLease(roomId, currentTime),
    startSession: startCaptionTranscriptionSession,
    handleFrame: handleCaptionAudioFrame,
    stopSession: stopCaptionTranscriptionSession,
    stopByRoom: stopCaptionTranscriptionByRoom,
    stopByPeer: stopCaptionTranscriptionByPeer,
    stopBySocket: stopCaptionTranscriptionBySocket,
    stopInvalid: stopInvalidCaptionTranscriptionSessions,
    listSessions: listCaptionTranscriptionSessions,
    createProvider: (options) => {
      providerState.onEvent = options.onEvent;
      providerState.onStatus = options.onStatus;
      return provider;
    },
    getApiKey: () => apiKey,
    isRoomHost: () => isHost,
    now: () => currentTime,
    startWatchdog: false,
  });

  const claim = (peerId = 'peer-2', overrides = {}) => {
    const result = claimCaptionHostLease({
      roomId: 'room-1',
      peerId,
      socketId,
      accountId: 'account-1',
      sourceLanguage: 'hi-IN',
      now: currentTime,
      ...overrides,
    });
    if (!result.ok) throw new Error(`Test lease claim failed: ${result.code}`);
    return result.lease;
  };

  const startPayload = (lease, overrides = {}) => ({
    roomId: 'room-1',
    peerId: lease.peerId,
    leaseId: lease.leaseId,
    generation: lease.generation,
    sourceLanguage: 'hi-IN',
    streamType: 'balanced',
    ...overrides,
  });

  const framePayload = (lease, sequence, overrides = {}) => ({
    roomId: 'room-1',
    peerId: lease.peerId,
    leaseId: lease.leaseId,
    generation: lease.generation,
    sequence,
    pcm: Buffer.alloc(SARVAM_CONFIG.chunkBytes, 1).toString('base64'),
    bytes: SARVAM_CONFIG.chunkBytes,
    sampleRate: SARVAM_CONFIG.sampleRate,
    channels: SARVAM_CONFIG.channels,
    encoding: SARVAM_CONFIG.encoding,
    durationMs: SARVAM_CONFIG.chunkMs,
    ...overrides,
  });

  return {
    socket,
    emissions,
    provider,
    claim,
    startPayload,
    framePayload,
    events: (event) => emissions.filter((entry) => entry.event === event),
    emitWithAck: (event, payload) =>
      new Promise((resolve) => socket.trigger(event, payload, resolve)),
    emit: (event, payload) => socket.trigger(event, payload),
  };
};

beforeEach(() => {
  clearCaptionHostLeasesForTests();
  clearCaptionTranscriptionSessionsForTests();
});

test('start requires the active Caption Host lease and blocks duplicate sessions', async () => {
  const harness = createHarness();
  const lease = harness.claim();

  const first = await harness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.start, harness.startPayload(lease));
  assert.equal(first.ok, true);
  assert.equal(first.provider, 'sarvam');
  assert.ok(getCaptionTranscriptionSession('room-1'));

  const duplicate = await harness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.start, harness.startPayload(lease));
  assert.equal(duplicate.code, CAPTION_TRANSCRIPTION_CODES.BUSY);

  const impostor = createHarness({ socketId: 'socket-3' });
  const unauthorized = await impostor.emitWithAck(
    CAPTION_TRANSCRIPTION_EVENTS.start,
    harness.startPayload(lease)
  );
  assert.equal(unauthorized.code, CAPTION_TRANSCRIPTION_CODES.NOT_HOST);
});

test('stale lease and generation are rejected for start and audio', async () => {
  const harness = createHarness();
  const lease = harness.claim();
  await harness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.start, harness.startPayload(lease));

  const staleAudio = await harness.emitWithAck(
    CAPTION_TRANSCRIPTION_EVENTS.audio,
    harness.framePayload(lease, 0, { generation: 'old-generation' })
  );
  assert.equal(staleAudio.code, CAPTION_TRANSCRIPTION_CODES.STALE_GENERATION);

  releaseCaptionHostLeaseByRoom('room-1');
  const releasedAudio = await harness.emitWithAck(
    CAPTION_TRANSCRIPTION_EVENTS.audio,
    harness.framePayload(lease, 0)
  );
  assert.equal(releasedAudio.code, CAPTION_TRANSCRIPTION_CODES.STALE_GENERATION);

  const releasedStart = await harness.emitWithAck(
    CAPTION_TRANSCRIPTION_EVENTS.start,
    harness.startPayload(lease)
  );
  assert.equal(releasedStart.code, CAPTION_TRANSCRIPTION_CODES.STALE_GENERATION);
});

test('duplicate and out-of-order sequence numbers are rejected', async () => {
  const harness = createHarness();
  const lease = harness.claim();
  await harness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.start, harness.startPayload(lease));

  const first = await harness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.audio, harness.framePayload(lease, 0));
  assert.equal(first.ok, true);

  const duplicate = await harness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.audio, harness.framePayload(lease, 0));
  assert.equal(duplicate.code, CAPTION_TRANSCRIPTION_CODES.INVALID_SEQUENCE);

  const skipped = await harness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.audio, harness.framePayload(lease, 2));
  assert.equal(skipped.code, CAPTION_TRANSCRIPTION_CODES.INVALID_SEQUENCE);

  const next = await harness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.audio, harness.framePayload(lease, 1));
  assert.equal(next.ok, true);
  assert.equal(harness.provider.sent.length, 2);
});

test('audio chunk format is strictly validated', async () => {
  const harness = createHarness();
  const lease = harness.claim();
  await harness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.start, harness.startPayload(lease));

  const invalidFrames = [
    { bytes: 1600 },
    { sampleRate: 48000 },
    { channels: 2 },
    { encoding: 'linear32' },
    { durationMs: 20 },
    { pcm: 'not base64!' },
  ];

  for (const override of invalidFrames) {
    const result = await harness.emitWithAck(
      CAPTION_TRANSCRIPTION_EVENTS.audio,
      harness.framePayload(lease, 0, override)
    );
    assert.equal(result.code, CAPTION_TRANSCRIPTION_CODES.AUDIO_FORMAT);
  }
});

test('audio queue is bounded and stop cleans up the session and provider', async () => {
  const harness = createHarness({ providerReady: false });
  const lease = harness.claim();
  await harness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.start, harness.startPayload(lease));

  let rejected = 0;
  for (let sequence = 0; sequence < 21; sequence += 1) {
    const result = await harness.emitWithAck(
      CAPTION_TRANSCRIPTION_EVENTS.audio,
      harness.framePayload(lease, sequence)
    );
    if (!result.ok) rejected += 1;
  }

  assert.ok(rejected >= 1);
  assert.equal(getCaptionTranscriptionSession('room-1').queuedFrames, 20);

  const stopped = await harness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.stop, harness.startPayload(lease));
  assert.equal(stopped.ok, true);
  assert.equal(getCaptionTranscriptionSession('room-1'), null);
  assert.equal(harness.provider.closeCalled, true);
});

test('lease expiry cleanup stops invalid sessions', async () => {
  const harness = createHarness();
  const lease = harness.claim();
  await harness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.start, harness.startPayload(lease));

  releaseCaptionHostLeaseByRoom('room-1');
  const stopped = stopInvalidCaptionTranscriptionSessions({
    reason: 'caption host lease expired',
    isSessionValid: (session) => {
      const current = getCaptionHostLease('room-1', 1_000);
      return Boolean(
        current &&
          current.leaseId === session.leaseId &&
          current.generation === session.generation &&
          current.peerId === session.peerId &&
          current.socketId === session.socketId
      );
    },
  });

  assert.equal(stopped.length, 1);
  assert.equal(getCaptionTranscriptionSession('room-1'), null);
  assert.equal(harness.provider.closeCalled, true);
});

test('provider partial and final events broadcast room-scoped original captions', async () => {
  const harness = createHarness();
  const lease = harness.claim();
  await harness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.start, harness.startPayload(lease));

  harness.provider.emitStatus({ status: 'connected', provider: 'sarvam', sourceLanguage: 'hi-IN' });
  harness.provider.emitEvent({
    type: 'caption',
    kind: 'partial',
    text: 'नमस्ते',
    utteranceIndex: 0,
    provider: 'sarvam',
    sourceLanguage: 'hi-IN',
  });
  harness.provider.emitEvent({
    type: 'caption',
    kind: 'final',
    text: 'नमस्ते दुनिया',
    utteranceIndex: 0,
    provider: 'sarvam',
    sourceLanguage: 'hi-IN',
  });

  const captions = harness.events(CAPTION_TRANSCRIPTION_EVENTS.caption).map((entry) => entry.payload);
  assert.equal(captions.length, 2);
  assert.deepEqual(captions.map((caption) => caption.kind), ['partial', 'final']);
  assert.deepEqual(captions.map((caption) => caption.text), ['नमस्ते', 'नमस्ते दुनिया']);
  for (const caption of captions) {
    assert.equal(caption.roomId, 'room-1');
    assert.equal(caption.generation, lease.generation);
    assert.equal(caption.provider, 'sarvam');
  }
});

test('fatal provider auth and quota errors stop processing', async () => {
  const authHarness = createHarness();
  const authLease = authHarness.claim();
  await authHarness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.start, authHarness.startPayload(authLease));
  authHarness.provider.emitStatus({
    status: 'error',
    code: CAPTION_TRANSCRIPTION_CODES.PROVIDER_AUTH,
    message: 'Sarvam rejected the API subscription key.',
    fatal: true,
  });
  assert.equal(getCaptionTranscriptionSession('room-1'), null);
  assert.equal(authHarness.provider.closeCalled, true);
  assert.ok(
    authHarness.events(CAPTION_TRANSCRIPTION_EVENTS.status).some(
      (entry) => entry.payload.code === CAPTION_TRANSCRIPTION_CODES.PROVIDER_AUTH
    )
  );

  clearCaptionHostLeasesForTests();
  clearCaptionTranscriptionSessionsForTests();

  const quotaHarness = createHarness();
  const quotaLease = quotaHarness.claim();
  await quotaHarness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.start, quotaHarness.startPayload(quotaLease));
  quotaHarness.provider.emitStatus({
    status: 'error',
    code: CAPTION_TRANSCRIPTION_CODES.PROVIDER_QUOTA,
    message: 'Sarvam quota or rate limits were exceeded.',
    fatal: true,
  });
  assert.equal(getCaptionTranscriptionSession('room-1'), null);
  assert.ok(
    quotaHarness.events(CAPTION_TRANSCRIPTION_EVENTS.status).some(
      (entry) => entry.payload.code === CAPTION_TRANSCRIPTION_CODES.PROVIDER_QUOTA
    )
  );
});

test('disconnect, leave, meeting end and removal clean up sessions', async () => {
  const scenarios = [
    ['disconnect', async (harness) => harness.emit('disconnect', {})],
    ['leave-room', async (harness) => harness.emit('leave-room', { roomId: 'room-1' })],
    ['end-meeting', async (harness) => harness.emit('end-meeting', { roomId: 'room-1' })],
    ['remove-participant', async (harness) => harness.emit('remove-participant', { roomId: 'room-1', peerId: 'peer-2' })],
  ];

  for (const [, cleanup] of scenarios) {
    clearCaptionHostLeasesForTests();
    clearCaptionTranscriptionSessionsForTests();
    const harness = createHarness();
    const lease = harness.claim();
    await harness.emitWithAck(CAPTION_TRANSCRIPTION_EVENTS.start, harness.startPayload(lease));
    await cleanup(harness);
    assert.equal(getCaptionTranscriptionSession('room-1'), null);
    assert.equal(harness.provider.closeCalled, true);
  }
});

class FakeWebSocket {
  static instances = [];

  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.handlers = new Map();
    this.readyState = 1;
    this.sent = [];
    this.closeCalled = false;
    FakeWebSocket.instances.push(this);
  }

  on(event, handler) {
    this.handlers.set(event, handler);
  }

  emit(event, ...args) {
    this.handlers.get(event)?.(...args);
  }

  send(payload) {
    this.sent.push(payload);
  }

  close() {
    this.closeCalled = true;
    this.readyState = 3;
  }

  terminate() {
    this.close();
  }
}

test('Sarvam adapter uses the verified URL, header, audio frame and event contract', () => {
  FakeWebSocket.instances = [];
  const statuses = [];
  const captions = [];
  const provider = createSarvamRealtimeProvider({
    apiKey: 'test-sarvam-key',
    sourceLanguage: 'hi-IN',
    streamType: 'balanced',
    WebSocketImpl: FakeWebSocket,
    onStatus: (status) => statuses.push(status),
    onEvent: (event) => captions.push(event),
  });

  const socket = FakeWebSocket.instances[0];
  const url = new URL(socket.url);
  assert.equal(url.host, 'api.sarvam.ai');
  assert.equal(url.pathname, '/speech-to-text-realtime/ws');
  assert.equal(url.searchParams.get('model'), 'saaras:v4');
  assert.equal(url.searchParams.get('language_code'), 'hi-IN');
  assert.equal(url.searchParams.get('mode'), 'transcribe');
  assert.equal(url.searchParams.get('encoding'), 'linear16');
  assert.equal(url.searchParams.get('sample_rate'), '16000');
  assert.equal(url.searchParams.get('stream_type'), 'balanced');
  assert.ok(socket.options.headers['api-subscription-key']);
  assert.equal(buildSarvamRealtimeUrl({ sourceLanguage: 'en-IN', streamType: 'fast' }).includes('language_code=en-IN'), true);

  socket.emit('open');
  assert.equal(provider.ready(), true);
  provider.sendAudio(Buffer.alloc(SARVAM_CONFIG.chunkBytes, 7));
  const audioMessage = JSON.parse(socket.sent[0]);
  assert.equal(audioMessage.event, 'audio_input');
  assert.equal(Buffer.from(audioMessage.audio, 'base64').length, SARVAM_CONFIG.chunkBytes);

  assert.equal(provider.sendEnd(), true);
  assert.equal(JSON.parse(socket.sent[socket.sent.length - 1]).event, 'end');

  socket.emit('message', JSON.stringify({ event: 'session.begin', request_id: 'request-1' }));
  socket.emit('message', JSON.stringify({ event: 'transcript.partial', utterance_idx: 0, text: 'hello' }));
  socket.emit('message', JSON.stringify({ event: 'transcript.final', utterance_idx: 0, text: 'hello world' }));
  socket.emit('message', JSON.stringify({
    event: 'error',
    code: 'invalid_subscription_key',
    is_fatal: true,
    message: 'bad key',
    status_code: 401,
  }));

  assert.equal(statuses.some((status) => status.status === 'connected'), true);
  assert.deepEqual(captions.map((caption) => caption.kind), ['partial', 'final']);
  assert.equal(
    statuses.some((status) => status.code === CAPTION_TRANSCRIPTION_CODES.PROVIDER_AUTH),
    true
  );
  assert.equal(socket.closeCalled, true);
  assert.equal(JSON.stringify(statuses).includes('test-sarvam-key'), false);
  assert.equal(JSON.stringify(captions).includes(audioMessage.audio), false);

  provider.close();
});

test('Sarvam adapter maps a rejected handshake to a provider auth error', () => {
  FakeWebSocket.instances = [];
  const statuses = [];
  createSarvamRealtimeProvider({
    apiKey: 'test-sarvam-key',
    sourceLanguage: 'en-IN',
    WebSocketImpl: FakeWebSocket,
    onStatus: (status) => statuses.push(status),
  });

  const socket = FakeWebSocket.instances[0];
  socket.emit('unexpected-response', { abort() {} }, { statusCode: 403 });

  assert.equal(
    statuses.some((status) => status.code === CAPTION_TRANSCRIPTION_CODES.PROVIDER_AUTH),
    true
  );
  assert.equal(JSON.stringify(statuses).includes('test-sarvam-key'), false);
});
