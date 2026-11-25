// Local, in-memory display state for participant subtitles. The live sentence
// is deliberately temporary (6 seconds, including a short fade-out), while
// completed utterances are kept in a separate session history. This module has
// no React, socket, provider, or persistence dependencies.

export const PARTICIPANT_SUBTITLE_DISPLAY_TIMING = Object.freeze({
  // Fully visible time for a completed sentence before the fade-out begins.
  liveVisibleMs: 6_000,
  liveFadeMs: 300,
  maxHistoryEntries: 200,
  maxSeenUtterances: 500,
});

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '');
const normalized = (value) => trimmed(value).replace(/\s+/g, ' ').toLocaleLowerCase();

const buildEntry = (event, { now, id, kind, fading = false }) => {
  const originalText = trimmed(event.originalText) || trimmed(event.text);
  const text = trimmed(event.text) || originalText;
  const translated = Boolean(event.translated);
  return {
    id,
    kind,
    utteranceId: trimmed(event.utteranceId),
    speakerPeerId: trimmed(event.speakerPeerId),
    speakerName: trimmed(event.speakerName) || 'Participant',
    timestamp: Number.isFinite(event.timestamp) ? event.timestamp : now(),
    text,
    originalText,
    translatedText: translated ? text : null,
    translated,
    translationError: trimmed(event.translationError) || null,
    sourceLanguage: trimmed(event.sourceLanguage) || null,
    fading,
  };
};

export class ParticipantSubtitleDisplayStore {
  constructor({
    roomId = null,
    now = () => Date.now(),
    schedule = (fn, ms) => setTimeout(fn, ms),
    cancel = (timer) => clearTimeout(timer),
    timing = PARTICIPANT_SUBTITLE_DISPLAY_TIMING,
  } = {}) {
    this.roomId = roomId;
    this.now = now;
    this.schedule = schedule;
    this.cancel = cancel;
    this.timing = { ...PARTICIPANT_SUBTITLE_DISPLAY_TIMING, ...timing };

    this.listeners = new Set();
    this.history = [];
    this.seenFinals = new Set();
    this.live = null;
    this.pendingPartial = null;
    this.generation = 0;
    this.fadeTimer = null;
    this.clearTimer = null;
    this.nextId = 0;
    this.snapshot = { live: null, history: [] };
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener) => {
    if (typeof listener !== 'function') return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  ingest(event) {
    if (!event || (event.roomId && this.roomId && event.roomId !== this.roomId)) return;
    if (event.kind === 'final') {
      this._ingestFinal(event);
    } else if (event.kind === 'partial') {
      this._ingestPartial(event);
    }
  }

  clearHistory() {
    this.history = [];
    this._emit();
  }

  reset(roomId = this.roomId) {
    this._cancelTimers();
    // Invalidate callbacks that were already dispatched but not yet cancelled.
    this.generation += 1;
    this.roomId = roomId;
    this.live = null;
    this.pendingPartial = null;
    this.history = [];
    this.seenFinals.clear();
    this._emit();
  }

  dispose() {
    this._cancelTimers();
    this.generation += 1;
    this.live = null;
    this.pendingPartial = null;
    // Do not notify listeners during an unmount; just keep the snapshot honest.
    this.snapshot = {
      live: null,
      history: this.history.map((entry) => ({ ...entry })),
    };
    this.listeners.clear();
  }

  _emit() {
    this.snapshot = {
      live: this.live ? { ...this.live } : null,
      history: this.history.map((entry) => ({ ...entry })),
    };
    this.listeners.forEach((listener) => listener());
  }

  _cancelTimers() {
    if (this.fadeTimer !== null) {
      this.cancel(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.clearTimer !== null) {
      this.cancel(this.clearTimer);
      this.clearTimer = null;
    }
  }

  _sameUtterance(a, b) {
    const utteranceId = trimmed(a?.utteranceId);
    return (
      Boolean(utteranceId) &&
      trimmed(a?.speakerPeerId) === trimmed(b?.speakerPeerId) &&
      utteranceId === trimmed(b?.utteranceId)
    );
  }

  _rememberFinal(event) {
    const utteranceId = trimmed(event.utteranceId);
    const key = `${trimmed(event.speakerPeerId)}:${utteranceId || normalized(event.text)}`;
    if (this.seenFinals.has(key)) return false;
    this.seenFinals.add(key);
    if (this.seenFinals.size > this.timing.maxSeenUtterances) {
      const oldest = this.seenFinals.values().next().value;
      if (oldest) this.seenFinals.delete(oldest);
    }
    return true;
  }

  _ingestFinal(event) {
    const text = trimmed(event.text);
    if (!text || !this._rememberFinal(event)) return;

    const entry = buildEntry(event, {
      now: this.now,
      id: ++this.nextId,
      kind: 'final',
    });
    this.history = [entry, ...this.history].slice(0, this.timing.maxHistoryEntries);
    // A completed utterance supersedes any interim text waiting in the wings.
    this.pendingPartial = null;
    this._showLive(entry);
  }

  _ingestPartial(event) {
    const text = trimmed(event.text);
    if (!text) return;

    const partial = buildEntry(event, {
      now: this.now,
      id: ++this.nextId,
      kind: 'partial',
    });
    const current = this.live;

    if (!current) {
      this.pendingPartial = null;
      this._showPartial(partial);
      return;
    }

    if (this._sameUtterance(current, event)) {
      // Ignored no-op updates keep rapidly refreshed interim text from
      // flickering; the completed sentence's timer is never restarted here.
      if (normalized(text) === normalized(current.text)) return;
      this.live = {
        ...current,
        text: partial.text,
        originalText: partial.originalText,
        translatedText: partial.translatedText,
        translated: partial.translated,
        translationError: partial.translationError,
        speakerName: partial.speakerName,
        timestamp: partial.timestamp,
        sourceLanguage: partial.sourceLanguage,
      };
      this._emit();
      return;
    }

    if (current.kind === 'partial' && !current.fading) {
      this._showPartial(partial);
      return;
    }

    // Do not cut a completed sentence short. Keep the newest interim text and
    // reveal it only after the completed sentence has faded away.
    this.pendingPartial = partial;
  }

  _showPartial(partial) {
    this._cancelTimers();
    this.generation += 1;
    this.live = partial;
    this._emit();
  }

  _showLive(entry) {
    this._cancelTimers();
    const generation = ++this.generation;
    this.live = entry;
    this._emit();

    this.fadeTimer = this.schedule(() => {
      if (generation !== this.generation || !this.live) return;
      this.fadeTimer = null;
      this.live = { ...this.live, fading: true };
      this._emit();

      this.clearTimer = this.schedule(() => {
        if (generation !== this.generation) return;
        this.clearTimer = null;
        this.live = null;
        // Invalidate callbacks for this sentence even if a cancel was missed.
        this.generation += 1;
        const pending = this.pendingPartial;
        this.pendingPartial = null;
        this._emit();
        if (pending) this._showPartial(pending);
      }, this.timing.liveFadeMs);
    }, this.timing.liveVisibleMs);
  }
}
