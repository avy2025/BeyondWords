import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
// @ts-ignore - shared dependency-free module
import { ParticipantSubtitleDisplayStore } from '@shared/participantSubtitleDisplay.js';
// @ts-ignore - shared dependency-free module
import {
  PARTICIPANT_SUBTITLE_CODES,
  PARTICIPANT_SUBTITLE_EVENTS,
  PARTICIPANT_SUBTITLE_TIMING,
  ParticipantSubtitleAckCoordinator,
  buildParticipantSubtitleAudioFrame,
  buildParticipantSubtitleAuthorizeRequest,
  buildParticipantSubtitlePreferencesRequest,
  buildParticipantSubtitlePublishRequest,
  buildParticipantSubtitleStopRequest,
  shouldAcceptParticipantSubtitleCaption,
} from '@shared/participantSubtitles.js';
import { useCaptionAudioCapture } from './useCaptionAudioCapture';

const DEFAULT_SPEAKING_LANGUAGE = 'hi-IN';
const DEFAULT_SUBTITLE_LANGUAGE = 'en-IN';

const encodePcmAsBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export function useParticipantSubtitles({
  socket,
  roomId,
  peerId,
  authToken,
  isConnected,
  roomJoined,
  stream,
}) {
  const [speakingLanguage, setSpeakingLanguage] = useState(DEFAULT_SPEAKING_LANGUAGE);
  const [subtitleLanguage, setSubtitleLanguage] = useState(DEFAULT_SUBTITLE_LANGUAGE);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [authorizationState, setAuthorizationState] = useState('idle');
  const [providerStatus, setProviderStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [captureActive, setCaptureActive] = useState(false);
  const [starting, setStarting] = useState(false);

  // Live display and history live in one local store, separate from publishing
  // state. The store owns its timers and is scoped to this hook instance.
  const displayRef = useRef(null);
  if (!displayRef.current) displayRef.current = new ParticipantSubtitleDisplayStore({ roomId });
  const subscribeDisplay = useCallback(
    (listener) => displayRef.current.subscribe(listener),
    []
  );
  const getDisplaySnapshot = useCallback(
    () => displayRef.current.getSnapshot(),
    []
  );
  const display = useSyncExternalStore(subscribeDisplay, getDisplaySnapshot);

  const mountedRef = useRef(true);
  const sessionRef = useRef(null);
  const sequenceRef = useRef(0);
  const startingRef = useRef(false);
  const speakingRef = useRef(speakingLanguage);
  const subtitleRef = useRef(subtitleLanguage);
  const authorizationCoordinatorRef = useRef(null);
  const publishCoordinatorRef = useRef(null);

  if (!authorizationCoordinatorRef.current) authorizationCoordinatorRef.current = new ParticipantSubtitleAckCoordinator();
  if (!publishCoordinatorRef.current) publishCoordinatorRef.current = new ParticipantSubtitleAckCoordinator();

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    speakingRef.current = speakingLanguage;
    subtitleRef.current = subtitleLanguage;
  }, [speakingLanguage, subtitleLanguage]);

  const handleAudioStatus = useCallback((status, message) => {
    if (!mountedRef.current) return;
    if (status === 'error' && message) setError(message);
  }, []);

  const handleFrame = useCallback((buffer) => {
    const sock = socket?.current;
    const session = sessionRef.current;
    if (!sock || !session || !roomId || !peerId) return;

    try {
      const request = buildParticipantSubtitleAudioFrame({
        roomId,
        peerId,
        sessionId: session.sessionId,
        sequence: sequenceRef.current,
        pcm: encodePcmAsBase64(buffer),
        bytes: buffer.byteLength,
      });
      sequenceRef.current += 1;
      sock.emit(PARTICIPANT_SUBTITLE_EVENTS.audio, request, (result) => {
        if (!mountedRef.current || !result || result.ok) return;
        setError(result.message || 'Audio frame was rejected.');
      });
    } catch {
      setError('Audio capture produced an invalid PCM frame.');
    }
  }, [socket, roomId, peerId]);

  const audio = useCaptionAudioCapture({
    consumerId: 'participant-subtitles',
    stream,
    active: captureActive,
    onFrame: handleFrame,
    onStatus: handleAudioStatus,
  });

  const stopPublishing = useCallback((reason = 'stopped', emitStop = true) => {
    const sock = socket?.current;
    const session = sessionRef.current;
    const wasStarting = startingRef.current;

    publishCoordinatorRef.current.invalidate();
    sessionRef.current = null;
    sequenceRef.current = 0;
    startingRef.current = false;
    setStarting(false);
    setCaptureActive(false);
    setProviderStatus((current) => (current === 'stopped' ? current : 'stopped'));
    audio.stopAudio(reason);

    if (!emitStop || !sock || !roomId || !peerId || (!session && !wasStarting)) return;
    try {
      const request = buildParticipantSubtitleStopRequest({ roomId, peerId });
      sock.emit(PARTICIPANT_SUBTITLE_EVENTS.publishStop, request, (result) => {
        if (!mountedRef.current || result?.ok) return;
        setError(result?.message || 'The transcription session was already stopped.');
      });
    } catch {
      // Local state is already stopped; no remote session to release.
    }
  }, [socket, roomId, peerId, audio.stopAudio]);

  const startPublishing = useCallback(() => {
    const sock = socket?.current;
    if (
      !sock ||
      !isConnected ||
      !roomJoined ||
      authorizationState !== 'authorized' ||
      startingRef.current ||
      sessionRef.current
    ) {
      return;
    }

    const track = stream?.getAudioTracks?.()[0];
    if (!track || track.readyState !== 'live' || !track.enabled || track.muted) {
      setError('The existing microphone track is unavailable or muted. No second microphone was opened.');
      setShareEnabled(false);
      return;
    }

    let request;
    try {
      request = buildParticipantSubtitlePublishRequest({
        roomId,
        peerId,
        speakingLanguage: speakingRef.current,
      });
    } catch (startError) {
      setError(startError?.message || 'Invalid live translation request.');
      setShareEnabled(false);
      return;
    }

    startingRef.current = true;
    setStarting(true);
    setError(null);
    setProviderStatus('starting');

    const finalize = (result) => {
      if (!mountedRef.current) return;
      startingRef.current = false;
      setStarting(false);
      if (!result?.ok) {
        setError(result?.message || 'Could not start live transcription.');
        setProviderStatus('error');
        setShareEnabled(false);
        if (result?.code === PARTICIPANT_SUBTITLE_CODES.ACK_TIMEOUT) {
          try {
            sock.emit(
              PARTICIPANT_SUBTITLE_EVENTS.publishStop,
              buildParticipantSubtitleStopRequest({ roomId, peerId }),
              () => {}
            );
          } catch {
            // Best-effort cleanup for a request whose acknowledgement was lost.
          }
        }
        return;
      }
      sessionRef.current = {
        sessionId: result.sessionId,
        provider: result.provider,
        sourceLanguage: result.sourceLanguage,
      };
      sequenceRef.current = 0;
      setCaptureActive(true);
    };

    publishCoordinatorRef.current.start({
      operation: 'publish-start',
      timeoutMs: PARTICIPANT_SUBTITLE_TIMING.publishAckMs,
      timeoutMessage: 'Live translation did not start in time. Check the provider connection and try again.',
      emit: (ack) => sock.emit(PARTICIPANT_SUBTITLE_EVENTS.publishStart, request, ack),
      onAck: finalize,
      onTimeout: finalize,
    });
  }, [socket, isConnected, roomJoined, authorizationState, stream, roomId, peerId]);

  const toggleShare = useCallback(() => {
    if (shareEnabled) {
      setShareEnabled(false);
      stopPublishing('share disabled');
      return;
    }
    setShareEnabled(true);
  }, [shareEnabled, stopPublishing]);

  useEffect(() => {
    const coordinator = authorizationCoordinatorRef.current;
    if (!socket?.current || !isConnected || !roomJoined || !roomId || !peerId || !authToken) {
      coordinator.invalidate();
      setAuthorizationState('idle');
      return undefined;
    }

    let cancelled = false;
    setAuthorizationState('authorizing');
    let request;
    try {
      request = buildParticipantSubtitleAuthorizeRequest({
        roomId,
        peerId,
        token: authToken,
        speakingLanguage: speakingRef.current,
        subtitleLanguage: subtitleRef.current,
      });
    } catch (requestError) {
      setAuthorizationState('error');
      setError(requestError?.message || 'Invalid live translation authorization.');
      return undefined;
    }

    const cleanup = coordinator.start({
      operation: 'authorize',
      timeoutMs: PARTICIPANT_SUBTITLE_TIMING.authorizationAckMs,
      timeoutMessage: 'Live translation authorization timed out. Reconnect and try again.',
      emit: (ack) => socket.current.emit(PARTICIPANT_SUBTITLE_EVENTS.authorize, request, ack),
      onAck: (result) => {
        if (cancelled) return;
        setAuthorizationState(result?.ok ? 'authorized' : 'error');
        if (!result?.ok) {
          setError(result?.message || 'Live translation authorization failed.');
        }
      },
      onTimeout: (result) => {
        if (cancelled) return;
        setAuthorizationState('error');
        setError(result?.message || 'Live translation authorization timed out.');
      },
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [socket, isConnected, roomJoined, roomId, peerId, authToken]);

  useEffect(() => {
    if (authorizationState !== 'authorized') return;
    const sock = socket?.current;
    if (!sock || !roomId || !peerId) return;
    try {
      sock.emit(
        PARTICIPANT_SUBTITLE_EVENTS.preferences,
        buildParticipantSubtitlePreferencesRequest({
          roomId,
          peerId,
          speakingLanguage,
          subtitleLanguage,
        })
      );
    } catch {
      // Invalid local values are already blocked by the selectors.
    }
  }, [socket, authorizationState, roomId, peerId, speakingLanguage, subtitleLanguage]);

  // History is scoped to the active meeting, not to the lifetime of the tab.
  useEffect(() => {
    displayRef.current.reset(roomId);
  }, [roomId]);

  useEffect(() => {
    if (!roomJoined) displayRef.current.reset(roomId);
  }, [roomJoined, roomId]);

  useEffect(() => () => displayRef.current.dispose(), []);

  useEffect(() => {
    const sock = socket?.current;
    if (!sock || !roomId) return undefined;

    const handleCaption = (event) => {
      if (!mountedRef.current) return;
      if (!shouldAcceptParticipantSubtitleCaption({
        event,
        roomId,
        subtitleLanguage: subtitleRef.current,
      })) {
        return;
      }

      displayRef.current.ingest(event);
    };

    const handleStatus = (status) => {
      if (!mountedRef.current || !status || status.roomId !== roomId) return;
      if (status.peerId && status.peerId !== peerId) return;
      setProviderStatus(status.status || 'idle');
      if (status.status === 'error') {
        setError(status.message || 'Live transcription failed.');
      }
      if (status.status === 'error' && status.fatal) {
        publishCoordinatorRef.current.invalidate();
        sessionRef.current = null;
        sequenceRef.current = 0;
        startingRef.current = false;
        setStarting(false);
        setCaptureActive(false);
        setShareEnabled(false);
        audio.stopAudio('provider error');
      }
      if (status.status === 'stopped' || status.status === 'closed') {
        sessionRef.current = null;
        sequenceRef.current = 0;
        setCaptureActive(false);
      }
    };

    sock.on(PARTICIPANT_SUBTITLE_EVENTS.caption, handleCaption);
    sock.on(PARTICIPANT_SUBTITLE_EVENTS.status, handleStatus);
    return () => {
      sock.off(PARTICIPANT_SUBTITLE_EVENTS.caption, handleCaption);
      sock.off(PARTICIPANT_SUBTITLE_EVENTS.status, handleStatus);
    };
  }, [socket, roomId, peerId, audio.stopAudio]);

  useEffect(() => {
    if (shareEnabled) {
      startPublishing();
    } else {
      stopPublishing('share disabled', false);
    }
  }, [shareEnabled, startPublishing, stopPublishing]);

  useEffect(() => {
    if (!isConnected) stopPublishing('connection lost');
  }, [isConnected, stopPublishing]);

  useEffect(() => {
    if (authorizationState === 'error' && shareEnabled) {
      setShareEnabled(false);
      stopPublishing('authorization failed');
    }
  }, [authorizationState, shareEnabled, stopPublishing]);

  useEffect(() => () => {
    authorizationCoordinatorRef.current.invalidate();
    publishCoordinatorRef.current.invalidate();
    stopPublishing('component unmount');
  }, [stopPublishing]);

  const canPublish = Boolean(
    isConnected &&
    roomJoined &&
    authorizationState === 'authorized' &&
    !starting &&
    !sessionRef.current
  );

  return {
    speakingLanguage,
    setSpeakingLanguage,
    subtitleLanguage,
    setSubtitleLanguage,
    shareEnabled,
    toggleShare,
    authorizationState,
    providerStatus,
    audioStatus: audio.audioStatus,
    error,
    live: display.live,
    history: display.history,
    clearHistory: () => displayRef.current.clearHistory(),
    canPublish,
    sessionActive: Boolean(sessionRef.current),
    starting,
    stop: () => { setShareEnabled(false); stopPublishing('manual stop'); },
  };
}
