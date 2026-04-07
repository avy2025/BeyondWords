/**
 * roomService.js
 * Core engine for in-memory room state management. 
 * Optimized for O(1) lookups and high-speed signaling.
 */

const activeRooms = new Map();

/**
 * Adds a user to an in-memory room.
 * @returns {Object} { users, isHost }
 */
export const addUserToInMemRoom = (roomId, { peerId, userName, socketId }) => {
  if (!activeRooms.has(roomId)) {
    activeRooms.set(roomId, []);
  }

  const room = activeRooms.get(roomId);
  const isDuplicate = room.find(u => 
    u.peerId === peerId || 
    u.socketId === socketId
  );

  if (!isDuplicate) {
    room.push({ peerId, userName, socketId });
  } else {
    // Update IDs and name if they changed for the same user
    isDuplicate.peerId = peerId;
    isDuplicate.socketId = socketId;
    isDuplicate.userName = userName;
  }

  const host = room[0];
  const isHost = host.socketId === socketId;

  if (isHost) console.log(`⭐ Host detected: ${userName} (Socket: ${socketId})`);

  return { users: [...room], isHost, hostPeerId: host.peerId };
};

/**
 * Removes a user from an in-memory room by socketId.
 * @returns {Object} { roomId, removedUser, newHost }
 */
export const removeUserFromInMemRoom = (socketId) => {
  let roomId = null;
  let removedUser = null;
  let newHost = null;

  for (const [id, users] of activeRooms.entries()) {
    const index = users.findIndex(u => u.socketId === socketId);
    if (index !== -1) {
      removedUser = users.splice(index, 1)[0];
      roomId = id;

      if (users.length === 0) {
        activeRooms.delete(id);
      } else if (index === 0) {
        // If the host left, the next person in line becomes host
        newHost = users[0];
      }
      break;
    }
  }

  return { roomId, removedUser, newHost };
};

/**
 * Returns all participants in a room.
 */
export const getUsersInInMemRoom = (roomId) => {
  return activeRooms.get(roomId) || [];
};

/**
 * Returns the host of the room.
 */
export const getInMemHost = (roomId) => {
  const room = activeRooms.get(roomId);
  return room && room.length > 0 ? room[0] : null;
};

/**
 * Verifies if a given socket is the host of a room.
 */
export const isSocketHost = (roomId, socketId) => {
  const host = getInMemHost(roomId);
  return host && host.socketId === socketId;
};

/**
 * Forcefully clears a room from memory.
 */
export const clearInMemRoom = (roomId) => {
  activeRooms.delete(roomId);
};
