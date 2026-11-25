// Narrow in-memory binding between an authenticated account and an active meeting
// participant. Populated only by the separate, authenticated live-subtitle event.

const memberships = new Map();

const key = (roomId, peerId) => `${roomId}:${peerId}`;

export const authorizeLiveSubtitleMember = ({
  roomId,
  peerId,
  accountId,
  socketId,
}) => {
  if (!roomId || !peerId || !accountId || !socketId) return null;

  const record = {
    roomId,
    peerId,
    accountId: String(accountId),
    socketId,
    authorizedAt: Date.now(),
  };
  memberships.set(key(roomId, peerId), record);
  return record;
};

export const isLiveSubtitleMember = ({ roomId, peerId, accountId }) => {
  const record = memberships.get(key(roomId, peerId));
  return Boolean(
    record &&
      record.accountId === String(accountId) &&
      record.roomId === roomId &&
      record.peerId === peerId
  );
};

export const removeLiveSubtitleMemberBySocket = (socketId) => {
  const removed = [];
  for (const [membershipKey, record] of memberships.entries()) {
    if (record.socketId === socketId) {
      memberships.delete(membershipKey);
      removed.push(record);
    }
  }
  return removed;
};

export const clearLiveSubtitleMemberships = () => memberships.clear();

export const liveSubtitleMembershipService = {
  authorize: authorizeLiveSubtitleMember,
  isMember: isLiveSubtitleMember,
  removeBySocket: removeLiveSubtitleMemberBySocket,
  clear: clearLiveSubtitleMemberships,
};

export default liveSubtitleMembershipService;
