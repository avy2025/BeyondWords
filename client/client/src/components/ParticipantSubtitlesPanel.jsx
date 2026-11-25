import React, { useState } from 'react';
// @ts-ignore - shared dependency-free module
import { PARTICIPANT_SUBTITLE_LANGUAGE_LABELS } from '@shared/participantSubtitles.js';

const statusTone = (status, authorizationState) => {
  if (authorizationState === 'error' || status === 'error') return 'text-red-600';
  if (status === 'connected' || status === 'listening' || status === 'processing') return 'text-emerald-700';
  if (status === 'starting' || status === 'connecting') return 'text-amber-700';
  return 'text-[#102c26]/60';
};

const statusLabel = (authorizationState, status, shareEnabled) => {
  if (authorizationState === 'authorizing') return 'Authorizing…';
  if (authorizationState === 'error') return 'Authorization failed';
  if (!shareEnabled) return status === 'error' ? 'Publishing stopped after error' : 'Receiving subtitles';
  if (status === 'connected') return 'Transcription connected';
  if (status === 'listening') return 'Listening';
  if (status === 'processing') return 'Finalizing transcript…';
  if (status === 'starting' || status === 'connecting') return 'Connecting…';
  if (status === 'error') return 'Provider error';
  if (status === 'stopped') return 'Publishing stopped';
  return 'Ready to share';
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export default function ParticipantSubtitlesPanel({ translation, roomJoined }) {
  const [historyOpen, setHistoryOpen] = useState(true);
  const {
    speakingLanguage,
    setSpeakingLanguage,
    subtitleLanguage,
    setSubtitleLanguage,
    shareEnabled,
    toggleShare,
    authorizationState,
    providerStatus,
    audioStatus,
    error,
    live,
    history,
    clearHistory,
    starting,
  } = translation;

  if (!roomJoined) return null;

  const languages = Object.entries(PARTICIPANT_SUBTITLE_LANGUAGE_LABELS);

  return (
    <>
      <div className="mx-4 mt-3 rounded-xl border border-[#102c2614] bg-[#ffffffcc] px-3 py-2 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[#102c26]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={shareEnabled}
              disabled={starting || authorizationState !== 'authorized'}
              onClick={toggleShare}
              className={`h-7 px-3 rounded-full border font-bold tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                shareEnabled
                  ? 'bg-[#102c26] border-[#102c26] text-[#eddec5]'
                  : 'bg-white border-[#102c2626] text-[#102c26] hover:bg-[#f3eee6]'
              }`}
            >
              {shareEnabled ? 'Sharing Live Translation' : 'Share Live Translation'}
            </button>
            <span className={`font-semibold ${statusTone(providerStatus, authorizationState)}`}>
              {statusLabel(authorizationState, providerStatus, shareEnabled)}
            </span>
            {shareEnabled && (
              <span className="text-[#102c26]/50">mic: {audioStatus}</span>
            )}
          </div>

          <label className="flex items-center gap-1.5">
            <span className="font-semibold text-[#102c26]/60">I speak</span>
            <select
              value={speakingLanguage}
              disabled={shareEnabled || starting}
              onChange={(event) => setSpeakingLanguage(event.target.value)}
              className="rounded-full border border-[#102c2626] bg-white px-2 py-1 text-[11px] font-semibold disabled:opacity-50"
            >
              {languages.map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5">
            <span className="font-semibold text-[#102c26]/60">I read</span>
            <select
              value={subtitleLanguage}
              onChange={(event) => setSubtitleLanguage(event.target.value)}
              className="rounded-full border border-[#102c2626] bg-white px-2 py-1 text-[11px] font-semibold"
            >
              {languages.map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p className="mt-1 text-[10px] font-medium text-red-600" role="alert">{error}</p>
        )}
      </div>

      {/* Temporary live subtitles: one sentence at a time, fading after 6s. */}
      {live && (
        <div
          data-testid="live-subtitle"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`pointer-events-none absolute bottom-24 left-1/2 z-20 w-full max-w-3xl -translate-x-1/2 px-4 transition-opacity duration-300 ease-out ${
            live.fading ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="mx-auto w-fit max-w-full rounded-lg bg-[#102c26e8] px-4 py-2 text-center text-sm leading-snug text-white shadow-lg backdrop-blur-sm">
            <div className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-[#eddec5]/70">
              {live.speakerName}
              {live.kind === 'partial' ? ' · live' : live.translated ? ' · translated' : ' · original'}
            </div>
            <div className="whitespace-pre-wrap break-words">{live.text}</div>
            {live.translationError && (
              <div className="mt-1 text-[9px] text-amber-200">
                Translation unavailable — showing original.
              </div>
            )}
            {live.translatedText && live.translatedText !== live.originalText && (
              <div className="mt-1 text-[10px] text-white/55">{live.originalText}</div>
            )}
          </div>
        </div>
      )}

      {/* Persistent, in-memory history for the current meeting only. */}
      <section
        data-testid="subtitle-history"
        aria-label="Subtitle history"
        className="pointer-events-auto absolute bottom-24 left-4 z-20 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[#102c2633] bg-[#0f1e18ee] text-white shadow-xl backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
          <button
            type="button"
            aria-expanded={historyOpen}
            onClick={() => setHistoryOpen((open) => !open)}
            className="flex items-center gap-2 text-left text-[11px] font-bold uppercase tracking-widest text-[#eddec5] hover:text-white"
          >
            <span aria-hidden="true">{historyOpen ? '▾' : '▸'}</span>
            Subtitle History
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white/70">
              {history.length}
            </span>
          </button>
          {historyOpen && history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="rounded-full border border-white/20 px-2 py-0.5 text-[9px] font-semibold text-white/70 transition-colors hover:border-white/40 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
        {historyOpen && (
          <ol data-testid="subtitle-history-entries" className="max-h-56 space-y-2 overflow-y-auto px-3 py-2">
            {history.length === 0 ? (
              <li className="text-[10px] text-white/50">Completed subtitles will appear here.</li>
            ) : (
              history.map((entry) => {
                const date = new Date(entry.timestamp);
                return (
                  <li key={entry.id} data-testid="subtitle-history-entry" className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-[9px] font-bold uppercase tracking-widest text-white/50">
                      <span className="truncate text-[#eddec5]/80">{entry.speakerName}</span>
                      <time dateTime={Number.isNaN(date.getTime()) ? undefined : date.toISOString()}>
                        {formatTimestamp(entry.timestamp)}
                      </time>
                    </div>
                    <div className="whitespace-pre-wrap break-words text-[11px] leading-snug">{entry.text}</div>
                    {entry.translatedText && entry.translatedText !== entry.originalText && (
                      <div className="mt-1 text-[10px] leading-snug text-white/55">
                        Original: {entry.originalText}
                      </div>
                    )}
                    {entry.translationError && (
                      <div className="mt-1 text-[9px] text-amber-200">Original preserved — translation unavailable.</div>
                    )}
                  </li>
                );
              })
            )}
          </ol>
        )}
      </section>
    </>
  );
}
