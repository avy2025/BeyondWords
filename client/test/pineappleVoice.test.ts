import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeTranscript,
  matchVoiceCommand,
  matchesWakeWord,
  parseSpokenRoomCode,
} from '../client/src/lib/voiceCommands.js';
import { joinRoom, startMeeting } from '../client/src/lib/meetingFlow.js';
import { VoiceCommandSession } from '../client/src/lib/voiceCommandSession.js';
import { WakeWordSession } from '../client/src/lib/wakeWordSession.js';
import {
  isHomePath,
  shouldAutoStartWakeWord,
} from '../client/src/lib/wakeWordEligibility.js';
import { PineappleController } from '../client/src/lib/pineappleController.js';
import {
  configureRecognitionForLocalSpeech,
  getLocalSpeechSetup,
  normalizeLocalSpeechAvailability,
} from '../client/src/lib/onDeviceSpeech.js';
import {
  registerAssistantStream,
  registerAssistantAudioContext,
  releaseAssistantAudioResources,
} from '../client/src/lib/assistantAudioResources.js';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

class FakeRecognition {
  static instances: FakeRecognition[] = [];

  onstart: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;

  continuous = false;
  interimResults = false;
  lang = '';
  maxAlternatives = 1;
  started = false;
  stopped = false;
  aborted = false;
  startCount = 0;
  endCount = 0;
  autoEndOnStart = false;
  autoEndOnStop = false;
  suppressStartEvent = false;

  constructor() {
    FakeRecognition.instances.push(this);
  }

  start() {
    this.started = true;
    this.startCount += 1;
    if (!this.suppressStartEvent) this.onstart?.();
    if (this.autoEndOnStart) setTimeout(() => this.end(), 0);
  }

  stop() {
    this.stopped = true;
    if (this.autoEndOnStop) setTimeout(() => this.end(), 0);
  }

  abort() {
    this.aborted = true;
  }

  emitInterim(text: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: false, 0: { transcript: text } }],
    });
  }

  emitFinal(text: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: text } }],
    });
  }

  error(code: string) {
    this.onerror?.({ error: code });
  }

  end() {
    this.endCount += 1;
    this.onend?.();
  }
}

function resetFakes() {
  FakeRecognition.instances.length = 0;
}

function makeSession(options: {
  timeoutMs?: number;
  stopTimeoutMs?: number;
  suppressStartEvent?: boolean;
} = {}) {
  const recognitions: FakeRecognition[] = [];
  const results: Array<{ transcript: string; errorCode?: string }> = [];
  const transcripts: string[] = [];
  const listeningStates: boolean[] = [];

  const session = new VoiceCommandSession({
    createRecognition: () => {
      const recognition = new FakeRecognition();
      recognition.suppressStartEvent = !!options.suppressStartEvent;
      recognitions.push(recognition);
      return recognition;
    },
    timeoutMs: options.timeoutMs ?? 300,
    stopTimeoutMs: options.stopTimeoutMs ?? 30,
    onResult: (transcript, errorCode) => results.push({ transcript, errorCode }),
    onTranscriptChange: (text) => transcripts.push(text),
    onListeningChange: (listening) => listeningStates.push(listening),
  });

  return { session, recognitions, results, transcripts, listeningStates };
}

interface WakeHarnessOptions {
  stopTimeoutMs?: number;
  restartDelayMs?: number;
  maxRestartDelayMs?: number;
  stableListeningMs?: number;
  autoEndOnStart?: boolean;
  suppressStartEvent?: boolean;
  onWake?: () => void | Promise<void>;
  createRecognition?: () => FakeRecognition;
}

function makeWakeSession(options: WakeHarnessOptions = {}) {
  const recognitions: FakeRecognition[] = [];
  const statuses: Array<{ status: string; detail?: any }> = [];
  const diagnostics: any[] = [];
  const transcripts: string[] = [];
  const listeningStates: boolean[] = [];
  let wakeCount = 0;

  const session = new WakeWordSession({
    createRecognition: () => {
      const recognition = options.createRecognition
        ? options.createRecognition()
        : new FakeRecognition();
      recognition.autoEndOnStart = !!options.autoEndOnStart;
      recognition.autoEndOnStop = true;
      recognition.suppressStartEvent = !!options.suppressStartEvent;
      recognitions.push(recognition);
      return recognition;
    },
    onWake: async () => {
      wakeCount += 1;
      await options.onWake?.();
    },
    onStatus: (status, detail) => statuses.push({ status, detail }),
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    onTranscript: (text) => transcripts.push(text),
    onListeningChange: (listening) => listeningStates.push(listening),
    stopTimeoutMs: options.stopTimeoutMs ?? 30,
    restartDelayMs: options.restartDelayMs ?? 10,
    maxRestartDelayMs: options.maxRestartDelayMs ?? 20,
    stableListeningMs: options.stableListeningMs ?? 1200,
  });

  return {
    session,
    recognitions,
    statuses,
    diagnostics,
    transcripts,
    listeningStates,
    get wakeCount() { return wakeCount; },
  };
}

interface HarnessOptions {
  startMeeting?: (name: string) => void;
  startFails?: Error;
  sessionStartResult?: boolean;
  releaseAudioResources?: () => void | Promise<void>;
  stopWakeWord?: () => Promise<void>;
}

function makeHarness(options: HarnessOptions = {}) {
  resetFakes();

  const calls = {
    wakeStops: 0,
    startMeeting: [] as string[],
    joinRoom: [] as string[],
    navigate: [] as string[],
    messages: [] as string[],
    parse: 0,
    releases: 0,
    speaks: [] as string[],
    feedback: [] as string[],
    states: [] as string[],
    events: [] as string[],
  };

  const recognitions: FakeRecognition[] = [];
  const session = new VoiceCommandSession({
    createRecognition: () => {
      const recognition = new FakeRecognition();
      recognitions.push(recognition);
      return recognition;
    },
    timeoutMs: 300,
    stopTimeoutMs: 30,
  });

  const speaking: string[] = [];
  const startMeeting =
    options.startMeeting ??
    ((name: string) => {
      calls.events.push('meeting:start');
      calls.startMeeting.push(name);
      if (options.startFails) throw options.startFails;
    });

  const controller = new PineappleController({
    commandSession: {
      start: (onResult) => {
        if (options.sessionStartResult === false) return false;
        calls.events.push('command:start');
        return session.start(onResult);
      },
      stop: () => {
        calls.events.push('command:stop');
        return session.stop();
      },
      cancel: () => session.cancel(),
      dispose: () => session.dispose(),
      get isListening() {
        return session.isListening;
      },
    },
    stopWakeWord: options.stopWakeWord ?? (async () => {
      calls.events.push('wake:stop-called');
      calls.wakeStops += 1;
    }),
    speak: async (text) => {
      speaking.push(text);
      calls.speaks.push(text);
      calls.events.push(`speak:${text}`);
    },
    parseIntent: async () => {
      calls.parse += 1;
      return { action: 'UNKNOWN', password: null, message: null };
    },
    startMeeting,
    joinRoom: (roomId) => calls.joinRoom.push(roomId),
    navigate: (path) => calls.navigate.push(path),
    sendMessage: (message) => calls.messages.push(message),
    releaseAudioResources: async () => {
      calls.releases += 1;
      if (options.releaseAudioResources) await options.releaseAudioResources();
    },
    getUser: () => ({ userName: 'Ranjan' }),
    getRoomId: () => null,
    onState: (state) => calls.states.push(state),
    onFeedback: (text) => calls.feedback.push(text),
  });

  return { controller, calls, recognitions, session, speaking };
}

test('normalizeTranscript handles case, punctuation and whitespace', () => {
  assert.equal(normalizeTranscript('  START   the Meeting!  '), 'start the meeting');
  assert.equal(normalizeTranscript("Let's start the meeting."), "let's start the meeting");
  assert.equal(normalizeTranscript('Lets   start\tthe meeting'), "let's start the meeting");
});

test('matchVoiceCommand recognizes all required start-meeting variations', () => {
  const phrases = [
    'Start the meeting.',
    'start meeting',
    'Create a meeting.',
    'create the meeting',
    "Let's start the meeting.",
    'Lets start the meeting',
    'Please start the meeting',
    'Can you start the meeting?',
    '  START   THE MEETING!  ',
  ];
  for (const phrase of phrases) {
    assert.deepEqual(matchVoiceCommand(phrase), {
      action: 'START_MEET',
      password: null,
      message: null,
    }, `failed to match: ${phrase}`);
  }
  assert.equal(matchVoiceCommand('send a message'), null);
  assert.equal(matchVoiceCommand(''), null);
});

test('matchVoiceCommand recognizes join-meeting variations', () => {
  for (const phrase of [
    'Join a meeting.',
    'join the meeting',
    'Please join a room',
    'Can you join the meeting?',
    "Let's join the meeting.",
  ]) {
    assert.deepEqual(matchVoiceCommand(phrase), {
      action: 'JOIN_MEET',
      password: null,
      message: null,
    }, `failed to match: ${phrase}`);
  }
});

test('parseSpokenRoomCode converts speech to a validated ten-character code', () => {
  assert.equal(
    parseSpokenRoomCode('room code a b c one two three four five six seven'),
    'abc1234567'
  );
  assert.equal(parseSpokenRoomCode('Room ID abc1234567'), 'abc1234567');
  assert.equal(parseSpokenRoomCode('double u 12345678 zed'), 'w12345678z');
  assert.equal(parseSpokenRoomCode('abc123'), null, 'short codes are rejected');
  assert.equal(parseSpokenRoomCode('confirm'), null, 'confirmation words are not codes');
});

test('startMeeting reuses the manual create-and-navigate flow', () => {
  const paths: string[] = [];
  const roomId = startMeeting((path) => paths.push(path), '  Ranjan  ');

  assert.equal(roomId.length, 10);
  assert.match(paths[0], new RegExp(`^/room/${roomId}\\?name=Ranjan$`));
  assert.throws(() => startMeeting(() => {}, '   '), /Please enter your name/);
});

test('joinRoom reuses the manual join navigation', () => {
  const paths: string[] = [];
  const code = joinRoom((path) => paths.push(path), '  abc1234567  ', '  Ranjan  ');

  assert.equal(code, 'abc1234567');
  assert.deepEqual(paths, ['/room/abc1234567?name=Ranjan']);
  assert.throws(() => joinRoom(() => {}, '', 'Ranjan'), /Room ID/);
});

test('command session starts listening and does not end immediately', async () => {
  const { session, recognitions, results, listeningStates } = makeSession({ timeoutMs: 200 });

  assert.equal(session.start(), true);
  assert.equal(session.isListening, true);
  assert.equal(recognitions.length, 1);
  assert.equal(recognitions[0].started, true);
  assert.deepEqual(listeningStates, [true]);

  await wait(40);
  assert.equal(session.isListening, true, 'listening ended before the user could speak');
  assert.equal(results.length, 0);
});

test('command recognition reports listening only after onstart', () => {
  const { session, recognitions, listeningStates } = makeSession({ suppressStartEvent: true });

  assert.equal(session.start(), true);
  assert.equal(session.isListening, false, 'start() alone must not claim command listening');
  assert.deepEqual(listeningStates, []);

  recognitions[0].onstart?.();
  assert.equal(session.isListening, true);
  assert.deepEqual(listeningStates, [true]);
});

test('interim results never execute a command; final results execute once', async () => {
  const { session, recognitions, results, transcripts } = makeSession();

  session.start();
  const recognition = recognitions[0];
  recognition.emitInterim('start the');
  recognition.emitInterim('start the meeting.');

  await wait(0);
  assert.equal(results.length, 0, 'interim speech must not produce a command');
  assert.equal(transcripts.at(-1), 'start the meeting.');

  recognition.emitFinal('start the meeting.');
  recognition.end();

  await wait(0);
  assert.equal(results.length, 1);
  assert.equal(results[0].transcript, 'start the meeting.');

  // Duplicate lifecycle events must not execute another command.
  recognition.emitFinal('start the meeting.');
  recognition.end();
  await wait(0);
  assert.equal(results.length, 1);
});

test('a final transcript is not discarded by a later service error', async () => {
  const { session, recognitions, results } = makeSession();

  session.start();
  const recognition = recognitions[0];
  recognition.emitFinal('Create a meeting.');
  recognition.error('network');
  await wait(0);

  assert.equal(results.length, 1);
  assert.equal(results[0].transcript, 'Create a meeting.');
  assert.equal(results[0].errorCode, undefined);
});

test('no-speech errors are reported only after recognition ends', async () => {
  const { session, recognitions, results, listeningStates } = makeSession();

  session.start();
  const recognition = recognitions[0];
  recognition.error('no-speech');
  await wait(0);
  assert.equal(results.length, 0);

  recognition.end();
  await wait(0);
  assert.equal(results.length, 1);
  assert.equal(results[0].transcript, '');
  assert.equal(results[0].errorCode, 'no-speech');
  assert.equal(listeningStates.at(-1), false);
});

test('stop() waits for onend, with a bounded fallback timeout', async () => {
  const bounded = makeSession({ stopTimeoutMs: 20 });
  bounded.session.start();
  await bounded.session.stop(); // resolves via fallback even without onend

  const { session, recognitions } = makeSession({ stopTimeoutMs: 500 });
  session.start();
  let resolved = false;
  const stopping = session.stop().then(() => { resolved = true; });

  await wait(10);
  assert.equal(resolved, false, 'stop() resolved before recognition ended');
  recognitions[0].end();
  await stopping;
  assert.equal(resolved, true);
});

test('cancel() and dispose() clean up without executing commands', async () => {
  const cancelled = makeSession();
  cancelled.session.start();
  await cancelled.session.cancel();
  cancelled.recognitions[0].end();
  await wait(0);
  assert.equal(cancelled.results.length, 0);
  assert.equal(cancelled.session.isListening, false);

  const disposed = makeSession();
  disposed.session.start();
  const recognition = disposed.recognitions[0];
  disposed.session.dispose();
  assert.equal(recognition.onresult, null);
  assert.equal(recognition.onerror, null);
  assert.equal(recognition.onend, null);
  assert.equal(disposed.session.isListening, false);
});

test('clicking Mr. Pineapple starts listening after the wake recognizer stops', async () => {
  const { controller, calls, recognitions, session } = makeHarness();

  const started = await controller.activate();

  assert.equal(started, true);
  assert.deepEqual(calls.states, ['activating', 'speaking', 'command-listening']);
  assert.equal(calls.wakeStops, 1);
  assert.equal(recognitions.length, 1);
  assert.equal(recognitions[0].started, true);
  assert.equal(session.isListening, true);
  assert.ok(calls.speaks.includes("I'm listening! What would you like me to do?"));
});

test('a final "Start the meeting" command starts the meeting exactly once and shuts down', async () => {
  const { controller, calls, recognitions, speaking, session } = makeHarness();

  await controller.activate();
  const recognition = recognitions[0];

  recognition.emitInterim('start the');
  await wait(0);
  assert.equal(calls.startMeeting.length, 0, 'interim speech started a meeting');

  recognition.emitFinal('Start the meeting.');
  recognition.end();
  await wait(15);

  assert.deepEqual(calls.startMeeting, ['Ranjan']);
  assert.equal(calls.parse, 0, 'local match should avoid an unavailable Ollama round trip');
  assert.equal(calls.navigate.length, 0);
  // A final result arrives with onend, so the browser session has already
  // ended; the important guarantee is that no session remains active.
  assert.equal(session.isListening, false);
  assert.ok(recognition.endCount >= 1);
  assert.equal(calls.wakeStops, 2, 'wake word must be stopped again during shutdown');
  assert.equal(calls.releases, 1);
  assert.equal(controller.getState(), 'off');
  assert.equal(calls.states.includes('off'), true);
  assert.equal(speaking.includes('Starting your meeting.'), true);

  // Repeated/duplicate recognition events cannot create a second meeting.
  recognition.emitFinal('Start the meeting.');
  recognition.end();
  await controller.handleRecognitionResult('Start the meeting.');
  await wait(0);
  assert.equal(calls.startMeeting.length, 1);
  assert.equal(controller.isActivationAllowed(), false);
});

test('guided join reads back a spoken room code and joins only after confirmation', async () => {
  const { controller, calls, recognitions, speaking } = makeHarness();

  await controller.activate();
  recognitions[0].emitFinal('Join a meeting.');
  recognitions[0].end();
  await wait(15);

  assert.equal(recognitions.length, 2, 'a fresh recognizer should capture the room code');
  assert.ok(calls.feedback.some((text) => text.includes("What's the room code")));
  assert.ok(speaking.some((text) => text.includes("What's the room code")));

  const codeRecognition = recognitions[1];
  codeRecognition.emitFinal('room code a b c one two three four five six seven');
  codeRecognition.end();
  await wait(15);

  assert.equal(recognitions.length, 3, 'a fresh recognizer should capture confirmation');
  assert.equal(calls.joinRoom.length, 0, 'joining before confirmation is not allowed');
  assert.ok(
    calls.feedback.some((text) => text.includes('A B C 1 2 3 4 5 6 7')),
    'the recognized code was not read back'
  );
  assert.ok(speaking.some((text) => text.includes('Say confirm')));

  const confirmationRecognition = recognitions[2];
  confirmationRecognition.emitFinal('Confirm.');
  confirmationRecognition.end();
  await wait(15);

  assert.deepEqual(calls.joinRoom, ['abc1234567']);
  assert.deepEqual(calls.navigate, []);
  assert.equal(calls.wakeStops, 2);
  assert.equal(calls.releases, 1);
  assert.equal(controller.getState(), 'off');
});

test('join confirmation can be corrected before navigating', async () => {
  const { controller, calls, recognitions } = makeHarness();

  await controller.activate();
  recognitions[0].emitFinal('Join a meeting.');
  recognitions[0].end();
  await wait(10);
  recognitions[1].emitFinal('room code abc1234567');
  recognitions[1].end();
  await wait(10);
  recognitions[2].emitFinal('Change.');
  recognitions[2].end();
  await wait(10);

  assert.equal(recognitions.length, 4, 'change should restart room-code capture');
  assert.equal(calls.joinRoom.length, 0);
  assert.ok(calls.feedback.some((text) => text.includes('say the room code again')));

  recognitions[3].emitFinal('room code z y x 9 8 7 6 5 4 3');
  recognitions[3].end();
  await wait(10);
  recognitions[4].emitFinal('Confirm.');
  recognitions[4].end();
  await wait(15);

  assert.deepEqual(calls.joinRoom, ['zyx9876543']);
});

test('an invalid spoken room code never navigates', async () => {
  const { controller, calls, recognitions } = makeHarness();

  await controller.activate();
  recognitions[0].emitFinal('Join a meeting.');
  recognitions[0].end();
  await wait(10);
  recognitions[1].emitFinal('room code abc123');
  recognitions[1].end();
  await wait(10);
  recognitions[2].emitFinal('abc123');
  recognitions[2].end();
  await wait(15);

  assert.deepEqual(calls.joinRoom, []);
  assert.deepEqual(calls.navigate, []);
  assert.equal(controller.getState(), 'standby');
  assert.ok(calls.feedback.some((text) => text.includes('valid ten character room code')));
});

test('all supported command variations trigger the meeting-start action', async () => {
  const phrases = ['Start the meeting.', 'start meeting', "Let's start the meeting."];

  for (const phrase of phrases) {
    const { controller, calls, recognitions } = makeHarness();
    await controller.activate();
    const recognition = recognitions[0];
    recognition.emitFinal(phrase);
    recognition.end();
    await wait(15);
    assert.equal(calls.startMeeting.length, 1, `failed for: ${phrase}`);
    assert.equal(calls.startMeeting[0], 'Ranjan');
  }
});

test('meeting creation failure is reported without claiming success', async () => {
  const failure = new Error('Room service unavailable');
  const { controller, calls, recognitions, speaking } = makeHarness({ startFails: failure });

  await controller.activate();
  recognitions[0].emitFinal('Start the meeting.');
  recognitions[0].end();
  await wait(15);

  assert.deepEqual(calls.startMeeting, ['Ranjan']);
  assert.equal(calls.navigate.length, 0);
  assert.ok(calls.feedback.some((text) => text.includes('Room service unavailable')));
  assert.equal(controller.getState(), 'standby');
  assert.equal(controller.isActivationAllowed(), true);
  assert.ok(speaking.some((text) => text.includes('couldn\'t start the meeting')));
});

test('repeated clicks cannot create multiple meetings', async () => {
  const { controller, calls, recognitions } = makeHarness();

  const results = await Promise.all([controller.activate(), controller.activate(), controller.activate()]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(recognitions.length, 1);

  recognitions[0].emitFinal('Start the meeting.');
  recognitions[0].end();
  await wait(15);
  assert.equal(calls.startMeeting.length, 1);

  await controller.activate();
  assert.equal(calls.startMeeting.length, 1);
});

test('no speech returns the assistant to standby instead of staying in Listening', async () => {
  const { controller, calls, recognitions } = makeHarness();

  await controller.activate();
  recognitions[0].emitFinal('   ');
  recognitions[0].end();
  await wait(10);

  assert.ok(calls.feedback.some((text) => text.includes("didn't hear a command")));
  assert.equal(controller.getState(), 'standby');
  assert.equal(calls.startMeeting.length, 0);
});

test('cancellation and unmount clean up recognition state', async () => {
  const cancelled = makeHarness();
  await cancelled.controller.activate();
  cancelled.controller.cancel();
  assert.equal(cancelled.session.isListening, false);
  assert.equal(cancelled.controller.getState(), 'standby');
  cancelled.recognitions[0].end();
  await wait(0);
  assert.equal(cancelled.calls.startMeeting.length, 0);

  const unmounted = makeHarness();
  await unmounted.controller.activate();
  unmounted.controller.dispose();
  assert.equal(unmounted.controller.getState(), 'off');
  assert.equal(unmounted.recognitions[0].onresult, null);
  assert.equal(unmounted.recognitions[0].onend, null);
});

test('shutdown releases assistant-owned audio only; meeting audio is untouched', async () => {
  await releaseAssistantAudioResources();

  const assistantTrack = { stopped: false, stop() { this.stopped = true; } };
  const meetingTrack = { stopped: false, stop() { this.stopped = true; } };
  const assistantStream = { getTracks: () => [assistantTrack] };
  const meetingStream = { getTracks: () => [meetingTrack] };
  let contextClosed = false;
  const assistantContext = {
    state: 'running',
    close() {
      contextClosed = true;
      return Promise.resolve();
    },
  };

  registerAssistantStream(assistantStream);
  registerAssistantAudioContext(assistantContext);
  // The meeting stream is deliberately NOT registered with the assistant.

  const { controller, calls, recognitions } = makeHarness({
    releaseAudioResources: () => releaseAssistantAudioResources(),
  });
  await controller.activate();
  recognitions[0].emitFinal('Start the meeting.');
  recognitions[0].end();
  await wait(15);

  assert.equal(calls.releases, 1, 'shutdown must release assistant-owned audio');
  assert.equal(assistantTrack.stopped, true);
  assert.equal(contextClosed, true);
  assert.equal(meetingTrack.stopped, false, 'meeting microphone must not be stopped');
  assert.equal(meetingStream.getTracks().length, 1);
});

test('unavailable speech recognition gives a clear error and returns to standby', async () => {
  const { controller, calls } = makeHarness({ sessionStartResult: false });

  const started = await controller.activate();

  assert.equal(started, false);
  assert.ok(calls.feedback.some((text) => text.includes('unavailable')));
  assert.equal(controller.getState(), 'standby');
});

test('matchesWakeWord accepts natural variations but rejects unrelated speech', () => {
  for (const phrase of [
    'Mr. Pineapple!',
    'MR   PINEAPPLE',
    'Hey Mr. Pineapple',
    'Hello Mr Pineapple',
    'hey mister pineapple',
    'Mr. Pine-Apple',
  ]) {
    assert.equal(matchesWakeWord(phrase), true, `failed to detect: ${phrase}`);
  }

  for (const phrase of [
    'I like pineapple',
    'pineapple',
    'hey pineapple',
    'start the meeting',
    '',
  ]) {
    assert.equal(matchesWakeWord(phrase), false, `false activation for: ${phrase}`);
  }
});

test('authenticated Home entry alone qualifies for automatic wake-word standby', () => {
  assert.equal(isHomePath('/dashboard'), true);
  assert.equal(isHomePath('/dashboard?from=email'), true);
  assert.equal(isHomePath('/lobby'), false);
  assert.equal(isHomePath('/room/abc'), false);

  const base = {
    isHome: true,
    isAuthenticated: true,
    isInMeeting: false,
    isTranslationActive: false,
    state: 'standby' as const,
  };

  assert.equal(shouldAutoStartWakeWord(base), true, 'no click should be required on Home');
  assert.equal(shouldAutoStartWakeWord({ ...base, isHome: false }), false);
  assert.equal(shouldAutoStartWakeWord({ ...base, isAuthenticated: false }), false);
  assert.equal(shouldAutoStartWakeWord({ ...base, isInMeeting: true }), false);
  assert.equal(shouldAutoStartWakeWord({ ...base, isTranslationActive: true }), false);
  assert.equal(shouldAutoStartWakeWord({ ...base, state: 'off' }), false);
  assert.equal(shouldAutoStartWakeWord({ ...base, state: 'activating' }), false);
});

test('wake session starts one recognizer and detects the wake phrase without a click', async () => {
  const wake = makeWakeSession();

  assert.equal(wake.session.start(), true);
  assert.equal(wake.session.start(), true, 'duplicate start created a second recognizer');
  assert.equal(wake.recognitions.length, 1);
  assert.equal(wake.statuses.at(-1)?.status, 'standby');

  wake.recognitions[0].emitInterim('Hey Mr. Pineapple!');
  await wait(10);

  assert.equal(wake.wakeCount, 1);
  assert.equal(wake.recognitions[0].stopped, true);
  assert.equal(wake.recognitions[0].onresult, null);
  assert.equal(wake.session.isListening, false);
});

test('wake handoff does not call onWake until the recognizer ends', async () => {
  const events: string[] = [];
  const wake = makeWakeSession({ onWake: () => { events.push('onWake'); } });
  wake.session.start();

  const recognition = wake.recognitions[0];
  recognition.autoEndOnStop = false;
  recognition.emitInterim('Mr. Pineapple');
  await wait(0);

  assert.equal(recognition.stopped, true, 'wake recognizer was not stopped');
  assert.deepEqual(events, [], 'onWake fired before the wake recognizer ended');

  recognition.end();
  await wait(0);
  assert.deepEqual(events, ['onWake']);
});

test('delayed events from an older wake recognizer cannot corrupt a newer session', async () => {
  const wake = makeWakeSession();
  wake.session.start();
  const first = wake.recognitions[0];
  first.autoEndOnStop = false;

  first.emitInterim('Mr. Pineapple');
  first.end();
  await wait(0);
  assert.equal(wake.wakeCount, 1);

  wake.session.start();
  assert.equal(wake.recognitions.length, 2);
  const second = wake.recognitions[1];

  first.emitInterim('Mr. Pineapple');
  first.error('not-allowed');
  first.end();
  second.emitInterim('unrelated speech');
  await wait(0);

  assert.equal(wake.wakeCount, 1, 'stale recognizer triggered a second wake');
  assert.ok(!wake.statuses.some((entry) => entry.status === 'permission-denied'));
  assert.equal(wake.session.isListening, true, 'stale event stopped the current session');
});

test('recoverable wake recognition endings restart standby automatically', async () => {
  const wake = makeWakeSession({
    restartDelayMs: 5,
    maxRestartDelayMs: 10,
    stableListeningMs: 5,
  });
  wake.session.start();
  await wait(10);
  wake.recognitions[0].end();

  await wait(30);

  assert.equal(wake.recognitions.length, 2);
  assert.equal(wake.statuses.at(-1)?.status, 'standby');
  assert.equal(wake.session.isListening, true);
  assert.ok(
    !wake.statuses.some((entry) => entry.status === 'reconnecting'),
    'a normal recognizer recycle must not be reported as a reconnect'
  );
});

test('immediate recognizer endings use growing backoff instead of a tight restart loop', async () => {
  const wake = makeWakeSession({
    restartDelayMs: 5,
    maxRestartDelayMs: 20,
    autoEndOnStart: true,
  });

  assert.equal(wake.session.start(), true);
  await wait(160);

  assert.ok(
    wake.recognitions.length <= 7,
    `restart loop created ${wake.recognitions.length} recognizers`
  );
  assert.equal(wake.statuses.at(-1)?.status, 'service-unavailable');
  assert.equal(wake.session.requiresUserSetup, true);
  assert.ok(
    wake.diagnostics.some((entry) => entry.event === 'restart-limit'),
    'restart limit was not diagnosed'
  );
  const delays = wake.diagnostics
    .filter((entry) => entry.event === 'restart-scheduled')
    .map((entry) => entry.retryDelayMs as number);
  assert.deepEqual(delays, [5, 10, 20, 20, 20, 20]);
});

test('silent starts that end before onstart require one setup gesture instead of looping', async () => {
  const wake = makeWakeSession({
    restartDelayMs: 5,
    maxRestartDelayMs: 20,
    autoEndOnStart: true,
    suppressStartEvent: true,
  });

  assert.equal(wake.session.start(), true);
  assert.equal(wake.session.isListening, false, 'start() alone must not claim listening');
  await wait(120);

  assert.equal(wake.statuses.at(-1)?.status, 'needs-setup');
  assert.equal(wake.session.requiresUserSetup, true);
  assert.ok(
    wake.recognitions.length <= 3,
    `silent-start loop created ${wake.recognitions.length} recognizers`
  );
  assert.ok(
    wake.diagnostics.some((entry) => entry.event === 'setup-required'),
    'silent start was not diagnosed'
  );

  assert.equal(wake.session.start({ userInitiated: true }), true);
  assert.equal(wake.statuses.at(-1)?.status, 'starting', 'gesture start is not listening yet');
  assert.equal(wake.session.requiresUserSetup, false);

  wake.recognitions.at(-1)?.onstart?.();
  assert.equal(wake.statuses.at(-1)?.status, 'standby');
  assert.equal(wake.session.isListening, true, 'onstart confirms real listening');
});

test('a start queued during an in-flight stop starts after onend', async () => {
  const wake = makeWakeSession();
  wake.session.start();
  const first = wake.recognitions[0];
  first.autoEndOnStop = false;

  const stopping = wake.session.stop();
  assert.equal(wake.session.start(), true, 'start during stop should be queued');
  assert.equal(wake.recognitions.length, 1);

  first.end();
  await stopping;
  await wait(0);

  assert.equal(wake.recognitions.length, 2, 'queued start never created a recognizer');
  assert.equal(wake.session.isListening, true);
  assert.notEqual(wake.statuses.at(-1)?.status, 'stopped');
});

test('service-not-allowed is treated as a permanent service error', async () => {
  const wake = makeWakeSession();
  wake.session.start();
  wake.recognitions[0].error('service-not-allowed');
  await wait(10);

  assert.equal(wake.session.isPermissionBlocked, true);
  assert.equal(wake.statuses.at(-1)?.status, 'permission-denied');
  assert.equal(wake.statuses.at(-1)?.detail?.error, 'service-not-allowed');
  assert.equal(wake.recognitions.length, 1);
});

test('gesture-gated auto start asks once and offers an explicit setup retry', async () => {
  let attempts = 0;
  const wake = makeWakeSession({
    createRecognition: () => {
      attempts += 1;
      const recognition = new FakeRecognition();
      if (attempts === 1) {
        recognition.start = () => { throw new Error('NotAllowedError: user gesture required'); };
      }
      return recognition;
    },
  });

  assert.equal(wake.session.start({ userInitiated: false }), false);
  assert.equal(wake.statuses.at(-1)?.status, 'needs-setup');
  assert.equal(wake.session.requiresUserSetup, true);

  assert.equal(wake.session.start({ userInitiated: false }), false);
  assert.equal(wake.recognitions.length, 1, 'permission failure retried in a loop');

  assert.equal(wake.session.start({ userInitiated: true }), true);
  assert.equal(wake.recognitions.length, 2);
  assert.equal(wake.statuses.at(-1)?.status, 'standby');
});

test('permission denial is visible and stops further restarts', async () => {
  const wake = makeWakeSession();
  wake.session.start();
  wake.recognitions[0].error('not-allowed');
  await wait(10);

  assert.equal(wake.session.isPermissionBlocked, true);
  assert.ok(wake.statuses.some((entry) => entry.status === 'permission-denied'));
  assert.equal(wake.recognitions[0].onresult, null);
  assert.equal(wake.session.start(), false);
  assert.equal(wake.recognitions.length, 1);
});

test('acknowledgement speech finishes before command recognition starts', async () => {
  const events: string[] = [];
  const harness = makeHarness({
    stopWakeWord: async () => {
      events.push('wake:stop-called');
      await wait(5);
      events.push('wake:end');
    },
  });
  harness.calls.events = events;
  const { controller, calls } = harness;

  await controller.activate();

  const wakeEnd = calls.events.indexOf('wake:end');
  const acknowledgement = calls.events.indexOf(
    "speak:I'm listening! What would you like me to do?"
  );
  const commandStart = calls.events.indexOf('command:start');

  assert.ok(wakeEnd >= 0 && acknowledgement >= 0 && commandStart >= 0);
  assert.ok(wakeEnd < acknowledgement, 'acknowledgement started before the wake session ended');
  assert.ok(acknowledgement < commandStart, 'command recognition started before speech finished');
  assert.deepEqual(calls.states, ['activating', 'speaking', 'command-listening']);
});

test('command timeout settles to an empty final result so the controller returns to standby', async () => {
  const { session, recognitions, results } = makeSession({ timeoutMs: 20 });
  session.start();
  await wait(35);

  assert.equal(recognitions[0].stopped, true, 'command recognition ignored its timeout');
  recognitions[0].end();
  await wait(0);

  assert.equal(results.length, 1);
  assert.equal(results[0].transcript, '');
  assert.equal(session.isListening, false);
});

test('a ready on-device pack configures local speech recognition', () => {
  const recognition: { processLocally?: boolean; lang?: string } = {
    lang: 'en-GB',
  };

  configureRecognitionForLocalSpeech(recognition, 'available', 'en-US');

  assert.equal(recognition.processLocally, true);
  assert.equal(recognition.lang, 'en-US');
});

test('a missing on-device pack leaves the recognizer on the default service', () => {
  for (const availability of ['downloadable', 'downloading', 'unavailable', 'unsupported', null] as const) {
    const recognition: { processLocally?: boolean } = {};
    configureRecognitionForLocalSpeech(recognition, availability);
    assert.equal(
      recognition.processLocally,
      undefined,
      `${availability} must not claim local processing`
    );
  }
});

test('on-device availability values are normalized', () => {
  assert.equal(normalizeLocalSpeechAvailability('available'), 'available');
  assert.equal(normalizeLocalSpeechAvailability('downloadable'), 'downloadable');
  assert.equal(normalizeLocalSpeechAvailability('downloading'), 'downloading');
  assert.equal(normalizeLocalSpeechAvailability('unavailable'), 'unavailable');
  assert.equal(normalizeLocalSpeechAvailability('unknown'), 'unsupported');
  assert.equal(normalizeLocalSpeechAvailability(undefined), 'unsupported');
});

test('Brave capability results map to honest setup states', () => {
  assert.equal(getLocalSpeechSetup(null), 'checking');
  assert.equal(getLocalSpeechSetup('available'), 'ready');
  assert.equal(getLocalSpeechSetup('downloadable'), 'install');
  assert.equal(getLocalSpeechSetup('downloading'), 'install');
  assert.equal(getLocalSpeechSetup('unsupported'), 'unsupported');

  const previousWindow = (globalThis as any).window;
  (globalThis as any).window = {
    SpeechRecognition: { install: async () => false },
  };
  try {
    assert.equal(getLocalSpeechSetup('unavailable'), 'feature-disabled');
  } finally {
    (globalThis as any).window = previousWindow;
  }
});
