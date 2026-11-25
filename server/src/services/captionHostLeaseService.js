// In-memory lease for the explicit Caption Host role.
// One active lease per room. No leader election and no automatic promotion.

import { randomUUID } from 'node:crypto';
import {
  CAPTION_HOST_CODES,
  CAPTION_HOST_TIMING,
} from '../../../client/shared/captionHost.js';

const leases = new Map();
const nowMs = () => Date.now();

const cloneLease = (lease) => (lease ? { ...lease } : null);

const publicStatus = (roomId, lease) => ({
  roomId,
  status: lease ? 'active' : 'idle',
  activeHostPeerId: lease ? lease.peerId : null,
  generation: lease ? lease.generation : null,
  leaseId: lease ? lease.leaseId : null,
  sourceLanguage: lease ? lease.sourceLanguage : null,
  claimedAt: lease ? lease.claimedAt : null,
  expiresAt: lease ? lease.expiresAt : null,
});

const purgeExpired = (roomId, now) => {
  const lease = leases.get(roomId);
  if (!lease) return null;
  if (now >= lease.expiresAt) {
    leases.delete(roomId);
    return cloneLease(lease);
  }
  return null;
};

export const claimCaptionHostLease = ({
  roomId,
  peerId,
  socketId,
  accountId,
  sourceLanguage,
  now = nowMs(),
}) => {
  if (!roomId || !peerId || !socketId || !accountId) {
    return { ok: false, code: CAPTION_HOST_CODES.INVALID_REQUEST };
  }

  purgeExpired(roomId, now);
  if (leases.has(roomId)) {
    return {
      ok: false,
      code: CAPTION_HOST_CODES.BUSY,
      lease: cloneLease(leases.get(roomId)),
    };
  }

  const lease = {
    leaseId: randomUUID(),
    generation: randomUUID(),
    roomId,
    peerId,
    socketId,
    accountId: String(accountId),
    sourceLanguage: sourceLanguage || 'hi-IN',
    claimedAt: now,
    heartbeatAt: now,
    expiresAt: now + CAPTION_HOST_TIMING.leaseMs,
  };

  leases.set(roomId, lease);
  return { ok: true, lease: cloneLease(lease) };
};

const matchesLease = (lease, { roomId, peerId, socketId, generation }) =>
  Boolean(
    lease &&
      lease.roomId === roomId &&
      lease.peerId === peerId &&
      lease.socketId === socketId &&
      lease.generation === generation
  );

export const renewCaptionHostLease = ({
  roomId,
  peerId,
  socketId,
  generation,
  now = nowMs(),
}) => {
  purgeExpired(roomId, now);
  const lease = leases.get(roomId);
  if (!matchesLease(lease, { roomId, peerId, socketId, generation })) {
    return { ok: false, code: CAPTION_HOST_CODES.STALE_GENERATION };
  }

  const renewed = {
    ...lease,
    heartbeatAt: now,
    expiresAt: now + CAPTION_HOST_TIMING.leaseMs,
  };
  leases.set(roomId, renewed);
  return { ok: true, lease: cloneLease(renewed) };
};

export const releaseCaptionHostLease = ({
  roomId,
  peerId,
  socketId,
  generation,
  now = nowMs(),
}) => {
  purgeExpired(roomId, now);
  const lease = leases.get(roomId);
  if (!matchesLease(lease, { roomId, peerId, socketId, generation })) {
    return { ok: false, code: CAPTION_HOST_CODES.STALE_GENERATION };
  }

  leases.delete(roomId);
  return { ok: true, lease: cloneLease(lease) };
};

export const releaseCaptionHostLeaseByRoom = (roomId) => {
  const lease = leases.get(roomId);
  if (!lease) return null;
  leases.delete(roomId);
  return cloneLease(lease);
};

export const releaseCaptionHostLeaseByPeer = (roomId, peerId) => {
  const lease = leases.get(roomId);
  if (!lease || lease.peerId !== peerId) return null;
  leases.delete(roomId);
  return cloneLease(lease);
};

export const releaseCaptionHostLeasesBySocket = (socketId) => {
  const released = [];
  for (const [roomId, lease] of leases.entries()) {
    if (lease.socketId === socketId) {
      leases.delete(roomId);
      released.push(cloneLease(lease));
    }
  }
  return released;
};

export const expireStaleCaptionHostLeases = (now = nowMs()) => {
  const expired = [];
  for (const [roomId, lease] of leases.entries()) {
    if (now >= lease.expiresAt) {
      leases.delete(roomId);
      expired.push(cloneLease(lease));
    }
  }
  return expired;
};

export const getCaptionHostStatus = (roomId, now = nowMs()) => {
  purgeExpired(roomId, now);
  return publicStatus(roomId, leases.get(roomId) || null);
};

export const getCaptionHostLease = (roomId, now = nowMs()) => {
  purgeExpired(roomId, now);
  return cloneLease(leases.get(roomId) || null);
};

export const clearCaptionHostLeasesForTests = () => {
  leases.clear();
};
