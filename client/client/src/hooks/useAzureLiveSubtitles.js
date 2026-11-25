import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioConfig,
  AutoDetectSourceLanguageConfig,
  ResultReason,
  SpeechTranslationConfig,
  TranslationRecognizer,
} from 'microsoft-cognitiveservices-speech-sdk';
// @ts-ignore - shared dependency-free module
import {
  F0_LIMITS,
  extractOriginalText,
  extractTranslationText,
  getAudioTrackDiagnostics,
  getAutoDetectLocales,
  getRecognitionLocale,
  getTranslationLocale,
  hasUsableAudioTrack,
} from '@shared/liveSubtitles.js';

const API_URL = '/api/live-subtitles';
const USAGE_REPORT_MS = 15_000;
const MIN_RENEW_DELAY_MS = 30_000;

const initialState = {
  status: 'idle',
  error: null,
  original: '',
  translated: '',
  detectedLanguage: '',
  quota: null,
};

async function postJson(path, body, token) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    const error = new Error('Could not reach the subtitle service.');
    error.code = 'SUBTITLE_SERVICE_UNAVAILABLE';
    throw error;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.message || 'Subtitle service request failed.');
    error.code = data?.code || 'SUBTITLE_SERVICE_UNAVAILABLE';
    error.status = response.status;
    throw error;
  }
  return data;
}

function statusForError(error) {
  if (error?.code === 'F0_QUOTA_EXHAUSTED') return 'quota-exhausted';
  if (error?.code === 'F0_CONCURRENCY_LIMIT') return 'concurrency-limit';
  if (error?.code === 'NOT_A_MEETING_MEMBER') return 'error';
  if (error?.code === 'AZURE_SUBTITLES_NOT_CONFIGURED') return 'error';
  return 'error';
}

const DEV_DIAGNOSTICS = Boolean(import.meta.env && import.meta.env.DEV);

// Development-only diagnostics. Never log tokens, keys, room ids, or transcript text.
function devLog(event, details = {}) {
  if (!DEV_DIAGNOSTICS) return;
  console.debug(`[live-subtitles] ${event}`, details);
}

function errorDetails(error, fallbackCode = 'LIVE_SUBTITLES_ERROR') {
  if (typeof error === 'string' && error.trim()) {
    return { message: error.trim(), code: fallbackCode };
  }
  return {
    message: error?.message || 'Live subtitles could not start.',
    code: error?.code || fallbackCode,
  };
}

function safeText(extract) {
  try {
    return extract() || '';
  } catch {
    return '';
  }
}

/**
 * Isolated Azure Speech F0 live transcription + translation.
 * It never opens the microphone, never stores audio/transcripts, and never
 * touches PeerJS, Socket.IO meeting events, or the existing caption pipeline.
 */
export function useAzureLiveSubtitles({
  enabled,
  authToken,
  roomId,
  peerId,
  stream,
  sourceLanguage = 'auto',
  targetLanguage = 'en',
}) {
  const [state, setState] = useState(initialState);

  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const authTokenRef = useRef(authToken);
  const paramsRef = useRef(null);
  const recognizerRef = useRef(null);
  const audioConfigRef = useRef(null);
  const speechConfigRef = useRef(null);
  const sessionRef = useRef(null);
  const usageRef = useRef({ sessionId: null, cumulativeSeconds: 0, lastTick: 0 });
  const timersRef = useRef({ usage: null, renew: null });

  useEffect(() => {
    authTokenRef.current = authToken;
  }, [authToken]);

  const update = useCallback((patch) => {
    if (!mountedRef.current) return;
    setState((previous) => ({ ...previous, ...patch }));
  }, []);

  const stop = useCallback((options = {}) => {
    const {
      status = 'idle',
      message = null,
      code = null,
      release = true,
      quota = undefined,
    } = options;

    generationRef.current += 1;
    clearInterval(timersRef.current.usage);
    clearTimeout(timersRef.current.renew);
    timersRef.current.usage = null;
    timersRef.current.renew = null;

    const recognizer = recognizerRef.current;
    recognizerRef.current = null;
    if (recognizer) {
      try {
        recognizer.stopContinuousRecognitionAsync(() => {}, () => {});
      } catch {
        // Recognition may already be stopped; cleanup below still runs.
      }
      try {
        recognizer.close();
      } catch {
        // Ignore double-close during unmount.
      }
    }

    const audioConfig = audioConfigRef.current;
    audioConfigRef.current = null;
    try { audioConfig?.close?.(); } catch { /* noop */ }

    const speechConfig = speechConfigRef.current;
    speechConfigRef.current = null;
    try { speechConfig?.close?.(); } catch { /* noop */ }

    const usage = usageRef.current;
    const shouldReport = usage.sessionId && usage.lastTick;
    const finalSeconds = shouldReport
      ? usage.cumulativeSeconds + Math.max(0, (Date.now() - usage.lastTick) / 1000)
      : usage.cumulativeSeconds;
    const finalSessionId = usage.sessionId;
    usageRef.current = { sessionId: null, cumulativeSeconds: 0, lastTick: 0 };

    if (shouldReport) {
      void postJson('/usage', { sessionId: finalSessionId, audioSeconds: finalSeconds }, authTokenRef.current)
        .catch(() => {});
    }
    if (release && finalSessionId) {
      void postJson('/release', { sessionId: finalSessionId }, authTokenRef.current)
        .catch(() => {});
    }

    sessionRef.current = null;
    paramsRef.current = null;
    update({
      status,
      error: message ? { code, message } : null,
      quota: quota === undefined ? undefined : quota,
    });
  }, [update]);

  const reportUsage = useCallback(() => {
    const usage = usageRef.current;
    if (!usage.sessionId || !usage.lastTick) return;

    const now = Date.now();
    usage.cumulativeSeconds += Math.max(0, (now - usage.lastTick) / 1000);
    usage.lastTick = now;

    void postJson(
      '/usage',
      { sessionId: usage.sessionId, audioSeconds: usage.cumulativeSeconds },
      authTokenRef.current
    )
      .then((quota) => update({ quota }))
      .catch((error) => {
        const quotaExhausted = error?.code === 'F0_QUOTA_EXHAUSTED';
        stop({
          status: quotaExhausted ? 'quota-exhausted' : statusForError(error),
          message: error.message,
          code: error.code,
          release: !quotaExhausted,
        });
      });
  }, [stop, update]);

  const renewAndSchedule = useCallback(async (generation) => {
    const params = paramsRef.current;
    const sessionId = sessionRef.current?.sessionId;
    if (!params || !sessionId || generation !== generationRef.current) return;

    try {
      devLog('token renewal requested', { hasSessionId: Boolean(sessionId) });
      const grant = await postJson(
        '/token',
        { ...params, sessionId },
        authTokenRef.current
      );
      if (generation !== generationRef.current) return;
      devLog('token renewal response', {
        hasToken: Boolean(grant?.token),
        hasSessionId: Boolean(grant?.sessionId),
      });
      if (!grant?.token) throw { code: 'INVALID_SUBTITLE_TOKEN_RESPONSE', message: 'Token renewal returned no token.' };

      if (recognizerRef.current) {
        recognizerRef.current.authorizationToken = grant.token;
      }
      update({ quota: grant.quota, error: null });
      timersRef.current.renew = setTimeout(
        () => { void renewAndSchedule(generation); },
        Math.max(MIN_RENEW_DELAY_MS, grant.renewAfterMs || F0_LIMITS.recommendedRenewAfterSeconds * 1000)
      );
    } catch (error) {
      if (generation !== generationRef.current) return;
      stop({
        status: statusForError(error),
        message: error.message,
        code: error.code,
      });
    }
  }, [stop, update]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stop({ status: 'idle', message: null, release: true, quota: null });
    };
  }, [stop]);

  useEffect(() => {
    devLog('session requested', {
      enabled,
      sourceLanguage,
      targetLanguage,
      hasAuthToken: Boolean(authToken),
      hasRoomId: Boolean(roomId),
      hasPeerId: Boolean(peerId),
      hasStream: Boolean(stream),
    });

    if (!enabled) {
      stop({ status: 'idle', message: null, release: true, quota: null });
      return undefined;
    }

    if (!authToken || !roomId || !peerId || !stream) {
      update({
        status: 'error',
        error: { code: 'SUBTITLE_NOT_READY', message: 'Sign in and join the meeting to enable live subtitles.' },
      });
      return undefined;
    }

    const tracks = getAudioTrackDiagnostics(stream);
    devLog('audio track availability', { tracks });
    if (!hasUsableAudioTrack(stream)) {
      update({
        status: 'error',
        error: {
          code: 'NO_AUDIO_TRACK',
          message: 'The selected audio track is not live, enabled, and unmuted. Unmute the speaker or choose another audio source.',
        },
      });
      return undefined;
    }

    const params = { roomId, peerId, sourceLanguage, targetLanguage };
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    paramsRef.current = params;

    const cancelled = () => generation !== generationRef.current;

    const start = async () => {
      update({ status: 'requesting', error: null, original: '', translated: '', detectedLanguage: '' });

      devLog('backend token requested', { sourceLanguage, targetLanguage });
      const grant = await postJson('/token', params, authToken);
      if (cancelled()) return;
      devLog('backend token response', {
        hasToken: Boolean(grant?.token),
        hasRegion: Boolean(grant?.region),
        hasSessionId: Boolean(grant?.sessionId),
        expiresInSeconds: Number.isFinite(grant?.expiresAt)
          ? Math.max(0, Math.round((grant.expiresAt - Date.now()) / 1000))
          : null,
      });

      if (!grant?.token || !grant?.region || !grant?.sessionId) {
        throw {
          code: 'INVALID_SUBTITLE_TOKEN_RESPONSE',
          message: 'The subtitle service returned incomplete authorization details.',
        };
      }

      sessionRef.current = { sessionId: grant.sessionId, expiresAt: grant.expiresAt };
      usageRef.current = {
        sessionId: grant.sessionId,
        cumulativeSeconds: 0,
        lastTick: Date.now(),
      };
      update({ status: 'connecting', quota: grant.quota });

      try {
        devLog('recognizer init', {
          autoDetect: sourceLanguage === 'auto',
          sourceLanguage,
          targetLanguage,
          audioTrackCount: tracks.length,
        });

        const audioConfig = AudioConfig.fromStreamInput(stream);
        const speechConfig = SpeechTranslationConfig.fromAuthorizationToken(grant.token, grant.region);
        speechConfig.speechRecognitionLanguage = getRecognitionLocale(sourceLanguage);
        speechConfig.addTargetLanguage(getTranslationLocale(targetLanguage));
        if (sourceLanguage === 'auto') {
          speechConfig.setProperty('SpeechServiceConnection_LanguageIdMode', 'AtStart');
        }

        const recognizer = sourceLanguage === 'auto'
          ? TranslationRecognizer.FromConfig(
              speechConfig,
              AutoDetectSourceLanguageConfig.fromLanguages(getAutoDetectLocales()),
              audioConfig
            )
          : new TranslationRecognizer(speechConfig, audioConfig);

        audioConfigRef.current = audioConfig;
        speechConfigRef.current = speechConfig;
        recognizerRef.current = recognizer;

        const applyResult = (event, phase) => {
          if (cancelled() || recognizerRef.current !== recognizer) return;
          const result = event?.result;
          if (!result) return;

          // Extract original text first. Translation extraction is isolated so a
          // translation failure can never suppress the original-language caption.
          const original = safeText(() => extractOriginalText(result));
          const translated = safeText(() => extractTranslationText(result, targetLanguage));
          const detectedLanguage = safeText(() => result.language);
          const details = {
            reason: result.reason,
            originalCharacters: original.length,
            translationCharacters: translated.length,
            detectedLanguage,
          };

          if (phase === 'partial') {
            devLog('partial recognition result', details);
          } else {
            devLog('final recognition result', details);
          }
          if (translated) {
            devLog('translation result', {
              targetLanguage,
              translationCharacters: translated.length,
            });
          }

          update({ original, translated, detectedLanguage });
        };

        recognizer.recognizing = (_sender, event) => applyResult(event, 'partial');
        recognizer.recognized = (_sender, event) => applyResult(event, 'final');
        recognizer.canceled = (_sender, event) => {
          if (cancelled() || recognizerRef.current !== recognizer) return;
          devLog('cancellation/error reason', {
            reason: event?.reason,
            errorCode: event?.errorCode,
            errorDetails: event?.errorDetails,
          });
          stop({
            status: 'error',
            message: event?.errorDetails || 'Azure Speech recognition was canceled.',
            code: 'AZURE_RECOGNITION_CANCELED',
          });
        };
        recognizer.sessionStopped = () => {
          if (cancelled() || recognizerRef.current !== recognizer) return;
          devLog('recognition stopped', { expected: false });
          stop({
            status: 'error',
            message: 'Azure stopped the live recognition session unexpectedly.',
            code: 'AZURE_RECOGNITION_STOPPED',
          });
        };

        devLog('starting recognition', { sourceLanguage, targetLanguage });
        await new Promise((resolve, reject) => {
          recognizer.startContinuousRecognitionAsync(resolve, reject);
        });
        if (cancelled()) return;
        devLog('recognition started', { sourceLanguage, targetLanguage });

        timersRef.current.usage = setInterval(reportUsage, USAGE_REPORT_MS);
        timersRef.current.renew = setTimeout(
          () => { void renewAndSchedule(generation); },
          Math.max(MIN_RENEW_DELAY_MS, grant.renewAfterMs || F0_LIMITS.recommendedRenewAfterSeconds * 1000)
        );
        update({ status: 'listening', error: null, quota: grant.quota });
      } catch (error) {
        if (cancelled()) return;
        const details = errorDetails(error, 'AZURE_RECOGNITION_START_FAILED');
        devLog('recognition start failed', { code: details.code, message: details.message });
        stop({ status: statusForError(details), message: details.message, code: details.code });
      }
    };

    start().catch((error) => {
      if (cancelled()) return;
      const details = errorDetails(error, 'LIVE_SUBTITLES_START_FAILED');
      devLog('session start failed', { code: details.code, message: details.message });
      stop({ status: statusForError(details), message: details.message, code: details.code });
    });

    return () => {
      devLog('session cleanup', { reason: 'disabled or dependencies changed' });
      stop({ status: 'idle', message: null, release: true, quota: null });
    };
  }, [enabled, authToken, roomId, peerId, stream, sourceLanguage, targetLanguage, update, reportUsage, renewAndSchedule]);

  return state;
}

export default useAzureLiveSubtitles;
