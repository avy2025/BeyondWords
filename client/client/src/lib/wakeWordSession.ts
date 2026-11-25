/**
 * wakeWordSession.ts — Continuous, lifecycle-safe wake-phrase recognition.
 *
 * This owns Home's "Mr. Pineapple" listener. It is intentionally separate
 * from command recognition: a wake session may only detect activation, then it
 * must stop completely before the command session is started.
 *
 * Important guarantees:
 *  - at most one SpeechRecognition instance exists at a time;
 *  - each start gets a generation id, and stale callbacks are ignored;
 *  - stop()/wake handoff waits for onend (or a bounded fallback);
 *  - permission/gesture failures are surfaced once instead of looping;
 *  - recoverable service endings retry with visible, bounded backoff.
 */

import type { SpeechRecognitionLike, SpeechResultEvent } from './voiceCommandSession';
import { matchesWakeWord } from './voiceCommands';
import {
  configureLocalSpeech,
  getCachedLocalSpeechAvailability,
  getLocalSpeechSetup,
  isBraveBrowser,
  markLocalSpeechModelMissing,
} from './onDeviceSpeech';

export type WakeWordStatus =
  | 'starting'
  | 'standby'
  | 'reconnecting'
  | 'needs-setup'
  | 'permission-denied'
  | 'service-unavailable'
  | 'unsupported'
  | 'paused'
  | 'stopped';

export interface WakeWordStatusDetail {
  error?: string;
  retryCount?: number;
  retryDelayMs?: number;
}

export type WakeDiagnosticEvent =
  | 'start-request'
  | 'start-called'
  | 'start-confirmed'
  | 'start-failed'
  | 'wake-detected'
  | 'end'
  | 'error'
  | 'restart-scheduled'
  | 'restart-fire'
  | 'restart-limit'
  | 'setup-required'
  | 'restart-queued-during-stop'
  | 'stop-requested'
  | 'stopped'
  | 'dispose';

export interface WakeWordDiagnostic {
  event: WakeDiagnosticEvent;
  generation: number;
  recognizerState: 'none' | 'starting' | 'active' | 'stopping';
  status?: WakeWordStatus;
  error?: string;
  retryCount?: number;
  retryDelayMs?: number;
  durationMs?: number;
  transcript?: string;
  detail?: Record<string, unknown>;
}

export interface WakeWordSessionOptions {
  createRecognition: () => SpeechRecognitionLike | null;
  onWake: () => void | Promise<void>;
  onStatus?: (status: WakeWordStatus, detail?: WakeWordStatusDetail) => void;
  onTranscript?: (transcript: string) => void;
  onListeningChange?: (listening: boolean) => void;
  onDiagnostic?: (diagnostic: WakeWordDiagnostic) => void;
  stopTimeoutMs?: number;
  restartDelayMs?: number;
  maxRestartDelayMs?: number;
  /** An end after this long is a normal recognizer recycle, not a failure. */
  stableListeningMs?: number;
  /** Recognition language. Default: en-US. */
  lang?: string;
}

export interface WakeStartOptions {
  /** True when called from an explicit click, which may satisfy gesture rules. */
  userInitiated?: boolean;
}

interface EndWaiter {
  generation: number;
  resolve: () => void;
  timer: ReturnType<typeof setTimeout>;
}

const DEFAULT_STOP_TIMEOUT_MS = 1500;
const DEFAULT_RESTART_DELAY_MS = 300;
const DEFAULT_MAX_RESTART_DELAY_MS = 4000;
const DEFAULT_STABLE_LISTENING_MS = 1200;
const MAX_RESTART_ATTEMPTS = 6;
const MAX_QUICK_ENDS_WITHOUT_START = 2;

export class WakeWordSession {
  private readonly createRecognition: WakeWordSessionOptions['createRecognition'];
  private readonly onWake: WakeWordSessionOptions['onWake'];
  private readonly options: WakeWordSessionOptions;
  private readonly stopTimeoutMs: number;
  private readonly restartDelayMs: number;
  private readonly maxRestartDelayMs: number;
  private readonly stableListeningMs: number;

  private recognition: SpeechRecognitionLike | null = null;
  private generation = 0;
  private enabled = false;
  private stopping = false;
  private wakeHandled = false;
  private wakeFired = false;
  private needsSetup = false;
  private permissionBlocked = false;
  private restartFailures = 0;
  private quickEndsWithoutStart = 0;
  private startConfirmed = false;
  private lastError: string | undefined;
  private startCalledAt = 0;
  private pendingRestart: { userInitiated: boolean } | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private endWaiters: EndWaiter[] = [];

  constructor(options: WakeWordSessionOptions) {
    this.options = options;
    this.createRecognition = options.createRecognition;
    this.onWake = options.onWake;
    this.stopTimeoutMs = options.stopTimeoutMs ?? DEFAULT_STOP_TIMEOUT_MS;
    this.restartDelayMs = options.restartDelayMs ?? DEFAULT_RESTART_DELAY_MS;
    this.maxRestartDelayMs = options.maxRestartDelayMs ?? DEFAULT_MAX_RESTART_DELAY_MS;
    this.stableListeningMs = options.stableListeningMs ?? DEFAULT_STABLE_LISTENING_MS;
  }

  get isListening(): boolean {
    // `start()` succeeding is not proof that recognition is active. Only the
    // browser's onstart callback may make the UI say it is listening.
    return this.startConfirmed && !!this.recognition && !this.stopping;
  }

  get requiresUserSetup(): boolean {
    return this.needsSetup || this.permissionBlocked;
  }

  get isPermissionBlocked(): boolean {
    return this.permissionBlocked;
  }

  /** Called automatically on Home entry, or explicitly by the setup button. */
  start(options: WakeStartOptions = {}): boolean {
    const userInitiated = !!options.userInitiated;
    if (userInitiated) {
      this.needsSetup = false;
      this.permissionBlocked = false;
      this.restartFailures = 0;
      this.quickEndsWithoutStart = 0;
      this.lastError = undefined;
    }

    this.emitDiagnostic('start-request', {
      retryCount: this.restartFailures,
      detail: { userInitiated },
    });

    if (this.recognition) {
      if (this.stopping) {
        // A route change may disable and immediately re-enable wake word. The
        // queued start must run after the current recognizer really ends.
        this.enabled = true;
        this.pendingRestart = { userInitiated };
        this.emitDiagnostic('restart-queued-during-stop', {
          retryCount: this.restartFailures,
        });
      } else {
        this.enabled = true;
      }
      return true;
    }

    if (this.permissionBlocked) {
      this.emitStatus('permission-denied');
      return false;
    }

    if (this.needsSetup) {
      this.emitStatus('needs-setup');
      return false;
    }

    return this.startFresh(userInitiated);
  }

  /** Stops listening and resolves only after the browser confirms onend. */
  stop(): Promise<void> {
    this.enabled = false;
    this.clearRetryTimer();
    this.pendingRestart = null;
    this.wakeHandled = true;
    this.startConfirmed = false;
    this.options.onListeningChange?.(false);
    this.emitDiagnostic('stop-requested');

    const generation = this.generation;
    return this.terminateCurrent(generation).then(() => {
      if (!this.isCurrent(generation) || this.enabled || this.recognition) return;
      if (!this.wakeFired) this.wakeHandled = false;
      this.lastError = undefined;
      this.emitStatus('stopped');
      this.options.onListeningChange?.(false);
      this.emitDiagnostic('stopped');
    });
  }

  /** Final teardown. Does not call onWake. */
  dispose(): void {
    this.enabled = false;
    this.stopping = true;
    this.clearRetryTimer();
    this.pendingRestart = null;
    const recognition = this.recognition;
    if (recognition) this.detach(recognition);
    this.recognition = null;
    this.startCalledAt = 0;
    this.startConfirmed = false;
    this.flushEndWaiters();
    this.options.onListeningChange?.(false);
    this.emitDiagnostic('dispose');
  }

  /** Permission query result: microphone is available, so auto-start is safe. */
  markPermissionGranted(): void {
    this.needsSetup = false;
    this.permissionBlocked = false;
    this.restartFailures = 0;
    this.quickEndsWithoutStart = 0;
  }

  /** Permission query result: stop retrying until the user changes the setting. */
  markPermissionDenied(): void {
    this.permissionBlocked = true;
    this.clearRetryTimer();
    this.lastError = 'not-allowed';
    this.emitStatus('permission-denied', { error: 'not-allowed' });
  }

  private startFresh(userInitiated: boolean): boolean {
    this.clearRetryTimer();
    this.generation += 1;
    const generation = this.generation;
    this.enabled = true;
    this.stopping = false;
    this.wakeHandled = false;
    this.wakeFired = false;
    this.startCalledAt = Date.now();
    this.startConfirmed = false;
    this.lastError = undefined;

    const lang = this.options.lang ?? 'en-US';
    const localAvailability = getCachedLocalSpeechAvailability();

    // Brave cannot use the cloud recognizer at all. Never fall back to it;
    // surface the exact setup state the user can act on (or the honest
    // unsupported state when no web-page action can fix the browser).
    const setup = getLocalSpeechSetup(localAvailability);
    if (isBraveBrowser() && setup !== 'ready') {
      this.startCalledAt = 0;
      const error = setup === 'install' ? 'local-model' : `local-model-${setup}`;
      if (setup === 'unsupported') {
        this.needsSetup = false;
        this.emitStatus('service-unavailable', { error });
      } else {
        this.needsSetup = true;
        this.emitStatus('needs-setup', { error });
      }
      this.emitDiagnostic('setup-required', {
        error,
        retryCount: this.restartFailures,
      });
      return false;
    }

    const recognition = this.createRecognition();
    if (!recognition) {
      this.enabled = false;
      this.startCalledAt = 0;
      this.emitStatus('unsupported');
      return false;
    }

    this.recognition = recognition;
    configureLocalSpeech(recognition, lang);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      if (!this.isCurrent(generation) || !this.enabled || this.stopping) return;
      this.startConfirmed = true;
      this.quickEndsWithoutStart = 0;
      this.emitDiagnostic('start-confirmed', { retryCount: this.restartFailures });
      this.emitStatus('standby');
      this.options.onListeningChange?.(true);
    };
    recognition.onresult = (event) => this.handleResult(event, generation);
    recognition.onerror = (event) => this.handleError(event, generation);
    recognition.onend = () => this.handleEnd(generation);

    this.emitStatus('starting');
    this.emitDiagnostic('start-called', {
      retryCount: this.restartFailures,
      detail: { userInitiated, recognitionId: generation },
    });

    try {
      recognition.start();
    } catch (error) {
      this.handleStartFailure(error, generation, userInitiated);
      return false;
    }

    // Do not reset restartFailures here. An immediately-ending recognizer must
    // keep increasing its backoff; otherwise the UI blinks Reconnecting forever.
    // Stay in `starting` until onstart confirms real recognition.
    return true;
  }

  private handleStartFailure(error: unknown, generation: number, userInitiated: boolean): void {
    if (!this.isCurrent(generation)) return;

    const message = error instanceof Error ? error.message : String(error || '');
    const gestureOrPermission = /user gesture|user activation|not.?allowed|permission|denied|security/i.test(
      message
    );

    this.lastError = message;
    this.startCalledAt = 0;
    this.emitDiagnostic('start-failed', { error: message, retryCount: this.restartFailures });
    this.cleanupRecognition(generation);

    if (!userInitiated && gestureOrPermission) {
      // Browsers that require a gesture will keep rejecting automatic starts.
      // Ask once instead of prompting or retrying on every render.
      this.needsSetup = true;
      this.emitStatus('needs-setup', { error: message });
      return;
    }

    if (userInitiated && gestureOrPermission) {
      this.permissionBlocked = true;
      this.emitStatus('permission-denied', { error: message });
      return;
    }

    if (/unsupported|not supported/i.test(message)) {
      this.emitStatus('unsupported', { error: message });
      return;
    }

    this.scheduleRestart(generation, { error: message, unstable: true });
  }

  private handleResult(event: SpeechResultEvent, generation: number): void {
    if (!this.isCurrent(generation) || !this.enabled || this.stopping || this.wakeHandled) return;

    const results = event?.results || [];
    for (let i = event.resultIndex ?? 0; i < results.length; i += 1) {
      const result = results[i];
      const alternatives = result?.length ?? (result?.[0] ? 1 : 0);
      for (let j = 0; j < alternatives; j += 1) {
        const transcript = result?.[j]?.transcript;
        if (!transcript) continue;
        this.options.onTranscript?.(transcript);
        if (matchesWakeWord(transcript)) {
          this.emitDiagnostic('wake-detected', {
            retryCount: this.restartFailures,
            transcript,
          });
          void this.fireWake(generation);
          return;
        }
      }
    }
  }

  private handleError(event: { error?: string }, generation: number): void {
    if (!this.isCurrent(generation) || this.wakeHandled) return;

    const code = event?.error || 'recognition-error';
    this.lastError = code;
    this.emitDiagnostic('error', { error: code, retryCount: this.restartFailures });

    // These are transient for a continuous recognizer; onend performs the
    // restart, so there is no need to tear down the mic a second time.
    if (code === 'no-speech' || code === 'aborted' || code === 'end') return;

    if (
      code === 'not-allowed' ||
      code === 'service-not-allowed' ||
      code === 'audio-capture'
    ) {
      this.permissionBlocked = true;
      this.emitStatus('permission-denied', { error: code });
      void this.terminateCurrent(generation, { restart: false });
      return;
    }

    // A local recognizer can reject when its pack was removed. Surface the
    // one-time install action instead of looping into "Speech service
    // unavailable" for a problem the user can fix.
    if (code === 'language-not-supported' || code === 'service-not-allowed') {
      const localAvailability = getCachedLocalSpeechAvailability();
      if (
        localAvailability === 'available' ||
        localAvailability === 'downloadable' ||
        localAvailability === 'downloading'
      ) {
        markLocalSpeechModelMissing();
        this.needsSetup = true;
        this.emitStatus('needs-setup', { error: 'local-model' });
        this.emitDiagnostic('setup-required', { error: 'local-model' });
        void this.terminateCurrent(generation, { restart: false });
        return;
      }
    }

    // Brave's cloud path always fails with `network`. Surface setup instead of
    // spending retries on a recognizer that cannot work there.
    if (code === 'network' && isBraveBrowser()) {
      const setup = getLocalSpeechSetup(getCachedLocalSpeechAvailability());
      const error = setup === 'install' ? 'local-model' : `local-model-${setup}`;
      this.needsSetup = setup !== 'unsupported';
      if (setup === 'unsupported') {
        this.emitStatus('service-unavailable', { error });
      } else {
        this.emitStatus('needs-setup', { error });
      }
      this.emitDiagnostic('setup-required', { error });
      void this.terminateCurrent(generation, { restart: false });
      return;
    }

    // network/other service errors are recoverable, but count as unstable so
    // backoff actually grows instead of retrying on a fixed timer.
    this.emitStatus('reconnecting', {
      error: code,
      retryCount: this.restartFailures + 1,
    });
    void this.terminateCurrent(generation, { restart: true, error: code, unstable: true });
  }

  private handleEnd(generation: number): void {
    const durationMs = this.startCalledAt ? Date.now() - this.startCalledAt : 0;
    this.emitDiagnostic('end', {
      error: this.lastError,
      retryCount: this.restartFailures,
      durationMs,
    });
    this.startCalledAt = 0;

    this.flushEndWaiters(generation);
    if (!this.isCurrent(generation)) return;

    this.cleanupRecognition(generation);
    this.startConfirmed = false;
    this.options.onListeningChange?.(false);

    if (this.stopping || this.wakeHandled) return;

    if (!this.enabled) {
      this.emitStatus('stopped');
      return;
    }

    // A recognizer that listened for a while is being recycled by the browser.
    // That is normal; do not count it as a reconnect failure.
    const unstable = durationMs < this.stableListeningMs;
    if (!unstable) {
      this.lastError = undefined;
      this.quickEndsWithoutStart = 0;
      this.scheduleRestart(generation, { unstable: false });
      return;
    }

    // Chrome can accept start() but silently end before onstart when the page
    // has not had a user gesture. Retrying in that state is the reconnect loop;
    // surface the one-time setup action after a couple of silent endings.
    if (!this.startConfirmed) {
      this.quickEndsWithoutStart += 1;
      if (this.quickEndsWithoutStart >= MAX_QUICK_ENDS_WITHOUT_START) {
        this.needsSetup = true;
        this.emitStatus('needs-setup', {
          error: 'silent-start',
          retryCount: this.restartFailures,
        });
        this.emitDiagnostic('setup-required', {
          error: 'silent-start',
          retryCount: this.restartFailures,
          durationMs,
          detail: { quickEndsWithoutStart: this.quickEndsWithoutStart },
        });
        return;
      }
    } else {
      this.quickEndsWithoutStart = 0;
    }

    this.scheduleRestart(generation, { error: this.lastError, unstable: true });
  }

  private async fireWake(generation: number): Promise<void> {
    if (this.wakeFired || !this.isCurrent(generation)) return;
    this.wakeFired = true;
    this.wakeHandled = true;
    this.enabled = false;
    this.pendingRestart = null;
    this.clearRetryTimer();
    this.emitDiagnostic('wake-detected', {
      retryCount: this.restartFailures,
      detail: { phase: 'handoff' },
    });
    this.emitStatus('paused');

    // The caller must not start command recognition until this resolves.
    await this.terminateCurrent(generation, { restart: false });
    if (!this.isCurrent(generation)) return;

    try {
      await this.onWake();
    } finally {
      this.wakeHandled = false;
    }
  }

  private terminateCurrent(
    generation: number,
    {
      restart = false,
      error,
      unstable = true,
    }: { restart?: boolean; error?: string; unstable?: boolean } = {}
  ): Promise<void> {
    const recognition = this.recognition;
    if (!recognition || !this.isCurrent(generation)) {
      this.options.onListeningChange?.(false);
      return Promise.resolve();
    }

    this.stopping = true;
    this.clearRetryTimer();
    const waiter = this.waitForEnd(generation);

    try {
      recognition.stop();
    } catch (_) {
      this.cleanupRecognition(generation);
      this.flushEndWaiters(generation);
    }

    return waiter.then(() => {
      if (!this.isCurrent(generation)) return;
      this.cleanupRecognition(generation);
      this.stopping = false;
      this.startCalledAt = 0;
      this.startConfirmed = false;
      this.options.onListeningChange?.(false);

      const queued = this.pendingRestart;
      this.pendingRestart = null;
      const wakeHandoffActive = this.wakeHandled && this.wakeFired;
      if (queued && this.enabled && !wakeHandoffActive) {
        this.startFresh(queued.userInitiated);
        return;
      }

      if (restart && this.enabled && !wakeHandoffActive) {
        this.scheduleRestart(generation, { error, unstable });
      }
    });
  }

  private waitForEnd(generation: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.endWaiters = this.endWaiters.filter((entry) => entry.resolve !== resolve);
        resolve();
      }, this.stopTimeoutMs);
      this.endWaiters.push({ generation, resolve, timer });
    });
  }

  private flushEndWaiters(generation?: number): void {
    const waiters = generation === undefined
      ? this.endWaiters
      : this.endWaiters.filter((entry) => entry.generation === generation);
    this.endWaiters = this.endWaiters.filter((entry) => !waiters.includes(entry));

    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      waiter.resolve();
    }
  }

  private scheduleRestart(
    generation: number,
    { error, unstable = true }: { error?: string; unstable?: boolean } = {}
  ): void {
    this.clearRetryTimer();
    if (!this.enabled || !this.isCurrent(generation) || this.recognition) return;

    let delay = this.restartDelayMs;
    if (unstable) {
      if (this.restartFailures >= MAX_RESTART_ATTEMPTS) {
        this.needsSetup = true;
        this.emitStatus('service-unavailable', {
          error,
          retryCount: this.restartFailures,
        });
        this.emitDiagnostic('restart-limit', {
          error,
          retryCount: this.restartFailures,
        });
        return;
      }

      this.restartFailures += 1;
      delay = Math.min(
        this.restartDelayMs * 2 ** (this.restartFailures - 1),
        this.maxRestartDelayMs
      );
      this.emitStatus('reconnecting', {
        error,
        retryCount: this.restartFailures,
        retryDelayMs: delay,
      });
    } else {
      // Recycle after a healthy listening period: resume quietly so the pill
      // does not blink "Reconnecting" on every normal browser onend.
      this.restartFailures = 0;
      this.emitStatus('starting');
    }

    this.emitDiagnostic('restart-scheduled', {
      error,
      retryCount: this.restartFailures,
      retryDelayMs: delay,
      detail: { unstable },
    });

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!this.enabled || !this.isCurrent(generation) || this.recognition) return;
      this.emitDiagnostic('restart-fire', {
        error,
        retryCount: this.restartFailures,
        retryDelayMs: delay,
      });
      this.startFresh(false);
    }, delay);
  }

  private cleanupRecognition(generation: number): void {
    if (!this.isCurrent(generation) || !this.recognition) return;
    const recognition = this.recognition;
    this.recognition = null;
    this.detach(recognition);
  }

  private detach(recognition: SpeechRecognitionLike): void {
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private isCurrent(generation: number): boolean {
    return generation === this.generation;
  }

  private emitStatus(status: WakeWordStatus, detail?: WakeWordStatusDetail): void {
    this.options.onStatus?.(status, detail);
  }

  private emitDiagnostic(
    event: WakeDiagnosticEvent,
    extra: Omit<WakeWordDiagnostic, 'event' | 'generation' | 'recognizerState'> = {}
  ): void {
    this.options.onDiagnostic?.({
      event,
      generation: this.generation,
      recognizerState: !this.recognition
        ? 'none'
        : this.stopping
          ? 'stopping'
          : this.startConfirmed
            ? 'active'
            : 'starting',
      ...extra,
    });
  }
}
