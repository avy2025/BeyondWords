/**
 * assistantAudioResources.ts — Ownership registry for any microphone/audio
 * resources Mr. Pineapple acquires.
 *
 * The current browser SpeechRecognition implementation is managed by the
 * browser and does not expose a MediaStream, so this registry is normally
 * empty. It exists so shutdown always releases assistant-owned resources if
 * an implementation registers one, while never touching streams owned by the
 * meeting (RoomPage) or the shared microphone frame bus. No getUserMedia call
 * is made here.
 */

interface StoppableTrack {
  stop(): void;
}

interface OwnedStream {
  getTracks(): StoppableTrack[];
}

interface OwnedAudioContext {
  state?: string;
  close(): Promise<void> | void;
}

const assistantStreams = new Set<OwnedStream>();
const assistantAudioContexts = new Set<OwnedAudioContext>();

export function registerAssistantStream(stream: OwnedStream | null | undefined): void {
  if (stream) assistantStreams.add(stream);
}

export function registerAssistantAudioContext(context: OwnedAudioContext | null | undefined): void {
  if (context) assistantAudioContexts.add(context);
}

export function unregisterAssistantStream(stream: OwnedStream): void {
  assistantStreams.delete(stream);
}

export function unregisterAssistantAudioContext(context: OwnedAudioContext): void {
  assistantAudioContexts.delete(context);
}

export interface ReleasedAudioResources {
  streams: number;
  audioContexts: number;
}

/** Stops/closes only resources explicitly registered as assistant-owned. */
export async function releaseAssistantAudioResources(): Promise<ReleasedAudioResources> {
  const streams = Array.from(assistantStreams);
  const contexts = Array.from(assistantAudioContexts);
  assistantStreams.clear();
  assistantAudioContexts.clear();

  for (const stream of streams) {
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch (_) {
        // Already stopped — nothing else to release.
      }
    }
  }

  await Promise.all(
    contexts.map(async (context) => {
      if (context.state === 'closed') return;
      try {
        await context.close();
      } catch (_) {
        // Closing twice is harmless; continue with the rest of the shutdown.
      }
    })
  );

  return { streams: streams.length, audioContexts: contexts.length };
}
