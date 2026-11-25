// Backend-only Gemini Live transcription adapter for languages not covered by
// the existing Sarvam adapter (currently German). Protocol verified from
// https://aistudio.google.com/docs/live-api/live-transcribe
// No API key, raw audio, or transcript text is logged here.

import WebSocket from 'ws';
import {
  PARTICIPANT_SUBTITLE_CODES,
  PARTICIPANT_SUBTITLE_CONFIG,
  PARTICIPANT_SUBTITLE_PROVIDERS,
  PARTICIPANT_SUBTITLE_TIMING,
  isParticipantSubtitleLanguage,
} from '../../../client/shared/participantSubtitles.js';

const OPEN_STATE = 1;

const safeText = (value, fallback = '') =>
  typeof value === 'string' && value.trim()
    ? value.trim().slice(0, PARTICIPANT_SUBTITLE_CONFIG.maxCaptionChars)
    : fallback;

const mapFailure = (payload = {}, closeCode) => {
  const message = safeText(payload.message, '');
  const combined = `${payload.code || ''} ${message}`.toLowerCase();
  if (/(api.key|unauthenticated|permission|401|403)/.test(combined) || closeCode === 1008) {
    return {
      code: PARTICIPANT_SUBTITLE_CODES.PROVIDER_AUTH,
      message: message || 'Gemini rejected the transcription credentials.',
    };
  }
  if (/(quota|rate.limit|resource.exhausted|429)/.test(combined) || closeCode === 1003) {
    return {
      code: PARTICIPANT_SUBTITLE_CODES.PROVIDER_QUOTA,
      message: message || 'Gemini transcription quota or rate limit was exceeded.',
    };
  }
  return {
    code: PARTICIPANT_SUBTITLE_CODES.PROVIDER_ERROR,
    message: message || 'The Gemini transcription session ended unexpectedly.',
  };
};

export const buildGeminiLiveUrl = (apiKey) => {
  const url = new URL('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent');
  url.searchParams.set('key', apiKey);
  return url.toString();
};

export const createGeminiLiveTranscriptionProvider = ({
  apiKey,
  sourceLanguage,
  onEvent = () => {},
  onStatus = () => {},
  WebSocketImpl = WebSocket,
  connectionTimeoutMs = PARTICIPANT_SUBTITLE_TIMING.providerConnectMs,
} = {}) => {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('GEMINI_API_KEY is not configured.');
  }
  if (!isParticipantSubtitleLanguage(sourceLanguage)) {
    throw new Error('Unsupported Gemini transcription language.');
  }

  let socket = null;
  let ready = false;
  let closed = false;
  let connectTimer = null;

  const clearConnectTimer = () => {
    if (connectTimer) {
      clearTimeout(connectTimer);
      connectTimer = null;
    }
  };

  const emitStatus = (status, extra = {}) =>
    onStatus({
      status,
      provider: PARTICIPANT_SUBTITLE_PROVIDERS.geminiLive,
      sourceLanguage,
      ...extra,
    });

  const emitFailure = (payload, options = {}) => {
    const mapped = mapFailure(payload, options.closeCode);
    emitStatus('error', {
      code: mapped.code,
      message: mapped.message,
      fatal: options.fatal !== false,
      closeCode: options.closeCode || null,
    });
    return mapped;
  };

  const forceClose = () => {
    closed = true;
    ready = false;
    clearConnectTimer();
    try {
      socket?.close?.(1000, 'session stop');
    } catch {
      // Cleanup is best-effort; local state is already closed.
    }
  };

  try {
    socket = new WebSocketImpl(buildGeminiLiveUrl(apiKey));
  } catch {
    emitFailure({ message: 'Could not open the Gemini Live WebSocket.' });
    return {
      provider: PARTICIPANT_SUBTITLE_PROVIDERS.geminiLive,
      ready: () => false,
      sendAudio: () => false,
      sendEnd: () => false,
      close: () => {},
    };
  }

  connectTimer = setTimeout(() => {
    if (closed || ready) return;
    closed = true;
    clearConnectTimer();
    emitFailure({ message: 'Gemini Live transcription did not connect in time.' });
    try { socket.close(1000, 'connection timeout'); } catch { /* cleanup is best-effort */ }
  }, connectionTimeoutMs);
  if (typeof connectTimer?.unref === 'function') connectTimer.unref();

  socket.on?.('unexpected-response', (request, response) => {
    if (closed) return;
    clearConnectTimer();
    const statusCode = response?.statusCode ?? null;
    closed = true;
    ready = false;
    emitFailure(
      {
        code: statusCode === 401 || statusCode === 403 ? 'unauthenticated' : undefined,
        message: `Gemini rejected the WebSocket handshake${statusCode ? ` (HTTP ${statusCode})` : ''}.`,
      },
      { closeCode: statusCode === 401 || statusCode === 403 ? 1008 : null }
    );
    try { request?.abort?.(); } catch { /* handshake cleanup is best-effort */ }
  });

  socket.on?.('open', () => {
    if (closed) return;
    emitStatus('connecting');
    try {
      socket.send(JSON.stringify({
        setup: {
          model: `models/${PARTICIPANT_SUBTITLE_PROVIDERS.geminiLive}`,
          generationConfig: { responseModalities: ['TEXT'] },
          inputAudioTranscription: {
            languageCodes: [sourceLanguage],
            mode: 'VERBATIM',
          },
        },
      }));
    } catch {
      emitFailure({ message: 'Could not configure the Gemini transcription session.' });
    }
  });

  socket.on?.('message', (raw) => {
    if (closed) return;
    let message;
    try {
      message = JSON.parse(raw?.toString?.() || '');
    } catch {
      emitFailure({ message: 'Gemini returned a malformed session event.' }, { fatal: false });
      return;
    }
    if (!message || typeof message !== 'object') return;

    if (message.setupComplete) {
      clearConnectTimer();
      ready = true;
      emitStatus('connected');
      return;
    }
    if (message.error) {
      clearConnectTimer();
      emitFailure(message.error, { fatal: Boolean(message.error?.fatal) });
      return;
    }

    const content = message.serverContent;
    if (!content) return;
    const partialText = safeText(content.interimInputTranscription?.text);
    if (partialText) {
      onEvent({
        type: 'caption',
        kind: 'partial',
        text: partialText,
        provider: PARTICIPANT_SUBTITLE_PROVIDERS.geminiLive,
        sourceLanguage,
      });
    }
    const finalText = safeText(content.inputTranscription?.text);
    if (finalText) {
      onEvent({
        type: 'caption',
        kind: 'final',
        text: finalText,
        provider: PARTICIPANT_SUBTITLE_PROVIDERS.geminiLive,
        sourceLanguage,
      });
    }
  });

  socket.on?.('error', () => {
    if (!closed) {
      clearConnectTimer();
      emitFailure({ message: 'The Gemini WebSocket reported a connection error.' });
    }
  });

  socket.on?.('close', (code, reason) => {
    clearConnectTimer();
    if (closed) {
      emitStatus('closed');
      return;
    }
    emitFailure({ message: safeText(reason?.toString?.()) }, { closeCode: typeof code === 'number' ? code : null });
  });

  return {
    provider: PARTICIPANT_SUBTITLE_PROVIDERS.geminiLive,
    ready: () => Boolean(ready && socket?.readyState === OPEN_STATE),
    sendAudio: (pcmBuffer) => {
      if (
        !ready ||
        closed ||
        socket?.readyState !== OPEN_STATE ||
        !Buffer.isBuffer(pcmBuffer) ||
        pcmBuffer.length === 0 ||
        pcmBuffer.length > PARTICIPANT_SUBTITLE_CONFIG.maxFrameBytes
      ) {
        return false;
      }
      try {
        socket.send(JSON.stringify({
          realtimeInput: {
            audio: {
              data: pcmBuffer.toString('base64'),
              mimeType: `audio/pcm;rate=${PARTICIPANT_SUBTITLE_CONFIG.sampleRate}`,
            },
          },
        }));
        return true;
      } catch {
        return false;
      }
    },
    sendEnd: () => {
      if (!ready || closed || socket?.readyState !== OPEN_STATE) return false;
      try {
        socket.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
        return true;
      } catch {
        return false;
      }
    },
    close: forceClose,
  };
};
