import { useEffect, useRef, useState } from 'react';

// ── Config ────────────────────────────────────────────────────────────────────
export const LANG_MODES = {
  'hi-en': { srLang: 'hi-IN', langpair: 'hi|en', label: 'Hindi',  flag: '🇮🇳' },
  'de-en': { srLang: 'de-DE', langpair: 'de|en', label: 'German', flag: '🇩🇪' },
};

/** Clear subtitle after this many ms of silence */
const SUBTITLE_CLEAR_MS = 7_000;

// ── Translation Cache (LRU Cache for performance) ─────────────────────────────
class TranslationCache {
  constructor(maxSize = 500) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    // Move to end (most recent)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first) item
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }
}

const translationCache = new TranslationCache(500);

// ── Ollama Configuration ──────────────────────────────────────────────────────
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:3b';
const OLLAMA_BASE_URL = 'http://localhost:11434';

console.log(`[Ollama] Model: ${OLLAMA_MODEL}, Base URL: ${OLLAMA_BASE_URL}`);

// ── Ollama Translation (Local, Privacy-Focused) ──────────────────────────────
async function translateViaOllama(text, langpair) {
  const [sl, tl] = langpair.split('|');
  
  const langMap = {
    'hi': 'Hindi',
    'de': 'German',
    'en': 'English',
  };
  
  const sourceLang = langMap[sl] || sl;
  const targetLang = langMap[tl] || tl;
  
  const prompt = `Translate this ${sourceLang} text to ${targetLang}. Only output the translation, nothing else.\n\n${sourceLang}: ${text}\n${targetLang}:`;

  try {
    const res = await Promise.race([
      fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: false,
          temperature: 0.3,
          top_p: 0.9,
        }),
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Ollama timeout')), 3000)
      ),
    ]);

    if (res.ok) {
      const data = await res.json();
      if (data.response) {
        const translation = data.response.trim();
        console.log(`[Translation] ✓ Ollama (${OLLAMA_MODEL}): "${text}" → "${translation}"`);
        return translation;
      }
    }
  } catch (err) {
    console.warn(`[Translation] ✗ Ollama failed: ${err.message}`);
  }

  return null;
}

// ── Translation API (Improved Multi-Strategy with Reliability) ───────────────
async function translateText(text, langpair, retryCount = 0) {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const cacheKey = `${langpair}:${trimmed}`;
  
  // Check cache first (FASTEST)
  const cached = translationCache.get(cacheKey);
  if (cached) {
    console.log(`[Translation] ✓ Cache HIT: "${trimmed}"`);
    return cached;
  }

  const [sl, tl] = langpair.split('|');
  let result = null;

  // Strategy 1: Ollama (Local, Privacy-First - if available)
  result = await translateViaOllama(text, langpair);
  if (result) {
    translationCache.set(cacheKey, result);
    return result;
  }

  // Strategy 2: Google Translate API (Most reliable for hi->en, de->en)
  try {
    const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(trimmed)}`;
    const gRes = await Promise.race([
      fetch(googleUrl),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      ),
    ]);
    
    if (gRes.ok) {
      const gData = await gRes.json();
      if (gData && gData[0] && gData[0][0] && gData[0][0][0]) {
        result = gData[0][0][0];
        console.log(`[Translation] ✓ Google: "${trimmed}" → "${result}"`);
      }
    }
  } catch (err) {
    console.warn(`[Translation] ✗ Google failed: ${err.message}`);
  }

  // Strategy 3: LibreTranslate
  if (!result) {
    try {
      const libreUrl = `https://libretranslate.de/translate`;
      const libreRes = await Promise.race([
        fetch(libreUrl, {
          method: 'POST',
          body: JSON.stringify({
            q: trimmed,
            source: sl,
            target: tl,
          }),
          headers: { 'Content-Type': 'application/json' },
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 4000)
        ),
      ]);
      
      if (libreRes.ok) {
        const libreData = await libreRes.json();
        if (libreData.translatedText) {
          result = libreData.translatedText;
          console.log(`[Translation] ✓ LibreTranslate: "${trimmed}" → "${result}"`);
        }
      }
    } catch (err) {
      console.warn(`[Translation] ✗ LibreTranslate failed: ${err.message}`);
    }
  }

  // Strategy 4: MyMemory
  if (!result) {
    try {
      const myMemoryUrl =
        `https://api.mymemory.translated.net/get` +
        `?q=${encodeURIComponent(trimmed)}` +
        `&langpair=${langpair}` +
        `&de=beyondwords@app.local`;

      const mRes = await Promise.race([
        fetch(myMemoryUrl),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 4000)
        ),
      ]);
      
      if (mRes.ok) {
        const mData = await mRes.json();
        if (mData.responseData?.translatedText && mData.responseData.translatedText !== trimmed) {
          result = mData.responseData.translatedText;
          console.log(`[Translation] ✓ MyMemory: "${trimmed}" → "${result}"`);
        }
      }
    } catch (err) {
      console.warn(`[Translation] ✗ MyMemory failed: ${err.message}`);
    }
  }

  // If still no result after 2 retries, use original text but log it
  if (!result) {
    if (retryCount < 1) {
      console.log(`[Translation] ⚠ Retry ${retryCount + 1}/1 for: "${trimmed}"`);
      // Wait 500ms and retry once
      await new Promise(r => setTimeout(r, 500));
      return translateText(trimmed, langpair, retryCount + 1);
    }
    console.warn(`[Translation] ✗ All strategies failed for: "${trimmed}"`);
    result = trimmed; // Fallback to original text
  }

  // Cache the result
  translationCache.set(cacheKey, result);
  return result;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
/**
 * @param {MediaStream|null}  stream
 * @param {object}            socket
 * @param {string}            peerId
 * @param {string}            roomId
 * @param {boolean}           isEnabled
 * @param {boolean}           isLocal
 * @param {boolean}           isConnected
 * @param {'hi-en'|'de-en'}  translationMode
 */
export function useTranslation(stream, socket, peerId, roomId, isEnabled, isLocal, isConnected, translationMode = 'hi-en') {
  const [subtitle, setSubtitle] = useState('');

  const recRef        = useRef(null);
  const clearRef      = useRef(null);
  const mountedRef    = useRef(true);
  const pineappleRef  = useRef(false);
  const enabledRef    = useRef(isEnabled);
  const connectedRef  = useRef(isConnected);
  const modeRef       = useRef(translationMode);
  const translationQueueRef = useRef([]); // Queue for translations instead of debouncing
  const isTranslatingRef = useRef(false);  // Track if translation is in progress

  const [isPineappleActive, setIsPineappleActive] = useState(false);

  // Keep refs current so async callbacks always see latest values
  useEffect(() => { enabledRef.current   = isEnabled;       }, [isEnabled]);
  useEffect(() => { connectedRef.current = isConnected;     }, [isConnected]);
  useEffect(() => { modeRef.current      = translationMode; }, [translationMode]);
  useEffect(() => { pineappleRef.current = isPineappleActive; }, [isPineappleActive]);

  // ── Voice-assistant coordination ────────────────────────────────────────
  useEffect(() => {
    const handle = (e) => setIsPineappleActive(!!e.detail.isActive);
    window.addEventListener('pineapple:activity', handle);
    return () => window.removeEventListener('pineapple:activity', handle);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('translation:status', {
      detail: { isActive: isEnabled && isLocal && !isPineappleActive },
    }));
  }, [isEnabled, isLocal, isPineappleActive]);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const safeSetSubtitle = (text) => {
    if (!mountedRef.current) return;
    setSubtitle(text);
    clearTimeout(clearRef.current);
    if (text) {
      clearRef.current = setTimeout(() => {
        if (mountedRef.current) setSubtitle('');
      }, SUBTITLE_CLEAR_MS);
    }
  };

  // ── Translation Queue Processor ──────────────────────────────────────────
  const processTranslationQueue = async (socketRef) => {
    if (isTranslatingRef.current || translationQueueRef.current.length === 0) {
      return;
    }

    isTranslatingRef.current = true;

    while (translationQueueRef.current.length > 0 && mountedRef.current) {
      const { originalText, langpair, label } = translationQueueRef.current.shift();

      try {
        console.log(`[Translation Queue] Processing: "${originalText}"`);
        const translated = await translateText(originalText, langpair);

        if (!mountedRef.current) break;

        // Update subtitle with translated text
        safeSetSubtitle(translated);

        // Send to room if socket is connected
        if (socketRef?.current && roomId && peerId) {
          socketRef.current.emit('send-subtitle', {
            roomId,
            peerId,
            translated,
            type: 'final',
          });
        }
      } catch (err) {
        console.error(`[Translation Queue] Error translating "${originalText}":`, err);
      }

      // Small delay between translations to avoid overwhelming the UI
      if (translationQueueRef.current.length > 0) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    isTranslatingRef.current = false;
  };

  const stopRec = () => {
    if (recRef.current) {
      recRef.current.onend    = null;
      recRef.current.onerror  = null;
      recRef.current.onresult = null;
      try { recRef.current.stop(); } catch (_) {}
      recRef.current = null;
    }
  };

  // ── Start recognizer ─────────────────────────────────────────────────────
  const startRec = (socketRef) => {
    if (!enabledRef.current || pineappleRef.current || !connectedRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('[useTranslation] SpeechRecognition not supported');
      return;
    }

    const mode = LANG_MODES[modeRef.current] ?? LANG_MODES['hi-en'];
    console.log(`🎙️ [useTranslation] Starting [${mode.srLang}]`);

    const rec = new SpeechRecognition();
    rec.lang            = mode.srLang;
    rec.interimResults  = true;
    rec.continuous      = true;
    rec.maxAlternatives = 1;
    recRef.current      = rec;

    rec.onresult = async (event) => {
      // Iterate only new results (from resultIndex onward)
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result  = event.results[i];
        const text    = result[0].transcript;
        const currentMode = LANG_MODES[modeRef.current] ?? LANG_MODES['hi-en'];

        if (result.isFinal) {
          if (!text.trim()) continue;
          
          const finalText = text.trim();
          console.log(`📝 [${currentMode.srLang}] Final: "${finalText}"`);

          // Show original text immediately
          safeSetSubtitle(`${currentMode.label}: ${finalText}`);

          // Add to translation queue
          translationQueueRef.current.push({
            originalText: finalText,
            langpair: currentMode.langpair,
            label: currentMode.label,
          });

          // Process queue (async, won't block)
          processTranslationQueue(socketRef);
        } else {
          // Show ONLY interim text (no translation API call)
          safeSetSubtitle(`${currentMode.label}: ${text}`);
        }
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'aborted')   return;
      if (e.error === 'no-speech') return;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        console.error('[useTranslation] Mic access denied:', e.error);
        return;
      }
      console.warn(`[useTranslation] STT error [${mode.srLang}]:`, e.error);
    };

    rec.onend = () => {
      recRef.current = null;
      // Auto-restart with current mode if still active
      if (enabledRef.current && !pineappleRef.current && connectedRef.current && mountedRef.current) {
        setTimeout(() => startRec(socketRef), 250);
      }
    };

    try {
      rec.start();
    } catch (e) {
      console.error('[useTranslation] Failed to start:', e);
      recRef.current = null;
      setTimeout(() => startRec(socketRef), 1_500);
    }
  };

  // ── Main effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLocal || !isEnabled || !socket || !socket.current || !isConnected || isPineappleActive) {
      stopRec();
      return;
    }

    // Stop current session and immediately restart with (potentially new) mode
    stopRec();
    startRec(socket);

    return () => stopRec();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, isLocal, socket, peerId, roomId, isPineappleActive, isConnected, translationMode]);

  // ── Remote subtitle relay ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket?.current || !isEnabled) return;

    const handleSubtitle = (data) => {
      if (data.peerId === peerId) safeSetSubtitle(data.translated);
    };

    socket.current.on('subtitle_update', handleSubtitle);
    return () => { socket.current?.off('subtitle_update', handleSubtitle); };
  }, [socket, peerId, isEnabled]);

  // ── Unmount guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(clearRef.current);
      stopRec();
    };
  }, []);

  return { subtitle };
}
