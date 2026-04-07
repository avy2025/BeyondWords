import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

// Use the Vite proxy (same origin) in development so that the
// /socket.io path is proxied to localhost:5000 automatically.
// This avoids direct cross-port WebSocket connections that fail
// when the backend hasn't started yet or CORS isn't configured.
const SERVER_URL = window.location.origin

export function useSocket() {
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    socketRef.current = io(SERVER_URL, {
      path: '/socket.io',
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      // Use both polling and websocket. 'polling' ensures initial handshake,
      // and 'websocket' provides the high-performance signaling needed for WebRTC.
      transports: ['polling', 'websocket'],
    })

    socketRef.current.on('connect_error', (err) => {
      // Only log once every 10 seconds to avoid console spam
      if (!useSocket._lastWarn || Date.now() - useSocket._lastWarn > 10000) {
        console.warn('🔌 Socket.IO connection error — is the backend server running on port 5000?', err.message)
        useSocket._lastWarn = Date.now()
      }
    })

    socketRef.current.on('connect', () => {
      console.log('🔌 Socket.IO connected (id:', socketRef.current.id, ')')
      setIsConnected(true)
    })
    
    socketRef.current.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason)
      setIsConnected(false)
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [])

  // Action emitters
  const joinRoom = useCallback(({ roomId, userName, peerId }) => {
    socketRef.current?.emit('join-room', { roomId, userName, peerId })
  }, [])

  const leaveRoom = useCallback(({ roomId }) => {
    socketRef.current?.emit('leave-room', { roomId })
  }, [])

  const sendChatMessage = useCallback(({ roomId, message, userName }) => {
    socketRef.current?.emit('chat-message', { roomId, message, userName })
  }, [])

  const sendReaction = useCallback(({ roomId, emoji, peerId }) => {
    socketRef.current?.emit('send-reaction', { roomId, emoji, peerId })
  }, [])

  const sendRemoveParticipant = useCallback(({ roomId, peerId }) => {
    socketRef.current?.emit('remove-participant', { roomId, peerId })
  }, [])

  const sendEndMeeting = useCallback(({ roomId }) => {
    socketRef.current?.emit('end-meeting', { roomId })
  }, [])

  const sendSubtitle = useCallback(({ roomId, peerId, translated, type }) => {
    socketRef.current?.emit('send-subtitle', { roomId, peerId, translated, type })
  }, [])

  // Event registration helpers (Stable)
  const onSubtitleUpdate = useCallback((cb) => {
    socketRef.current?.on('subtitle_update', cb)
    return () => socketRef.current?.off('subtitle_update', cb)
  }, [])

  const onRoomUsers = useCallback((cb) => {
    socketRef.current?.on('room-users', cb)
    return () => socketRef.current?.off('room-users', cb)
  }, [])

  const onUserJoined = useCallback((cb) => {
    socketRef.current?.on('user-joined', cb)
    return () => socketRef.current?.off('user-joined', cb)
  }, [])

  const onUserLeft = useCallback((cb) => {
    socketRef.current?.on('user-left', cb)
    return () => socketRef.current?.off('user-left', cb)
  }, [])

  const onChatMessage = useCallback((cb) => {
    socketRef.current?.on('chat-message', cb)
    return () => socketRef.current?.off('chat-message', cb)
  }, [])

  const onReaction = useCallback((cb) => {
    socketRef.current?.on('receive-reaction', cb)
    return () => socketRef.current?.off('receive-reaction', cb)
  }, [])

  const onMeetingEnded = useCallback((cb) => {
    socketRef.current?.on('meeting-ended', cb)
    return () => socketRef.current?.off('meeting-ended', cb)
  }, [])

  const onUserRemoved = useCallback((cb) => {
    socketRef.current?.on('user-removed', cb)
    return () => socketRef.current?.off('user-removed', cb)
  }, [])

  const onYouWereRemoved = useCallback((cb) => {
    socketRef.current?.on('you-were-removed', cb)
    return () => socketRef.current?.off('you-were-removed', cb)
  }, [])

  const onRoomFull = useCallback((cb) => {
    socketRef.current?.on('room-full', cb)
    return () => socketRef.current?.off('room-full', cb)
  }, [])

  return {
    socket: socketRef,
    isConnected,
    joinRoom,
    leaveRoom,
    sendChatMessage,
    sendReaction,
    sendRemoveParticipant,
    sendEndMeeting,
    sendSubtitle,
    onRoomUsers,
    onUserJoined,
    onUserLeft,
    onChatMessage,
    onReaction,
    onMeetingEnded,
    onUserRemoved,
    onYouWereRemoved,
    onRoomFull,
    onSubtitleUpdate,
  }
}

// Throttle property for connect_error logging
useSocket._lastWarn = 0
