import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useWakeWord } from '@/hooks/useWakeWord';
import { useCommandListener } from '@/hooks/useCommandListener';
import { parseIntent } from '@/lib/intentParser';
import './VoiceAgent.css';

// Helper for generating room ID
function generateRoomId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/**
 * VoiceAgent — "Mr. Pineapple" voice command assistant.
 *
 * State machine:
 *   idle → awake → listening → processing → (action) → idle
 *
 * Mounted globally in App.tsx so it persists across all pages.
 * NOTE: Socket.IO chat commands only work inside a room — the
 * RoomPage manages that socket. We navigate instead of sending directly.
 */

// ── TTS helper ─────────────────────────────────────────────────────────────
function speak(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve();
      return;
    }
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;
    utterance.onend = resolve;
    utterance.onerror = resolve;

    window.speechSynthesis.speak(utterance);
  });
}

export default function VoiceAgent() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // ── Early return if not authenticated ────────────────────────────────────
  // This is a double-check since App.tsx also conditionally renders VoiceAgent
  if (isLoading || !user?.userName) {
    return null;
  }

  const [state, setState] = useState('idle'); // idle | awake | listening | processing
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const feedbackTimeoutRef = useRef(null);
  const stateRef = useRef(state);
  const userRef = useRef(user);

  // Keep refs in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // ── Activity Dispatcher ────────────────────────────────────────────────
  useEffect(() => {
    // Dispatch state to help other listeners (like useTranslation)
    // they can pause their mic recognition when we are NOT idle.
    window.dispatchEvent(new CustomEvent('pineapple:activity', { 
      detail: { state, isActive: state !== 'idle' } 
    }));
  }, [state]);

  // ── Command Listener ───────────────────────────────────────────────────
  const { isListening: isCommandListening, transcript, startListening, stopListening, isSupported: cmdSupported } = useCommandListener();

  const [isTranslationActive, setIsTranslationActive] = useState(false);

  // ── Listen for translation activity ──────────────────────────────────
  useEffect(() => {
    const handleTranslationStatus = (e) => {
      setIsTranslationActive(!!e.detail.isActive);
    };
    window.addEventListener('translation:status', handleTranslationStatus);
    return () => window.removeEventListener('translation:status', handleTranslationStatus);
  }, []);

  // ── Extraction of roomId from URL ──────────────────────────────────────
  const [location] = useLocation();
  const roomMatch = location.match(/^\/room\/([^\/\?]+)/);
  const currentRoomId = roomMatch ? roomMatch[1] : null;

  // ── Clear feedback after delay ─────────────────────────────────────────
  const clearFeedbackLater = useCallback(() => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setShowFeedback(false);
      setFeedback('');
    }, 4000);
  }, []);

  // ── Handle parsed intent → execute action ──────────────────────────────
  const executeAction = useCallback(async (action, password, messageText) => {
    const currentUser = userRef.current;
    const displayName = currentUser?.userName || 'Guest';

    switch (action) {
      case 'START_MEET':
        const newRoomId = generateRoomId();
        setFeedback('Starting a meeting...');
        setShowFeedback(true);
        await speak('Starting a meeting for you.');
        navigate(`/room/${newRoomId}?name=${encodeURIComponent(displayName)}`);
        break;

      case 'JOIN_MEET':
        if (password) {
          setFeedback(`Joining room ${password}...`);
          setShowFeedback(true);
          await speak(`Joining room ${password}.`);
          navigate(`/room/${encodeURIComponent(password)}?name=${encodeURIComponent(displayName)}`);
        } else {
          setFeedback('What\'s the room code?');
          setShowFeedback(true);
          await speak('What\'s the room code?');
          setState('listening');
          startListening(async (roomTranscript) => {
            if (roomTranscript) {
              const roomCode = roomTranscript.replace(/\s+/g, '').toLowerCase();
              setFeedback(`Joining room ${roomCode}...`);
              await speak(`Joining room ${roomCode}.`);
              navigate(`/room/${encodeURIComponent(roomCode)}?name=${encodeURIComponent(displayName)}`);
            } else {
              setFeedback('I didn\'t catch that.');
              await speak('I didn\'t catch the room code.');
            }
            setState('idle');
            setShowFeedback(true);
            clearFeedbackLater();
          });
          return;
        }
        break;

      case 'END_MEET':
        setFeedback('Ending the meeting...');
        setShowFeedback(true);
        await speak('Ending the meeting.');
        navigate('/dashboard');
        break;
      
      case 'SEND_MESSAGE':
        if (currentRoomId && messageText) {
          setFeedback(`Sending: "${messageText}"`);
          setShowFeedback(true);
          // Dispatch a custom event so RoomPage (which owns the socket) can send it
          window.dispatchEvent(new CustomEvent('pineapple:send-message', {
            detail: { message: messageText, userName: currentUser?.userName || 'Guest' }
          }));
          await speak('Message sent.');
        } else if (!currentRoomId) {
          setFeedback('You are not in a meeting.');
          setShowFeedback(true);
          await speak('You must be in a meeting to send a message.');
        } else {
          setFeedback('I didn\'t catch the message.');
          setShowFeedback(true);
          await speak('I didn\'t catch the message you wanted to send.');
        }
        break;

      default:
        setFeedback('I didn\'t understand that command.');
        setShowFeedback(true);
        await speak('Sorry, I didn\'t understand that command.');
        break;
    }

    setState('idle');
    clearFeedbackLater();
  }, [navigate, startListening, clearFeedbackLater, currentRoomId]);

  // ── Handle command result from STT ─────────────────────────────────────
  const handleCommand = useCallback(async (commandText) => {
    if (!commandText) {
      setFeedback('I didn\'t hear anything.');
      setShowFeedback(true);
      await speak('I didn\'t hear a command.');
      setState('idle');
      clearFeedbackLater();
      return;
    }

    setState('processing');
    setFeedback(`"${commandText}"`);
    setShowFeedback(true);

    try {
      const { action, password, message } = await parseIntent(commandText);
      console.log('🍍 Intent:', action, 'Password:', password, 'Message:', message);
      await executeAction(action, password, message);
    } catch (err) {
      console.error('🍍 Intent parse error:', err);
      setFeedback('Something went wrong.');
      setShowFeedback(true);
      await speak('Sorry, something went wrong.');
      setState('idle');
      clearFeedbackLater();
    }
  }, [executeAction, clearFeedbackLater]);

  // ── Wake word detected → transition to awake → listen for command ──────
  const handleWake = useCallback(async () => {
    if (stateRef.current !== 'idle') return;

    console.log('🍍 Agent woken up!');
    setState('awake');
    setFeedback('');
    setShowFeedback(false);

    await speak("I'm listening.");

    setState('listening');
    startListening(handleCommand);
  }, [startListening, handleCommand]);

  // ── Wake Word Hook — only enabled when logged in AND idle ──────────────
  const { isListening: isWakeListening, isSupported: wakeSupported } = useWakeWord({
    onWake: handleWake,
    enabled: !!user && state === 'idle' && !isTranslationActive,
  });

  const isSupported = wakeSupported && cmdSupported;

  // ── If not logged in or still loading, render nothing (AFTER all hooks) ───
  // We check both the context user AND the localStorage token for maximum safety.
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');
  
  if (isLoading || !user?.userName || !hasToken) {
    return null;
  }

  console.log('🍍 VoiceAgent: Rendering for user:', user.userName);

  // ── Determine CSS classes ──────────────────────────────────────────────
  const pillClass = `voice-agent__pill voice-agent__pill--${isSupported ? state : 'unsupported'}`;
  const pulseClass = state !== 'idle' && isSupported
    ? `voice-agent__pulse-ring voice-agent__pulse-ring--${state}`
    : 'voice-agent__pulse-ring';

  // ── Label text ─────────────────────────────────────────────────────────
  const getLabel = () => {
    if (!isSupported) return 'Unsupported';
    switch (state) {
      case 'idle': return 'Mr. Pineapple';
      case 'awake': return 'Listening...';
      case 'listening': return 'Speak now...';
      case 'processing': return 'Thinking...';
      default: return 'Mr. Pineapple';
    }
  };

  return (
    <div className="voice-agent" id="voice-agent">
      {/* Transcript/Feedback bubble above the pill */}
      {state === 'listening' && (
        <div className="voice-agent__transcript">
          <div className="voice-agent__transcript-label">Hearing</div>
          <div className={`voice-agent__transcript-text ${!transcript ? 'voice-agent__transcript-text--empty' : ''}`}>
            {transcript || 'Waiting for your command...'}
          </div>
        </div>
      )}

      {showFeedback && feedback && state !== 'listening' && (
        <div className="voice-agent__feedback">
          <div className="voice-agent__feedback-text">{feedback}</div>
        </div>
      )}

      {/* Main pill */}
      <div 
        className={pillClass} 
        onClick={state === 'idle' ? handleWake : undefined}
        title={
          !isSupported ? 'Speech recognition not supported' :
          isTranslationActive ? 'Manual activation — Wake word paused during translation' :
          'Say "Mr. Pineapple" or click to activate'
        }
      >
        {/* Pulse ring */}
        <div className={pulseClass} />

        {/* Icon */}
        <span className="voice-agent__icon">🍍</span>

        {/* Sound wave bars when listening */}
        {state === 'listening' && (
          <div className="voice-agent__wave">
            <div className="voice-agent__wave-bar" />
            <div className="voice-agent__wave-bar" />
            <div className="voice-agent__wave-bar" />
            <div className="voice-agent__wave-bar" />
            <div className="voice-agent__wave-bar" />
          </div>
        )}

        {/* Spinner when processing */}
        {state === 'processing' && (
          <div className="voice-agent__spinner" />
        )}

        {/* Label */}
        <span className="voice-agent__label">{getLabel()}</span>
      </div>
    </div>
  );
}
