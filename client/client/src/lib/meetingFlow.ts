/**
 * meetingFlow.ts — Shared meeting creation/joining logic.
 *
 * The manual lobby form and Mr. Pineapple's voice commands call the same
 * helpers, so room generation, validation and navigation stay in one place.
 * There is no server-side room creation step in this app: starting or joining
 * a meeting means navigating to /room/:roomId with the user's display name.
 */

export type MeetingNavigate = (path: string) => void;

const ROOM_ID_LENGTH = 10;
const ROOM_ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateRoomId(): string {
  const bytes = new Uint32Array(ROOM_ID_LENGTH);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => ROOM_ID_CHARS[value % ROOM_ID_CHARS.length]).join('');
  }
  return Array.from({ length: ROOM_ID_LENGTH }, () =>
    ROOM_ID_CHARS[Math.floor(Math.random() * ROOM_ID_CHARS.length)]
  ).join('');
}

/**
 * Reuses the manual "Create & Start Meeting" flow.
 * Throws when the host name is missing so voice commands cannot silently
 * create an invalid/anonymous room.
 */
export function startMeeting(navigate: MeetingNavigate, displayName: string): string {
  const name = (displayName || '').trim();
  if (!name) {
    throw new Error('Please enter your name before starting a meeting.');
  }

  const roomId = generateRoomId();
  navigate(`/room/${roomId}?name=${encodeURIComponent(name)}`);
  return roomId;
}

/**
 * Reuses the manual "Join Room" navigation exactly. The spoken flow validates
 * the code before calling this; manual input keeps its existing non-empty rule.
 */
export function joinRoom(
  navigate: MeetingNavigate,
  roomId: string,
  displayName: string
): string {
  const code = (roomId || '').trim();
  if (!code) {
    throw new Error('Please enter a Room ID to join.');
  }

  const name = (displayName || '').trim();
  if (!name) {
    throw new Error('Please enter your name before joining a meeting.');
  }

  navigate(`/room/${code}?name=${encodeURIComponent(name)}`);
  return code;
}
