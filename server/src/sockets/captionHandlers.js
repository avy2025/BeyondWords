// Separate lifecycle handlers for the explicit Caption Host role.
// These events are isolated from meeting host logic and Azure subtitles.

import jwt from 'jsonwebtoken';
import Account from '../models/Account.js';
import {
  getUsersInInMemRoom,
  isSocketHost,
} from '../services/roomService.js';
import {
  claimCaptionHostLease,
  expireStaleCaptionHostLeases,
  getCaptionHostStatus,
  releaseCaptionHostLease,
  releaseCaptionHostLeaseByPeer,
  releaseCaptionHostLeaseByRoom,
  releaseCaptionHostLeasesBySocket,
  renewCaptionHostLease,
} from '../services/captionHostLeaseService.js';
import {
  CAPTION_HOST_CODES,
  CAPTION_HOST_EVENTS,
  CAPTION_HOST_TIMING,
  buildCaptionHostClaimRequest,
  isSafeCaptionIdentifier,
} from '../../../client/shared/captionHost.js';

let sweeperStarted = false;

const defaultDependencies = {
  verifyToken: (token, secret) => jwt.verify(token, secret),
  findAccount: (accountId) => Account.findById(accountId).select('_id'),
  getRoomMembers: (roomId) => getUsersInInMemRoom(roomId),
  isRoomHost: (roomId, socketId) => isSocketHost(roomId, socketId),
  now: () => Date.now(),
};

export const startCaptionLeaseSweeper = (io, intervalMs) => {
  if (sweeperStarted) return;
  sweeperStarted = true;

  const sweepMs = intervalMs || Math.max(1_000, Math.floor(CAPTION_HOST_TIMING.leaseMs / 3));
  const timer = setInterval(() => {
    const expired = expireStaleCaptionHostLeases();
    expired.forEach((lease) => {
      io.to(lease.roomId).emit(CAPTION_HOST_EVENTS.status, getCaptionHostStatus(lease.roomId));
    });
  }, sweepMs);

  if (typeof timer.unref === 'function') timer.unref();
};

const respond = (ack, payload) => {
  if (typeof ack === 'function') ack(payload);
};

const failure = (code, message) => ({ ok: false, code, message });

// Temporary development diagnostics. Only identifiers and codes are logged —
// never tokens, auth headers, transcript text, or audio data.
const captionHostDebug = (event, details = {}) => {
  if (process.env.NODE_ENV !== 'production' && !process.env.NODE_TEST_CONTEXT) {
    console.debug(`[caption-host] ${event}`, details);
  }
};

const safeLogId = (value) => (isSafeCaptionIdentifier(value) ? value : null);

const rejectClaim = (ack, details, stage, code, message) => {
  captionHostDebug('validation rejected', { ...details, stage, code });
  captionHostDebug('ack sent', { ...details, ok: false, code });
  return respond(ack, failure(code, message));
};

export const registerCaptionHandlers = (socket, io, dependencyOverrides = {}) => {
  const deps = { ...defaultDependencies, ...dependencyOverrides };
  const now = () => deps.now();

  if (deps.startSweeper !== false) startCaptionLeaseSweeper(io);

  const broadcastStatus = (roomId) => {
    io.to(roomId).emit(CAPTION_HOST_EVENTS.status, getCaptionHostStatus(roomId, now()));
  };

  const isActiveMember = (roomId, peerId) =>
    deps.getRoomMembers(roomId).some(
      (member) => member.peerId === peerId && member.socketId === socket.id
    );

  const authenticate = async (token) => {
    try {
      const decoded = deps.verifyToken(token, process.env.JWT_SECRET);
      const account = await Promise.resolve(deps.findAccount(decoded?.id));
      if (!account?._id) return null;
      return String(account._id);
    } catch (error) {
      return null;
    }
  };

  const broadcastReleased = (lease) => {
    if (lease) broadcastStatus(lease.roomId);
  };

  socket.on(
    CAPTION_HOST_EVENTS.claim,
    async ({ roomId, peerId, token, sourceLanguage } = {}, ack) => {
      const details = {
        roomId: safeLogId(roomId),
        peerId: safeLogId(peerId),
        socketId: socket.id,
      };
      captionHostDebug('claim received', details);

      let request;
      captionHostDebug('validation started', { ...details, stage: 'request' });
      try {
        request = buildCaptionHostClaimRequest({ roomId, peerId, token, sourceLanguage });
      } catch (error) {
        return rejectClaim(
          ack,
          details,
          'request',
          CAPTION_HOST_CODES.INVALID_REQUEST,
          error.message
        );
      }

      captionHostDebug('validation started', { ...details, stage: 'authentication' });
      const accountId = await authenticate(request.token);
      if (!accountId) {
        return rejectClaim(
          ack,
          details,
          'authentication',
          CAPTION_HOST_CODES.INVALID_TOKEN,
          'Caption Host authentication failed.'
        );
      }

      captionHostDebug('validation started', { ...details, stage: 'membership' });
      if (!isActiveMember(request.roomId, request.peerId)) {
        return rejectClaim(
          ack,
          details,
          'membership',
          CAPTION_HOST_CODES.NOT_IN_ROOM,
          'Join the meeting before claiming Caption Host.'
        );
      }

      captionHostDebug('validation started', { ...details, stage: 'lease' });
      const result = claimCaptionHostLease({
        roomId: request.roomId,
        peerId: request.peerId,
        socketId: socket.id,
        accountId,
        sourceLanguage: request.sourceLanguage,
        now: now(),
      });

      if (!result.ok) {
        const message =
          result.code === CAPTION_HOST_CODES.BUSY
            ? 'Another participant is already the Caption Host.'
            : 'Caption Host claim failed.';
        captionHostDebug('validation rejected', {
          ...details,
          stage: 'lease',
          code: result.code,
        });
        // Keep viewers in sync when a competing claim is rejected.
        broadcastStatus(request.roomId);
        captionHostDebug('ack sent', { ...details, ok: false, code: result.code });
        return respond(ack, failure(result.code, message));
      }

      captionHostDebug('lease created', {
        ...details,
        leaseId: result.lease.leaseId,
        generation: result.lease.generation,
      });
      broadcastStatus(request.roomId);
      captionHostDebug('ack sent', { ...details, ok: true });
      return respond(ack, {
        ok: true,
        leaseId: result.lease.leaseId,
        generation: result.lease.generation,
        expiresAt: result.lease.expiresAt,
      });
    }
  );

  socket.on(CAPTION_HOST_EVENTS.heartbeat, ({ roomId, peerId, generation } = {}, ack) => {
    if (
      !isSafeCaptionIdentifier(roomId) ||
      !isSafeCaptionIdentifier(peerId) ||
      typeof generation !== 'string' ||
      generation.length === 0 ||
      generation.length > 200
    ) {
      return respond(ack, failure(CAPTION_HOST_CODES.INVALID_REQUEST, 'Invalid heartbeat request.'));
    }

    if (!isActiveMember(roomId, peerId)) {
      return respond(
        ack,
        failure(CAPTION_HOST_CODES.NOT_IN_ROOM, 'Caption Host is no longer in the meeting.')
      );
    }

    const result = renewCaptionHostLease({
      roomId,
      peerId,
      socketId: socket.id,
      generation,
      now: now(),
    });

    if (!result.ok) {
      return respond(ack, failure(result.code, 'Caption Host lease is no longer active.'));
    }

    return respond(ack, {
      ok: true,
      generation: result.lease.generation,
      expiresAt: result.lease.expiresAt,
    });
  });

  socket.on(CAPTION_HOST_EVENTS.release, ({ roomId, peerId, generation } = {}, ack) => {
    if (!isSafeCaptionIdentifier(roomId) || !isSafeCaptionIdentifier(peerId)) {
      return respond(ack, failure(CAPTION_HOST_CODES.INVALID_REQUEST, 'Invalid release request.'));
    }

    const result = releaseCaptionHostLease({
      roomId,
      peerId,
      socketId: socket.id,
      generation,
      now: now(),
    });

    if (!result.ok) {
      return respond(ack, failure(result.code, 'Caption Host lease is no longer active.'));
    }

    broadcastStatus(roomId);
    return respond(ack, { ok: true });
  });

  // Sync late joiners and reconnects with the current explicit Caption Host.
  // This is additive: the existing meeting join handler is unchanged.
  socket.on('join-room', ({ roomId } = {}) => {
    if (!isSafeCaptionIdentifier(roomId)) return;
    io.to(socket.id).emit(
      CAPTION_HOST_EVENTS.status,
      getCaptionHostStatus(roomId, now())
    );
  });

  socket.on('leave-room', () => {
    releaseCaptionHostLeasesBySocket(socket.id).forEach(broadcastReleased);
  });

  socket.on('disconnect', () => {
    releaseCaptionHostLeasesBySocket(socket.id).forEach(broadcastReleased);
  });

  // Registered before the existing meeting handlers so the room host check
  // still sees an active membership when a meeting is terminated.
  socket.on('end-meeting', ({ roomId } = {}) => {
    if (!isSafeCaptionIdentifier(roomId) || !deps.isRoomHost(roomId, socket.id)) return;
    broadcastReleased(releaseCaptionHostLeaseByRoom(roomId));
  });

  socket.on('remove-participant', ({ roomId, peerId } = {}) => {
    if (
      !isSafeCaptionIdentifier(roomId) ||
      !isSafeCaptionIdentifier(peerId) ||
      !deps.isRoomHost(roomId, socket.id)
    ) {
      return;
    }
    broadcastReleased(releaseCaptionHostLeaseByPeer(roomId, peerId));
  });
};
