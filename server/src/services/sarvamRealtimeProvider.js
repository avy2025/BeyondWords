// Backend-only Sarvam saaras:v4 realtime transcription adapter.
// Protocol verified from https://docs.sarvam.ai/api/api-guides-tutorials/speech-to-text/realtime-streaming
// No API key, raw audio, or transcript text is ever logged here.

import WebSocket from 'ws';
import {
  CAPTION_TRANSCRIPTION_CODES,
  SARVAM_CONFIG,
  isSarvamSourceLanguage,
  isSarvamStreamType,
} from '../../../client/shared/captionHost.js';

const OPEN_STATE = 1;

const safeText = (value, fallback) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 300) : fallback;

const mapProviderFailure = (payload = {}, closeCode) => {
  const code = safeText(payload.code, '').toLowerCase();
  const message = safeText(payload.message, '');
  const combined = `${code} ${message}`.toLowerCase();

  if (code === 'invalid_subscription_key') {
    return {
      code: CAPTION_TRANSCRIPTION_CODES.PROVIDER_AUTH,
      message: message || 'Sarvam rejected the API subscription key.',
    };
  }
  if (closeCode === 1003 || /(quota|rate.limit|limit.exceeded)/.test(combined)) {
    return {
      code: CAPTION_TRANSCRIPTION_CODES.PROVIDER_QUOTA,
      message: message || 'Sarvam rejected the session because quota or rate limits were exceeded.',
    };
  }
  if (code === 'inactivity_timeout' || closeCode === 1008) {
    return {
      code: CAPTION_TRANSCRIPTION_CODES.PROVIDER_INACTIVE,
      message: message || 'Sarvam ended the session after 60 seconds without audio.',
    };
  }
  if (code === 'invalid_request' || code === 'invalid_model' || closeCode === 4000) {
    return {
      code: CAPTION_TRANSCRIPTION_CODES.PROVIDER_ERROR,
      message: message || 'Sarvam rejected the session configuration.',
    };
  }
  if (closeCode === 1011) {
    return {
      code: CAPTION_TRANSCRIPTION_CODES.PROVIDER_ERROR,
      message: message || 'Sarvam reported an internal server error.',
    };
  }
  return {
    code: CAPTION_TRANSCRIPTION_CODES.PROVIDER_ERROR,
    message: message || 'The Sarvam transcription session ended unexpectedly.',
  };
};

export const buildSarvamRealtimeUrl = ({ sourceLanguage, streamType }) => {
  const url = new URL(SARVAM_CONFIG.endpoint);
  url.searchParams.set('model', SARVAM_CONFIG.model);
  url.searchParams.set('language_code', sourceLanguage);
  url.searchParams.set('mode', SARVAM_CONFIG.mode);
  url.searchParams.set('encoding', SARVAM_CONFIG.encoding);
  url.searchParams.set('sample_rate', String(SARVAM_CONFIG.sampleRate));
  url.searchParams.set('stream_type', streamType);
  return url.toString();
};

export const createSarvamRealtimeProvider = ({
  apiKey,
  sourceLanguage,
  streamType = 'balanced',
  onEvent = () => {},
  onStatus = () => {},
  WebSocketImpl = WebSocket,
  connectionTimeoutMs = SARVAM_CONFIG.connectionTimeoutMs,
} = {}) => {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('SARVAM_API_KEY is not configured.');
  }
  if (!isSarvamSourceLanguage(sourceLanguage)) {
    throw new Error('Unsupported Sarvam source language.');
  }
  if (!isSarvamStreamType(streamType)) {
    throw new Error('Unsupported Sarvam stream type.');
  }

  let socket = null;
  let pingTimer = null;
  let connectTimer = null;
  let closed = false;
  let ready = false;
  let connected = false;

  const emitStatus = (status, extra = {}) => {
    onStatus({ status, provider: SARVAM_CONFIG.provider, sourceLanguage, ...extra });
  };

  const emitFailure = (payload, { closeCode, fatal = true } = {}) => {
    const mapped = mapProviderFailure(payload, closeCode);
    emitStatus('error', {
      code: mapped.code,
      message: mapped.message,
      fatal,
      closeCode: closeCode || null,
    });
    return mapped;
  };

  const clearPing = () => {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  };

  const clearConnectTimer = () => {
    if (connectTimer) {
      clearTimeout(connectTimer);
      connectTimer = null;
    }
  };

  const forceClose = () => {
    closed = true;
    ready = false;
    connected = false;
    clearPing();
    clearConnectTimer();
    try {
      if (socket && typeof socket.close === 'function') socket.close(1000, 'session stop');
    } catch {
      // Closing is best-effort; state is already marked closed.
    }
  };

  const url = buildSarvamRealtimeUrl({ sourceLanguage, streamType });

  try {
    socket = new WebSocketImpl(url, { headers: { 'api-subscription-key': apiKey } });
  } catch {
    emitFailure({ message: 'Could not open the Sarvam WebSocket.' });
    return {
      provider: SARVAM_CONFIG.provider,
      ready: () => false,
      sendAudio: () => false,
      close: () => {},
    };
  }

  connectTimer = setTimeout(() => {
    if (closed || connected) return;
    closed = true;
    clearPing();
    clearConnectTimer();
    emitFailure({ message: 'Sarvam did not confirm session.begin in time.' });
    try { socket.close(1000, 'connection timeout'); } catch { /* cleanup is best-effort */ }
  }, connectionTimeoutMs);
  if (typeof connectTimer?.unref === 'function') connectTimer.unref();

  // A rejected handshake (for example HTTP 401/403 for a bad key) never
  // reaches 'open'. Map it explicitly instead of reporting a generic close.
  socket.on?.('unexpected-response', (request, response) => {
    if (closed) return;
    clearConnectTimer();
    const statusCode = response?.statusCode;
    const authRejected = statusCode === 401 || statusCode === 403;
    closed = true;
    ready = false;
    clearPing();
    emitFailure(
      {
        code: authRejected ? 'invalid_subscription_key' : undefined,
        message: authRejected
          ? 'Sarvam rejected the WebSocket handshake because the API subscription key was invalid or unauthorized.'
          : `Sarvam rejected the WebSocket handshake (HTTP ${statusCode || 'unknown'}).`,
      },
      { closeCode: authRejected ? 1003 : null }
    );
    try {
      request?.abort?.();
    } catch {
      // Handshake cleanup is best-effort.
    }
  });

  socket.on?.('open', () => {
    if (closed) return;
    ready = true;
    emitStatus('connecting');
    pingTimer = setInterval(() => {
      if (!ready || !socket || socket.readyState !== OPEN_STATE) return;
      try {
        socket.send(JSON.stringify({ event: 'ping' }));
      } catch {
        // The close/error handlers report provider failures.
      }
    }, SARVAM_CONFIG.pingMs);
    if (typeof pingTimer?.unref === 'function') pingTimer.unref();
  });

  socket.on?.('message', (raw) => {
    if (closed) return;
    let message;
    try {
      message = JSON.parse(raw?.toString?.() || '');
    } catch {
      emitFailure({ message: 'Sarvam returned a malformed session event.' }, { fatal: false });
      return;
    }
    if (!message || typeof message !== 'object') return;

    switch (message.event) {
      case 'session.begin':
        clearConnectTimer();
        connected = true;
        emitStatus('connected', {
          requestId: safeText(message.request_id, ''),
          model: SARVAM_CONFIG.model,
        });
        break;
      case 'vad.speech_start':
        emitStatus('listening', { utteranceIndex: message.utterance_idx ?? null });
        break;
      case 'vad.speech_end':
        emitStatus('processing', { utteranceIndex: message.utterance_idx ?? null });
        break;
      case 'transcript.partial':
        onEvent({
          type: 'caption',
          kind: 'partial',
          text: safeText(message.text, ''),
          utteranceIndex: message.utterance_idx ?? null,
          provider: SARVAM_CONFIG.provider,
          sourceLanguage,
        });
        break;
      case 'transcript.final':
        onEvent({
          type: 'caption',
          kind: 'final',
          text: safeText(message.text, ''),
          utteranceIndex: message.utterance_idx ?? null,
          provider: SARVAM_CONFIG.provider,
          sourceLanguage,
        });
        break;
      case 'session.end':
        emitStatus('ended', {
          requestId: safeText(message.request_id, ''),
          audioDurationS: message.audio_duration_s ?? null,
          totalUtterances: message.total_utterances ?? null,
        });
        break;
      case 'error': {
        const isFatal = Boolean(message.is_fatal);
        emitFailure(message, { fatal: isFatal });
        if (isFatal) forceClose();
        break;
      }
      case 'pong':
      case 'config.updated':
        break;
      default:
        break;
    }
  });

  socket.on?.('error', () => {
    if (closed) return;
    clearConnectTimer();
    emitFailure({ message: 'The Sarvam WebSocket reported a connection error.' });
  });

  socket.on?.('close', (code, reason) => {
    clearConnectTimer();
    if (closed) {
      emitStatus('closed');
      return;
    }
    emitFailure(
      { message: safeText(reason?.toString?.(), '') },
      { closeCode: typeof code === 'number' ? code : null }
    );
  });

  return {
    provider: SARVAM_CONFIG.provider,
    ready: () => Boolean(ready && socket?.readyState === OPEN_STATE),
    sendAudio: (pcmBuffer) => {
      if (
        !ready ||
        !socket ||
        socket.readyState !== OPEN_STATE ||
        !Buffer.isBuffer(pcmBuffer) ||
        pcmBuffer.length === 0 ||
        pcmBuffer.length > SARVAM_CONFIG.maxFrameBytes
      ) {
        return false;
      }
      try {
        socket.send(
          JSON.stringify({
            event: 'audio_input',
            audio: pcmBuffer.toString('base64'),
          })
        );
        return true;
      } catch {
        return false;
      }
    },
    sendEnd: () => {
      if (!ready || !socket || socket.readyState !== OPEN_STATE) return false;
      try {
        socket.send(JSON.stringify({ event: 'end' }));
        return true;
      } catch {
        return false;
      }
    },
    close: () => forceClose(),
  };
};
