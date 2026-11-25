import { useCallback, useEffect, useRef, useState } from 'react';
// @ts-ignore - shared dependency-free module
import {
  CAPTION_HOST_EVENTS,
  CAPTION_HOST_TIMING,
  CaptionHostClaimCoordinator,
  buildCaptionHostClaimRequest,
  captionHostDebug,
  isCaptionHostClaimReady,
} from '@shared/captionHost.js';

const idleStatus = (roomId) => ({
  roomId,
  status: 'idle',
  activeHostPeerId: null,
  generation: null,
  leaseId: null,
  sourceLanguage: null,
  claimedAt: null,
  expiresAt: null,
});

const CLAIM_TIMEOUT_MESSAGE =
  'Caption Host claim timed out after 8 seconds. Check your connection and try again.';

export function useCaptionHost({
  socket,
  roomId,
  peerId,
  authToken,
  isConnected,
  roomJoined = false,
}) {
  const [status, setStatus] = useState(() => idleStatus(roomId));
  const [generation, setGeneration] = useState(null);
  const [error, setError] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const generationRef = useRef(null);
  const mountedRef = useRef(true);
  const claimContextRef = useRef({ socket, roomId, peerId });
  claimContextRef.current = { socket, roomId, peerId };

  const claimDebug = (event, details = {}) => {
    const context = claimContextRef.current;
    captionHostDebug(event, {
      roomId: context.roomId,
      peerId: context.peerId,
      socketId: context.socket?.current?.id ?? null,
      connected: context.socket?.current?.connected === true,
      ...details,
    });
  };

  const claimCoordinatorRef = useRef(null);
  if (!claimCoordinatorRef.current) {
    claimCoordinatorRef.current = new CaptionHostClaimCoordinator({
      ackTimeoutMs: CAPTION_HOST_TIMING.claimAckMs,
      onClaimingChange: (value) => {
        if (mountedRef.current) setClaiming(value);
      },
      onTimeout: (attempt) => {
        if (!mountedRef.current) return;
        setError(CLAIM_TIMEOUT_MESSAGE);
        claimDebug('claim timeout error shown', { attempt });
      },
      onLog: (event, details) => claimDebug(event, details),
    });
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      claimCoordinatorRef.current.dispose();
    };
  }, []);

  useEffect(() => {
    claimCoordinatorRef.current.cancelPending('room changed');
    setStatus(idleStatus(roomId));
  }, [roomId]);

  useEffect(() => {
    const sock = socket?.current;
    if (!sock) return undefined;

    const handleStatus = (nextStatus) => {
      if (!mountedRef.current) return;
      const safeStatus = nextStatus || idleStatus(roomId);
      claimDebug('status event received', {
        status: safeStatus.status,
        activeHostPeerId: safeStatus.activeHostPeerId ?? null,
        hasGeneration: Boolean(safeStatus.generation),
      });
      setStatus(safeStatus);

      const stillActive =
        safeStatus.status === 'active' &&
        safeStatus.activeHostPeerId === peerId &&
        safeStatus.generation === generationRef.current;

      if (generationRef.current && !stillActive) {
        generationRef.current = null;
        setGeneration(null);
      }
    };

    sock.on(CAPTION_HOST_EVENTS.status, handleStatus);
    return () => sock.off(CAPTION_HOST_EVENTS.status, handleStatus);
  }, [socket, roomId, peerId]);

  useEffect(() => {
    // A socket can be connected before join-room has been acknowledged.
    if (isConnected && roomJoined) return;
    claimCoordinatorRef.current.cancelPending('room not ready');
    generationRef.current = null;
    setGeneration(null);
  }, [isConnected, roomJoined]);

  const canClaim = isCaptionHostClaimReady({
    isConnected,
    roomJoined,
    roomId,
    peerId,
    hasAuthToken: Boolean(authToken),
    claiming,
    statusActive: status.status === 'active',
  });

  const claim = useCallback(() => {
    const sock = socket?.current;
    if (!canClaim || !sock) return;

    try {
      const request = buildCaptionHostClaimRequest({ roomId, peerId, token: authToken });
      claimCoordinatorRef.current.start({
        emit: (onAck, attempt) => {
          claimDebug('claim request emitted', {
            attempt,
            socketId: sock.id ?? null,
            connected: sock.connected === true,
          });
          sock.emit(CAPTION_HOST_EVENTS.claim, request, onAck);
        },
        onAck: (result) => {
          if (!mountedRef.current) return;
          if (!result?.ok) {
            setError(result?.message || 'Could not claim the Caption Host role.');
            return;
          }
          generationRef.current = result.generation || null;
          setGeneration(result.generation || null);
          setError(null);
        },
      });
    } catch (claimError) {
      if (mountedRef.current) {
        setError(claimError?.message || 'Invalid Caption Host request.');
      }
    }
  }, [canClaim, socket, roomId, peerId, authToken]);

  const release = useCallback(() => {
    const sock = socket?.current;
    const activeGeneration = generationRef.current;
    if (!sock || !roomId || !peerId || !activeGeneration) return;

    sock.emit(
      CAPTION_HOST_EVENTS.release,
      { roomId, peerId, generation: activeGeneration },
      (result) => {
        if (!mountedRef.current) return;
        generationRef.current = null;
        setGeneration(null);
        setStatus(idleStatus(roomId));
        if (!result?.ok) {
          setError(result?.message || 'Caption Host lease was already released.');
        }
      }
    );
  }, [socket, roomId, peerId]);

  useEffect(() => {
    if (!generation || !isConnected) return undefined;

    const timer = setInterval(() => {
      const sock = socket?.current;
      if (!sock) return;
      sock.emit(
        CAPTION_HOST_EVENTS.heartbeat,
        { roomId, peerId, generation },
        (result) => {
          if (!mountedRef.current || result?.ok) return;
          generationRef.current = null;
          setGeneration(null);
          setStatus(idleStatus(roomId));
          setError(result?.message || 'Caption Host lease expired.');
        }
      );
    }, CAPTION_HOST_TIMING.heartbeatMs);

    return () => clearInterval(timer);
  }, [generation, isConnected, socket, roomId, peerId]);

  useEffect(
    () => () => {
      const sock = socket?.current;
      const activeGeneration = generationRef.current;
      if (sock && roomId && peerId && activeGeneration) {
        sock.emit(
          CAPTION_HOST_EVENTS.release,
          { roomId, peerId, generation: activeGeneration },
          () => {}
        );
      }
    },
    [socket, roomId, peerId]
  );

  const isCaptionHost = Boolean(
    generation &&
      status.status === 'active' &&
      status.activeHostPeerId === peerId &&
      status.generation === generation
  );

  return {
    status,
    generation,
    error,
    claiming,
    canClaim,
    isCaptionHost,
    isViewer: !isCaptionHost,
    claim,
    release,
  };
}
