import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PARTICIPANT_SUBTITLE_DISPLAY_TIMING,
  ParticipantSubtitleDisplayStore,
} from '../shared/participantSubtitleDisplay.js';

const totalMs = PARTICIPANT_SUBTITLE_DISPLAY_TIMING.liveVisibleMs;
const fadeMs = PARTICIPANT_SUBTITLE_DISPLAY_TIMING.liveFadeMs;

type Timer = { id: number; at: number; fn: () => void };

const caption = (overrides: Record<string, unknown> = {}) => ({
  roomId: 'room-1',
  speakerPeerId: 'peer-a',
  speakerName: 'Asha',
  sourceLanguage: 'hi-IN',
  targetLanguage: 'en-IN',
  utteranceId: 'pst-1:u1',
  kind: 'final',
  text: 'Hello, friend.',
  originalText: 'नमस्ते, दोस्त।',
  translated: true,
  translationError: null,
  timestamp: 1_700_000_000_000,
  ...overrides,
});

const createHarness = () => {
  let nowMs = 1_700_000_000_000;
  let nextId = 0;
  const queued: Timer[] = [];
  const fired = new Map<number, () => void>();
  const cancelled: number[] = [];
  const snapshots: unknown[] = [];

  const store = new ParticipantSubtitleDisplayStore({
    roomId: 'room-1',
    now: () => nowMs,
    schedule: (fn: () => void, ms: number) => {
      const id = ++nextId;
      const timer = { id, at: nowMs + ms, fn };
      queued.push(timer);
      fired.set(id, fn);
      return id;
    },
    cancel: (id: number) => {
      cancelled.push(id);
      const index = queued.findIndex((timer) => timer.id === id);
      if (index >= 0) queued.splice(index, 1);
    },
  });
  store.subscribe(() => snapshots.push(store.getSnapshot()));

  return {
    store,
    queued,
    cancelled,
    snapshots,
    now: () => nowMs,
    advance(ms: number) {
      const target = nowMs + ms;
      for (;;) {
        const due = queued
          .filter((timer) => timer.at <= target)
          .sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        queued.splice(queued.indexOf(due), 1);
        nowMs = Math.max(nowMs, due.at);
        due.fn();
      }
      nowMs = target;
    },
    fireStale(id: number) {
      fired.get(id)?.();
    },
  };
};

test('a completed sentence appears in the live area and history immediately', () => {
  const h = createHarness();
  h.store.ingest(caption());

  const snapshot = h.store.getSnapshot() as any;
  assert.equal(snapshot.live.text, 'Hello, friend.');
  assert.equal(snapshot.live.speakerName, 'Asha');
  assert.equal(snapshot.live.kind, 'final');
  assert.equal(snapshot.live.fading, false);
  assert.equal(h.snapshots.length, 1);

  assert.equal(snapshot.history.length, 1);
  assert.deepEqual(
    {
      speakerName: snapshot.history[0].speakerName,
      timestamp: snapshot.history[0].timestamp,
      originalText: snapshot.history[0].originalText,
      translatedText: snapshot.history[0].translatedText,
    },
    {
      speakerName: 'Asha',
      timestamp: 1_700_000_000_000,
      originalText: 'नमस्ते, दोस्त।',
      translatedText: 'Hello, friend.',
    }
  );
});

test('the live sentence fades at six seconds and clears after the fade while history keeps it', () => {
  const h = createHarness();
  h.store.ingest(caption());

  assert.equal(h.queued[0].at - h.now(), totalMs);
  h.advance(totalMs - 1);
  assert.equal((h.store.getSnapshot() as any).live.fading, false);

  h.advance(1);
  assert.equal((h.store.getSnapshot() as any).live.fading, true);
  assert.equal((h.store.getSnapshot() as any).live.text, 'Hello, friend.');

  h.advance(fadeMs);
  const snapshot = h.store.getSnapshot() as any;
  assert.equal(snapshot.live, null);
  assert.equal(snapshot.history.length, 1);
  assert.equal(snapshot.history[0].text, 'Hello, friend.');
  assert.equal(h.queued.length, 0);
});

test('a new completed sentence replaces the live text and resets the six-second timer', () => {
  const h = createHarness();
  h.store.ingest(caption());
  h.advance(3_000);

  h.store.ingest(caption({
    utteranceId: 'pst-1:u2',
    text: 'A second sentence.',
    originalText: 'दूसरा वाक्य।',
  }));
  let snapshot = h.store.getSnapshot() as any;
  assert.equal(snapshot.live.text, 'A second sentence.');
  assert.equal(snapshot.history.length, 2);
  assert.equal(snapshot.history[0].text, 'A second sentence.');
  assert.equal(h.cancelled.length, 1);
  assert.equal(h.queued[0].at - h.now(), totalMs);

  // The first sentence's original deadline passes without clearing the new one.
  h.advance(totalMs - 1);
  snapshot = h.store.getSnapshot() as any;
  assert.equal(snapshot.live.text, 'A second sentence.');
  assert.equal(snapshot.live.fading, false);

  h.advance(1 + fadeMs);
  assert.equal((h.store.getSnapshot() as any).live, null);
  assert.equal((h.store.getSnapshot() as any).history.length, 2);
});

test('an older fade or clear callback cannot clear a newer sentence', () => {
  const h = createHarness();
  h.store.ingest(caption());
  const staleFadeId = h.queued[0].id;

  h.store.ingest(caption({
    utteranceId: 'pst-1:u2',
    text: 'Newer sentence.',
  }));
  const freshFadeId = h.queued[0].id;
  assert.notEqual(staleFadeId, freshFadeId);

  h.fireStale(staleFadeId);
  let snapshot = h.store.getSnapshot() as any;
  assert.equal(snapshot.live.text, 'Newer sentence.');
  assert.equal(snapshot.live.fading, false);
  assert.equal(h.queued.length, 1);

  h.advance(totalMs);
  const staleClearId = h.queued[0].id;
  h.store.ingest(caption({
    utteranceId: 'pst-1:u3',
    text: 'The newest sentence.',
  }));
  h.fireStale(staleClearId);

  snapshot = h.store.getSnapshot() as any;
  assert.equal(snapshot.live.text, 'The newest sentence.');
  assert.equal(snapshot.live.fading, false);
  assert.equal(snapshot.history.length, 3);
});

test('partial captions update live text without history entries or flicker', () => {
  const h = createHarness();
  h.store.ingest(caption({
    kind: 'partial',
    text: 'नमस्ते',
    translated: false,
    translationError: null,
  }));
  assert.equal((h.store.getSnapshot() as any).live.text, 'नमस्ते');
  assert.equal((h.store.getSnapshot() as any).history.length, 0);
  assert.equal(h.queued.length, 0, 'partials must not start a completion timer');

  const notificationsBeforeRepeat = h.snapshots.length;
  h.store.ingest(caption({
    kind: 'partial',
    text: 'नमस्ते',
    translated: false,
    translationError: null,
  }));
  assert.equal(h.snapshots.length, notificationsBeforeRepeat);

  h.store.ingest(caption({
    kind: 'partial',
    text: 'नमस्ते दोस्त',
    translated: false,
    translationError: null,
  }));
  const snapshot = h.store.getSnapshot() as any;
  assert.equal(snapshot.live.text, 'नमस्ते दोस्त');
  assert.equal(snapshot.live.kind, 'partial');
  assert.equal(snapshot.history.length, 0);

  h.store.ingest(caption());
  assert.equal((h.store.getSnapshot() as any).history.length, 1);
  assert.equal((h.store.getSnapshot() as any).live.text, 'Hello, friend.');
});

test('a partial for another utterance does not truncate a completed sentence', () => {
  const h = createHarness();
  h.store.ingest(caption());

  h.store.ingest(caption({
    kind: 'partial',
    utteranceId: 'pst-1:u2',
    text: 'अगला वाक्य',
    translated: false,
    translationError: null,
  }));

  const snapshot = h.store.getSnapshot() as any;
  assert.equal(snapshot.live.text, 'Hello, friend.');
  assert.equal(snapshot.live.kind, 'final');
  assert.equal(snapshot.history.length, 1);
});

test('a repeated final utterance does not create duplicate history or reset live', () => {
  const h = createHarness();
  h.store.ingest(caption());
  const first = h.store.getSnapshot() as any;
  const timerCount = h.queued.length;

  h.store.ingest(caption({ timestamp: first.history[0].timestamp + 25 }));
  const second = h.store.getSnapshot() as any;

  assert.equal(second.history.length, 1);
  assert.deepEqual(second.live, first.live);
  assert.equal(h.queued.length, timerCount);
  assert.equal(h.cancelled.length, 0);
});

test('a failed translation keeps the original recognized transcript', () => {
  const h = createHarness();
  h.store.ingest(caption({
    translated: false,
    translationError: 'PARTICIPANT_SUBTITLE_TRANSLATION_ERROR',
    text: 'नमस्ते, दोस्त।',
    originalText: 'नमस्ते, दोस्त।',
  }));

  const snapshot = h.store.getSnapshot() as any;
  assert.equal(snapshot.history[0].text, 'नमस्ते, दोस्त।');
  assert.equal(snapshot.history[0].originalText, 'नमस्ते, दोस्त।');
  assert.equal(snapshot.history[0].translatedText, null);
  assert.equal(snapshot.history[0].translationError, 'PARTICIPANT_SUBTITLE_TRANSLATION_ERROR');
  assert.equal(snapshot.live.text, 'नमस्ते, दोस्त।');
});

test('clear history is local and leaves the live sentence and its timer alone', () => {
  const h = createHarness();
  h.store.ingest(caption());
  const liveBefore = (h.store.getSnapshot() as any).live;
  const timerCount = h.queued.length;

  h.store.clearHistory();
  let snapshot = h.store.getSnapshot() as any;
  assert.equal(snapshot.history.length, 0);
  assert.deepEqual(snapshot.live, liveBefore);
  assert.equal(h.queued.length, timerCount);

  h.store.ingest(caption({ utteranceId: 'pst-1:u2', text: 'Fresh entry.' }));
  snapshot = h.store.getSnapshot() as any;
  assert.equal(snapshot.history.length, 1);
  assert.equal(snapshot.history[0].text, 'Fresh entry.');
});

test('dispose cancels timers and listeners on unmount', () => {
  const h = createHarness();
  h.store.ingest(caption());
  const staleFadeId = h.queued[0].id;

  h.store.dispose();
  assert.equal(h.queued.length, 0);
  assert.deepEqual(h.cancelled, [staleFadeId]);
  assert.equal(h.store.listeners.size, 0);

  h.fireStale(staleFadeId);
  const snapshot = h.store.getSnapshot() as any;
  assert.equal(snapshot.live, null);
  assert.equal(snapshot.history.length, 1);
  assert.equal(h.snapshots.length, 1);
});

test('display state is reset when the meeting changes or is left', () => {
  const h = createHarness();
  h.store.ingest(caption());

  h.store.reset('room-2');
  let snapshot = h.store.getSnapshot() as any;
  assert.equal(snapshot.live, null);
  assert.equal(snapshot.history.length, 0);
  assert.equal(h.queued.length, 0);

  h.store.ingest(caption({ roomId: 'room-1' }));
  assert.equal((h.store.getSnapshot() as any).history.length, 0);

  h.store.ingest(caption({ roomId: 'room-2' }));
  snapshot = h.store.getSnapshot() as any;
  assert.equal(snapshot.history.length, 1);
  assert.equal(snapshot.live.text, 'Hello, friend.');
});
