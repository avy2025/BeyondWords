import { useEffect, useRef, useState } from 'react';
import { VoiceCommandSession } from '@/lib/voiceCommandSession';

/**
 * useCommandListener — Short-lived SpeechRecognition for one voice command.
 *
 * Wraps VoiceCommandSession so the React pill can show the live transcript.
 * The session waits up to 10 seconds for a final result and never invokes the
 * command callback from interim results.
 *
 * @returns {{
 *   isListening: boolean,
 *   transcript: string,
 *   session: VoiceCommandSession | null,
 *   startListening: (onResult: (text: string, error?: string) => void) => boolean,
 *   stopListening: () => Promise<void>,
 *   isSupported: boolean
 * }}
 */
export function useCommandListener({ timeoutMs = 10000 } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognition;

  const sessionRef = useRef(null);
  if (!sessionRef.current && isSupported) {
    sessionRef.current = new VoiceCommandSession({
      createRecognition: () => {
        const Recognition = typeof window !== 'undefined'
          ? window.SpeechRecognition || window.webkitSpeechRecognition
          : null;
        return Recognition ? new Recognition() : null;
      },
      timeoutMs,
      onListeningChange: (listening) => {
        setIsListening(listening);
        if (!listening) setTranscript('');
      },
      onTranscriptChange: (text) => setTranscript(text),
    });
  }

  useEffect(() => {
    const session = sessionRef.current;
    return () => {
      session?.dispose();
    };
  }, []);

  const startListening = (onResult) => sessionRef.current?.start(onResult) ?? false;
  const stopListening = () => sessionRef.current?.stop() ?? Promise.resolve();

  return {
    isListening,
    transcript,
    session: sessionRef.current,
    startListening,
    stopListening,
    isSupported,
  };
}
