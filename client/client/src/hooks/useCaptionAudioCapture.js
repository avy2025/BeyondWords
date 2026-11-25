import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// @ts-ignore - shared dependency-free module
import { getSharedMicrophoneFrameBus, nextMicrophoneConsumerId } from '@shared/microphoneFrameBus.js';

// Multiple subtitle consumers now share one AudioContext/Worklet per MediaStream.
// No consumer owns the microphone stream itself, so stopping one subtitle
// feature never stops another feature's audio processing.
export function useCaptionAudioCapture({ stream, active, onFrame, onStatus, consumerId }) {
  const [audioStatus, setAudioStatus] = useState('idle');
  const [error, setError] = useState(null);

  const idRef = useRef(consumerId || nextMicrophoneConsumerId('caption-capture'));
  const ownActiveRef = useRef(false);
  const onFrameRef = useRef(onFrame);
  const onStatusRef = useRef(onStatus);

  useEffect(() => {
    onFrameRef.current = onFrame;
    onStatusRef.current = onStatus;
  }, [onFrame, onStatus]);

  const bus = useMemo(() => {
    if (!stream || typeof window === 'undefined') return null;
    return getSharedMicrophoneFrameBus({
      stream,
      AudioContextCtor: window.AudioContext || window.webkitAudioContext,
      AudioWorkletNodeCtor: window.AudioWorkletNode,
    });
  }, [stream]);

  const callbacksRef = useRef(null);
  if (!callbacksRef.current) {
    callbacksRef.current = {
      onFrame: (frame) => { onFrameRef.current?.(frame); },
      onStatus: (status, message) => {
        if (!ownActiveRef.current) return;
        if (status === 'error') {
          setError(message || 'Microphone capture failed.');
        } else {
          setError(null);
        }
        setAudioStatus(status);
        onStatusRef.current?.(status, message);
      },
    };
  }

  useEffect(() => {
    if (!bus) return undefined;
    bus.subscribe(idRef.current, callbacksRef.current);
    return () => bus.unsubscribe(idRef.current);
  }, [bus]);

  useEffect(() => {
    if (!bus || !active) {
      ownActiveRef.current = false;
      bus?.deactivate(idRef.current);
      setAudioStatus('idle');
      return;
    }

    ownActiveRef.current = true;
    setError(null);
    void bus.activate(idRef.current).then((started) => {
      if (!started && ownActiveRef.current) {
        setAudioStatus('error');
        onStatusRef.current?.('error', 'Microphone capture could not start.');
      }
    });
  }, [active, bus]);

  const startAudio = useCallback(() => {
    if (!bus) return Promise.resolve(false);
    ownActiveRef.current = true;
    return bus.activate(idRef.current);
  }, [bus]);

  const stopAudio = useCallback(() => {
    ownActiveRef.current = false;
    bus?.deactivate(idRef.current);
    setAudioStatus('idle');
  }, [bus]);

  useEffect(() => () => {
    ownActiveRef.current = false;
    bus?.unsubscribe(idRef.current);
  }, [bus]);

  return { audioStatus, audioError: error, startAudio, stopAudio };
}
