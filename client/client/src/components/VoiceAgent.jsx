import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useWakeWord } from '@/hooks/useWakeWord';
import { useCommandListener } from '@/hooks/useCommandListener';
import { PineappleController } from '@/lib/pineappleController';
import { joinRoom, startMeeting } from '@/lib/meetingFlow';
import { releaseAssistantAudioResources } from '@/lib/assistantAudioResources';
import { cancelSpeech } from '@/lib/voiceSpeech';
import { isHomePath, shouldAutoStartWakeWord } from '@/lib/wakeWordEligibility';
import { isBraveBrowser } from '@/lib/onDeviceSpeech';
import './VoiceAgent.css';

/**
 * VoiceAgent — "Mr. Pineapple" hands-free accessibility assistant.
 *
 * Mounted only on the authenticated Home/Dashboard route. Entering Home
 * automatically starts the wake listener; no meeting-form click is needed.
 * State machine:
 *   standby → activating → speaking → command-listening → processing → standby
 * A successful meeting start or join transitions to `off` and unmounts with the
 * Home route, so the meeting owns its own microphone.
 */

const VISUAL_STATE = {
  standby: 'idle',
  activating: 'awake',
  speaking: 'awake',
  'command-listening': 'listening',
  processing: 'processing',
  off: 'off',
};

const DEV_DIAGNOSTICS = Boolean(import.meta.env && import.meta.env.DEV);

function wakeStatusMessage(status, detail) {
  switch (status) {
    case 'starting':
      return 'Initializing';
    case 'reconnecting':
      return detail?.error
        ? `Speech service paused (${detail.error}). Reconnecting…`
        : 'Speech service paused. Reconnecting…';
    case 'needs-setup':
      if (detail?.error === 'local-model') {
        return 'Permission required. Install the on-device English speech model to enable wake word.';
      }
      if (detail?.error === 'local-model-feature-disabled') {
        return 'Brave on-device speech is off. Update Brave (1.100.58+) and enable brave://flags/#brave-on-device-speech-recognition, then check again.';
      }
      if (detail?.error === 'local-model-checking') {
        return 'Checking Brave speech support…';
      }
      return 'Permission required. Click once to enable wake-word listening.';
    case 'permission-denied':
      return detail?.error === 'service-not-allowed'
        ? 'Speech service blocked. Check browser site settings, then retry.'
        : 'Permission required. Allow microphone access, then retry.';
    case 'service-unavailable':
      if (detail?.error === 'local-model-unsupported') {
        return 'This Brave build cannot run speech recognition. Use Chrome or update Brave.';
      }
      return isBraveBrowser()
        ? 'Brave cannot use the cloud speech service. Update Brave (1.100.58+) and enable on-device speech recognition.'
        : 'Speech service unavailable. Check your connection, then retry.';
    case 'unsupported':
      return isBraveBrowser()
        ? 'Brave needs on-device speech recognition enabled for English.'
        : 'Speech recognition is not supported in this browser.';
    default:
      return '';
  }
}

export default function VoiceAgent() {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  const [state, setState] = useState('standby');
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isTranslationActive, setIsTranslationActive] = useState(false);
  const feedbackTimeoutRef = useRef(null);

  // Refs let the long-lived controller read current values without recreating it.
  const userRef = useRef(user);
  userRef.current = user;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const isHome = isHomePath(location);
  const roomMatch = location.match(/^\/room\/([^\/\?]+)/);
  const currentRoomId = roomMatch ? roomMatch[1] : null;
  const roomIdRef = useRef(currentRoomId);
  roomIdRef.current = currentRoomId;

  const wakeStopRef = useRef(async () => {});

  const {
    transcript,
    session: commandSession,
    isListening: isCommandListening,
  } = useCommandListener();

  // Stable adapter around the hook's session (null in unsupported browsers).
  const commandSessionRef = useRef(commandSession);
  commandSessionRef.current = commandSession;
  const controllerSessionRef = useRef(null);
  if (!controllerSessionRef.current) {
    controllerSessionRef.current = {
      start: (onResult) => commandSessionRef.current?.start(onResult) ?? false,
      stop: () => commandSessionRef.current?.stop() ?? Promise.resolve(),
      cancel: () => commandSessionRef.current?.cancel() ?? Promise.resolve(),
      dispose: () => commandSessionRef.current?.dispose(),
      get isListening() {
        return !!commandSessionRef.current?.isListening;
      },
    };
  }

  const showFeedbackMessage = useCallback((text) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    if (!text) {
      setFeedback('');
      setShowFeedback(false);
      return;
    }
    setFeedback(text);
    setShowFeedback(true);
    feedbackTimeoutRef.current = setTimeout(() => {
      setShowFeedback(false);
      setFeedback('');
    }, 4000);
  }, []);

  // The controller owns the lifecycle; the component only renders its state.
  const controllerRef = useRef(null);
  if (!controllerRef.current) {
    controllerRef.current = new PineappleController({
      commandSession: controllerSessionRef.current,
      stopWakeWord: () => wakeStopRef.current(),
      startMeeting: (displayName) =>
        startMeeting((path) => navigateRef.current(path), displayName),
      joinRoom: (roomId) =>
        joinRoom((path) => navigateRef.current(path), roomId, userRef.current?.userName || 'Guest'),
      navigate: (path) => navigateRef.current(path),
      sendMessage: (message) => {
        window.dispatchEvent(new CustomEvent('pineapple:send-message', {
          detail: { message, userName: userRef.current?.userName || 'Guest' },
        }));
      },
      releaseAudioResources: releaseAssistantAudioResources,
      getUser: () => userRef.current,
      getRoomId: () => roomIdRef.current,
      onState: setState,
      onFeedback: showFeedbackMessage,
    });
  }

  const handleWake = useCallback(() => {
    void controllerRef.current?.activate();
  }, []);

  // Automatic standby is decided purely by route/auth/state. Permission and
  // gesture failures are handled inside the session so they never create a
  // start/stop loop here.
  const autoWakeEnabled = shouldAutoStartWakeWord({
    isHome,
    isAuthenticated: !!user && !isLoading,
    isInMeeting: !!currentRoomId,
    isTranslationActive,
    state,
  });

  const eligibilityRef = useRef(null);
  useEffect(() => {
    const next = {
      isHome,
      isAuthenticated: !!user && !isLoading,
      isInMeeting: !!currentRoomId,
      isTranslationActive,
      state,
      autoWakeEnabled,
    };
    const previous = eligibilityRef.current;
    const changed = !previous || Object.keys(next).some((key) => previous[key] !== next[key]);
    if (!changed) return;
    eligibilityRef.current = next;
    if (DEV_DIAGNOSTICS) {
      console.info('[MrPineapple:eligibility]', JSON.stringify(next));
    }
  }, [autoWakeEnabled, currentRoomId, isHome, isLoading, isTranslationActive, state, user]);

  const {
    isListening: isWakeListening,
    status: wakeStatus,
    detail: wakeDetail,
    needsSetup: wakeNeedsSetup,
    startWithUserGesture,
    installLocalModel,
    retryLocalSpeechSetup,
    stop: stopWakeWord,
    isSupported: wakeSupported,
  } = useWakeWord({ onWake: handleWake, enabled: autoWakeEnabled });
  wakeStopRef.current = stopWakeWord;

  const needsLocalModel = wakeDetail?.error === 'local-model';
  const braveFeatureDisabled = wakeDetail?.error === 'local-model-feature-disabled';
  const braveSpeechUnsupported = wakeDetail?.error === 'local-model-unsupported';

  const handleWakeSetup = useCallback(async () => {
    if (needsLocalModel) {
      showFeedbackMessage('Installing the on-device English speech model…');
      const installed = await installLocalModel();
      showFeedbackMessage(
        installed
          ? 'Wake word enabled. Say "Mr. Pineapple" to activate me.'
          : 'Brave blocked the speech model download. Enable on-device speech recognition, then check again.'
      );
      return;
    }

    if (braveFeatureDisabled) {
      const ready = await retryLocalSpeechSetup();
      showFeedbackMessage(
        ready
          ? 'Wake word enabled. Say "Mr. Pineapple" to activate me.'
          : 'On-device speech is still off. Enable it in Brave, then check again.'
      );
      return;
    }

    if (braveSpeechUnsupported) {
      showFeedbackMessage(
        'This Brave build cannot run speech recognition. Use Chrome or update Brave.'
      );
      return;
    }

    if (startWithUserGesture()) {
      showFeedbackMessage('Wake word enabled. Say "Mr. Pineapple" to activate me.');
    }
  }, [
    braveFeatureDisabled,
    braveSpeechUnsupported,
    installLocalModel,
    needsLocalModel,
    retryLocalSpeechSetup,
    showFeedbackMessage,
    startWithUserGesture,
  ]);

  const isSupported = wakeSupported && !!commandSession;

  // ── Translation activity: pause wake word while participant STT is on ────
  useEffect(() => {
    const handleTranslationStatus = (e) => {
      setIsTranslationActive(!!e.detail.isActive);
    };
    window.addEventListener('translation:status', handleTranslationStatus);
    return () => window.removeEventListener('translation:status', handleTranslationStatus);
  }, []);

  // ── Activity dispatcher ──────────────────────────────────────────────────
  // "standby" and "off" are both inactive so Live Translation is never left
  // paused after a voice-started meeting.
  useEffect(() => {
    const isActive = state === 'activating' || state === 'speaking' ||
      state === 'command-listening' || state === 'processing';
    window.dispatchEvent(new CustomEvent('pineapple:activity', {
      detail: { state, isActive },
    }));
  }, [state]);

  // ── Meeting route guard: never restart wake word inside a meeting ────────
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller) return;
    if (currentRoomId) controller.disable();
    else controller.enable();
  }, [currentRoomId]);

  // ── Unmount cleanup ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      controllerRef.current?.dispose();
      cancelSpeech();
      void releaseAssistantAudioResources();
    };
  }, []);

  // Safety net for unauthenticated renders (App.tsx also guards this).
  const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');
  if (isLoading || !user?.userName || !hasToken) {
    return null;
  }

  // Never show "Listening" from start() alone. Both recognizers report a real
  // onstart before these flags become true.
  const wakeListeningNow =
    isHome && !currentRoomId && state === 'standby' &&
    isWakeListening && wakeStatus === 'standby';
  const commandListeningNow =
    state === 'command-listening' && isCommandListening;
  const anyListeningNow = wakeListeningNow || commandListeningNow;

  let visualState = VISUAL_STATE[state] || 'idle';
  if (!isHome || currentRoomId || state === 'off') visualState = 'off';
  else if (anyListeningNow) visualState = 'listening';
  else if (state === 'processing') visualState = 'processing';
  else visualState = 'idle';

  const pillClass = `voice-agent__pill voice-agent__pill--${isSupported ? visualState : 'unsupported'}`;
  const pulseState = anyListeningNow
    ? 'listening'
    : state === 'processing'
      ? 'processing'
      : null;
  const pulseClass = pulseState && isSupported
    ? `voice-agent__pulse-ring voice-agent__pulse-ring--${pulseState}`
    : 'voice-agent__pulse-ring';

  const getLabel = () => {
    if (!isHome || currentRoomId || state === 'off') return 'Off';
    if (!isSupported) return 'Speech service unavailable';
    if (state === 'processing') return 'Processing';
    if (state === 'command-listening') {
      return commandListeningNow ? 'Listening for command' : 'Initializing';
    }
    if (state === 'activating' || state === 'speaking') return 'Initializing';

    if (wakeStatus === 'service-unavailable' || wakeStatus === 'unsupported') {
      return 'Speech service unavailable';
    }
    if (wakeStatus === 'permission-denied' || wakeStatus === 'needs-setup') {
      return 'Permission required';
    }
    return wakeListeningNow ? 'Listening for wake word' : 'Initializing';
  };

  const canActivate = isHome && state === 'standby' && !currentRoomId;
  const showSetupAction = isHome && state === 'standby' && wakeNeedsSetup;
  const statusMessage = isHome && state === 'standby'
    ? wakeStatusMessage(wakeStatus, wakeDetail)
    : '';
  const commandStartingMessage =
    isHome && state === 'command-listening' && !commandListeningNow
      ? 'Initializing'
      : '';
  const bubbleText = showFeedback && feedback
    ? feedback
    : statusMessage || commandStartingMessage;

  const onPillActivate = () => {
    if (!canActivate) return;
    if (showSetupAction) handleWakeSetup();
    else handleWake();
  };

  return (
    <div className="voice-agent" id="voice-agent">
      {/* Live command transcript is only shown after onstart confirms listening. */}
      {commandListeningNow && (
        <div className="voice-agent__transcript">
          <div className="voice-agent__transcript-label">Listening for command</div>
          <div className={`voice-agent__transcript-text ${!transcript ? 'voice-agent__transcript-text--empty' : ''}`}>
            {transcript || 'Waiting for your command...'}
          </div>
        </div>
      )}

      {!commandListeningNow && bubbleText && (
        <div className="voice-agent__feedback">
          <div className="voice-agent__feedback-text">{bubbleText}</div>
        </div>
      )}

      {/* Main pill */}
      <div
        className={pillClass}
        role="button"
        tabIndex={canActivate ? 0 : -1}
        aria-label={`Mr. Pineapple: ${getLabel()}`}
        onClick={canActivate ? onPillActivate : undefined}
        onKeyDown={(event) => {
          if (canActivate && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            onPillActivate();
          }
        }}
        title={
          !isSupported ? 'Speech recognition is unavailable' :
          currentRoomId ? 'Mr. Pineapple is off during your meeting' :
          showSetupAction ? 'Permission required to enable wake word' :
          wakeListeningNow ? 'Listening for wake word' :
          'Say "Mr. Pineapple" or click to activate'
        }
      >
        {/* Pulse ring */}
        <div className={pulseClass} />

        {/* Icon */}
        <span className="voice-agent__icon">🍍</span>

        {/* Sound wave bars only while the command recognizer is really active. */}
        {commandListeningNow && (
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

      {/* One-time gesture/permission recovery for browsers that require it. */}
      {showSetupAction && (
        <button type="button" className="voice-agent__setup" onClick={handleWakeSetup}>
          {needsLocalModel
            ? 'Install speech model'
            : braveFeatureDisabled
              ? 'Check again'
              : 'Enable wake word'}
        </button>
      )}
    </div>
  );
}
