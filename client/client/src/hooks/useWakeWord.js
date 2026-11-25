import { useCallback, useEffect, useRef, useState } from 'react';
import { WakeWordSession } from '@/lib/wakeWordSession';
import {
  canInstallLocalSpeech,
  checkLocalSpeechAvailability,
  clearLocalSpeechAvailability,
  getLocalSpeechSetup,
  installLocalSpeechModel,
} from '@/lib/onDeviceSpeech';

const SETUP_COMPLETE_KEY = 'beyondwords:pineapple:wake-setup-complete';
const DEV_DIAGNOSTICS = Boolean(import.meta.env && import.meta.env.DEV);

function rememberSetupComplete() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SETUP_COMPLETE_KEY, 'true');
  } catch (_) {
    // Storage can be disabled; the in-memory session still works.
  }
}

function setupWasCompleted() {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(SETUP_COMPLETE_KEY) === 'true';
  } catch (_) {
    return false;
  }
}

/**
 * useWakeWord — Automatic Home standby listener for "Mr. Pineapple".
 *
 * The actual lifecycle lives in WakeWordSession so it can be tested without
 * React. This hook only wires browser SpeechRecognition and permission state
 * into the component.
 *
 * @param {Object} options
 * @param {Function} options.onWake — called after the wake recognizer has fully stopped
 * @param {boolean} options.enabled — true only on authenticated Home while idle
 * @returns {{
 *   isListening: boolean,
 *   status: string,
 *   detail: object | undefined,
 *   needsSetup: boolean,
 *   isSupported: boolean,
 *   start: Function,
 *   stop: Function,
 *   startWithUserGesture: Function
 * }}
 */
export function useWakeWord({ onWake, enabled = true } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('starting');
  const [detail, setDetail] = useState(undefined);
  const [localSpeechStatus, setLocalSpeechStatus] = useState(null);
  const [localSpeechSetup, setLocalSpeechSetup] = useState('checking');

  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;

  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;
  const isSupported = !!SpeechRecognition;

  const sessionRef = useRef(null);
  if (!sessionRef.current && SpeechRecognition) {
    sessionRef.current = new WakeWordSession({
      createRecognition: () => {
        const Recognition = typeof window !== 'undefined'
          ? window.SpeechRecognition || window.webkitSpeechRecognition
          : null;
        return Recognition ? new Recognition() : null;
      },
      onWake: () => onWakeRef.current?.(),
      onStatus: (nextStatus, statusDetail) => {
        setStatus(nextStatus);
        setDetail(statusDetail);
      },
      onDiagnostic: (diagnostic) => {
        if (DEV_DIAGNOSTICS) {
          console.info(
            '[MrPineapple:wake]',
            diagnostic.event,
            JSON.stringify(diagnostic)
          );
        }
      },
      onListeningChange: setIsListening,
    });
  }

  useEffect(() => {
    return () => sessionRef.current?.dispose();
  }, []);

  // A permission query is informational only: SpeechRecognition still performs
  // the real request. A previous successful setup lets later Home visits skip
  // the gesture step without asking again.
  useEffect(() => {
    const session = sessionRef.current;
    if (!enabled || !session) return undefined;

    let cancelled = false;

    const checkPermission = async () => {
      if (setupWasCompleted()) session.markPermissionGranted();

      if (!navigator.permissions?.query) return;
      try {
        const result = await navigator.permissions.query({ name: 'microphone' });
        if (cancelled) return;
        // The Permissions API is advisory: browsers can report "denied" while
        // SpeechRecognition still works (or vice versa). Actual start/error
        // callbacks are the source of truth for visible status.
        if (result.state === 'granted') {
          session.markPermissionGranted();
          rememberSetupComplete();
        }
      } catch (_) {
        // Some browsers reject the permission name; start() will classify it.
      }
    };

    void checkPermission();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Automatic standby: no click required. Gesture/permission failures stop in
  // WakeWordSession with a visible status instead of retrying in a loop.
  useEffect(() => {
    const session = sessionRef.current;
    if (!enabled || !session) {
      void session?.stop();
      return undefined;
    }

    let cancelled = false;

    // Resolve local-pack availability before starting. Brave needs this to
    // avoid its unavailable cloud path; Chrome can keep using local recognition
    // when the pack is already installed.
    const begin = async () => {
      try {
        const availability = await checkLocalSpeechAvailability();
        if (cancelled) return;
        setLocalSpeechStatus(availability);
        setLocalSpeechSetup(getLocalSpeechSetup(availability));
      } catch (_) {
        if (cancelled) return;
        setLocalSpeechStatus('unsupported');
        setLocalSpeechSetup('unsupported');
      }
      if (!cancelled) session.start({ userInitiated: false });
    };

    void begin();

    return () => {
      cancelled = true;
      void session.stop();
    };
  }, [enabled, isSupported]);

  const start = useCallback(() => {
    return !!sessionRef.current?.start({ userInitiated: false });
  }, []);

  const stop = useCallback(() => {
    return sessionRef.current?.stop() ?? Promise.resolve();
  }, []);

  // Used by the one-time setup button in browsers that require a gesture.
  const startWithUserGesture = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return false;

    const started = session.start({ userInitiated: true });
    if (started) {
      session.markPermissionGranted();
      rememberSetupComplete();
      // Status stays at `starting` until the recognizer's onstart fires.
    }
    return started;
  }, []);

  // Used by Brave's one-time on-device language-pack consent prompt.
  const installLocalModel = useCallback(async () => {
    const installed = await installLocalSpeechModel();
    const availability = await checkLocalSpeechAvailability();
    setLocalSpeechStatus(availability);
    setLocalSpeechSetup(getLocalSpeechSetup(availability));
    if (!installed) return false;
    rememberSetupComplete();
    return !!sessionRef.current?.start({ userInitiated: true });
  }, []);

  // Rechecks after the user enables the Brave flag/update in another tab.
  const retryLocalSpeechSetup = useCallback(async () => {
    clearLocalSpeechAvailability();
    const availability = await checkLocalSpeechAvailability();
    setLocalSpeechStatus(availability);
    setLocalSpeechSetup(getLocalSpeechSetup(availability));
    if (getLocalSpeechSetup(availability) !== 'ready') return false;
    return !!sessionRef.current?.start({ userInitiated: true });
  }, []);

  return {
    isListening,
    status: isSupported ? status : 'unsupported',
    detail,
    localSpeechStatus,
    localSpeechSetup,
    canInstallLocalSpeech: canInstallLocalSpeech(),
    needsSetup: status === 'needs-setup' || status === 'permission-denied',
    isSupported,
    start,
    stop,
    startWithUserGesture,
    installLocalModel,
    retryLocalSpeechSetup,
  };
}
