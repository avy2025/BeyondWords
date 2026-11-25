/** Text-to-speech helper used by Mr. Pineapple. Never rejects. */
export function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch (_) {
      // Some browsers throw when cancel is called with no active utterance.
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

/** Stops any confirmation speech still playing during final shutdown. */
export function cancelSpeech(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {
      // Ignore browser-specific cancel errors.
    }
  }
}
