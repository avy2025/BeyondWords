import React from 'react';
// @ts-ignore - shared dependency-free module
import {
  AUTO_DETECT_CANDIDATES,
  F0_LIMITS,
  SOURCE_LANGUAGES,
  SOURCE_LABELS,
  TARGET_LANGUAGES,
  TARGET_LABELS,
  describeSourceLanguage,
  describeTargetLanguage,
} from '@shared/liveSubtitles.js';

const STATUS_LABELS = {
  idle: 'Off',
  requesting: 'Starting securely…',
  connecting: 'Connecting to Azure…',
  listening: 'Live',
  error: 'Unavailable',
  'quota-exhausted': 'Monthly quota reached',
  'concurrency-limit': 'One session already active',
};

const selectClass =
  'bg-[#102c26] text-[#eddec5] text-[11px] font-semibold rounded-md border border-[#eddec5]/25 px-2 py-1 outline-none focus:border-[#eddec5]/70';

export default function LiveSubtitlesPanel({
  enabled,
  onEnabledChange,
  authorizationState,
  authorizationError,
  sourceLanguage,
  onSourceLanguageChange,
  targetLanguage,
  onTargetLanguageChange,
  displayMode,
  onDisplayModeChange,
  audioSources,
  audioSourceId,
  onAudioSourceChange,
  subtitles,
  speakerLabel,
}) {
  const { status, error, original, translated, detectedLanguage, quota } = subtitles;
  const canEnable = authorizationState === 'authorized' && audioSources.length > 0;

  const showOriginal = displayMode === 'original' || displayMode === 'both';
  const showTranslation = displayMode === 'translation' || displayMode === 'both';

  return (
    <div className="shrink-0 border-b border-[#ffffff12] bg-[#0d1f1a] px-6 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="[font-family:'Manrope',Helvetica] text-[10px] font-bold tracking-[0.18em] text-[#77948c] mr-1">
          AZURE LIVE AI
        </span>

        <button
          type="button"
          onClick={() => onEnabledChange(!enabled)}
          disabled={!canEnable && !enabled}
          title={canEnable || enabled ? 'Explicit opt-in for live speech subtitles' : 'Join the meeting with audio first'}
          className={`h-7 px-3 rounded-md text-[10px] font-bold tracking-wider transition-colors ${
            enabled
              ? 'bg-[#eddec5] text-[#102c26] hover:bg-white'
              : canEnable
                ? 'bg-[#102c26] text-[#eddec5] border border-[#eddec5]/30 hover:bg-[#183d34]'
                : 'bg-[#ffffff0d] text-[#77948c] border border-[#ffffff14] cursor-not-allowed'
          }`}
        >
          {enabled ? 'DISABLE' : 'ENABLE'}
        </button>

        <span className="text-[10px] text-[#77948c]">
          {authorizationState === 'authorizing'
            ? 'Securing subtitle session…'
            : authorizationState === 'error'
              ? (authorizationError || 'Subtitle authorization failed')
              : audioSources.length === 0
                ? 'No active audio track available'
                : 'Opt-in only · audio sent to Azure while enabled · nothing stored'}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-[10px] text-[#77948c]">
            Audio
            <select
              value={audioSourceId || ''}
              onChange={(event) => onAudioSourceChange(event.target.value)}
              className={selectClass}
              disabled={audioSources.length === 0}
            >
              {audioSources.length === 0 ? (
                <option value="">None</option>
              ) : (
                audioSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.label}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="flex items-center gap-1 text-[10px] text-[#77948c]">
            Speak
            <select
              value={sourceLanguage}
              onChange={(event) => onSourceLanguageChange(event.target.value)}
              className={selectClass}
            >
              {SOURCE_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {SOURCE_LABELS[code] || code}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1 text-[10px] text-[#77948c]">
            Show in
            <select
              value={targetLanguage}
              onChange={(event) => onTargetLanguageChange(event.target.value)}
              className={selectClass}
            >
              {TARGET_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {TARGET_LABELS[code] || code}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1 text-[10px] text-[#77948c]">
            View
            <select
              value={displayMode}
              onChange={(event) => onDisplayModeChange(event.target.value)}
              className={selectClass}
            >
              <option value="both">Both</option>
              <option value="original">Original</option>
              <option value="translation">Translation</option>
            </select>
          </label>

          <span
            className={`text-[10px] font-bold px-2 py-1 rounded-md ${
              status === 'listening'
                ? 'bg-emerald-500/15 text-emerald-300'
                : status === 'error' || status === 'quota-exhausted' || status === 'concurrency-limit'
                  ? 'bg-red-500/15 text-red-300'
                  : 'bg-white/5 text-[#77948c]'
            }`}
          >
            {STATUS_LABELS[status] || status}
          </span>
        </div>
      </div>

      {(enabled || error || status === 'listening') && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]" aria-live="polite">
          <span className="text-[#77948c] font-semibold">{speakerLabel || 'Speaker'}</span>
          {sourceLanguage === 'auto' && detectedLanguage && (
            <span className="text-[#eddec5]/80">
              Detected: {describeSourceLanguage(detectedLanguage)}
            </span>
          )}
          {quota?.remainingSeconds !== undefined && (
            <span className="text-[#77948c]">
              F0 quota left: {Math.floor(quota.remainingSeconds / 60)} min
            </span>
          )}
          <span className="text-[#77948c]/80">
            Max {F0_LIMITS.maxConcurrentRequests} simultaneous session
          </span>

          {error && (
            <span className="text-red-300 font-medium">
              {error.message}
            </span>
          )}

          {showOriginal && original && (
            <span className="px-2 py-1 rounded bg-white/5 text-[#eddec5] max-w-full truncate">
              <span className="text-[#77948c] mr-1">
                {sourceLanguage === 'auto' && detectedLanguage
                  ? describeSourceLanguage(detectedLanguage)
                  : describeSourceLanguage(sourceLanguage)}
                :
              </span>
              {original}
            </span>
          )}
          {showTranslation && translated && (
            <span className="px-2 py-1 rounded bg-[#eddec5]/15 text-[#f8ecd9] max-w-full truncate">
              <span className="text-eddec5/70 mr-1">{describeTargetLanguage(targetLanguage)}:</span>
              {translated}
            </span>
          )}
          {enabled && status === 'listening' && !original && !translated && (
            <span className="text-[#77948c]/80">Listening for speech…</span>
          )}
          {sourceLanguage === 'auto' && !detectedLanguage && (
            <span className="text-[#77948c]/70">
              Auto-detect candidates: {AUTO_DETECT_CANDIDATES.map(describeSourceLanguage).join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
