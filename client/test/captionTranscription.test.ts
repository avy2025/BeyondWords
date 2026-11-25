import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAPTION_TRANSCRIPTION_CODES,
  CAPTION_TRANSCRIPTION_EVENTS,
  SARVAM_CONFIG,
  buildCaptionAudioFrame,
  buildCaptionTranscriptionStartRequest,
  isCaptionAudioFrameValid,
  shouldAcceptCaptionEvent,
} from '../shared/captionHost.js';

const pcmBase64 = Buffer.alloc(SARVAM_CONFIG.chunkBytes, 1).toString('base64');

const frame = (overrides = {}) => ({
  roomId: 'room-1',
  peerId: 'peer-2',
  leaseId: 'lease-1',
  generation: 'generation-1',
  sequence: 0,
  pcm: pcmBase64,
  bytes: SARVAM_CONFIG.chunkBytes,
  sampleRate: SARVAM_CONFIG.sampleRate,
  channels: SARVAM_CONFIG.channels,
  encoding: SARVAM_CONFIG.encoding,
  durationMs: SARVAM_CONFIG.chunkMs,
  ...overrides,
});

test('transcription events stay isolated from legacy subtitles and lease events', () => {
  assert.equal(CAPTION_TRANSCRIPTION_EVENTS.start, 'caption-transcription:start');
  assert.equal(CAPTION_TRANSCRIPTION_EVENTS.audio, 'caption-transcription:audio');
  assert.equal(CAPTION_TRANSCRIPTION_EVENTS.stop, 'caption-transcription:stop');
  assert.equal(CAPTION_TRANSCRIPTION_EVENTS.caption, 'caption-transcription:caption');
  assert.equal(CAPTION_TRANSCRIPTION_EVENTS.status, 'caption-transcription:status');

  const legacy = ['send-subtitle', 'subtitle_update', 'live-subtitles:authorize'];
  const lifecycle = ['caption-host:claim', 'caption-host:heartbeat', 'caption-host:release', 'caption-host:status'];
  assert.equal(
    Object.values(CAPTION_TRANSCRIPTION_EVENTS).some((event) => [...legacy, ...lifecycle].includes(event)),
    false
  );
});

test('Sarvam audio frames enforce 16 kHz mono linear16 100 ms chunks', () => {
  assert.equal(SARVAM_CONFIG.model, 'saaras:v4');
  assert.equal(SARVAM_CONFIG.mode, 'transcribe');
  assert.equal(SARVAM_CONFIG.encoding, 'linear16');
  assert.equal(SARVAM_CONFIG.chunkBytes, 3200);
  assert.equal(isCaptionAudioFrameValid(frame()), true);
  assert.equal(isCaptionAudioFrameValid(frame({ sampleRate: 48000 })), false);
  assert.equal(isCaptionAudioFrameValid(frame({ channels: 2 })), false);
  assert.equal(isCaptionAudioFrameValid(frame({ bytes: 6400 })), false);
  assert.equal(isCaptionAudioFrameValid(frame({ pcm: 'not base64!' })), false);
});

test('audio and start requests carry only validated metadata', () => {
  const audioRequest = buildCaptionAudioFrame(frame());
  assert.deepEqual(Object.keys(audioRequest).sort(), [
    'bytes', 'channels', 'durationMs', 'encoding', 'generation', 'leaseId',
    'pcm', 'peerId', 'roomId', 'sampleRate', 'sequence',
  ]);
  assert.equal('apiKey' in audioRequest, false);
  assert.throws(() => buildCaptionAudioFrame(frame({ sequence: -1 })));
  assert.throws(() => buildCaptionAudioFrame(frame({ sequence: 1.5 })));

  const startRequest = buildCaptionTranscriptionStartRequest({
    roomId: 'room-1',
    peerId: 'peer-2',
    leaseId: 'lease-1',
    generation: 'generation-1',
    sourceLanguage: 'hi-IN',
  });
  assert.equal(startRequest.streamType, 'balanced');
  assert.throws(() => buildCaptionTranscriptionStartRequest({
    roomId: 'room-1',
    peerId: 'peer-2',
    leaseId: 'lease-1',
    generation: 'generation-1',
    sourceLanguage: 'de-DE',
  }));
});

test('viewers reject captions from other rooms or generations', () => {
  const caption = {
    roomId: 'room-1',
    generation: 'generation-1',
    kind: 'partial',
    text: 'नमस्ते',
  };
  assert.equal(shouldAcceptCaptionEvent({ event: caption, roomId: 'room-1', generation: 'generation-1' }), true);
  assert.equal(shouldAcceptCaptionEvent({ event: caption, roomId: 'room-2', generation: 'generation-1' }), false);
  assert.equal(shouldAcceptCaptionEvent({ event: caption, roomId: 'room-1', generation: 'generation-2' }), false);
  assert.equal(
    shouldAcceptCaptionEvent({ event: { ...caption, kind: 'status' }, roomId: 'room-1', generation: 'generation-1' }),
    false
  );
});

test('provider error codes are distinct from lease error codes', () => {
  assert.equal(CAPTION_TRANSCRIPTION_CODES.PROVIDER_AUTH, 'CAPTION_PROVIDER_AUTH_ERROR');
  assert.equal(CAPTION_TRANSCRIPTION_CODES.PROVIDER_QUOTA, 'CAPTION_PROVIDER_QUOTA_ERROR');
  assert.equal(CAPTION_TRANSCRIPTION_CODES.INVALID_SEQUENCE, 'CAPTION_TRANSCRIPTION_INVALID_SEQUENCE');
});
