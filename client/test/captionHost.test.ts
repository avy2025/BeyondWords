import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CaptionHostControl from '../client/src/components/CaptionHostControl.jsx';
import {
  CAPTION_HOST_CODES,
  CAPTION_HOST_EVENTS,
  CAPTION_HOST_TIMING,
  CaptionHostClaimCoordinator,
  buildCaptionHostClaimRequest,
  isCaptionHostClaimReady,
  isCaptionSourceLanguage,
  isSafeCaptionIdentifier,
} from '../shared/captionHost.js';

test('caption host events are isolated from subtitle contracts', () => {
  assert.equal(CAPTION_HOST_EVENTS.claim, 'caption-host:claim');
  assert.equal(CAPTION_HOST_EVENTS.heartbeat, 'caption-host:heartbeat');
  assert.equal(CAPTION_HOST_EVENTS.release, 'caption-host:release');
  assert.equal(CAPTION_HOST_EVENTS.status, 'caption-host:status');
  assert.equal(CAPTION_HOST_CODES.BUSY, 'CAPTION_HOST_BUSY');
  assert.equal(
    Object.values(CAPTION_HOST_EVENTS).some((event) =>
      ['send-subtitle', 'subtitle_update', 'live-subtitles:authorize'].includes(event)
    ),
    false
  );
});

test('lease timing allows heartbeats before expiry', () => {
  assert.ok(CAPTION_HOST_TIMING.heartbeatMs > 0);
  assert.ok(CAPTION_HOST_TIMING.leaseMs > CAPTION_HOST_TIMING.heartbeatMs * 2);
});

test('identifiers and source languages are validated', () => {
  assert.equal(isSafeCaptionIdentifier('room-123'), true);
  assert.equal(isSafeCaptionIdentifier('peer_456'), true);
  assert.equal(isSafeCaptionIdentifier('bad room'), false);
  assert.equal(isSafeCaptionIdentifier(''), false);
  assert.equal(isCaptionSourceLanguage('hi-IN'), true);
  assert.equal(isCaptionSourceLanguage('de-DE'), true);
  assert.equal(isCaptionSourceLanguage('fr-FR'), false);
});

test('claim requests carry no keys or extra fields', () => {
  const request = buildCaptionHostClaimRequest({
    roomId: 'room-123',
    peerId: 'peer_456',
    token: 'auth-token',
    sourceLanguage: 'de-DE',
  });

  assert.deepEqual(request, {
    roomId: 'room-123',
    peerId: 'peer_456',
    token: 'auth-token',
    sourceLanguage: 'de-DE',
  });
  assert.equal('apiKey' in request, false);

  assert.throws(() =>
    buildCaptionHostClaimRequest({ roomId: 'bad room', peerId: 'peer_1', token: 't' })
  );
  assert.throws(() =>
    buildCaptionHostClaimRequest({ roomId: 'r', peerId: 'p', token: '' })
  );
  assert.throws(() =>
    buildCaptionHostClaimRequest({
      roomId: 'r',
      peerId: 'p',
      token: 't',
      sourceLanguage: 'unknown',
    })
  );
});

const createTimerHarness = () => {
  const timers: Array<{ fn: () => void; ms: number; cancelled: boolean }> = [];
  return {
    timers,
    schedule: (fn: () => void, ms: number) => {
      const timer = { fn, ms, cancelled: false };
      timers.push(timer);
      return timer;
    },
    cancel: (timer: { cancelled: boolean } | null) => {
      if (timer) timer.cancelled = true;
    },
    fire: (timer: { fn: () => void; cancelled: boolean }) => {
      if (!timer.cancelled) timer.fn();
    },
  };
};

const createCoordinatorHarness = () => {
  const timerHarness = createTimerHarness();
  const claimingStates: boolean[] = [];
  const timeouts: number[] = [];
  const logs: Array<{ event: string; details: any }> = [];
  const coordinator = new CaptionHostClaimCoordinator({
    ackTimeoutMs: CAPTION_HOST_TIMING.claimAckMs,
    schedule: timerHarness.schedule,
    cancel: timerHarness.cancel,
    onClaimingChange: (value: boolean) => claimingStates.push(value),
    onTimeout: (attempt: number) => timeouts.push(attempt),
    onLog: (event: string, details: any) => logs.push({ event, details }),
  });
  return { coordinator, timerHarness, claimingStates, timeouts, logs };
};

test('claim acknowledgement uses the 8-second timeout and resets claiming', () => {
  const harness = createCoordinatorHarness();
  const started = harness.coordinator.start({ emit: () => {} });

  assert.equal(started.ok, true);
  assert.equal(started.attempt, 1);
  assert.equal(harness.timerHarness.timers.length, 1);
  assert.equal(harness.timerHarness.timers[0].ms, 8_000);
  assert.equal(harness.claimingStates.at(-1), true);

  harness.timerHarness.fire(harness.timerHarness.timers[0]);

  assert.deepEqual(harness.timeouts, [1]);
  assert.equal(harness.claimingStates.at(-1), false);
  assert.equal(harness.coordinator.isClaiming, false);
});

test('successful acknowledgement clears the timeout and applies once', () => {
  const harness = createCoordinatorHarness();
  let ack: ((result: unknown) => void) | undefined;
  const applied: Array<{ attempt: number; generation: string }> = [];
  const started = harness.coordinator.start({
    emit: (onAck) => {
      ack = onAck;
    },
    onAck: (result, attempt) => applied.push({ attempt, generation: result.generation }),
  });

  assert.equal(started.ok, true);
  ack?.({ ok: true, generation: 'gen-1' });

  assert.equal(harness.timerHarness.timers[0].cancelled, true);
  assert.equal(harness.claimingStates.at(-1), false);
  assert.deepEqual(applied, [{ attempt: 1, generation: 'gen-1' }]);
  assert.deepEqual(harness.timeouts, []);
});

test('late acknowledgement after timeout is ignored', () => {
  const harness = createCoordinatorHarness();
  let ack: ((result: unknown) => void) | undefined;
  const applied: unknown[] = [];
  harness.coordinator.start({
    emit: (onAck) => {
      ack = onAck;
    },
    onAck: (result) => applied.push(result),
  });

  harness.timerHarness.fire(harness.timerHarness.timers[0]);
  ack?.({ ok: true, generation: 'late-gen' });

  assert.deepEqual(applied, []);
  assert.equal(harness.claimingStates.at(-1), false);
  assert.ok(harness.logs.some((entry) => entry.event === 'late claim ack ignored'));
});

test('acknowledgement from a superseded attempt is ignored', () => {
  const harness = createCoordinatorHarness();
  const acks: Array<(result: unknown) => void> = [];
  const applied: number[] = [];
  harness.coordinator.start({ emit: (onAck) => acks.push(onAck) });
  harness.coordinator.cancelPending('test reset');
  const second = harness.coordinator.start({
    emit: (onAck) => acks.push(onAck),
    onAck: (_result, attempt) => applied.push(attempt),
  });

  assert.equal(second.ok, true);
  assert.equal(second.attempt, 2);
  acks[0]?.({ ok: true, generation: 'old-gen' });
  acks[1]?.({ ok: true, generation: 'new-gen' });

  assert.deepEqual(applied, [2]);
});

test('duplicate claim requests are prevented while one is pending', () => {
  const harness = createCoordinatorHarness();
  let emitCount = 0;
  const first = harness.coordinator.start({
    emit: () => {
      emitCount += 1;
    },
  });
  const second = harness.coordinator.start({
    emit: () => {
      emitCount += 1;
    },
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.reason, 'duplicate');
  assert.equal(emitCount, 1);
  assert.equal(harness.timerHarness.timers.length, 1);
});

test('unmount cleanup cancels a pending claim timer', () => {
  const harness = createCoordinatorHarness();
  harness.coordinator.start({ emit: () => {} });
  const timer = harness.timerHarness.timers[0];

  harness.coordinator.dispose();
  harness.timerHarness.fire(timer);

  assert.equal(timer.cancelled, true);
  assert.deepEqual(harness.timeouts, []);
  assert.equal(harness.claimingStates.at(-1), false);
});

test('claim readiness requires confirmed room membership, not just a connection', () => {
  const ready = {
    isConnected: true,
    roomJoined: true,
    roomId: 'room-123',
    peerId: 'peer_456',
    hasAuthToken: true,
    claiming: false,
    statusActive: false,
  };

  assert.equal(isCaptionHostClaimReady(ready), true);
  assert.equal(isCaptionHostClaimReady({ ...ready, roomJoined: false }), false);
  assert.equal(isCaptionHostClaimReady({ ...ready, isConnected: false }), false);
  assert.equal(isCaptionHostClaimReady({ ...ready, hasAuthToken: false }), false);
  assert.equal(isCaptionHostClaimReady({ ...ready, claiming: true }), false);
  assert.equal(isCaptionHostClaimReady({ ...ready, statusActive: true }), false);
  assert.equal(isCaptionHostClaimReady({ ...ready, peerId: 'bad peer' }), false);
});

const renderControl = (roomJoined: boolean) => {
  const captionHost = {
    status: { status: 'idle', activeHostPeerId: null },
    error: null,
    claiming: false,
    canClaim: true,
    isCaptionHost: false,
    claim: () => {},
    release: () => {},
  };
  return renderToStaticMarkup(
    createElement(CaptionHostControl, {
      captionHost,
      peerId: 'peer_456',
      participants: [],
      isConnected: true,
      roomJoined,
    })
  );
};

test('claim button is disabled before confirmed room membership', () => {
  const beforeJoin = renderControl(false);
  const afterJoin = renderControl(true);

  assert.match(beforeJoin, /disabled=""/);
  assert.match(beforeJoin, /Available after you join the room/);
  assert.doesNotMatch(afterJoin, /disabled=""/);
});
