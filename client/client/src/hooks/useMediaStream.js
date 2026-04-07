import { useState, useEffect, useRef } from 'react'

export function useMediaStream() {
  const [localStream, setLocalStream] = useState(null)
  const [error, setError] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const streamRef = useRef(null)

  useEffect(() => {
    async function getMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            frameRate: { ideal: 24, max: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
        })
        streamRef.current = stream
        setLocalStream(stream)
      } catch (err) {
        setError(err.message)
        console.error('getUserMedia error:', err)
      }
    }
    getMedia()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  function toggleAudio() {
    if (!streamRef.current) return
    const enabled = !audioEnabled
    streamRef.current.getAudioTracks().forEach(t => (t.enabled = enabled))
    setAudioEnabled(enabled)
  }

  function toggleVideo() {
    if (!streamRef.current) return
    const enabled = !videoEnabled
    streamRef.current.getVideoTracks().forEach(t => (t.enabled = enabled))
    setVideoEnabled(enabled)
  }

  return { localStream, error, audioEnabled, videoEnabled, toggleAudio, toggleVideo }
}
