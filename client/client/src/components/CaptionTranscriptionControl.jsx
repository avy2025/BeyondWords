import React from 'react';

const buttonClass =
  'h-8 px-3 rounded-full border text-[10px] font-bold tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

const statusTone = (status) => {
  if (status === 'error') return 'text-red-600';
  if (status === 'connected' || status === 'capturing' || status === 'listening') return 'text-emerald-700';
  return 'text-[#102c26]/60';
};

export default function CaptionTranscriptionControl({ transcription, isCaptionHost }) {
  const {
    sourceLanguage,
    setSourceLanguage,
    providerStatus,
    audioStatus,
    error,
    partial,
    captions,
    sessionActive,
    starting,
    canStart,
    start,
    stop,
  } = transcription;

  const hasTranscript = Boolean(partial || captions.length > 0);
  const showPanel = isCaptionHost || hasTranscript || Boolean(error);

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        {isCaptionHost ? (
          <div className="flex items-center gap-2">
            {['hi-IN', 'en-IN'].map((language) => (
              <button
                key={language}
                type="button"
                onClick={() => setSourceLanguage(language)}
                disabled={sessionActive || starting}
                className={`${buttonClass} ${
                  sourceLanguage === language
                    ? 'bg-[#102c26] text-[#eddec5] border-[#102c26]'
                    : 'bg-white text-[#102c26] border-[#102c260d] hover:bg-[#102c260a]'
                }`}
                title={`Transcribe in ${language === 'hi-IN' ? 'Hindi' : 'English'} with Sarvam`}
              >
                {language === 'hi-IN' ? 'HI' : 'EN'}
              </button>
            ))}

            {sessionActive ? (
              <button
                type="button"
                onClick={() => stop('manual stop')}
                className={`${buttonClass} bg-white text-[#102c26] border-red-200 hover:bg-red-50`}
                title="Stop Sarvam transcription"
              >
                STOP
              </button>
            ) : (
              <button
                type="button"
                onClick={start}
                disabled={!canStart}
                className={`${buttonClass} bg-[#102c26] text-[#eddec5] border-[#102c26] hover:bg-[#1a3d34]`}
                title="Start Sarvam transcription from the existing microphone"
              >
                {starting ? 'STARTING…' : 'TRANSCRIBE'}
              </button>
            )}
          </div>
        ) : (
          <span className="px-2 py-1 rounded-full text-[10px] font-bold tracking-widest bg-[#102c260a] text-[#102c26]">
            LIVE ORIGINAL
          </span>
        )}

        <span className={`text-[10px] font-semibold ${statusTone(providerStatus)}`}>
          Sarvam {providerStatus}
          {isCaptionHost ? ` · mic ${audioStatus}` : ''}
        </span>
      </div>

      {showPanel && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-30 w-[min(92vw,720px)] -translate-x-1/2 rounded-2xl border border-[#eddec5]/25 bg-[#102c26]/95 px-4 py-3 text-[#eddec5] shadow-xl">
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-[#eddec5]/60">
            <span>Original transcript · Sarvam</span>
            <span>{sessionActive ? 'live' : 'idle'}</span>
          </div>

          <div className="max-h-28 overflow-hidden text-sm leading-relaxed">
            {captions.slice(-3).map((caption) => (
              <p key={caption.id} className="mb-1 last:mb-0">
                {caption.text}
              </p>
            ))}
            {partial && <p className="text-[#eddec5]/60">{partial}</p>}
            {!hasTranscript && !error && (
              <p className="text-[#eddec5]/50">Waiting for speech…</p>
            )}
          </div>

          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
      )}
    </>
  );
}
