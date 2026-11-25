import React from 'react';

const compactButtonClass =
  'h-9 px-3 flex items-center gap-1.5 rounded-full border border-[#eddec5]/30 text-[10px] font-bold tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

const controlDebug = (event, details = {}) => {
  if (import.meta.env?.DEV) console.debug(`[caption-host] ${event}`, details);
};

export default function CaptionHostControl({
  captionHost,
  peerId,
  participants = [],
  isConnected,
  roomJoined = false,
}) {
  const { status, error, claiming, canClaim, isCaptionHost, claim, release } = captionHost;
  const activePeerId = status.activeHostPeerId;
  const activeHostIsSelf = Boolean(activePeerId && activePeerId === peerId);
  const activeHostUser = participants.find((user) => user.peerId === activePeerId);
  const activeHostLabel = activeHostIsSelf
    ? 'You'
    : activeHostUser?.userName || 'Another participant';

  // Room membership is confirmed by room-users before roomJoined becomes true.
  // Socket connection alone must not enable the claim action.
  const claimEnabled = Boolean(
    roomJoined &&
      canClaim &&
      isConnected &&
      peerId &&
      !claiming &&
      status.status !== 'active'
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-widest ${
            isCaptionHost
              ? 'bg-[#102c26] text-[#eddec5]'
              : 'bg-[#102c260a] text-[#102c26] border border-[#102c260d]'
          }`}
        >
          {isCaptionHost ? 'CAPTION HOST' : 'VIEWER'}
        </span>

        {isCaptionHost ? (
          <button
            type="button"
            onClick={release}
            className={`${compactButtonClass} hover:bg-red-50 hover:border-red-300 text-[#102c26]`}
            title="Release the explicit Caption Host role"
          >
            STOP
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              controlDebug('claim button clicked', {
                peerId: peerId ?? null,
                isConnected,
                roomJoined,
                status: status.status,
              });
              claim();
            }}
            disabled={!claimEnabled}
            className={`${compactButtonClass} bg-[#102c26] text-[#eddec5] hover:bg-[#1a3d34]`}
            title={
              status.status === 'active'
                ? `${activeHostLabel} is the Caption Host`
                : !roomJoined
                  ? 'Available after you join the room'
                  : 'Explicitly claim the Caption Host role (no audio capture yet)'
            }
          >
            {claiming ? 'CLAIMING…' : 'CAPTION HOST'}
          </button>
        )}
      </div>

      <span className="text-[10px] text-[#102c26]/60">
        {status.status === 'active'
          ? `${activeHostLabel} is captioning`
          : 'No Caption Host selected'}
      </span>

      {error && (
        <span className="text-[10px] text-red-600 max-w-[220px] text-right">{error}</span>
      )}
    </div>
  );
}
