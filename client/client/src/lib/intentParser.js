/**
 * intentParser.js — Client-side utility to call the parse-intent API.
 *
 * Sends the voice transcript to the Express backend, which forwards it
 * to Ollama for intent classification.
 *
 * @param {string} transcript — The raw voice command text
 * @returns {Promise<{ action: string, password: string | null }>}
 */
export async function parseIntent(transcript) {
  try {
    const res = await fetch('/api/voice/parse-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    });

    if (!res.ok) {
      console.error('Intent parse API error:', res.status);
      return { action: 'UNKNOWN', password: null };
    }

    const data = await res.json();
    return {
      action: data.action || 'UNKNOWN',
      password: data.password || null,
    };
  } catch (err) {
    console.error('Intent parse failed:', err);
    return { action: 'UNKNOWN', password: null };
  }
}
