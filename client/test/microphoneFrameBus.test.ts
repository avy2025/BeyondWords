import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MicrophoneFrameBus,
  getSharedMicrophoneFrameBus,
} from '../shared/microphoneFrameBus.js';

class FakeTrack {
  readyState = 'live';
  enabled = true;
  muted = false;
  listeners = new Map<string, Set<() => void>>();

  addEventListener(event: string, handler: () => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  removeEventListener(event: string, handler: () => void) {
    this.listeners.get(event)?.delete(handler);
  }
}

class FakeStream {
  track: FakeTrack;

  constructor() {
    this.track = new FakeTrack();
  }

  getAudioTracks() {
    return [this.track];
  }
}

class FakePort {
  onmessage: ((event: { data: unknown }) => void) | null = null;
}

class FakeWorklet {
  static instances: FakeWorklet[] = [];
  port = new FakePort();

  constructor(_context: unknown, _name: string, _options: unknown) {
    FakeWorklet.instances.push(this);
  }

  connect() {}
  disconnect() {}
}

class FakeGain {
  gain = { value: 1 };

  connect() {}
  disconnect() {}
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  audioWorklet = { addModule: async () => {} };
  destination = {};
  sampleRate: number;
  closed = false;

  constructor(options: { sampleRate?: number } = {}) {
    this.sampleRate = options.sampleRate || 48000;
    FakeAudioContext.instances.push(this);
  }

  createMediaStreamSource() {
    return { connect: () => {} };
  }

  createGain() {
    return new FakeGain();
  }

  resume() {
    return Promise.resolve();
  }

  close() {
    this.closed = true;
    return Promise.resolve();
  }
}

const createBus = (stream: FakeStream) => {
  const timers = new Set<() => void>();
  const bus = new MicrophoneFrameBus({
    stream,
    AudioContextCtor: FakeAudioContext,
    AudioWorkletNodeCtor: FakeWorklet,
    setIntervalImpl: (fn: () => void) => { timers.add(fn); return fn; },
    clearIntervalImpl: (fn: () => void) => { timers.delete(fn); },
  });
  return { bus, timers };
};

test('one shared bus serves multiple consumers from one MediaStream', () => {
  const stream = new FakeStream();
  assert.equal(
    getSharedMicrophoneFrameBus({ stream, AudioContextCtor: FakeAudioContext, AudioWorkletNodeCtor: FakeWorklet }),
    getSharedMicrophoneFrameBus({ stream })
  );
});

test('caption host and participant consumers share one capture without competing pipelines', async () => {
  FakeAudioContext.instances.length = 0;
  FakeWorklet.instances.length = 0;

  const stream = new FakeStream();
  const { bus } = createBus(stream);
  const captionFrames: unknown[] = [];
  const participantFrames: unknown[] = [];
  const captionStatuses: string[] = [];

  bus.subscribe('caption-host-transcription', {
    onFrame: (frame) => captionFrames.push(frame),
    onStatus: (status) => captionStatuses.push(status),
  });
  bus.subscribe('participant-subtitles', {
    onFrame: (frame) => participantFrames.push(frame),
  });

  assert.equal(await bus.activate('caption-host-transcription'), true);
  assert.equal(await bus.activate('participant-subtitles'), true);
  assert.equal(FakeAudioContext.instances.length, 1);
  assert.equal(FakeWorklet.instances.length, 1);
  assert.equal(captionStatuses.includes('capturing'), true);

  FakeWorklet.instances[0].port.onmessage?.({ data: { pcm: 'shared-frame' } });
  assert.deepEqual(captionFrames, [{ pcm: 'shared-frame' }]);
  assert.deepEqual(participantFrames, [{ pcm: 'shared-frame' }]);
});

test('stopping one consumer leaves the other capture alive; the last stop releases resources', async () => {
  FakeAudioContext.instances.length = 0;
  FakeWorklet.instances.length = 0;

  const stream = new FakeStream();
  const { bus } = createBus(stream);
  bus.subscribe('caption-host-transcription', {});
  bus.subscribe('participant-subtitles', {});

  await bus.activate('caption-host-transcription');
  await bus.activate('participant-subtitles');
  const context = FakeAudioContext.instances[0];

  bus.deactivate('caption-host-transcription');
  assert.equal(context.closed, false);

  bus.deactivate('participant-subtitles');
  assert.equal(context.closed, true);

  await bus.activate('participant-subtitles');
  assert.equal(FakeAudioContext.instances.length, 2);
  assert.equal(FakeWorklet.instances.length, 2);
});

test('receiver-sensitive timer implementations stay bound to the global object', async () => {
  FakeAudioContext.instances.length = 0;
  FakeWorklet.instances.length = 0;

  let setCalls = 0;
  let clearCalls = 0;
  const requireGlobalReceiver = function (this: unknown) {
    if (this !== globalThis) throw new TypeError('Illegal invocation');
  };
  const setIntervalImpl = function (this: unknown, _fn: () => void) {
    requireGlobalReceiver.call(this);
    setCalls += 1;
    return 0;
  } as typeof setInterval;
  const clearIntervalImpl = function (this: unknown, _handle: unknown) {
    requireGlobalReceiver.call(this);
    clearCalls += 1;
  } as typeof clearInterval;

  const stream = new FakeStream();
  const bus = new MicrophoneFrameBus({
    stream,
    AudioContextCtor: FakeAudioContext,
    AudioWorkletNodeCtor: FakeWorklet,
    setIntervalImpl,
    clearIntervalImpl,
  });
  bus.subscribe('participant-subtitles', {});

  assert.equal(await bus.activate('participant-subtitles'), true);
  bus.deactivate('participant-subtitles');
  assert.equal(setCalls, 1);
  assert.equal(clearCalls, 1);
});

test('a muted or missing microphone produces an error and never opens a second microphone', async () => {
  FakeAudioContext.instances.length = 0;
  FakeWorklet.instances.length = 0;

  const stream = new FakeStream();
  stream.track.muted = true;
  const { bus } = createBus(stream);
  const statuses: string[] = [];
  bus.subscribe('participant-subtitles', { onStatus: (status) => statuses.push(status) });

  assert.equal(await bus.activate('participant-subtitles'), false);
  assert.equal(statuses.includes('error'), true);
  assert.equal(FakeAudioContext.instances.length, 0);
});
