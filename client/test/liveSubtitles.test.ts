import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTO_DETECT_CANDIDATES,
  F0_LIMITS,
  TARGET_LANGUAGES,
  buildIssueTokenUrl,
  buildSubtitleTokenRequest,
  extractOriginalText,
  extractTranslationText,
  getAudioTrackDiagnostics,
  getAutoDetectLocales,
  getRecognitionLocale,
  getTranslationLocale,
  hasUsableAudioTrack,
  isDisplayMode,
  isSourceLanguage,
  isTargetLanguage,
} from '../shared/liveSubtitles.js';

test('F0 limits match the verified free-tier caps', () => {
  assert.equal(F0_LIMITS.maxConcurrentRequests, 1);
  assert.equal(F0_LIMITS.monthlyAudioSeconds, 5 * 60 * 60);
  assert.equal(F0_LIMITS.maxAtStartLidCandidates, 4);
  assert.equal(F0_LIMITS.maxTargetsPerTranslationRequest, 2);
});

test('source and target selectors cover the required languages', () => {
  for (const locale of ['auto', 'en-US', 'hi-IN', 'de-DE']) {
    assert.equal(isSourceLanguage(locale), true);
  }
  for (const target of ['en', 'hi', 'de']) {
    assert.equal(isTargetLanguage(target), true);
  }
  for (const target of TARGET_LANGUAGES) {
    assert.equal(isTargetLanguage(target), true);
  }
  assert.equal(isDisplayMode('both'), true);
  assert.equal(isDisplayMode('unknown'), false);
});

test('automatic detection uses a provider-required candidate list', () => {
  assert.ok(AUTO_DETECT_CANDIDATES.length <= F0_LIMITS.maxAtStartLidCandidates);
  for (const locale of ['en-US', 'hi-IN', 'de-DE']) {
    assert.ok(getAutoDetectLocales().includes(locale));
  }
  assert.equal(getRecognitionLocale('auto'), 'en-US');
  assert.equal(getRecognitionLocale('hi-IN'), 'hi-IN');
});

test('token requests are validated and never include credentials', () => {
  const request = buildSubtitleTokenRequest({
    roomId: 'room-123',
    peerId: 'peer_456',
    sourceLanguage: 'hi-IN',
    targetLanguage: 'en',
  });
  assert.deepEqual(request, {
    roomId: 'room-123',
    peerId: 'peer_456',
    sourceLanguage: 'hi-IN',
    targetLanguage: 'en',
  });
  assert.equal('key' in request, false);

  assert.throws(() => buildSubtitleTokenRequest({ roomId: 'bad room', peerId: 'p' }));
  assert.throws(() => buildSubtitleTokenRequest({ roomId: 'r', peerId: 'p', sourceLanguage: 'xx-XX' }));
  assert.throws(() => buildSubtitleTokenRequest({ roomId: 'r', peerId: 'p', targetLanguage: 'zz' }));
});

test('renewal requests reuse an existing session id', () => {
  const request = buildSubtitleTokenRequest({
    roomId: 'room-123',
    peerId: 'peer_456',
    sourceLanguage: 'en-US',
    targetLanguage: 'hi',
    sessionId: 'session-abc',
  });
  assert.equal(request.sessionId, 'session-abc');
});

test('translation targets use bare language codes and token URLs are regional', () => {
  assert.equal(getTranslationLocale('hi'), 'hi');
  assert.equal(getTranslationLocale('de'), 'de');
  assert.equal(
    buildIssueTokenUrl({ region: 'eastus' }),
    'https://eastus.api.cognitive.microsoft.com/sts/v1.0/issueToken'
  );
  assert.equal(
    buildIssueTokenUrl({ region: 'eastus', subdomain: 'my-speech' }),
    'https://my-speech.cognitiveservices.azure.com/sts/v1.0/issueToken'
  );
  assert.throws(() => buildIssueTokenUrl({ region: 'bad region' }));
});

test('audio track validation rejects ended, disabled, and muted tracks', () => {
  const track = (overrides: Record<string, unknown> = {}) => ({
    kind: 'audio',
    readyState: 'live',
    enabled: true,
    muted: false,
    ...overrides,
  });
  const stream = (tracks: unknown[]) => ({ getAudioTracks: () => tracks });

  assert.equal(hasUsableAudioTrack(stream([track()])), true);
  assert.equal(hasUsableAudioTrack(stream([track({ readyState: 'ended' })])), false);
  assert.equal(hasUsableAudioTrack(stream([track({ enabled: false })])), false);
  assert.equal(hasUsableAudioTrack(stream([track({ muted: true })])), false);
  assert.equal(hasUsableAudioTrack(stream([])), false);
  assert.equal(hasUsableAudioTrack(null), false);

  const diagnostics = getAudioTrackDiagnostics(stream([track({ muted: true })]));
  assert.deepEqual(diagnostics, [
    { index: 0, kind: 'audio', readyState: 'live', enabled: true, muted: true },
  ]);
});

test('original caption extraction is independent from translation results', () => {
  assert.equal(extractOriginalText({ text: '  hello world  ' }), 'hello world');
  assert.equal(extractOriginalText({}), '');
  assert.equal(extractOriginalText(null), '');
});

test('translation extraction supports Azure map results and never throws', () => {
  const map = new Map<string, string>([['hi', 'नमस्ते']]);
  assert.equal(extractTranslationText({ translations: map }, 'hi'), 'नमस्ते');
  assert.equal(extractTranslationText({ translations: { en: '  Hello  ' } }, 'en'), 'Hello');
  assert.equal(extractTranslationText({ translations: { de: 'Hallo' } }, 'en'), 'Hallo');
  assert.equal(extractTranslationText({ translations: map }, 'en'), 'नमस्ते');
  const sdkTranslations = {
    languages: ['hi'],
    get(language: string) { return language === 'hi' ? 'नमस्ते' : ''; },
  };
  assert.equal(extractTranslationText({ translations: sdkTranslations }, 'en'), 'नमस्ते');
  assert.equal(extractTranslationText({}, 'en'), '');
  assert.equal(
    extractTranslationText({ translations: { get() { throw new Error('translation failed'); } } }, 'en'),
    ''
  );
});
