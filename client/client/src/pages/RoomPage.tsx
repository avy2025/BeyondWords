import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useParams } from "wouter";
// @ts-ignore
import { useMediaStream } from "@/hooks/useMediaStream";
// @ts-ignore
import { usePeer } from "@/hooks/usePeer";
// @ts-ignore
import { useSocket } from "@/hooks/useSocket";
// @ts-ignore
import { useTranslation } from "@/hooks/useTranslation";
// @ts-ignore
import { useSignLanguage } from "@/hooks/useSignLanguage";

import { useAuth } from "@/hooks/use-auth";

// ─── Video Tile ────────────────────────────────────────────────────────────
type TranslationMode = 'hi-en' | 'de-en';

function VideoTile({
  stream,
  userName,
  peerId,
  roomId,
  socket,
  showSubtitles = false,
  showSignLanguage = false,
  isMuted = false,
  isLocal = false,
  isActive = false,
  isConnected = false,
  translationMode = 'hi-en',
}: {
  stream: MediaStream | null;
  userName: string;
  peerId: string;
  roomId: string;
  socket: any;
  showSubtitles?: boolean;
  showSignLanguage?: boolean;
  isMuted?: boolean;
  isLocal?: boolean;
  isActive?: boolean;
  isConnected?: boolean;
  translationMode?: TranslationMode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { subtitle } = useTranslation(stream, socket, peerId, roomId, showSubtitles, isLocal, isConnected, translationMode);
  const { signOverlay, signSentence, clearSentence } = useSignLanguage(
    socket,
    peerId,
    roomId,
    userName,
    showSignLanguage,
    isLocal,
    videoRef,
    stream
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    // Attach stream
    video.srcObject = stream;

    // Explicitly call play to ensure video starts (sometimes autoPlay fails)
    const startPlayback = async () => {
      try {
        await video.play();
        console.log(`✅ Video playback started for ${userName} (${peerId})`);
      } catch (err) {
        console.warn(`⚠️ Video play() failed for ${userName}:`, err);
        // If it failed due to lack of user gesture, we can't do much but
        // it should normally work because the video is muted.
      }
    };

    startPlayback();

    // Debug log for track status
    const tracks = stream.getVideoTracks();
    if (tracks.length === 0) {
      console.error(`❌ No video tracks found for ${userName}`);
    } else {
      console.log(`📹 ${userName} has ${tracks.length} video tracks. State: ${tracks[0].readyState}, Enabled: ${tracks[0].enabled}`);
    }

  }, [stream, userName, peerId]);

  const initials = userName
    ? userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : "??";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex items-center justify-center bg-[#1a1a1a] rounded-xl overflow-hidden w-full h-full min-h-[180px] ${isActive ? "ring-2 ring-[#685d4a]" : ""
        }`}
    >
      {/* Animated ring for active speaker */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{
            boxShadow: [
              "0 0 0 2px rgba(104,93,74,0.4)",
              "0 0 0 6px rgba(104,93,74,0.08)",
              "0 0 0 2px rgba(104,93,74,0.4)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal || isMuted}
          onLoadedMetadata={(e) => {
            // Backup play() trigger when metadata is loaded
            (e.target as HTMLVideoElement).play().catch(() => { });
          }}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-[#102c26]">
          <span className="[font-family:'Manrope',Helvetica] font-bold text-white text-3xl opacity-80">
            {initials}
          </span>
        </div>
      )}

      {/* Name label */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <span className="[font-family:'Manrope',Helvetica] font-bold text-white text-xs tracking-wide px-2 py-1 bg-[#102c26cc] rounded backdrop-blur-sm">
          {userName} {isLocal ? "(You)" : ""}
        </span>
        {isMuted && (
          <span className="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full">
            <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 24 24">
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
            </svg>
          </span>
        )}
      </div>

      {/* Corner label for local */}
      {isLocal && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-bold text-[#77948c] tracking-widest bg-[#102c26cc] px-2 py-0.5 rounded">
            YOU
          </span>
        </div>
      )}

      {/* Subtitles (Translation) + Sign language overlay */}
      {((showSubtitles && subtitle) || (showSignLanguage && (signOverlay || signSentence))) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-2 px-4"
        >
          {showSubtitles && subtitle && (
            <p className="bg-black/60 backdrop-blur-md text-white text-sm md:text-base font-medium px-4 py-2 rounded-lg text-center max-w-[90%] border border-white/10 shadow-lg pointer-events-none">
              {subtitle}
            </p>
          )}
          {showSignLanguage && signSentence && (
            <div className="flex items-center gap-2 bg-[#052e16]/95 backdrop-blur-md px-4 py-2 rounded-xl max-w-[90%] border border-emerald-500/50 shadow-xl">
              <p className="text-emerald-100 text-sm md:text-base font-semibold text-center flex-1 leading-snug">
                📝 {signSentence}
              </p>
              {isLocal && (
                <button
                  onClick={clearSentence}
                  title="Clear sentence"
                  className="ml-2 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-800/70 hover:bg-red-600/80 text-emerald-200 hover:text-white text-xs font-bold transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          )}
          {showSignLanguage && signOverlay && (
            <p className="bg-[#064e3b]/90 backdrop-blur-md text-emerald-50 text-xs md:text-sm font-medium px-3 py-1.5 rounded-lg text-center max-w-[90%] border border-emerald-400/30 shadow-lg pointer-events-none opacity-80">
              ✋ {signOverlay}
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function RoomPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const { user, isLoading: authLoading } = useAuth();

  const userName = user?.userName || "Guest";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const { localStream, audioEnabled, videoEnabled, toggleAudio, toggleVideo } = useMediaStream();
  const { myPeerId, peers, callExistingUsers, handleUserLeft } = usePeer(localStream);
  const {
    socket,
    isConnected, joinRoom, leaveRoom,
    onRoomUsers, onUserJoined, onUserLeft,
    onChatMessage, sendChatMessage,
    onReaction, sendReaction,
    onMeetingEnded, onUserRemoved, onYouWereRemoved,
    sendRemoveParticipant, sendEndMeeting
  } = useSocket();

  const [chatMessages, setChatMessages] = useState<{ userName: string; message: string; time: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"chat" | "people">("chat");
  const [showCopied, setShowCopied] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [showSignLanguage, setShowSignLanguage] = useState(false);
  const [translationMode, setTranslationMode] = useState<TranslationMode>('hi-en');
  const [reactions, setReactions] = useState<{ id: number; emoji: string; peerId: string }[]>([]);
  const [participants, setParticipants] = useState<{ peerId: string; userName: string }[]>([]);
  const [hostPeerId, setHostPeerId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isHost = myPeerId === hostPeerId;

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  // Join room once BOTH peer ID and local camera stream are ready
  // This prevents race conditions where you join but can't call others because you have no stream yet.
  useEffect(() => {
    if (!myPeerId || !isConnected || !roomId || !localStream) return;

    console.log('🔗 Joining room with stream ready:', roomId);
    joinRoom({ roomId, userName, peerId: myPeerId });
  }, [myPeerId, isConnected, roomId, userName, joinRoom, localStream]);

  // Handle existing users
  useEffect(() => {
    const cleanup = onRoomUsers((users: { peerId: string; userName: string }[], currentHostPeerId: string) => {
      setParticipants(users);
      setHostPeerId(currentHostPeerId);
      callExistingUsers(users, userName);
    });
    return cleanup;
  }, [onRoomUsers, callExistingUsers, userName]);

  // Handle new user joins
  useEffect(() => {
    const cleanup = onUserJoined((user: { peerId: string; userName: string }, currentHostPeerId: string) => {
      setParticipants((prev) => {
        if (prev.find(u => u.peerId === user.peerId)) return prev;
        return [...prev, user];
      });
      setHostPeerId(currentHostPeerId);
      callExistingUsers([user], userName);
    });
    return cleanup;
  }, [onUserJoined, callExistingUsers, userName]);

  // Handle user leaves
  useEffect(() => {
    const cleanup = onUserLeft(({ peerId, newHostPeerId }: { peerId: string, newHostPeerId: string | null }) => {
      setParticipants((prev) => prev.filter((u) => u.peerId !== peerId));
      if (newHostPeerId) setHostPeerId(newHostPeerId);
      handleUserLeft(peerId);
    });
    return cleanup;
  }, [onUserLeft, handleUserLeft]);

  // Handle chat
  useEffect(() => {
    const cleanup = onChatMessage(({ userName: u, message: m }: { userName: string; message: string }) => {
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setChatMessages((prev) => [...prev, { userName: u, message: m, time }]);
    });
    return cleanup;
  }, [onChatMessage]);

  // Handle reactions
  useEffect(() => {
    const cleanup = onReaction(({ emoji, peerId }: { emoji: string; peerId: string }) => {
      const id = Date.now();
      setReactions((prev) => [...prev, { id, emoji, peerId }]);
      setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 4000);
    });
    return cleanup;
  }, [onReaction]);

  // Handle meeting ended by host
  useEffect(() => {
    const cleanupMeeting = onMeetingEnded(({ message }: { message: string }) => {
      alert(message);
      navigate("/dashboard");
    });
    const cleanupRemoved = onYouWereRemoved(() => {
      alert("You have been removed from the meeting by the host.");
      navigate("/dashboard");
    });
    const cleanupUserRemoved = onUserRemoved(({ peerId }: { peerId: string }) => {
      setParticipants((prev) => prev.filter((u) => u.peerId !== peerId));
      handleUserLeft(peerId);
    });

    return () => {
      cleanupMeeting();
      cleanupRemoved();
      cleanupUserRemoved();
    };
  }, [onMeetingEnded, onYouWereRemoved, onUserRemoved, navigate, handleUserLeft]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, sidebarTab, showSidebar]);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [...prev, { userName, message: chatInput.trim(), time }]);
    sendChatMessage({ roomId, message: chatInput.trim(), userName });
    setChatInput("");
  };

  // Listen for Mr. Pineapple voice-command chat messages
  useEffect(() => {
    const handleVoiceMessage = (e: CustomEvent) => {
      const { message, userName: voiceUserName } = e.detail;
      if (!message || !roomId) return;
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setChatMessages((prev) => [...prev, { userName: voiceUserName || userName, message, time }]);
      sendChatMessage({ roomId, message, userName: voiceUserName || userName });
    };
    window.addEventListener("pineapple:send-message", handleVoiceMessage as EventListener);
    return () => window.removeEventListener("pineapple:send-message", handleVoiceMessage as EventListener);
  }, [roomId, userName, sendChatMessage]);

  const addReaction = (emoji: string) => {
    sendReaction({ roomId, emoji, peerId: myPeerId });
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/lobby?room=${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
  };

  const kickParticipant = (peerId: string) => {
    if (!isHost) return;
    sendRemoveParticipant({ roomId, peerId });
  };

  const endMeeting = () => {
    if (!isHost) return;
    if (confirm("Are you sure you want to end the meeting for everyone?")) {
      sendEndMeeting({ roomId });
    }
  };

  const handleLeave = useCallback(() => {
    leaveRoom({ roomId });
    navigate("/dashboard");
  }, [leaveRoom, roomId, navigate]);

  // Build all video tiles: local first, then peers
  const peerEntries = Object.entries(peers as Record<string, { stream: MediaStream; userName: string }>);
  const allTiles = [
    { id: "local", peerId: myPeerId, stream: localStream, userName, isLocal: true },
    ...peerEntries.map(([peerId, peer]) => ({
      id: peerId,
      peerId: peerId,
      stream: peer.stream,
      userName: peer.userName,
      isLocal: false,
    })),
  ];

  // Grid layout based on count
  const count = allTiles.length;
  const gridClass =
    count === 1 ? "grid-cols-1 grid-rows-1" :
      count === 2 ? "grid-cols-2 grid-rows-1" :
        count <= 4 ? "grid-cols-2 grid-rows-2" :
          count <= 6 ? "grid-cols-3 grid-rows-2" :
            "grid-cols-4 grid-rows-3";

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0d1f1a]">
      {/* ── Top Navigation Bar ─────────────────────────────── */}
      <motion.nav
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex w-full items-center justify-between px-6 py-3 bg-[#102c26cc] backdrop-blur-md border-b border-[#ffffff0a] z-20 shrink-0"
      >
        <div className="flex items-center gap-4">
          <span
            className="[font-family:'Manrope',Helvetica] font-bold text-white text-xl tracking-[-1px] select-none"
          >
            BeyondWords
          </span>
          <div className="w-px h-5 bg-[#ffffff20]" />
          <div className="flex flex-col">
            <span className="[font-family:'Manrope',Helvetica] text-white text-sm font-medium tracking-tight">
              {userName}'s Meeting
            </span>
            <span className="[font-family:'Manrope',Helvetica] text-[#77948c] text-xs tracking-widest">
              {formatTime(elapsed)} • {participants.length + 1} PARTICIPANT{participants.length !== 0 ? "S" : ""}
            </span>
          </div>
        </div>

        {/* Room ID pill + copy */}
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => {
              navigator.clipboard.writeText(roomId || "");
              setShowCopied(true);
              setTimeout(() => setShowCopied(false), 2000);
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2 bg-[#ffffff0d] hover:bg-[#ffffff1a] rounded-lg border border-[#ffffff14] transition-colors"
          >
            <span className="[font-family:'Manrope',Helvetica] text-[#eddec5] text-xs font-bold tracking-widest font-mono">
              {roomId}
            </span>
            <AnimatePresence mode="wait">
              {showCopied ? (
                <motion.span
                  key="copied"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-[#4ade80] text-xs font-bold [font-family:'Manrope',Helvetica]"
                >
                  Copied!
                </motion.span>
              ) : (
                <motion.svg key="icon" className="w-3.5 h-3.5 text-[#77948c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Sidebar toggle */}
          <div className="flex items-center gap-1 bg-[#ffffff0d] rounded-lg p-1 border border-[#ffffff14]">
            <button
              onClick={() => { setShowSidebar(true); setSidebarTab("chat"); }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${showSidebar && sidebarTab === "chat" ? "bg-[#eddec5] text-[#102c26]" : "text-[#77948c] hover:text-white"
                }`}
            >
              Chat
            </button>
            <button
              onClick={() => { setShowSidebar(true); setSidebarTab("people"); }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${showSidebar && sidebarTab === "people" ? "bg-[#eddec5] text-[#102c26]" : "text-[#77948c] hover:text-white"
                }`}
            >
              People ({participants.length + 1})
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ── Main area ──────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Video Grid */}
        <div className="flex-1 flex flex-col p-4 relative overflow-hidden">
          <div className={`grid ${gridClass} gap-3 flex-1 w-full h-full`} style={{ minHeight: 0 }}>
            <AnimatePresence>
              {allTiles.map((tile) => (
                <VideoTile
                  key={tile.id}
                  stream={tile.stream}
                  userName={tile.userName}
                  peerId={tile.peerId}
                  roomId={roomId!}
                  socket={socket}
                  showSubtitles={showSubtitles}
                  showSignLanguage={showSignLanguage}
                  isLocal={tile.isLocal}
                  isMuted={tile.isLocal && !audioEnabled}
                  isConnected={isConnected}
                  translationMode={translationMode}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Floating emoji reactions */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <AnimatePresence>
              {reactions.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ y: "100%", x: `${Math.random() * 80 + 10}%`, opacity: 0, scale: 0.5 }}
                  animate={{ y: "-20%", opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 4, ease: "easeOut" }}
                  className="absolute text-5xl flex flex-col items-center gap-2"
                >
                  <span className="text-white text-[10px] font-bold bg-[#102c26cc] px-2 py-0.5 rounded backdrop-blur-sm whitespace-nowrap">
                    {r.peerId === myPeerId ? "You" : (peers[r.peerId]?.userName || "Guest")}
                  </span>
                  {r.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* ── Bottom Control Bar ─────────────────────────── */}
          <div className="flex justify-center mt-4 shrink-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="flex items-center gap-3 px-6 py-3 bg-[#ffffffcc] rounded-2xl border border-[#102c260d] shadow-[0px_20px_40px_#102c261a] backdrop-blur-xl"
            >
              {/* Mic */}
              <motion.button
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleAudio}
                title={audioEnabled ? "Mute" : "Unmute"}
                className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors ${!audioEnabled ? "bg-red-500" : "hover:bg-gray-100"
                  }`}
              >
                {audioEnabled ? (
                  <svg className="w-5 h-5 text-[#102c26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                  </svg>
                )}
              </motion.button>

              {/* Camera */}
              <motion.button
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleVideo}
                title={videoEnabled ? "Stop Camera" : "Start Camera"}
                className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors ${!videoEnabled ? "bg-red-500" : "hover:bg-gray-100"
                  }`}
              >
                {videoEnabled ? (
                  <svg className="w-5 h-5 text-[#102c26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                )}
              </motion.button>

              {/* CC Toggle */}
              <motion.button
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSubtitles(!showSubtitles)}
                title={showSubtitles ? "Disable Subtitles" : "Enable Subtitles"}
                className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors ${showSubtitles ? "bg-[#102c26] text-[#eddec5]" : "hover:bg-gray-100 text-[#102c26]"
                  }`}
              >
                <span className="font-bold text-sm">CC</span>
              </motion.button>

              {/* Language toggle — only visible when CC is active */}
              {showSubtitles && (
                <motion.button
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() =>
                    setTranslationMode((m) => (m === 'hi-en' ? 'de-en' : 'hi-en'))
                  }
                  title={
                    translationMode === 'hi-en'
                      ? 'Listening in Hindi — click to switch to German'
                      : 'Listening in German — click to switch to Hindi'
                  }
                  className="h-11 px-3 flex items-center gap-1.5 rounded-full bg-[#102c26] text-[#eddec5] hover:bg-[#1a3d34] transition-all border border-[#eddec5]/30 shrink-0"
                >
                  <span className="text-base leading-none">
                    {translationMode === 'hi-en' ? '🇮🇳' : '🇩🇪'}
                  </span>
                  <span className="font-bold text-[10px] tracking-widest">
                    {translationMode === 'hi-en' ? 'HI' : 'DE'}
                  </span>
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSignLanguage(!showSignLanguage)}
                title={
                  showSignLanguage
                    ? "Disable sign language detection"
                    : "Sign language (camera → local Python model)"
                }
                className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors ${showSignLanguage
                    ? "bg-emerald-800 text-emerald-100"
                    : "hover:bg-gray-100 text-[#102c26]"
                  }`}
              >
                <span className="font-bold text-xs leading-none text-center px-0.5">
                  SL
                </span>
              </motion.button>

              {/* Reactions */}
              <div className="flex items-center gap-1.5 px-3 py-2 bg-[#102c260a] rounded-xl border border-[#102c260d]">
                {["✨", "🌍", "🧡", "🔥", "👏"].map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.25 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => addReaction(emoji)}
                    className="text-xl hover:opacity-80 transition-opacity"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>

              <div className="w-px h-8 bg-[#c1c8c54c]" />

              {/* Chat Toggle */}
              <motion.button
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setShowSidebar(true); setSidebarTab("chat"); }}
                className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors ${showSidebar && sidebarTab === "chat" ? "bg-[#eddec5]" : "hover:bg-gray-100"
                  }`}
              >
                <svg className={`w-5 h-5 ${showSidebar && sidebarTab === "chat" ? "text-[#102c26]" : "text-[#414846]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </motion.button>

              {/* People Toggle */}
              <motion.button
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors ${showSidebar && sidebarTab === "people" ? "bg-[#eddec5]" : "hover:bg-gray-100"
                  }`}
                onClick={() => { setShowSidebar(true); setSidebarTab("people"); }}
              >
                <svg className={`w-5 h-5 ${showSidebar && sidebarTab === "people" ? "text-[#102c26]" : "text-[#414846]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </motion.button>

              <div className="w-px h-8 bg-[#c1c8c54c]" />

              {/* Leave / End */}
              {isHost ? (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={endMeeting}
                  className="flex items-center gap-2 px-6 h-11 bg-red-600 hover:bg-red-700 rounded-full text-white [font-family:'Manrope',Helvetica] font-bold text-xs tracking-widest transition-colors"
                >
                  END MEETING
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleLeave}
                  className="flex items-center gap-2 px-6 h-11 bg-red-500 hover:bg-red-600 rounded-full text-white [font-family:'Manrope',Helvetica] font-bold text-xs tracking-widest transition-colors"
                >
                  LEAVE
                </motion.button>
              )}
            </motion.div>
          </div>
        </div>

        {/* ── Sidebar (Chat & People) ────────────────────────── */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col bg-[#0f1e18] border-l border-[#ffffff0a] overflow-hidden shrink-0"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#ffffff0a]">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSidebarTab("chat")}
                    className={`[font-family:'Manrope',Helvetica] font-bold text-sm tracking-wide pb-1 border-b-2 transition-all ${sidebarTab === "chat" ? "text-white border-[#eddec5]" : "text-[#77948c] border-transparent"
                      }`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setSidebarTab("people")}
                    className={`[font-family:'Manrope',Helvetica] font-bold text-sm tracking-wide pb-1 border-b-2 transition-all ${sidebarTab === "people" ? "text-white border-[#eddec5]" : "text-[#77948c] border-transparent"
                      }`}
                  >
                    People
                  </button>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSidebar(false)}
                  className="text-[#77948c] hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>

              {/* Chat Tab */}
              {sidebarTab === "chat" && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                    {chatMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                        <svg className="w-10 h-10 text-[#77948c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="[font-family:'Manrope',Helvetica] text-[#77948c] text-xs text-center">
                          No messages yet.<br />Everyone can see these.
                        </p>
                      </div>
                    ) : (
                      chatMessages.map((msg, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex flex-col gap-1 ${msg.userName === userName ? "items-end" : "items-start"}`}
                        >
                          <span className="[font-family:'Manrope',Helvetica] text-[#77948c] text-[10px] tracking-wide">
                            {msg.userName} • {msg.time}
                          </span>
                          <div
                            className={`px-3 py-2 rounded-lg max-w-[240px] [font-family:'Manrope',Helvetica] text-sm leading-5 ${msg.userName === userName
                                ? "bg-[#102c26] text-white shadow-sm"
                                : "bg-[#ffffff0d] text-white border border-[#ffffff0a]"
                              }`}
                          >
                            {msg.message}
                          </div>
                        </motion.div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="flex items-center gap-2 p-3 border-t border-[#ffffff0a]">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendChat()}
                      placeholder="Message..."
                      className="flex-1 px-3 py-2 bg-[#ffffff0d] rounded-lg border border-[#ffffff0a] text-white text-sm [font-family:'Manrope',Helvetica] placeholder-[#77948c] focus:outline-none focus:border-[#685d4a]"
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={sendChat}
                      className="w-8 h-8 flex items-center justify-center bg-[#eddec5] rounded-lg shrink-0"
                    >
                      <svg className="w-4 h-4 text-[#102c26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </motion.button>
                  </div>
                </div>
              )}

              {/* People Tab */}
              {sidebarTab === "people" && (
                <div className="flex flex-col flex-1 overflow-y-auto p-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[#77948c] text-[10px] font-bold tracking-widest uppercase">Participants</span>
                    <div className="h-px bg-[#ffffff0a] w-full mt-1" />
                  </div>

                  {/* Local User */}
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#eddec5] rounded-full flex items-center justify-center text-[#102c26] font-bold text-xs uppercase">
                        {userName.slice(0, 2)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white text-sm font-bold [font-family:'Manrope',Helvetica]">
                          {userName} (You)
                        </span>
                        {myPeerId === hostPeerId && (
                          <span className="text-[#77948c] text-[10px] font-bold tracking-widest uppercase">Meeting Host</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Remote Users */}
                  {participants.map((u) => (
                    <motion.div
                      layout
                      key={u.peerId}
                      className="flex items-center justify-between py-1"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#102c26] border border-[#ffffff10] rounded-full flex items-center justify-center text-white font-bold text-xs uppercase">
                          {u.userName.slice(0, 2)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white text-sm font-bold [font-family:'Manrope',Helvetica]">
                            {u.userName}
                          </span>
                          {u.peerId === hostPeerId && (
                            <span className="text-[#eddec5] text-[10px] font-bold tracking-widest uppercase">Meeting Host</span>
                          )}
                        </div>
                      </div>

                      {isHost && u.peerId !== hostPeerId && (
                        <motion.button
                          whileHover={{ scale: 1.05, backgroundColor: "#ef4444" }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => kickParticipant(u.peerId)}
                          className="px-2 py-1 bg-[#ffffff0d] rounded text-[10px] font-bold text-white transition-colors"
                        >
                          REMOVE
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reconnecting indicator */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-full text-xs font-bold [font-family:'Manrope',Helvetica] z-50"
          >
            <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
            Reconnecting to server...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
