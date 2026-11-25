// Shared, dependency-free configuration for the isolated Azure F0 live subtitle feature.
// This file intentionally contains no keys, endpoints, or audio data.

export const F0_LIMITS = Object.freeze({
  maxConcurrentRequests: 1,
  monthlyAudioSeconds: 5 * 60 * 60,
  tokenValiditySeconds: 10 * 60,
  recommendedRenewAfterSeconds: 9 * 60,
  maxAtStartLidCandidates: 4,
  maxTargetsPerTranslationRequest: 2,
});

export const SOURCE_LANGUAGES = Object.freeze([
  'auto',
  'en-US',
  'hi-IN',
  'de-DE',
  'es-ES',
  'fr-FR',
]);

export const TARGET_LANGUAGES = Object.freeze(['en', 'hi', 'de', 'es', 'fr']);

// Azure LID requires a candidate list. Keep it at or below the at-start limit.
export const AUTO_DETECT_CANDIDATES = Object.freeze(['en-US', 'hi-IN', 'de-DE', 'es-ES']);

export const SOURCE_LABELS = Object.freeze({
  auto: 'Auto-detect',
  'en-US': 'English (US)',
  'hi-IN': 'Hindi (India)',
  'de-DE': 'German (Germany)',
  'es-ES': 'Spanish (Spain)',
  'fr-FR': 'French (France)',
});

export const TARGET_LABELS = Object.freeze({
  en: 'English',
  hi: 'Hindi',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
});

// TranslationRecognizer expects the target as a language code, usually without locale.
export const TARGET_LOCALES = Object.freeze({
  en: 'en',
  hi: 'hi',
  de: 'de',
  es: 'es',
  fr: 'fr',
});

export function isSourceLanguage(value) {
  return typeof value === 'string' && SOURCE_LANGUAGES.includes(value);
}

export function isTargetLanguage(value) {
  return typeof value === 'string' && TARGET_LANGUAGES.includes(value);
}

export function isDisplayMode(value) {
  return value === 'original' || value === 'translation' || value === 'both';
}

export function isSafeRoomIdentifier(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

export function buildSubtitleTokenRequest({
  roomId,
  peerId,
  sourceLanguage = 'auto',
  targetLanguage = 'en',
  sessionId,
}) {
  if (!isSafeRoomIdentifier(roomId)) {
    throw new Error('Invalid meeting identifier.');
  }
  if (!isSafeRoomIdentifier(peerId)) {
    throw new Error('Invalid participant identifier.');
  }
  if (!isSourceLanguage(sourceLanguage)) {
    throw new Error('Unsupported source language.');
  }
  if (!isTargetLanguage(targetLanguage)) {
    throw new Error('Unsupported target language.');
  }
  if (sessionId !== undefined && sessionId !== null && !isSafeRoomIdentifier(sessionId)) {
    throw new Error('Invalid subtitle session.');
  }

  return {
    roomId,
    peerId,
    sourceLanguage,
    targetLanguage,
    ...(sessionId ? { sessionId } : {}),
  };
}

export function getAutoDetectLocales() {
  return [...AUTO_DETECT_CANDIDATES];
}

// A concrete locale is still required when LID is used; the service ignores it.
export function getRecognitionLocale(sourceLanguage) {
  return sourceLanguage === 'auto'
    ? AUTO_DETECT_CANDIDATES[0]
    : sourceLanguage;
}

export function getTranslationLocale(targetLanguage) {
  return TARGET_LOCALES[targetLanguage] || targetLanguage;
}

// Diagnostics only: never includes transcript text or credentials.
export function getAudioTrackDiagnostics(stream) {
  const tracks = typeof stream?.getAudioTracks === 'function' ? stream.getAudioTracks() : [];
  return tracks.map((track, index) => ({
    index,
    kind: track?.kind || 'unknown',
    readyState: track?.readyState || 'unknown',
    enabled: track?.enabled !== false,
    muted: Boolean(track?.muted),
  }));
}

// Azure cannot transcribe a disabled, ended, or source-muted track.
export function hasUsableAudioTrack(stream) {
  return getAudioTrackDiagnostics(stream).some(
    (track) => track.readyState === 'live' && track.enabled && !track.muted
  );
}

export function extractOriginalText(result) {
  return typeof result?.text === 'string' ? result.text.trim() : '';
}

// Translation failures must never prevent the original caption from rendering.
export function extractTranslationText(result, targetLanguage) {
  const translations = result?.translations;
  if (!translations) return '';

  const target = getTranslationLocale(targetLanguage);
  try {
    const direct = translations[target];
    if (typeof direct === 'string' && direct.trim()) return direct.trim();

    if (typeof translations.get === 'function') {
      const mapped = translations.get(target);
      if (typeof mapped === 'string' && mapped.trim()) return mapped.trim();

      // The Azure SDK Translations class exposes languages/get rather than
      // Object.values or Map iteration.
      if (Array.isArray(translations.languages)) {
        for (const language of translations.languages) {
          const value = translations.get(language);
          if (typeof value === 'string' && value.trim()) return value.trim();
        }
      }
    }

    if (typeof translations.values === 'function') {
      for (const value of translations.values()) {
        if (typeof value === 'string' && value.trim()) return value.trim();
      }
    }

    const values = typeof Object.values === 'function' ? Object.values(translations) : [];
    const first = values.find((value) => typeof value === 'string' && value.trim());
    return typeof first === 'string' ? first.trim() : '';
  } catch {
    return '';
  }
}

export function describeSourceLanguage(code) {
  return SOURCE_LABELS[code] || code || 'Unknown';
}

export function describeTargetLanguage(code) {
  return TARGET_LABELS[code] || code || 'Unknown';
}

export function buildIssueTokenUrl({ region, subdomain } = {}) {
  if (subdomain) {
    if (!/^[A-Za-z0-9-]{1,63}$/.test(subdomain)) {
      throw new Error('Invalid Azure Speech custom subdomain.');
    }
    return `https://${subdomain}.cognitiveservices.azure.com/sts/v1.0/issueToken`;
  }
  if (typeof region !== 'string' || !/^[a-z0-9][a-z0-9-]{1,62}$/.test(region)) {
    throw new Error('Invalid Azure Speech region.');
  }
  return `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
}
