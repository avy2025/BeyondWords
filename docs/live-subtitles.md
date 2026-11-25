# Isolated Azure Speech F0 live subtitles

This feature is additive and opt-in. It does not replace the existing browser
`SpeechRecognition`/Ollama captions, PeerJS/WebRTC media, Socket.IO meeting
events, the Python sign-language service, or the academies.

## Configuration (server only)

Copy `server/.env.example` and set:

```env
AZURE_SPEECH_F0_KEY=...
AZURE_SPEECH_F0_REGION=eastus
# Optional, only for resources with a custom subdomain:
# AZURE_SPEECH_F0_SUBDOMAIN=my-speech-resource
```

The key is never sent to the browser. The backend exchanges it for a short-lived
Azure STS token at `https://<region>.api.cognitive.microsoft.com/sts/v1.0/issueToken`
(or the custom-subdomain equivalent). Azure tokens are valid for 10 minutes; the
client renews after 9 minutes by setting the recognizer's `authorizationToken`.

Use an F0 Speech resource in a region that supports real-time translation, such
as `eastus`, `westus`, `westus2`, `westeurope`, or `centralindia`.

## Request flow

1. The meeting client joins normally with JWT-based UI auth and existing
   `join-room` Socket.IO payload.
2. A separate authenticated socket event, `live-subtitles:authorize`, carries the
   user's JWT. The server verifies the JWT/account, checks that the account's
   `peerId`/`socketId` is present in the in-memory room, and stores a narrow
   membership binding. No existing event payload is changed.
3. On explicit opt-in, the client POSTs to `/api/live-subtitles/token` with
   `Authorization: Bearer <JWT>`, `roomId`, `peerId`, source language and target
   language. The route re-checks membership, acquires a single F0 lease, then
   requests the Azure token server-side.
4. The client creates one `TranslationRecognizer` from an existing local or
   remote `MediaStream` via `AudioConfig.fromStreamInput(stream)`. No second
   `getUserMedia()` call is made.
5. Audio-second metadata is reported to `/api/live-subtitles/usage`. No audio or
   transcript text is sent to the application server and nothing is persisted.
6. Disable, source/target change, participant change, leave, end, or unmount
   stops the recognizer, reports final usage, and releases the lease via
   `/api/live-subtitles/release`.

## Verified F0 behavior and limits

- F0 allows **1** concurrent real-time STT/speech-translation request. The server
  enforces a single lease and returns `F0_CONCURRENCY_LIMIT` otherwise.
- F0 includes **5 audio hours/month** for speech translation and real-time STT.
  Usage is counted in reported audio seconds, stored in MongoDB as metadata when
  the server is connected (in-memory fallback otherwise), and the server fails
  closed at the limit with `F0_QUOTA_EXHAUSTED`.
- Standard Speech translation supports **two target languages per request**.
  This integration uses exactly one target per session; each participant
  chooses their own target independently, but only one F0 session can run at a
  time. More than two targets in a single request requires multi-service setup
  and extra translation fees, so it is intentionally not offered.
- Language identification requires a candidate list. Automatic detection uses
  `AutoDetectSourceLanguageConfig` with four at-start candidates: `en-US`,
  `hi-IN`, `de-DE`, `es-ES`. The detected language is displayed. This is not
  unrestricted/open-range language detection.
- Continuous LID is not used: JavaScript continuous LID support is limited to
  speech-to-text, not speech translation.
- Real-time translation is unavailable via the short-audio REST API; the
  browser Speech SDK's streaming `TranslationRecognizer` is required.
- Voice output/speech-to-speech is not enabled; only original text, translated
  text, and detected language are displayed.

## Supported languages

- Source: `auto`, `en-US`, `hi-IN`, `de-DE`, `es-ES`, `fr-FR`.
- Auto-detect candidates: `en-US`, `hi-IN`, `de-DE`, `es-ES`.
- Targets: `en`, `hi`, `de`, `es`, `fr`.

English, Hindi, and German are covered in both directions through their verified
Azure locale/language codes. Other locales require a separate verified addition
to the shared language tables.

## Development diagnostics

In Vite dev mode the client logs phase-level events prefixed with
`[live-subtitles]` (session requested, authorization request/response, audio
track state, recognizer init/start, partial/final results, translation result,
cancellation/error, and stopped). Diagnostics contain only booleans, language
codes, lengths, and error reasons. They never log API keys, Azure tokens, room
identifiers, or transcript/translation text. The original caption is extracted
and updated independently from translation extraction, so a translation failure
cannot hide the original-language caption.

## Failure isolation

Azure configuration/token/concurrency/quota failures only affect the live AI
panel. They never block meeting join, A/V, sign recognition, chat, or academies.
Missing configuration causes an explicit server error and the recognizer is not
started. Invalid or expired application JWTs cannot obtain a Speech token.

Quota usage is durable in MongoDB when connected; the active-session lease is
per-process. A server restart clears the lease, and an already-running browser
recognizer stops at its next failed usage report (within roughly 15 seconds).

## Testing

Automated tests cover configuration tables, request validation, token URL
construction, F0 concurrency, quota exhaustion, token renewal lease reuse,
membership binding, and socket cleanup:

```bash
cd client && npm test
cd server && npm test
```

### Verified automatically

- F0 configuration constants, language tables, request validation, renewal
  session reuse, single-session concurrency, five-hour quota cutoff, membership
  binding, and socket cleanup.
- Existing client and server suites still pass.
- TypeScript check and production Vite build pass.

### Requires a real Azure/browser environment

- Actual en→hi, hi→en, de→en translation quality with genuine speech audio.
- Genuine automatic language detection with real multilingual speech.
- Local and remote WebRTC track selection in two or more browser participants.
- Independent per-participant target selection under real F0 concurrency.
- Azure disconnect/recovery and 10-minute token renewal against a live resource.
- Browser microphone permission, sign recognition, academy, and meeting A/V
  continuity during a live subtitle session.

Real verification requires a configured F0 resource, real audio, and at least
two browser participants. Until then, translation quality and live
multi-participant behavior are **not** claimed as verified.
