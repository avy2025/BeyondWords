// Authenticated, room-scoped participant bindings for independent live subtitles.
// This registry is intentionally separate from the Caption Host lease and from
// the Azure F0 membership service.

const memberships = new Map();

const keyFor = (roomId, peerId) => `${roomId}:${peerId}`;

export const authorizeParticipantSubtitleMember = ({
  roomId,
  peerId,
  accountId,
  socketId,
  speakingLanguage,
  subtitleLanguage,
  now = Date.now(),
}) => {
  const member = {
    roomId,
    peerId,
    accountId: String(accountId),
    socketId,
    speakingLanguage,
    subtitleLanguage,
    authorizedAt: now,
  };
  memberships.set(keyFor(roomId, peerId), member);
  return member;
};

export const updateParticipantSubtitlePreferences = ({
  roomId,
  peerId,
  socketId,
  speakingLanguage,
  subtitleLanguage,
}) => {
  const member = memberships.get(keyFor(roomId, peerId));
  if (!member || member.socketId !== socketId) return null;
  member.speakingLanguage = speakingLanguage;
  member.subtitleLanguage = subtitleLanguage;
  return member;
};

export const getParticipantSubtitleMember = (roomId, peerId) =>
  memberships.get(keyFor(roomId, peerId)) || null;

export const getRoomParticipantSubtitleMembers = (roomId) =>
  [...memberships.values()].filter((member) => member.roomId === roomId);

export const removeParticipantSubtitleMember = (roomId, peerId) =>
  memberships.delete(keyFor(roomId, peerId));

export const removeParticipantSubtitleMembersBySocket = (socketId) => {
  const removed = [];
  for (const [key, member] of [...memberships.entries()]) {
    if (member.socketId === socketId) {
      memberships.delete(key);
      removed.push(member);
    }
  }
  return removed;
};

export const removeParticipantSubtitleMemberByPeer = (roomId, peerId) =>
  removeParticipantSubtitleMember(roomId, peerId);

export const removeParticipantSubtitleMembersByRoom = (roomId) => {
  const removed = [];
  for (const [key, member] of [...memberships.entries()]) {
    if (member.roomId === roomId) {
      memberships.delete(key);
      removed.push(member);
    }
  }
  return removed;
};

export const clearParticipantSubtitleMembershipsForTests = () => {
  memberships.clear();
};
