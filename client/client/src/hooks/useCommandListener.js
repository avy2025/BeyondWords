import { useRef, useState, useCallback } from 'react';

/**
 * useCommandListener — Short-lived SpeechRecognition for capturing voice commands.
 *
 * Starts a NEW recognition instance each time, listens for a voice command,
 * and auto-stops after a 7-second timeout or when speech ends naturally.
 * Returns the final transcript via onResult callback.
 *
 * Separate instance from wake word listener to avoid conflicts.
 *
 * @returns {{
 *   isListening: boolean,
 *   transcript: string,
 *   startListening: (onResult: (transcript: string) => void) => void,
 *   stopListening: () => void,
 *   isSupported: boolean
 * }}
 */
export function useCommandListener() {
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  const onResultRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognition;

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback((onResult) => {
    if (!SpeechRecognition) return;

    // Clean up any previous instance
    cleanup();
    setTranscript('');
    onResultRef.current = onResult;

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Single utterance
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      // Show live transcript (interim or final so far)
      setTranscript(finalTranscript || interim);
    };

    recognition.onerror = (event) => {
      console.warn('🎤 Command listener error:', event.error);
      if (event.error === 'not-allowed') {
        console.error('🎤 Permission error: Microphone access was lost or denied.');
      }
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        cleanup();
        // Return whatever we have
        if (finalTranscript.trim()) {
          console.log('🎤 Returning partial transcript due to error:', finalTranscript.trim());
          onResultRef.current?.(finalTranscript.trim());
        } else {
          onResultRef.current?.('');
        }
      }
    };

    recognition.onend = () => {
      cleanup();
      const result = finalTranscript.trim();
      console.log('🎤 Command captured:', result);
      onResultRef.current?.(result);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
      console.log('🎤 Command listener started (7s timeout)');

      // 7-second timeout
      timeoutRef.current = setTimeout(() => {
        console.log('🎤 Command listener timed out');
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (_) {}
        }
      }, 7000);
    } catch (err) {
      console.warn('🎤 Failed to start command listener:', err);
      cleanup();
    }
  }, [SpeechRecognition, cleanup]);

  const stopListening = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return { isListening, transcript, startListening, stopListening, isSupported };
}
