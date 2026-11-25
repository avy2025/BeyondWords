/**
 * onDeviceSpeech.ts — Brave-compatible Web Speech setup.
 *
 * Brave exposes SpeechRecognition but does not have access to Google's cloud
 * recognition service, so a default start() ends in a `network` error. Recent
 * Brave releases support free on-device English recognition instead. That path
 * must be requested explicitly with `processLocally = true`, and the language
 * pack must be installed with `SpeechRecognition.install()`.
 *
 * Chrome keeps its existing behavior unless the local pack is already present.
 * Nothing here uses getUserMedia, a paid API, or a server-side transcript.
 */

export type LocalSpeechAvailability =
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable'
  | 'unsupported';

export type LocalSpeechSetup =
  | 'ready'
  | 'install'
  | 'feature-disabled'
  | 'unsupported'
  | 'checking';

interface LocalSpeechRecognitionConstructor {
  available?: (options: {
    langs: string[];
    processLocally: boolean;
  }) => Promise<unknown>;
  install?: (options: {
    langs: string[];
    processLocally: boolean;
    quality?: string;
  }) => Promise<unknown>;
}

let cachedAvailability: LocalSpeechAvailability | null = null;
let pendingCheck: Promise<LocalSpeechAvailability> | null = null;

function recognitionConstructor(): LocalSpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const candidate =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return candidate || null;
}

/** Brave advertises itself on navigator.brave. */
export function isBraveBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as any;
  if (nav.brave) return true;
  const brands = nav.userAgentData?.brands;
  return Array.isArray(brands)
    ? brands.some((brand: { brand?: string }) => /brave/i.test(brand?.brand || ''))
    : false;
}

export function normalizeLocalSpeechAvailability(
  value: unknown
): LocalSpeechAvailability {
  if (
    value === 'available' ||
    value === 'downloadable' ||
    value === 'downloading' ||
    value === 'unavailable'
  ) {
    return value;
  }
  return 'unsupported';
}

export function getCachedLocalSpeechAvailability(): LocalSpeechAvailability | null {
  return cachedAvailability;
}

/**
 * Turns a browser capability result into an honest setup state.
 * `install` means Brave can download the model after consent. `feature-disabled`
 * means the build has the API but on-device speech is switched off or outside
 * the rollout, so no web-page action can enable it.
 */
export function getLocalSpeechSetup(
  availability: LocalSpeechAvailability | null = getCachedLocalSpeechAvailability()
): LocalSpeechSetup {
  if (availability === null) return 'checking';
  if (availability === 'available') return 'ready';
  if (availability === 'downloadable' || availability === 'downloading') return 'install';
  if (availability === 'unavailable') {
    return canInstallLocalSpeech() ? 'feature-disabled' : 'unsupported';
  }
  return 'unsupported';
}

/** True when the browser exposes the consent/download API. */
export function canInstallLocalSpeech(): boolean {
  const Recognition = recognitionConstructor();
  return !!Recognition && typeof Recognition.install === 'function';
}

/** Forget a cached capability result so a settings change can be rechecked. */
export function clearLocalSpeechAvailability(): void {
  cachedAvailability = null;
  pendingCheck = null;
}

/** The browser rejected local recognition; the pack needs installing again. */
export function markLocalSpeechModelMissing(): void {
  cachedAvailability = 'downloadable';
}

/**
 * Checks the local language pack once and caches the result for the session.
 * Missing `available()` means the browser cannot offer on-device recognition.
 */
export async function checkLocalSpeechAvailability(
  lang = 'en-US'
): Promise<LocalSpeechAvailability> {
  if (cachedAvailability) return cachedAvailability;
  if (pendingCheck) return pendingCheck;

  const Recognition = recognitionConstructor();
  if (!Recognition || typeof Recognition.available !== 'function') {
    cachedAvailability = 'unsupported';
    return cachedAvailability;
  }

  pendingCheck = Recognition.available({
    langs: [lang],
    processLocally: true,
  })
    .then(normalizeLocalSpeechAvailability)
    .catch(() => 'unsupported' as LocalSpeechAvailability)
    .then((result) => {
      cachedAvailability = result;
      pendingCheck = null;
      return result;
    });

  return pendingCheck;
}

/**
 * Applies the checked availability to a recognizer before start(). The helper
 * is pure so it can be tested without browser globals.
 */
export function configureRecognitionForLocalSpeech(
  recognition: unknown,
  availability: LocalSpeechAvailability | null,
  lang = 'en-US'
): void {
  if (!recognition || availability !== 'available') return;
  const target = recognition as { processLocally?: boolean; lang?: string };
  try {
    target.processLocally = true;
  } catch (_) {
    // An older engine may not expose the property; leave its default intact.
  }
  try {
    target.lang = lang;
  } catch (_) {
    // Lang is normally writable; ignore frozen test doubles.
  }
}

/** Convenience wrapper used by both Mr. Pineapple recognizers. */
export function configureLocalSpeech(recognition: unknown, lang = 'en-US'): void {
  configureRecognitionForLocalSpeech(
    recognition,
    getCachedLocalSpeechAvailability(),
    lang
  );
}

/**
 * Triggers Brave's consent prompt and downloads the local English model. This
 * is free and stays on-device, but must be called from a user gesture.
 */
export async function installLocalSpeechModel(lang = 'en-US'): Promise<boolean> {
  const Recognition = recognitionConstructor();
  if (!Recognition || typeof Recognition.install !== 'function') return false;

  try {
    const installed = await Recognition.install({
      langs: [lang],
      processLocally: true,
      quality: 'command',
    });
    if (installed) cachedAvailability = 'available';
    else cachedAvailability = 'unavailable';
    return Boolean(installed);
  } catch (_) {
    return false;
  }
}

/** Test-only helper; production never needs to forget a checked capability. */
export function resetLocalSpeechCacheForTests(): void {
  cachedAvailability = null;
  pendingCheck = null;
}
