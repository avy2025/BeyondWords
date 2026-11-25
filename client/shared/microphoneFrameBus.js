// One AudioWorklet capture pipeline per MediaStream, with independent consumers.
// Caption Host transcription and participant-level translation can both receive
// the same 16 kHz mono PCM frames without opening another microphone or starting
// a competing AudioContext/Worklet for the same stream.

import { SARVAM_CONFIG } from './captionHost.js';

const DEFAULT_WORKLET_URL = '/caption-audio-processor.js';
const buses = new WeakMap();
let consumerCounter = 0;

export const nextMicrophoneConsumerId = (prefix = 'microphone') => {
  consumerCounter += 1;
  return `${prefix}-${consumerCounter}`;
};

export class MicrophoneFrameBus {
  constructor({
    stream,
    AudioContextCtor,
    AudioWorkletNodeCtor,
    workletUrl = DEFAULT_WORKLET_URL,
    sampleRate = SARVAM_CONFIG.sampleRate,
    setIntervalImpl = setInterval,
    clearIntervalImpl = clearInterval,
  } = {}) {
    this.stream = stream;
    this.AudioContextCtor = AudioContextCtor;
    this.AudioWorkletNodeCtor = AudioWorkletNodeCtor;
    this.workletUrl = workletUrl;
    this.sampleRate = sampleRate;
    // Native timer functions require their global receiver. Calling them as
    // this.setIntervalImpl(...) would otherwise throw "Illegal invocation" in
    // browsers while passing in the test doubles still works unchanged.
    this.setIntervalImpl =
      typeof setIntervalImpl?.bind === 'function'
        ? setIntervalImpl.bind(globalThis)
        : setIntervalImpl;
    this.clearIntervalImpl =
      typeof clearIntervalImpl?.bind === 'function'
        ? clearIntervalImpl.bind(globalThis)
        : clearIntervalImpl;

    this.consumers = new Map();
    this.resources = null;
    this.starting = null;
    this.status = 'idle';
  }

  subscribe(id, { onFrame = () => {}, onStatus = () => {} } = {}) {
    this.consumers.set(id, {
      id,
      onFrame,
      onStatus,
      active: false,
    });
    return () => this.unsubscribe(id);
  }

  unsubscribe(id) {
    const consumer = this.consumers.get(id);
    this.consumers.delete(id);
    if (consumer?.active && !this.hasActiveConsumers()) {
      this.stopResources('no active microphone consumers');
    }
  }

  activate(id) {
    const consumer = this.consumers.get(id);
    if (!consumer) return Promise.resolve(false);
    consumer.active = true;
    return this.ensureCapturing();
  }

  deactivate(id) {
    const consumer = this.consumers.get(id);
    if (!consumer) return;
    consumer.active = false;
    if (!this.hasActiveConsumers()) this.stopResources('capture inactive');
  }

  hasActiveConsumers() {
    return [...this.consumers.values()].some((consumer) => consumer.active);
  }

  ensureCapturing() {
    if (this.resources) {
      this.setStatus('capturing', 'Microphone capture active');
      return Promise.resolve(true);
    }
    if (this.starting) return this.starting;

    this.starting = Promise.resolve()
      .then(() => this.startResources())
      .finally(() => { this.starting = null; });
    return this.starting;
  }

  startResources() {
    const track = this.stream?.getAudioTracks?.()[0] || null;
    if (
      !this.stream ||
      !track ||
      track.readyState !== 'live' ||
      !track.enabled ||
      track.muted
    ) {
      this.setStatus('error', 'The existing microphone track is unavailable or muted. No second microphone was opened.');
      return false;
    }

    const ContextCtor = this.AudioContextCtor;
    const WorkletCtor = this.AudioWorkletNodeCtor;
    if (!ContextCtor || !WorkletCtor) {
      this.setStatus('error', 'This browser does not support AudioWorklet capture.');
      return false;
    }

    let context = null;
    try {
      try {
        context = new ContextCtor({ sampleRate: this.sampleRate });
      } catch {
        context = new ContextCtor();
      }

      const moduleResult = context.audioWorklet?.addModule?.(this.workletUrl);
      if (moduleResult && typeof moduleResult.then === 'function') {
        // Callers await activate(); the returned promise keeps module loading ordered.
        return moduleResult
          .then(() => this.finishStart({ context, track, WorkletCtor }))
          .catch((error) => this.failStart(context, error));
      }
      return this.finishStart({ context, track, WorkletCtor });
    } catch (error) {
      return this.failStart(context, error);
    }
  }

  finishStart({ context, track, WorkletCtor }) {
    const source = context.createMediaStreamSource(this.stream);
    const worklet = new WorkletCtor(context, 'caption-audio-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { sourceRate: context.sampleRate },
    });
    const silentGain = context.createGain();
    silentGain.gain.value = 0;

    worklet.port.onmessage = (event) => {
      if (!this.resources || this.resources.worklet !== worklet || !event?.data) return;
      [...this.consumers.values()].forEach((consumer) => {
        if (consumer.active) consumer.onFrame(event.data);
      });
    };

    source.connect(worklet);
    worklet.connect(silentGain);
    silentGain.connect(context.destination);

    const handleTrackEnded = () => {
      this.handleFailure('The microphone track ended during transcription.');
    };
    track.addEventListener?.('ended', handleTrackEnded);

    const monitorTimer = this.setIntervalImpl(() => {
      const currentTrack = this.stream?.getAudioTracks?.()[0];
      if (
        !currentTrack ||
        currentTrack.readyState !== 'live' ||
        !currentTrack.enabled ||
        currentTrack.muted
      ) {
        this.handleFailure('Microphone audio was muted or lost; transcription stopped.');
      }
    }, 500);

    this.resources = {
      context,
      source,
      worklet,
      silentGain,
      track,
      handleTrackEnded,
      monitorTimer,
    };

    return Promise.resolve(context.resume?.())
      .then(() => {
        this.setStatus('capturing', 'Microphone capture active');
        return true;
      })
      .catch((error) => this.failStart(context, error));
  }

  failStart(context, error) {
    try { context?.close?.(); } catch { /* already closed */ }
    this.setStatus('error', error?.message || 'Could not start microphone capture.');
    return false;
  }

  handleFailure(message) {
    this.stopResources(message);
    this.setStatus('error', message);
  }

  stopResources(reason = 'capture stopped') {
    const resources = this.resources;
    this.resources = null;
    if (!resources) return;

    try {
      resources.track?.removeEventListener?.('ended', resources.handleTrackEnded);
    } catch { /* listener cleanup is best-effort */ }
    this.clearIntervalImpl(resources.monitorTimer);
    try { resources.worklet.port.onmessage = null; } catch { /* already cleaned up */ }
    try { resources.worklet.disconnect(); } catch { /* already disconnected */ }
    try { resources.source.disconnect(); } catch { /* already disconnected */ }
    try { resources.silentGain.disconnect(); } catch { /* already disconnected */ }
    try { resources.context.close?.(); } catch { /* already closed */ }

    this.setStatus('idle', reason);
  }

  setStatus(status, message) {
    this.status = status;
    [...this.consumers.values()].forEach((consumer) => {
      consumer.onStatus(status, message);
    });
  }
};

export const getSharedMicrophoneFrameBus = ({ stream, ...options } = {}) => {
  if (!stream) return null;
  let bus = buses.get(stream);
  if (!bus) {
    bus = new MicrophoneFrameBus({ stream, ...options });
    buses.set(stream, bus);
  }
  return bus;
};
