import { useCallback, useEffect, useRef, useState } from 'react';
// @ts-ignore - shared dependency-free module
import {
  CAPTION_HOST_EVENTS,
  CAPTION_TRANSCRIPTION_CODES,
  CAPTION_TRANSCRIPTION_EVENTS,
  SARVAM_CONFIG,
  buildCaptionAudioFrame,
  buildCaptionTranscriptionStartRequest,
  shouldAcceptCaptionEvent,
} from '@shared/captionHost.js';
import { useCaptionAudioCapture } from './useCaptionAudioCapture';

const MAX_DISPLAYED_CAPTIONS = 20;

const encodePcmAsBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

export function useCaptionTranscription({ socket, roomId, peerId, captionHost, stream, isConnected }) {
  const [sourceLanguage, setSourceLanguage] = useState(null);
  const [providerStatus, setProviderStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [partial, setPartial] = useState('');
  const [captions, setCaptions] = useState([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [starting, setStarting] = useState(false);

  const sessionRef = useRef(null);
  const sequenceRef = useRef(0);
  const generationRef = useRef(null);
  const mountedRef = useRef(true);
  const captionIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleAudioStatus = useCallback((status, message) => {
    if (!mountedRef.current) return;
    if (status === 'error' && message) setError(message);
  }, []);

  const handleFrame = useCallback((buffer) => {
    const sock = socket?.current;
    const session = sessionRef.current;
    if (!sock || !session || !roomId || !peerId) return;

    try {
      const request = buildCaptionAudioFrame({
        roomId,
        peerId,
        leaseId: session.leaseId,
        generation: session.generation,
        sequence: sequenceRef.current,
        pcm: encodePcmAsBase64(buffer),
        bytes: buffer.byteLength,
        sampleRate: SARVAM_CONFIG.sampleRate,
        channels: SARVAM_CONFIG.channels,
        encoding: SARVAM_CONFIG.encoding,
        durationMs: SARVAM_CONFIG.chunkMs,
      });
      sequenceRef.current += 1;

      sock.emit(CAPTION_TRANSCRIPTION_EVENTS.audio, request, (result) => {
        if (!mountedRef.current || !result || result.ok) return;
        if (result.code === CAPTION_TRANSCRIPTION_CODES.BUSY) return;
        setError(result.message || 'Audio frame was rejected.');
      });
    } catch {
      setError('Audio capture produced an invalid PCM frame.');
    }
  }, [socket, roomId, peerId]);

  const audio = useCaptionAudioCapture({
    consumerId: 'caption-host-transcription',
    stream,
    active: sessionActive,
    onFrame: handleFrame,
    onStatus: handleAudioStatus,
  });

  useEffect(() => {
    const sock = socket?.current;
    if (!sock) return undefined;

    const handleCaption = (event) => {
      if (!mountedRef.current || !roomId) return;
      const generation = sessionRef.current?.generation || generationRef.current;
      if (!shouldAcceptCaptionEvent({ event, roomId, generation })) return;

      if (event.kind === 'partial') {
        setPartial(event.text);
        return;
      }
      captionIdRef.current += 1;
      setCaptions((current) => [
        ...current.slice(-(MAX_DISPLAYED_CAPTIONS - 1)),
        { id: captionIdRef.current, text: event.text },
      ]);
      setPartial('');
    };

    const handleProviderStatus = (status) => {
      if (!mountedRef.current || !status || status.roomId !== roomId) return;
      if (status.generation) generationRef.current = status.generation;
      setProviderStatus(status.status || 'idle');
      if (status.status === 'error') {
        setError(status.message || 'Sarvam transcription failed.');
      }
      if (status.status === 'stopped' || status.status === 'ended' || status.status === 'closed') {
        setSessionActive(false);
      }
      if (status.status === 'idle') {
        generationRef.current = null;
      }
    };

    const handleCaptionHostStatus = (status) => {
      if (!mountedRef.current || !status || status.roomId !== roomId) return;
      if (status.status === 'active' && status.generation) {
        generationRef.current = status.generation;
      } else if (!sessionRef.current) {
        generationRef.current = null;
      }
    };

    sock.on(CAPTION_TRANSCRIPTION_EVENTS.caption, handleCaption);
    sock.on(CAPTION_TRANSCRIPTION_EVENTS.status, handleProviderStatus);
    sock.on(CAPTION_HOST_EVENTS.status, handleCaptionHostStatus);
    return () => {
      sock.off(CAPTION_TRANSCRIPTION_EVENTS.caption, handleCaption);
      sock.off(CAPTION_TRANSCRIPTION_EVENTS.status, handleProviderStatus);
      sock.off(CAPTION_HOST_EVENTS.status, handleCaptionHostStatus);
    };
  }, [socket, roomId]);

  const start = useCallback(() => {
    const sock = socket?.current;
    if (
      !sock ||
      !isConnected ||
      !captionHost?.isCaptionHost ||
      !roomId ||
      !peerId ||
      starting ||
      sessionRef.current
    ) {
      return;
    }
    if (!sourceLanguage) {
      setError('Select Hindi or English before starting transcription.');
      return;
    }

    const track = stream?.getAudioTracks?.()[0];
    if (!track || track.readyState !== 'live' || !track.enabled || track.muted) {
      setError('The existing microphone track is unavailable or muted. No second microphone was opened.');
      return;
    }

    let request;
    try {
      request = buildCaptionTranscriptionStartRequest({
        roomId,
        peerId,
        leaseId: captionHost.status.leaseId,
        generation: captionHost.generation,
        sourceLanguage,
        streamType: 'balanced',
      });
    } catch (startError) {
      setError(startError?.message || 'Invalid transcription request.');
      return;
    }

    setStarting(true);
    setError(null);
    setProviderStatus('starting');
    setPartial('');
    setCaptions([]);
    sequenceRef.current = 0;

    sock.emit(CAPTION_TRANSCRIPTION_EVENTS.start, request, (result) => {
      if (!mountedRef.current) return;
      setStarting(false);
      if (!result?.ok) {
        setError(result?.message || 'Could not start Sarvam transcription.');
        setProviderStatus('error');
        return;
      }
      sessionRef.current = {
        sessionId: result.sessionId,
        leaseId: request.leaseId,
        generation: request.generation,
        sourceLanguage: request.sourceLanguage,
      };
      generationRef.current = request.generation;
      setSessionActive(true);
    });
  }, [socket, isConnected, captionHost, roomId, peerId, sourceLanguage, starting, stream]);

  const stop = useCallback((reason = 'manual stop') => {
    const sock = socket?.current;
    const session = sessionRef.current;
    audio.stopAudio(reason);
    sessionRef.current = null;
    sequenceRef.current = 0;
    setSessionActive(false);
    setProviderStatus('stopped');

    if (!sock || !session || !roomId || !peerId) return;
    sock.emit(
      CAPTION_TRANSCRIPTION_EVENTS.stop,
      {
        roomId,
        peerId,
        leaseId: session.leaseId,
        generation: session.generation,
      },
      (result) => {
        if (!mountedRef.current || result?.ok) return;
        setError(result?.message || 'Transcription session was already stopped.');
      }
    );
  }, [socket, roomId, peerId, audio.stopAudio]);

  useEffect(() => {
    if (!sessionRef.current) return;
    const generationChanged = captionHost?.generation && captionHost.generation !== sessionRef.current.generation;
    const leaseChanged = captionHost?.status?.leaseId && captionHost.status.leaseId !== sessionRef.current.leaseId;
    if (!captionHost?.isCaptionHost || !isConnected || generationChanged || leaseChanged) {
      stop('caption host lease lost');
    }
  }, [captionHost?.isCaptionHost, captionHost?.generation, captionHost?.status?.leaseId, isConnected, stop]);

  useEffect(() => () => stop('component unmount'), [stop]);

  const canStart = Boolean(
    isConnected && captionHost?.isCaptionHost && sourceLanguage && !sessionActive && !starting
  );

  return {
    sourceLanguage,
    setSourceLanguage,
    providerStatus,
    audioStatus: audio.audioStatus,
    error,
    partial,
    captions,
    sessionActive,
    starting,
    canStart,
    start,
    stop,
  };
}
