import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerCaptionHandlers } from '../src/sockets/captionHandlers.js';
import {
  clearCaptionHostLeasesForTests,
  getCaptionHostStatus,
} from '../src/services/captionHostLeaseService.js';
import {
  CAPTION_HOST_CODES,
  CAPTION_HOST_EVENTS,
  CAPTION_HOST_TIMING,
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
    const list = this.handlers.get(event) || [];
    return Promise.all(list.map((handler) => handler(payload, ack)));
  }
}

const createHarness = ({
  socketId = 'socket-2',
  members = [
    { peerId: 'peer-1', socketId: 'socket-1' },
    { peerId: 'peer-2', socketId: 'socket-2' },
    { peerId: 'peer-3', socketId: 'socket-3' },
  ],
  hostSocketId = 'socket-1',
} = {}) => {
  let currentTime = 1_000;
  const emissions = [];
  const io = {
    to: (roomId) => ({
      emit: (event, payload) => emissions.push({ roomId, event, payload }),
    }),
  };
  const socket = new FakeSocket(socketId);
  const dependencies = {
    verifyToken: (token) => {
      if (token !== 'valid-token') throw new Error('invalid token');
      return { id: 'account-id' };
    },
    findAccount: async () => ({ _id: 'account-1' }),
    getRoomMembers: () => members,
    isRoomHost: (_roomId, candidateSocketId) => candidateSocketId === hostSocketId,
    now: () => currentTime,
    startSweeper: false,
  };

  registerCaptionHandlers(socket, io, dependencies);

  return {
    socket,
    emissions,
    statuses: () =>
      emissions.filter((entry) => entry.event === CAPTION_HOST_EVENTS.status),
    lastStatus: () => {
      const matches = emissions.filter(
        (entry) => entry.event === CAPTION_HOST_EVENTS.status
      );
      return matches[matches.length - 1]?.payload;
    },
    setTime: (value) => {
      currentTime = value;
    },
    emitWithAck: (event, payload) =>
      new Promise((resolve) => socket.trigger(event, payload, resolve)),
    emit: (event, payload) => socket.trigger(event, payload),
  };
};

const claimPayload = (peerId = 'peer-2', token = 'valid-token') => ({
  roomId: 'room-1',
  peerId,
  token,
  sourceLanguage: 'hi-IN',
});

beforeEach(() => {
  clearCaptionHostLeasesForTests();
});

test('successful claim creates one explicit Caption Host lease', async () => {
  const harness = createHarness();

  const result = await harness.emitWithAck(
    CAPTION_HOST_EVENTS.claim,
    claimPayload()
  );

  assert.equal(result.ok, true);
  assert.ok(result.generation);
  assert.ok(result.leaseId);
  assert.equal(harness.lastStatus().status, 'active');
  assert.equal(harness.lastStatus().activeHostPeerId, 'peer-2');
  assert.equal(harness.lastStatus().generation, result.generation);
});

test('second claim is rejected with CAPTION_HOST_BUSY', async () => {
  const first = createHarness();
  const second = createHarness({
    socketId: 'socket-3',
    members: [
      { peerId: 'peer-1', socketId: 'socket-1' },
      { peerId: 'peer-3', socketId: 'socket-3' },
    ],
  });

  const firstResult = await first.emitWithAck(CAPTION_HOST_EVENTS.claim, claimPayload());
  const secondResult = await second.emitWithAck(
    CAPTION_HOST_EVENTS.claim,
    claimPayload('peer-3')
  );

  assert.equal(firstResult.ok, true);
  assert.equal(secondResult.ok, false);
  assert.equal(secondResult.code, CAPTION_HOST_CODES.BUSY);
  assert.match(secondResult.message, /already the Caption Host/i);
  assert.equal(getCaptionHostStatus('room-1', 1_000).activeHostPeerId, 'peer-2');
});

test('development claim diagnostics stay safe and log only codes', async () => {
  const previousTestContext = process.env.NODE_TEST_CONTEXT;
  const originalDebug = console.debug;
  const logs = [];
  delete process.env.NODE_TEST_CONTEXT;
  console.debug = (...args) => logs.push(args);

  try {
    const harness = createHarness();
    const result = await harness.emitWithAck(
      CAPTION_HOST_EVENTS.claim,
      claimPayload('peer-2', 'valid-token')
    );
    assert.equal(result.ok, true);

    let serialized = JSON.stringify(logs);
    assert.doesNotMatch(serialized, /valid-token/);
    assert.doesNotMatch(serialized, /authorization|cookie|apikey|jwt/i);
    assert.match(serialized, /claim received/);
    assert.match(serialized, /validation started/);
    assert.match(serialized, /lease created/);
    assert.match(serialized, /ack sent/);

    logs.length = 0;
    const rejected = createHarness();
    const failureResult = await rejected.emitWithAck(
      CAPTION_HOST_EVENTS.claim,
      claimPayload('peer-2', 'bad-token')
    );
    assert.equal(failureResult.ok, false);
    serialized = JSON.stringify(logs);
    assert.doesNotMatch(serialized, /bad-token/);
    assert.match(serialized, /validation rejected/);
    assert.match(serialized, /CAPTION_HOST_INVALID_TOKEN/);
  } finally {
    console.debug = originalDebug;
    if (previousTestContext === undefined) {
      delete process.env.NODE_TEST_CONTEXT;
    } else {
      process.env.NODE_TEST_CONTEXT = previousTestContext;
    }
  }
});

test('heartbeat renews the lease and expiry rejects stale heartbeats', async () => {
  const harness = createHarness();
  const claimResult = await harness.emitWithAck(
    CAPTION_HOST_EVENTS.claim,
    claimPayload()
  );

  harness.setTime(1_000 + CAPTION_HOST_TIMING.leaseMs - 1_000);
  const renewed = await harness.emitWithAck(CAPTION_HOST_EVENTS.heartbeat, {
    roomId: 'room-1',
    peerId: 'peer-2',
    generation: claimResult.generation,
  });

  assert.equal(renewed.ok, true);
  assert.equal(renewed.expiresAt, 1_000 + CAPTION_HOST_TIMING.leaseMs - 1_000 + CAPTION_HOST_TIMING.leaseMs);

  harness.setTime(renewed.expiresAt);
  const expired = await harness.emitWithAck(CAPTION_HOST_EVENTS.heartbeat, {
    roomId: 'room-1',
    peerId: 'peer-2',
    generation: claimResult.generation,
  });

  assert.equal(expired.ok, false);
  assert.equal(expired.code, CAPTION_HOST_CODES.STALE_GENERATION);
  assert.equal(getCaptionHostStatus('room-1', renewed.expiresAt).status, 'idle');
});

test('claim requires active meeting membership', async () => {
  const harness = createHarness();

  const result = await harness.emitWithAck(
    CAPTION_HOST_EVENTS.claim,
    claimPayload('peer-not-in-room')
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, CAPTION_HOST_CODES.NOT_IN_ROOM);
  assert.equal(getCaptionHostStatus('room-1').status, 'idle');
});

test('claim rejects invalid JWT', async () => {
  const harness = createHarness();

  const result = await harness.emitWithAck(
    CAPTION_HOST_EVENTS.claim,
    claimPayload('peer-2', 'not-a-valid-token')
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, CAPTION_HOST_CODES.INVALID_TOKEN);
  assert.equal(getCaptionHostStatus('room-1').status, 'idle');
});

test('stale generations cannot renew or release an active lease', async () => {
  const harness = createHarness();
  const claimResult = await harness.emitWithAck(
    CAPTION_HOST_EVENTS.claim,
    claimPayload()
  );

  const staleHeartbeat = await harness.emitWithAck(CAPTION_HOST_EVENTS.heartbeat, {
    roomId: 'room-1',
    peerId: 'peer-2',
    generation: 'previous-generation',
  });
  const staleRelease = await harness.emitWithAck(CAPTION_HOST_EVENTS.release, {
    roomId: 'room-1',
    peerId: 'peer-2',
    generation: 'previous-generation',
  });

  assert.equal(staleHeartbeat.code, CAPTION_HOST_CODES.STALE_GENERATION);
  assert.equal(staleRelease.code, CAPTION_HOST_CODES.STALE_GENERATION);
  assert.equal(getCaptionHostStatus('room-1', 1_000).generation, claimResult.generation);
});

test('explicit release clears the lease', async () => {
  const harness = createHarness();
  const claimResult = await harness.emitWithAck(
    CAPTION_HOST_EVENTS.claim,
    claimPayload()
  );

  const released = await harness.emitWithAck(CAPTION_HOST_EVENTS.release, {
    roomId: 'room-1',
    peerId: 'peer-2',
    generation: claimResult.generation,
  });

  assert.equal(released.ok, true);
  assert.equal(harness.lastStatus().status, 'idle');
  assert.equal(harness.lastStatus().activeHostPeerId, null);
});

test('disconnect and leaving the room clean up the lease', async () => {
  const leaveHarness = createHarness();
  const firstClaim = await leaveHarness.emitWithAck(
    CAPTION_HOST_EVENTS.claim,
    claimPayload()
  );
  assert.equal(firstClaim.ok, true);
  await leaveHarness.emit('leave-room', { roomId: 'room-1' });
  assert.equal(leaveHarness.lastStatus().status, 'idle');

  const disconnectHarness = createHarness();
  const secondClaim = await disconnectHarness.emitWithAck(
    CAPTION_HOST_EVENTS.claim,
    claimPayload()
  );
  assert.equal(secondClaim.ok, true);
  await disconnectHarness.emit('disconnect', {});
  assert.equal(disconnectHarness.lastStatus().status, 'idle');
});

test('meeting end and host removal clean up the lease', async () => {
  const endHarness = createHarness({ socketId: 'socket-1' });
  const endClaim = await endHarness.emitWithAck(
    CAPTION_HOST_EVENTS.claim,
    claimPayload('peer-1')
  );
  assert.equal(endClaim.ok, true);
  await endHarness.emit('end-meeting', { roomId: 'room-1' });
  assert.equal(endHarness.lastStatus().status, 'idle');

  const removalClaimHarness = createHarness();
  const removalClaim = await removalClaimHarness.emitWithAck(
    CAPTION_HOST_EVENTS.claim,
    claimPayload()
  );
  assert.equal(removalClaim.ok, true);

  const removalHostHarness = createHarness({ socketId: 'socket-1' });
  await removalHostHarness.emit('remove-participant', {
    roomId: 'room-1',
    peerId: 'peer-2',
  });
  assert.equal(removalHostHarness.lastStatus().status, 'idle');
  assert.equal(getCaptionHostStatus('room-1', 1_000).status, 'idle');
});

test('late joiners and reconnects receive the current Caption Host status', async () => {
  const hostHarness = createHarness();
  const claimResult = await hostHarness.emitWithAck(
    CAPTION_HOST_EVENTS.claim,
    claimPayload()
  );
  assert.equal(claimResult.ok, true);

  const lateHarness = createHarness({
    socketId: 'socket-3',
    members: [{ peerId: 'peer-3', socketId: 'socket-3' }],
  });
  await lateHarness.emit('join-room', { roomId: 'room-1' });

  const synced = lateHarness.emissions.find(
    (entry) => entry.roomId === 'socket-3' && entry.event === CAPTION_HOST_EVENTS.status
  )?.payload;
  assert.equal(synced?.status, 'active');
  assert.equal(synced?.activeHostPeerId, 'peer-2');
  assert.equal(synced?.generation, claimResult.generation);
});

test('no automatic host promotion occurs when the Caption Host leaves', async () => {
  const harness = createHarness();
  const claimResult = await harness.emitWithAck(
    CAPTION_HOST_EVENTS.claim,
    claimPayload()
  );
  assert.equal(claimResult.ok, true);

  await harness.emit('disconnect', {});

  const status = getCaptionHostStatus('room-1', 1_000);
  assert.equal(status.status, 'idle');
  assert.equal(status.activeHostPeerId, null);
  assert.equal(status.generation, null);
  assert.equal(
    harness.statuses().some((entry) => entry.payload.activeHostPeerId === 'peer-3'),
    false
  );
});
