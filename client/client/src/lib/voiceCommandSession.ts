/**
 * voiceCommandSession.ts — Lifecycle-safe wrapper around the browser's
 * SpeechRecognition session for a single Mr. Pineapple command.
 *
 * Key rules:
 *  - interim results are displayed but never executed;
 *  - onResult fires at most once, only after the recognition session ends (or
 *    a non-recoverable error), so repeated events cannot execute a command;
 *  - stop()/cancel() return promises that resolve when `onend` fires, with a
 *    bounded fallback timeout;
 *  - dispose() detaches all recognition listeners and clears every timer.
 *
 * If Brave's free local language pack is ready, recognition is configured with
 * processLocally = true so commands work without Google's cloud service.
 *
 * No getUserMedia call is made here. Browser-managed SpeechRecognition owns
 * its microphone internally; we only stop and wait for that session.
 */

import { configureLocalSpeech } from './onDeviceSpeech';

export interface SpeechResultAlternative {
  transcript?: string;
}

export interface SpeechResultLike {
  isFinal: boolean;
  length?: number;
  0?: SpeechResultAlternative;
  [index: number]: SpeechResultAlternative | undefined;
}

export interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<SpeechResultLike>;
}

export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  processLocally?: boolean;
  onstart?: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
}

export type RecognitionFactory = () => SpeechRecognitionLike | null;

export type CommandResultHandler = (transcript: string, errorCode?: string) => void;

export interface VoiceCommandSessionOptions {
  createRecognition: RecognitionFactory;
  /** How long to give the user to speak. Default: 10 seconds. */
  timeoutMs?: number;
  /** Maximum time to wait for the browser's onend callback. Default: 1500ms. */
  stopTimeoutMs?: number;
  onListeningChange?: (listening: boolean) => void;
  onTranscriptChange?: (transcript: string) => void;
  onResult?: CommandResultHandler;
}

interface EndWaiter {
  resolve: () => void;
  timer: ReturnType<typeof setTimeout>;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_STOP_TIMEOUT_MS = 1_500;

export class VoiceCommandSession {
  private readonly createRecognition: RecognitionFactory;
  private readonly timeoutMs: number;
  private readonly stopTimeoutMs: number;
  private readonly options: VoiceCommandSessionOptions;

  private recognition: SpeechRecognitionLike | null = null;
  private resultHandler: CommandResultHandler | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private endWaiters: EndWaiter[] = [];

  private active = false;
  private startConfirmed = false;
  private cancelled = false;
  private settled = false;
  private finalTranscript = '';
  private errorCode: string | undefined;

  constructor(options: VoiceCommandSessionOptions) {
    this.options = options;
    this.createRecognition = options.createRecognition;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.stopTimeoutMs = options.stopTimeoutMs ?? DEFAULT_STOP_TIMEOUT_MS;
    this.resultHandler = options.onResult ?? null;
  }

  get isListening(): boolean {
    // Only onstart proves the browser is actually listening.
    return this.active && this.startConfirmed;
  }

  /** Starts a fresh recognition session. Returns false if it could not start. */
  start(onResult?: CommandResultHandler): boolean {
    if (this.active) return false;

    this.cancelled = false;
    this.settled = false;
    this.startConfirmed = false;
    this.finalTranscript = '';
    this.errorCode = undefined;
    if (onResult) this.resultHandler = onResult;

    const recognition = this.createRecognition();
    if (!recognition) {
      this.emit('', 'unavailable');
      return false;
    }

    this.recognition = recognition;
    this.active = true;
    configureLocalSpeech(recognition);
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (!this.active || !this.recognition) return;
      this.startConfirmed = true;
      this.options.onListeningChange?.(true);
    };
    recognition.onresult = (event) => this.handleResultEvent(event);
    recognition.onerror = (event) => this.handleError(event);
    recognition.onend = () => this.handleEnd();

    try {
      recognition.start();
    } catch (error) {
      this.active = false;
      this.errorCode = 'start-failed';
      this.detach(recognition);
      this.recognition = null;
      this.options.onListeningChange?.(false);
      this.emit('', 'start-failed');
      return false;
    }

    // Listening is reported from recognition.onstart, not from start().

    this.timeoutTimer = setTimeout(() => {
      this.timeoutTimer = null;
      if (!this.active || !this.recognition) return;
      // Stopping lets the browser deliver any final result before `onend`.
      this.stop();
    }, this.timeoutMs);

    return true;
  }

  /**
   * Stops recognition and resolves when the browser reports `onend` (or after
   * a bounded fallback timeout, if the browser never reports it).
   */
  stop(): Promise<void> {
    const recognition = this.recognition;
    if (!recognition || !this.active) {
      this.active = false;
      this.options.onListeningChange?.(false);
      return Promise.resolve();
    }

    // The UI must stop showing "Listening" as soon as we ask the browser to
    // stop; the promise below still waits for onend before audio handoff.
    this.active = false;
    this.startConfirmed = false;
    this.clearTimeoutTimer();
    this.options.onListeningChange?.(false);

    const waiter = new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.endWaiters = this.endWaiters.filter((entry) => entry.resolve !== resolve);
        resolve();
      }, this.stopTimeoutMs);
      this.endWaiters.push({ resolve, timer });
    });

    try {
      recognition.stop();
    } catch (_) {
      this.handleEnd();
    }

    return waiter;
  }

  /** Cancels listening without invoking the command result callback. */
  cancel(): Promise<void> {
    this.cancelled = true;
    this.errorCode = 'aborted';
    return this.stop();
  }

  /** Full teardown, used on unmount / final shutdown. */
  dispose(): void {
    void this.cancel();
    this.resultHandler = null;
    this.clearTimeoutTimer();
    this.flushEndWaiters();
    if (this.recognition) this.detach(this.recognition);
    this.recognition = null;
    this.active = false;
    this.startConfirmed = false;
  }

  private handleResultEvent(event: SpeechResultEvent): void {
    let interim = '';
    const results = event.results || [];
    for (let i = event.resultIndex ?? 0; i < results.length; i++) {
      const result = results[i];
      const text = result?.[0]?.transcript ?? '';
      if (result?.isFinal) {
        this.finalTranscript += this.finalTranscript ? ` ${text}` : text;
      } else {
        interim += interim ? ` ${text}` : text;
      }
    }
    // Interim text is for the live transcript bubble only — never executed.
    this.options.onTranscriptChange?.(this.finalTranscript || interim);
  }

  private handleError(event: { error?: string }): void {
    const code = event?.error || 'recognition-error';

    // Expected transient states; `onend` still delivers the final result.
    if (code === 'no-speech' || code === 'aborted' || code === 'end') {
      if (!this.errorCode) this.errorCode = code;
      return;
    }

    // A final transcript already heard must win over a later service error.
    // Otherwise a network error on onend would discard the user's command.
    if (this.finalTranscript) {
      this.errorCode = undefined;
      this.settle();
      this.stop();
      return;
    }

    this.errorCode = code;
    if (!this.settled) {
      this.settle();
      this.stop();
    }
  }

  private handleEnd(): void {
    this.clearTimeoutTimer();
    this.active = false;
    this.startConfirmed = false;
    this.options.onListeningChange?.(false);

    if (!this.cancelled) this.settle();

    const recognition = this.recognition;
    if (recognition) {
      this.detach(recognition);
      this.recognition = null;
    }
    this.flushEndWaiters();
  }

  private settle(): void {
    if (this.settled) return;
    this.settled = true;
    this.emit(this.finalTranscript.trim(), this.errorCode);
  }

  private emit(transcript: string, errorCode?: string): void {
    const handler = this.resultHandler;
    if (!handler) return;
    // Defer so callers never re-enter recognition lifecycle synchronously.
    queueMicrotask(() => handler(transcript, errorCode));
  }

  private detach(recognition: SpeechRecognitionLike): void {
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
  }

  private clearTimeoutTimer(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  private flushEndWaiters(): void {
    const waiters = this.endWaiters;
    this.endWaiters = [];
    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      waiter.resolve();
    }
  }
}
