import { useState, useEffect, useCallback, useRef } from 'react'
import Peer from 'peerjs'

// Use the current page host/port so PeerJS traffic goes through the Vite proxy
// in development (localhost:5173 -> proxied to localhost:5000/peerjs)
const PEER_SERVER = {
  host: window.location.hostname,
  port: parseInt(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80),
  path: '/peerjs',
  secure: window.location.protocol === 'https:',
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      // Added OpenRelay TURN (Free)
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ],
  },
}

export function usePeer(localStream) {
  const peerRef = useRef(null)
  const streamRef = useRef(localStream)
  const callsRef = useRef({}) 
  const [myPeerId, setMyPeerId] = useState(null)
  const [peers, setPeers] = useState({})

  useEffect(() => {
    if (!localStream || !peerRef.current) {
      streamRef.current = localStream;
      return;
    }

    // When the local stream changes (e.g. track enabled/disabled or new stream),
    // we should update all active calls so they get the new tracks.
    const oldStream = streamRef.current;
    streamRef.current = localStream;

    Object.values(callsRef.current).forEach((call) => {
      const peerConnection = call.peerConnection;
      if (!peerConnection) return;

      const senders = peerConnection.getSenders();
      localStream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track).catch(err => 
            console.error(`❌ Failed to replace ${track.kind} track:`, err)
          );
        }
      });
    });
  }, [localStream]);

  const removePeer = useCallback((peerId) => {
    if (!peerId) return
    setPeers(prev => {
      const next = { ...prev }
      delete next[peerId]
      return next
    })
    if (callsRef.current[peerId]) {
      callsRef.current[peerId].close()
      delete callsRef.current[peerId]
    }
  }, [])

  const addPeer = useCallback((peerId, stream, userName) => {
    if (!peerId) return
    setPeers(prev => ({ ...prev, [peerId]: { stream, userName } }))
  }, [])

  useEffect(() => {
    const peer = new Peer(undefined, PEER_SERVER)
    peerRef.current = peer

    peer.on('open', (id) => setMyPeerId(id))

    peer.on('call', (incomingCall) => {
      // If we don't have a stream yet, we can't answer properly.
      // However, we should still handle the call and answer once the stream is ready,
      // or answer with null if we only want to receive.
      // For this app, we'll answer with whatever we have in streamRef.current.
      
      console.log('📞 Receiving call from:', incomingCall.peer);
      incomingCall.answer(streamRef.current || undefined)
      
      incomingCall.on('stream', (remoteStream) => {
        const userName = incomingCall.metadata?.userName || 'Guest'
        console.log('📡 Received stream from:', incomingCall.peer, userName);
        addPeer(incomingCall.peer, remoteStream, userName)
        callsRef.current[incomingCall.peer] = incomingCall
      })

      incomingCall.on('close', () => {
        console.log('🔌 Call closed by:', incomingCall.peer);
        removePeer(incomingCall.peer);
      });
      incomingCall.on('error', (err) => {
        console.error('❌ Call error with:', incomingCall.peer, err);
        removePeer(incomingCall.peer);
      });
    })

    peer.on('error', (err) => console.error('❌ PeerJS:', err))
    peer.on('disconnected', () => peer.reconnect())

    return () => {
      Object.values(callsRef.current).forEach(c => c.close())
      peer.destroy()
    }
  }, [addPeer, removePeer])

  const callExistingUsers = useCallback((existingUsers, myUserName) => {
    if (!peerRef.current || !streamRef.current) {
      console.warn('⚠️ Cannot call existing users: peer or stream not ready');
      return;
    }

    console.log('📞 Calling existing users:', existingUsers.length);
    existingUsers.forEach((user) => {
      if (!user.peerId || user.peerId === myPeerId) return;
      if (callsRef.current[user.peerId]) return;

      console.log('📲 Calling peer:', user.peerId, user.userName);
      const call = peerRef.current.call(user.peerId, streamRef.current, {
        metadata: { userName: myUserName },
      });
      
      if (!call) {
        console.error('❌ Failed to initiate call to:', user.peerId);
        return;
      }

      call.on('stream', (remoteStream) => {
        addPeer(user.peerId, remoteStream, user.userName)
        callsRef.current[user.peerId] = call
        
        // Edge case: Handle when the remote stream becomes inactive
        remoteStream.oninactive = () => removePeer(user.peerId)
        remoteStream.getVideoTracks().forEach(track => {
          track.onended = () => removePeer(user.peerId)
        })
      })

      call.on('close', () => removePeer(user.peerId))
      call.on('error', (err) => {
        console.error('❌ Call error with peer:', user.peerId, err)
        removePeer(user.peerId)
      })
    })
  }, [myPeerId, addPeer, removePeer])

  const handleUserLeft = useCallback((peerId) => removePeer(peerId), [removePeer])

  return { myPeerId, peers, callExistingUsers, handleUserLeft }
}
