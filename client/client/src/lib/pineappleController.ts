/**
 * pineappleController.ts — UI-independent state machine for Mr. Pineapple.
 *
 * Lifecycle: standby → activating → speaking → command-listening → processing
 * → standby (recoverable outcomes) or off (meeting started / teardown).
 *
 * The React component only renders this state and forwards activation. Keeping
 * the lifecycle here makes the critical handoff and shutdown testable:
 *   wake recognizer onend → acknowledgement speech → command recognition →
 *   stop command recognition → stop wake recognition → release assistant audio
 *   → reuse the manual meeting-start / join flow.
 */

import {
  matchVoiceCommand,
  normalizeTranscript,
  parseSpokenRoomCode,
} from './voiceCommands.js';
import { parseIntent } from './intentParser.js';
import { speak, cancelSpeech } from './voiceSpeech.js';

export type PineappleState =
  | 'standby'
  | 'activating'
  | 'speaking'
  | 'command-listening'
  | 'processing'
  | 'off';

export interface ParsedIntent {
  action?: string;
  password?: string | null;
  message?: string | null;
}

export interface CommandSessionLike {
  start(onResult: (transcript: string, errorCode?: string) => void): boolean;
  stop(): Promise<void>;
  cancel(): Promise<void>;
  dispose?(): void;
  readonly isListening: boolean;
}

export interface PineappleControllerDeps {
  commandSession: CommandSessionLike;
  stopWakeWord: () => Promise<void>;
  speak?: (text: string) => Promise<void>;
  parseIntent?: (transcript: string) => Promise<ParsedIntent>;
  startMeeting: (displayName: string) => void;
  joinRoom: (roomId: string) => void;
  navigate: (path: string) => void;
  sendMessage: (message: string) => void;
  releaseAudioResources?: () => void | Promise<void>;
  getUser: () => { userName?: string } | null;
  getRoomId: () => string | null;
  onState: (state: PineappleState) => void;
  onFeedback: (text: string) => void;
}

const ACKNOWLEDGEMENT = "I'm listening! What would you like me to do?";
const MAX_CODE_ATTEMPTS = 2;

function errorMessageFor(code?: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission was denied. Allow access and try again.';
    case 'unavailable':
    case 'start-failed':
      return 'Speech recognition is unavailable in this browser.';
    case 'no-speech':
    case undefined:
    case '':
      return "I didn't hear a command. Try again.";
    case 'network':
      return 'The speech service had a network error. Try again.';
    case 'audio-capture':
      return 'No microphone was found. Try again.';
    case 'language-not-supported':
      return 'The on-device speech model is missing. Install it and try again.';
    case 'aborted':
      return 'Listening was canceled.';
    default:
      return 'I had trouble hearing you. Try again.';
  }
}

function messageFromError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error || 'Unknown error');
}

function spacedCode(code: string): string {
  return code.toUpperCase().split('').join(' ');
}

export class PineappleController {
  private readonly deps: PineappleControllerDeps;
  private state: PineappleState = 'standby';
  private activationAllowed = true;
  private activationPending = false;
  private commandPending = false;
  private navigationPending = false;
  private codeAttempts = 0;
  private confirmationAttempts = 0;

  constructor(deps: PineappleControllerDeps) {
    this.deps = deps;
  }

  getState(): PineappleState {
    return this.state;
  }

  isActivationAllowed(): boolean {
    return this.activationAllowed;
  }

  /** Called by automatic wake detection and by the optional pill click. */
  async activate(): Promise<boolean> {
    if (!this.activationAllowed || this.getState() !== 'standby' || this.activationPending) {
      return false;
    }

    this.activationPending = true;
    this.setState('activating');
    this.deps.onFeedback('');

    try {
      // The wake recognizer's onend is awaited inside stopWakeWord. No command
      // recognition starts until the microphone has actually been released.
      await this.deps.stopWakeWord();

      if (!this.activationAllowed || this.getState() !== 'activating') return false;

      this.setState('speaking');
      await this.say(ACKNOWLEDGEMENT);

      if (!this.activationAllowed || this.getState() !== 'speaking') return false;

      this.setState('command-listening');
      const started = this.deps.commandSession.start((transcript, errorCode) => {
        void this.handleRecognitionResult(transcript, errorCode);
      });

      if (!started) {
        this.setState('standby');
        this.reportError('unavailable');
        return false;
      }
      return true;
    } finally {
      this.activationPending = false;
    }
  }

  /** User-visible cancel path (unmount, explicit cancel, etc.). */
  cancel(): void {
    void this.deps.commandSession.cancel();
    this.clearJoinPrompt();
    if (this.getState() !== 'off') {
      this.setState('standby');
      this.deps.onFeedback('Listening canceled.');
    }
  }

  /** Permanently disables activation while a meeting is active. */
  disable(): void {
    this.activationAllowed = false;
    this.clearJoinPrompt();
    void this.deps.commandSession.cancel();
    cancelSpeech();
    this.setState('off');
  }

  /** Re-enables automatic standby after the user leaves the meeting. */
  enable(): void {
    this.clearJoinPrompt();
    if (this.getState() === 'off' && !this.deps.getRoomId()) {
      this.activationAllowed = true;
      this.setState('standby');
    }
  }

  /** Component unmount / final teardown. */
  dispose(): void {
    this.activationAllowed = false;
    this.clearJoinPrompt();
    void this.deps.commandSession.dispose?.();
    this.setState('off');
  }

  /** Handles a single final command result (or a recognition error). */
  async handleRecognitionResult(transcript: string, errorCode?: string): Promise<void> {
    if (this.getState() === 'off' || this.commandPending) return;

    if (errorCode) {
      this.reportError(errorCode);
      if (this.getState() !== 'off') this.setState('standby');
      return;
    }

    const command = (transcript || '').trim();
    if (!command) {
      this.reportError('no-speech');
      if (this.getState() !== 'off') this.setState('standby');
      return;
    }

    this.commandPending = true;
    this.deps.onFeedback(`"${command}"`);

    try {
      this.setState('processing');

      // Deterministic local match first; keep the existing Ollama intent API
      // for everything else (and as a fallback for other phrasings).
      const localIntent = matchVoiceCommand(command);
      const parse = this.deps.parseIntent ?? parseIntent;
      const intent: ParsedIntent = localIntent ?? (await parse(command));

      if (intent?.action === 'START_MEET') {
        await this.startMeetingByVoice();
      } else if (intent?.action === 'JOIN_MEET') {
        await this.beginJoinFlow(intent.password, command);
      } else {
        await this.executeOtherIntent(intent, command);
      }
    } catch (error) {
      const reason = messageFromError(error);
      this.deps.onFeedback(`Couldn't complete that command: ${reason}`);
      await this.say(`Sorry, I couldn't complete that command. ${reason}`);
      if (this.getState() !== 'off') this.setState('standby');
    } finally {
      this.commandPending = false;
    }
  }

  /**
   * Full microphone handoff before navigating into the meeting's own mic flow.
   */
  async startMeetingByVoice(): Promise<void> {
    if (this.navigationPending) return;
    this.navigationPending = true;

    this.deps.onFeedback('Starting your meeting.');

    try {
      await this.leaveForMeeting();

      // Confirmation is best-effort; meeting startup must continue.
      try {
        await this.say('Starting your meeting.');
      } catch (_) {
        // Ignore speech synthesis failures.
      }

      // Reuse the exact same meeting-start action as the manual UI.
      const displayName = this.displayName();
      this.deps.startMeeting(displayName);
    } catch (error) {
      this.recoverFromNavigationError('start the meeting', error);
    } finally {
      this.navigationPending = false;
    }
  }

  /**
   * Guided join: ask for the code, validate it, read it back, then require an
   * explicit confirmation before invoking the same join action as the lobby.
   */
  private async beginJoinFlow(intentCode: string | null | undefined, transcript: string): Promise<void> {
    const spoken = parseSpokenRoomCode(transcript);
    const candidate = parseSpokenRoomCode(intentCode) ?? spoken;
    this.codeAttempts = 0;
    this.confirmationAttempts = 0;

    if (candidate) {
      await this.confirmRoomCode(candidate);
      return;
    }

    await this.askForRoomCode();
  }

  private async askForRoomCode(prompt?: string): Promise<void> {
    const message = prompt ?? "What's the room code? Say the ten character code.";
    this.deps.onFeedback(message);
    await this.say(message);
    if (this.getState() === 'off') return;

    this.setState('command-listening');
    const started = this.deps.commandSession.start((transcript, errorCode) => {
      void this.handleRoomCodeResponse(transcript, errorCode);
    });

    if (!started) {
      this.reportError('unavailable');
      this.setState('standby');
    }
  }

  private async handleRoomCodeResponse(transcript: string, errorCode?: string): Promise<void> {
    if (this.getState() === 'off') return;

    const code = errorCode ? null : parseSpokenRoomCode(transcript);
    if (code) {
      this.codeAttempts = 0;
      await this.confirmRoomCode(code);
      return;
    }

    this.codeAttempts += 1;
    const message = errorCode
      ? errorMessageFor(errorCode)
      : "That wasn't a valid ten character room code. Please say it again.";
    this.deps.onFeedback(message);
    await this.say(message);
    if (this.getState() === 'off') return;

    if (this.codeAttempts >= MAX_CODE_ATTEMPTS) {
      this.clearJoinPrompt();
      this.setState('standby');
      return;
    }

    await this.askForRoomCode('Say the room code now.');
  }

  private async confirmRoomCode(code: string): Promise<void> {
    this.confirmationAttempts = 0;
    await this.promptForConfirmation(code);
  }

  private async promptForConfirmation(code: string): Promise<void> {
    const message = `I heard room code ${spacedCode(code)}. Say confirm to join, or change to try again.`;
    this.deps.onFeedback(message);
    await this.say(message);
    if (this.getState() === 'off') return;

    this.setState('command-listening');
    const started = this.deps.commandSession.start((transcript, errorCode) => {
      void this.handleRoomCodeConfirmation(transcript, errorCode, code);
    });

    if (!started) {
      this.reportError('unavailable');
      this.clearJoinPrompt();
      this.setState('standby');
    }
  }

  private async handleRoomCodeConfirmation(
    transcript: string,
    errorCode: string | undefined,
    code: string
  ): Promise<void> {
    if (this.getState() === 'off') return;

    const normalized = normalizeTranscript(transcript);
    const confirmed = !errorCode && (
      /^(?:yes|yeah|yep|confirm|confirmed|join(?:\s+(?:it|this|that|the\s+room|the\s+meeting))?|that(?:'s|\s+is)\s+(?:right|correct)|sure|ok|okay)$/.test(normalized)
    );
    const changed = !errorCode && (
      /^(?:no|nope|change|retry|try\s+again|start\s+over|different\s+code|new\s+code|correct\s+it)$/.test(normalized)
    );

    if (confirmed) {
      await this.joinMeetingByRoomCode(code);
      return;
    }

    if (changed) {
      this.clearJoinPrompt();
      this.codeAttempts = 0;
      await this.askForRoomCode('Okay, say the room code again.');
      return;
    }

    this.confirmationAttempts += 1;
    const message = errorCode
      ? errorMessageFor(errorCode)
      : "Please say confirm to join, or change to try again.";
    this.deps.onFeedback(message);
    await this.say(message);
    if (this.getState() === 'off') return;

    if (this.confirmationAttempts >= MAX_CODE_ATTEMPTS) {
      this.clearJoinPrompt();
      this.setState('standby');
      return;
    }

    await this.promptForConfirmation(code);
  }

  private async joinMeetingByRoomCode(code: string): Promise<void> {
    if (this.navigationPending) return;
    this.navigationPending = true;

    this.deps.onFeedback(`Joining room ${spacedCode(code)}.`);

    try {
      await this.leaveForMeeting();

      try {
        await this.say(`Joining room ${spacedCode(code)}.`);
      } catch (_) {
        // Ignore speech synthesis failures.
      }

      this.deps.joinRoom(code);
    } catch (error) {
      this.recoverFromNavigationError('join the meeting', error);
    } finally {
      this.navigationPending = false;
    }
  }

  /** Stops both recognizers and releases only assistant-owned audio. */
  private async leaveForMeeting(): Promise<void> {
    await Promise.all([
      this.deps.commandSession.stop(),
      this.deps.stopWakeWord(),
    ]);

    if (this.deps.releaseAudioResources) await this.deps.releaseAudioResources();
    cancelSpeech();

    // Go inactive before the room's microphone can start.
    this.activationAllowed = false;
    this.setState('off');
  }

  private recoverFromNavigationError(action: string, error: unknown): void {
    const reason = messageFromError(error);
    this.activationAllowed = !this.deps.getRoomId();
    this.setState('standby');
    this.deps.onFeedback(`Couldn't ${action}: ${reason}`);
    void this.say(`Sorry, I couldn't ${action}. ${reason}`);
  }

  private executeOtherIntent(intent: ParsedIntent, transcript: string): Promise<void> {
    switch (intent?.action) {
      case 'END_MEET': {
        this.deps.onFeedback('Ending the meeting...');
        void this.say('Ending the meeting.');
        this.deps.navigate('/dashboard');
        break;
      }

      case 'SEND_MESSAGE': {
        const message = intent.message?.trim();
        const roomId = this.deps.getRoomId();
        if (!roomId) {
          this.deps.onFeedback('You are not in a meeting.');
          void this.say('You must be in a meeting to send a message.');
        } else if (!message) {
          this.deps.onFeedback("I didn't catch the message.");
          void this.say("I didn't catch the message you wanted to send.");
        } else {
          this.deps.onFeedback(`Sending: "${message}"`);
          this.deps.sendMessage(message);
          void this.say('Message sent.');
        }
        break;
      }

      default:
        this.deps.onFeedback(`"${transcript}" — I didn't understand that command.`);
        void this.say("Sorry, I didn't understand that command.");
        break;
    }

    if (this.getState() !== 'off') this.setState('standby');
    return Promise.resolve();
  }

  private clearJoinPrompt(): void {
    this.codeAttempts = 0;
    this.confirmationAttempts = 0;
  }

  private displayName(): string {
    return this.deps.getUser()?.userName?.trim() || 'Guest';
  }

  private reportError(code?: string): void {
    const message = errorMessageFor(code);
    this.deps.onFeedback(message);
    void this.say(message);
  }

  private setState(next: PineappleState): void {
    this.state = next;
    this.deps.onState(next);
  }

  private say(text: string): Promise<void> {
    const sayFn = this.deps.speak || speak;
    return sayFn(text);
  }
}
