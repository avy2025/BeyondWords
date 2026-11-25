import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PARTICIPANT_SUBTITLE_CODES,
  PARTICIPANT_SUBTITLE_CONFIG,
  PARTICIPANT_SUBTITLE_EVENTS,
  PARTICIPANT_SUBTITLE_INDEPENDENCE,
  PARTICIPANT_SUBTITLE_LANGUAGES,
  PARTICIPANT_SUBTITLE_PROVIDERS,
  PARTICIPANT_SUBTITLE_TIMING,
  ParticipantSubtitleAckCoordinator,
  buildParticipantSubtitleAudioFrame,
  buildParticipantSubtitleAuthorizeRequest,
  buildParticipantSubtitlePreferencesRequest,
  buildParticipantSubtitlePublishRequest,
  shouldAcceptParticipantSubtitleCaption,
} from '../shared/participantSubtitles.js';

const pcm = Buffer.alloc(PARTICIPANT_SUBTITLE_CONFIG.chunkBytes, 2).toString('base64');

const authorize = (overrides = {}) => ({
  roomId: 'room-1',
  peerId: 'peer-a',
  token: 'test-token',
  speakingLanguage: 'hi-IN',
  subtitleLanguage: 'en-IN',
  ...overrides,
});

test('participant subtitle events are isolated from legacy and caption host events', () => {
  const reserved = [
    'send-subtitle',
    'subtitle_update',
    'live-subtitles:authorize',
    'caption-host:claim',
    'caption-transcription:start',
    'caption-transcription:caption',
  ];
  Object.values(PARTICIPANT_SUBTITLE_EVENTS).forEach((event) => {
    assert.equal(reserved.includes(event), false, `${event} must stay isolated`);
  });
  assert.equal(PARTICIPANT_SUBTITLE_EVENTS.authorize, 'participant-subtitles:authorize');
  assert.equal(PARTICIPANT_SUBTITLE_EVENTS.caption, 'participant-subtitles:caption');
});

test('authorization does not enable publishing and validates both languages', () => {
  const request = buildParticipantSubtitleAuthorizeRequest(authorize());
  assert.equal(request.speakingLanguage, 'hi-IN');
  assert.equal(request.subtitleLanguage, 'en-IN');
  assert.equal('shareEnabled' in request, false);

  assert.throws(() => buildParticipantSubtitleAuthorizeRequest(authorize({ token: '' })));
  assert.throws(() => buildParticipantSubtitleAuthorizeRequest(authorize({ speakingLanguage: 'fr-FR' })));
  assert.throws(() => buildParticipantSubtitleAuthorizeRequest(authorize({ subtitleLanguage: 'auto' })));
});

test('preferences are built independently for each participant', () => {
  const a = buildParticipantSubtitlePreferencesRequest({
    roomId: 'room-1',
    peerId: 'peer-a',
    speakingLanguage: 'hi-IN',
    subtitleLanguage: 'en-IN',
  });
  const b = buildParticipantSubtitlePreferencesRequest({
    roomId: 'room-1',
    peerId: 'peer-b',
    speakingLanguage: 'de-DE',
    subtitleLanguage: 'hi-IN',
  });

  assert.equal(a.speakingLanguage, 'hi-IN');
  assert.equal(b.speakingLanguage, 'de-DE');
  assert.equal(a.subtitleLanguage, 'en-IN');
  assert.equal(b.subtitleLanguage, 'hi-IN');
  assert.equal(PARTICIPANT_SUBTITLE_LANGUAGES.length, 3);
});

test('publish requests carry only the speaker language', () => {
  const request = buildParticipantSubtitlePublishRequest({
    roomId: 'room-1',
    peerId: 'peer-a',
    speakingLanguage: 'de-DE',
  });
  assert.deepEqual(request, {
    roomId: 'room-1',
    peerId: 'peer-a',
    speakingLanguage: 'de-DE',
  });
});

test('audio frames use the verified 16 kHz mono linear16 contract', () => {
  const frame = buildParticipantSubtitleAudioFrame({
    roomId: 'room-1',
    peerId: 'peer-a',
    sessionId: 'pst-1',
    sequence: 4,
    pcm,
    bytes: PARTICIPANT_SUBTITLE_CONFIG.chunkBytes,
  });
  assert.equal(frame.sampleRate, 16000);
  assert.equal(frame.channels, 1);
  assert.equal(frame.encoding, 'linear16');
  assert.equal(frame.durationMs, 100);
  assert.equal(frame.bytes, 3200);

  assert.throws(() => buildParticipantSubtitleAudioFrame({
    roomId: 'room-1',
    peerId: 'peer-a',
    sessionId: 'pst-1',
    sequence: 4,
    pcm,
    bytes: 6400,
  }));
  assert.throws(() => buildParticipantSubtitleAudioFrame({
    roomId: 'room-1',
    peerId: 'peer-a',
    sessionId: 'pst-1',
    sequence: -1,
    pcm,
    bytes: PARTICIPANT_SUBTITLE_CONFIG.chunkBytes,
  }));
});

test('viewer filtering respects room and preferred subtitle language', () => {
  const caption = {
    roomId: 'room-1',
    speakerPeerId: 'peer-a',
    targetLanguage: 'en-IN',
    utteranceId: 'pst-1:u0',
    kind: 'final',
    text: 'Hello',
  };
  assert.equal(shouldAcceptParticipantSubtitleCaption({
    event: caption,
    roomId: 'room-1',
    subtitleLanguage: 'en-IN',
  }), true);
  assert.equal(shouldAcceptParticipantSubtitleCaption({
    event: caption,
    roomId: 'room-2',
    subtitleLanguage: 'en-IN',
  }), false);
  assert.equal(shouldAcceptParticipantSubtitleCaption({
    event: caption,
    roomId: 'room-1',
    subtitleLanguage: 'hi-IN',
  }), false);
});

test('verified provider models are explicit in the shared contract', () => {
  assert.equal(PARTICIPANT_SUBTITLE_PROVIDERS.sarvam, 'sarvam-saaras-v4');
  assert.equal(PARTICIPANT_SUBTITLE_PROVIDERS.geminiLive, 'gemini-3.5-transcribe-live');
  assert.equal(PARTICIPANT_SUBTITLE_PROVIDERS.geminiTranslate, 'gemini-3.5-flash-lite');
});

test('legacy pipelines are not gates for participant publishing or receiving', () => {
  assert.equal(PARTICIPANT_SUBTITLE_INDEPENDENCE.requiresCaptionHostLease, false);
  assert.equal(PARTICIPANT_SUBTITLE_INDEPENDENCE.requiresAzureSubtitles, false);
  assert.equal(PARTICIPANT_SUBTITLE_INDEPENDENCE.requiresOwnPublishingToReceive, false);
  assert.equal(PARTICIPANT_SUBTITLE_INDEPENDENCE.opensSecondMicrophone, false);

  const hookSource = new URL('../client/src/hooks/useParticipantSubtitles.js', import.meta.url);
  const roomSource = new URL('../client/src/pages/RoomPage.tsx', import.meta.url);
  const hook = readFileSync(hookSource, 'utf8');
  const room = readFileSync(roomSource, 'utf8');

  assert.equal(hook.includes('externalCaptureActive'), false);
  assert.equal(hook.includes('caption-host'), false);
  assert.equal(hook.includes('azure'), false);
  assert.equal(room.includes('participantCaptureActiveElsewhere'), false);
  assert.equal(room.includes('getUserMedia'), false);
});

test('acknowledgement coordinator times out and rejects late stale acknowledgements', () => {
  const scheduled = new Map<number, () => void>();
  const cancelled: number[] = [];
  let timer = 0;
  const coordinator = new ParticipantSubtitleAckCoordinator({
    schedule: (fn) => { timer += 1; scheduled.set(timer, fn as () => void); return timer; },
    cancel: (id) => { cancelled.push(id as number); scheduled.delete(id as number); },
  });

  let ack: ((result: unknown) => void) | null = null;
  const results: unknown[] = [];
  coordinator.start({
    operation: 'authorize',
    emit: (callback) => { ack = callback; },
    onAck: (result) => results.push(result),
    onTimeout: (result) => results.push(result),
    timeoutMs: PARTICIPANT_SUBTITLE_TIMING.authorizationAckMs,
    timeoutMessage: 'Authorization timed out.',
  });

  scheduled.get(1)!();
  assert.deepEqual(results, [{
    ok: false,
    code: PARTICIPANT_SUBTITLE_CODES.ACK_TIMEOUT,
    message: 'Authorization timed out.',
  }]);

  ack?.({ ok: true, ignored: true });
  assert.equal(results.length, 1, 'a late ack must not reauthorize after timeout');

  const secondResults: unknown[] = [];
  let secondAck: ((result: unknown) => void) | null = null;
  coordinator.start({
    operation: 'publish-start',
    emit: (callback) => { secondAck = callback; },
    onAck: (result) => secondResults.push(result),
    timeoutMs: PARTICIPANT_SUBTITLE_TIMING.publishAckMs,
  });
  assert.equal(coordinator.pendingAttempt, 2);
  secondAck?.({ ok: true, sessionId: 'pst-fresh' });
  assert.deepEqual(secondResults, [{ ok: true, sessionId: 'pst-fresh' }]);
  assert.equal(coordinator.pendingAttempt, null);
});

test('a cancelled start ignores its late acknowledgement so re-enabling stays clean', () => {
  let timerId = 0;
  const coordinator = new ParticipantSubtitleAckCoordinator({
    schedule: () => { timerId += 1; return timerId; },
    cancel: () => {},
  });
  const staleResults: unknown[] = [];
  const freshResults: unknown[] = [];
  let staleAck: ((result: unknown) => void) | null = null;
  let freshAck: ((result: unknown) => void) | null = null;

  coordinator.start({
    emit: (callback) => { staleAck = callback; },
    onAck: (result) => staleResults.push(result),
  });
  coordinator.invalidate();
  coordinator.start({
    emit: (callback) => { freshAck = callback; },
    onAck: (result) => freshResults.push(result),
  });

  staleAck?.({ ok: true, sessionId: 'pst-stale' });
  freshAck?.({ ok: true, sessionId: 'pst-current' });
  assert.deepEqual(staleResults, []);
  assert.deepEqual(freshResults, [{ ok: true, sessionId: 'pst-current' }]);
});
