import { useEffect, useRef, useState } from 'react';

const WS_URL =
  import.meta.env.VITE_SIGN_LANGUAGE_WS_URL || 'ws://127.0.0.1:8765';

/**
 * Local: sends video frames to Python sign_ws_server, broadcasts label via Socket.IO.
 * Remote: listens for sign_gesture_update for this tile's peerId.
 */
export function useSignLanguage(
  socket,
  peerId,
  roomId,
  userName,
  enabled,
  isLocal,
  videoRef,
  stream
) {
  const [signOverlay, setSignOverlay] = useState('');
  const [signSentence, setSignSentence] = useState('');
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  const lastEmitRef = useRef({ label: '', t: 0 });

  useEffect(() => {
    if (!enabled) {
      setSignOverlay('');
      setSignSentence('');
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isLocal || !socket?.current || !roomId || !peerId) {
      return;
    }

    let ws;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      setSignOverlay('Sign server unavailable');
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      intervalRef.current = window.setInterval(() => {
        const video = videoRef?.current;
        if (!video || video.readyState < 2) return;
        const w = Math.min(video.videoWidth || 0, 640);
        const h = Math.min(video.videoHeight || 0, 480);
        if (!w || !h) return;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, w, h);
        const data = canvas.toDataURL('image/jpeg', 0.55).split(',')[1];
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'frame', data }));
        }
      }, 220);
    };

    ws.onmessage = (ev) => {
      let payload;
      try {
        payload = JSON.parse(ev.data);
      } catch {
        return;
      }
      const label = payload.label || '';
      const confidence = typeof payload.confidence === 'number' ? payload.confidence : 0;
      const sentence = payload.sentence || '';

      const line = label ? `${label} · ${Math.round(confidence)}%` : '';
      setSignOverlay(line);
      setSignSentence(sentence);

      const smooth = label;
      if (!smooth || !socket.current) return;
      const now = Date.now();
      const last = lastEmitRef.current;
      if ((smooth !== last.label || now - last.t > 450) && socket.current) {
        lastEmitRef.current = { label: smooth, t: now };
        socket.current.emit('send-sign-gesture', {
          roomId,
          peerId,
          userName: userName || 'Guest',
          label: smooth,
          confidence,
          sentence, // Broadcast the sentence too
        });
      }
    };

    ws.onerror = () => {
      setSignOverlay((prev) => prev || 'Sign WS error — is python sign_ws_server.py running?');
    };

    ws.onclose = () => {};

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
      setSignOverlay('');
      setSignSentence('');
    };
  }, [enabled, isLocal, socket, roomId, peerId, userName, videoRef, stream]);

  useEffect(() => {
    if (isLocal || !enabled || !socket?.current) {
      return;
    }

    const handler = (data) => {
      if (data.peerId === peerId) {
        const line = data.label
          ? `${data.label} · ${Math.round(data.confidence || 0)}%`
          : '';
        setSignOverlay(line);
        setSignSentence(data.sentence || '');
      }
    };

    socket.current.on('sign_gesture_update', handler);
    return () => {
      socket.current?.off('sign_gesture_update', handler);
    };
  }, [isLocal, peerId, enabled, socket]);

  const clearSentence = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'clear' }));
    }
    setSignSentence('');
    setSignOverlay('');
  };

  return { signOverlay, signSentence, clearSentence };
}
