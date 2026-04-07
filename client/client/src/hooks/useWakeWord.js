import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useWakeWord — Continuous SpeechRecognition listener for "Mr. Pineapple" wake word.
 *
 * Runs perpetually in the background, scanning every transcript chunk for the
 * wake phrase. Automatically restarts on `onend` to keep listening.
 *
 * @param {Object} options
 * @param {Function} options.onWake — called when wake word is detected
 * @param {boolean} options.enabled — master switch (default: true)
 * @returns {{ isListening: boolean, start: Function, stop: Function, isSupported: boolean }}
 */
export function useWakeWord({ onWake, enabled = true } = {}) {
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const shouldBeListeningRef = useRef(false);
  const onWakeRef = useRef(onWake);

  // Keep callback ref fresh without re-creating recognition
  useEffect(() => {
    onWakeRef.current = onWake;
  }, [onWake]);

  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognition;

  // Wake-word matching — fuzzy enough to catch "mister pineapple", "mr pine apple", etc.
  const matchesWakeWord = useCallback((text) => {
    const normalized = text.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    return (
      normalized.includes('mr pineapple') ||
      normalized.includes('mister pineapple') ||
      normalized.includes('mr pine apple') ||
      normalized.includes('mister pine apple') ||
      normalized.includes('hey pineapple') ||
      normalized.includes('hey mr pineapple') ||
      normalized.includes('hey mister pineapple') ||
      normalized.endsWith(' pineapple') ||
      normalized === 'pineapple'
    );
  }, []);

  const createRecognition = useCallback(() => {
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      // Scan through all results for the wake word
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        
        // Log final transcripts for debugging, but skip interim to reduce noise
        const transcript = result[0].transcript.trim();
        if (result.isFinal) {
          console.log('🍍 (Final) Heard:', transcript);
        }

        // Check all alternatives
        for (let j = 0; j < result.length; j++) {
          const alternateTranscript = result[j].transcript;
          if (matchesWakeWord(alternateTranscript)) {
            console.log('🍍 SUCCESS: Wake word detected:', alternateTranscript);
            // Stop listening so command listener can take over
            shouldBeListeningRef.current = false;
            try { recognition.stop(); } catch (_) {}
            setIsListening(false);
            onWakeRef.current?.();
            return;
          }
        }
      }
    };

    recognition.onerror = (event) => {
      // 'no-speech' and 'aborted' are expected — just restart
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      
      console.warn('🍍 Wake word recognition error:', event.error);
      if (event.error === 'not-allowed') {
        console.error('🍍 Permission error: Microphone was blocked or not allowed.');
      }
      if (event.error === 'network') {
        console.error('🍍 Network error: Check internal network connectivity for Speech API.');
      }
    };

    recognition.onend = () => {
      // Auto-restart if we should still be listening
      if (shouldBeListeningRef.current) {
        try {
          setTimeout(() => {
            if (shouldBeListeningRef.current && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        } catch (_) {}
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, [SpeechRecognition, matchesWakeWord]);

  const start = useCallback(() => {
    if (!SpeechRecognition || recognitionRef.current) return;

    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    shouldBeListeningRef.current = true;

    try {
      recognition.start();
      setIsListening(true);
      console.log('🍍 Wake word listener started');
    } catch (err) {
      console.warn('🍍 Failed to start wake word listener:', err);
    }
  }, [SpeechRecognition, createRecognition]);

  const stop = useCallback(() => {
    shouldBeListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    console.log('🍍 Wake word listener stopped');
  }, []);

  // Auto-start/stop based on enabled prop
  useEffect(() => {
    if (enabled && isSupported) {
      start();
    } else {
      stop();
    }

    return () => stop();
  }, [enabled, isSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isListening, start, stop, isSupported };
}
