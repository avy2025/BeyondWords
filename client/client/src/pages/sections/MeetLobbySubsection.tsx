import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/animations";

function generateRoomId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export const MeetLobbySubsection = (): JSX.Element => {
  const [, navigate] = useLocation();
  const [userName, setUserName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [error, setError] = useState("");

  // Auto-fill room ID from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get("room");
    if (roomFromUrl) {
      setRoomId(roomFromUrl);
      setMode("join");
    }
  }, []);

  const handleStart = () => {
    if (!userName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (mode === "join" && !roomId.trim()) {
      setError("Please enter a Room ID to join.");
      return;
    }
    const finalRoomId = mode === "create" ? generateRoomId() : roomId.trim();
    // Navigate to the real meeting room with params in the URL
    navigate(`/room/${finalRoomId}?name=${encodeURIComponent(userName.trim())}`);
  };

  return (
    <div className="flex w-full min-h-screen bg-[#fbf9f5] items-stretch">
      {/* Left decorative panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col flex-1 items-center justify-center p-16 relative bg-[#102c26] overflow-hidden min-h-screen"
      >
        {/* Animated background orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-20 -bottom-20 w-96 h-96 bg-[#eddec51a] rounded-full blur-[64px] pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-10 right-10 w-72 h-72 bg-[#685d4a1a] rounded-full blur-[48px] pointer-events-none"
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-10 relative z-10 max-w-lg w-full text-center"
        >
          <motion.div variants={fadeUp} className="flex flex-col items-center gap-3">
            <span className="[font-family:'Manrope',Helvetica] font-normal text-[#77948c] text-sm tracking-[2.80px] leading-5">
              A GLOBAL DIALOGUE
            </span>
            <motion.h1
              onClick={() => navigate("/")}
              whileHover={{ opacity: 0.8 }}
              className="[font-family:'Manrope',Helvetica] font-normal text-white text-6xl tracking-[-3px] leading-[64px] cursor-pointer"
            >
              BeyondWords
            </motion.h1>
          </motion.div>

          <motion.div variants={scaleIn} className="w-full">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="w-full h-64 bg-[url(/figmaAssets/editorial-illustration-of-diverse-people-speaking.png)] bg-cover bg-center rounded-xl opacity-60"
            />
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-col gap-4 w-full">
            <div className="flex items-center gap-4 p-4 bg-[#ffffff0d] rounded-lg border border-[#ffffff1a]">
              <div className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse" />
              <span className="[font-family:'Manrope',Helvetica] text-[#77948c] text-sm">
                Real-time video with live translation subtitles
              </span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-[#ffffff0d] rounded-lg border border-[#ffffff1a]">
              <div className="w-2 h-2 bg-[#eddec5] rounded-full animate-pulse" />
              <span className="[font-family:'Manrope',Helvetica] text-[#77948c] text-sm">
                Encrypted end-to-end peer-to-peer connection
              </span>
            </div>
            <div className="flex items-center gap-4 p-4 bg-[#ffffff0d] rounded-lg border border-[#ffffff1a]">
              <div className="w-2 h-2 bg-[#60a5fa] rounded-full animate-pulse" />
              <span className="[font-family:'Manrope',Helvetica] text-[#77948c] text-sm">
                Share your room code — anyone can join instantly
              </span>
            </div>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="[font-family:'Manrope',Helvetica] font-light text-[#77948c] text-lg text-center leading-8"
          >
            "Connecting not just people but also the languages"
          </motion.p>
        </motion.div>
      </motion.div>

      {/* Right form panel */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col w-[520px] shrink-0 items-center justify-center p-16 relative bg-[#fbf9f5] min-h-screen"
      >
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-start gap-8 w-full max-w-md"
        >
          {/* Header */}
          <motion.div variants={fadeUp} className="flex flex-col items-start gap-2 w-full">
            <button
              onClick={() => navigate("/")}
              className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-2xl tracking-[-1.2px] leading-8 cursor-pointer bg-transparent border-none p-0 mb-2"
            >
              BeyondWords
            </button>
            <h2 className="[font-family:'Manrope',Helvetica] font-bold text-[#001712] text-3xl tracking-[-0.75px] leading-9">
              Start a Meeting
            </h2>
            <p className="[font-family:'Manrope',Helvetica] font-medium text-[#414846] text-base leading-6">
              Enter your details to begin your global dialogue.
            </p>
          </motion.div>

          {/* Mode tabs */}
          <motion.div variants={fadeUp} className="flex w-full bg-[#f5f3ef] rounded-lg p-1">
            {(["create", "join"] as const).map((m) => (
              <motion.button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                whileTap={{ scale: 0.97 }}
                className={`flex-1 py-2.5 rounded-md text-sm font-bold tracking-wide transition-all [font-family:'Manrope',Helvetica] ${
                  mode === m
                    ? "bg-[#102c26] text-white shadow-sm"
                    : "text-[#414846] hover:text-[#102c26]"
                }`}
              >
                {m === "create" ? "Create Room" : "Join Room"}
              </motion.button>
            ))}
          </motion.div>

          {/* Form fields */}
          <motion.div variants={staggerContainer} className="flex flex-col gap-5 w-full">
            {/* Name field */}
            <motion.div variants={fadeUp} className="flex flex-col gap-1.5 w-full">
              <label className="[font-family:'Manrope',Helvetica] text-[#414846] text-xs tracking-[1.20px] leading-4">
                YOUR NAME
              </label>
              <Input
                type="text"
                placeholder="e.g. Anika Sharma"
                value={userName}
                onChange={(e) => { setUserName(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                className="px-4 py-[17px] w-full h-auto bg-[#f5f3ef] rounded-lg border-none focus-visible:ring-1 focus-visible:ring-[#102c2633] [font-family:'Manrope',Helvetica] text-[#102c26] text-base"
              />
            </motion.div>

            {/* Room ID field (join mode only) */}
            {mode === "join" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-1.5 w-full"
              >
                <label className="[font-family:'Manrope',Helvetica] text-[#414846] text-xs tracking-[1.20px] leading-4">
                  ROOM ID
                </label>
                <Input
                  type="text"
                  placeholder="Paste the room code here"
                  value={roomId}
                  onChange={(e) => { setRoomId(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleStart()}
                  className="px-4 py-[17px] w-full h-auto bg-[#f5f3ef] rounded-lg border-none focus-visible:ring-1 focus-visible:ring-[#102c2633] [font-family:'Manrope',Helvetica] text-[#102c26] text-base font-mono"
                />
              </motion.div>
            )}

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-sm [font-family:'Manrope',Helvetica]"
              >
                {error}
              </motion.p>
            )}

            {/* CTA button */}
            <motion.div variants={fadeUp} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={handleStart}
                className="relative flex justify-center px-0 py-4 w-full h-auto bg-[#102c26] rounded-lg items-center hover:bg-[#1a4a3a] overflow-hidden"
              >
                <div className="shadow-[0px_8px_10px_-6px_#102c261a,0px_20px_25px_-5px_#102c261a] absolute w-full h-full top-0 left-0 bg-[#ffffff01] rounded-lg pointer-events-none" />
                <span className="relative [font-family:'Manrope',Helvetica] font-bold text-white text-base text-center leading-6">
                  {mode === "create" ? "Create & Start Meeting →" : "Join Meeting →"}
                </span>
              </Button>
            </motion.div>
          </motion.div>

          {/* Divider */}
          <motion.div variants={fadeUp} className="flex items-center w-full gap-3">
            <div className="flex-1 h-px bg-[#c1c8c533]" />
            <span className="[font-family:'Manrope',Helvetica] text-[#727976] text-xs tracking-[1.2px]">OR</span>
            <div className="flex-1 h-px bg-[#c1c8c533]" />
          </motion.div>

          {/* Back to dashboard */}
          <motion.div variants={fadeUp} className="w-full">
            <motion.button
              onClick={() => navigate("/dashboard")}
              whileHover={{ backgroundColor: "#f0ede8" }}
              className="w-full py-3 rounded-lg border border-[#c1c8c533] bg-transparent [font-family:'Manrope',Helvetica] font-medium text-[#414846] text-sm transition-colors"
            >
              ← Back to Dashboard
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <footer className="flex items-center gap-6 absolute left-16 bottom-8">
          {["PRIVACY", "TERMS", "HELP"].map((l) => (
            <motion.button
              key={l}
              whileHover={{ color: "#414846", y: -1 }}
              className="[font-family:'Manrope',Helvetica] text-[#727976] text-[10px] tracking-[2px] leading-[15px] bg-transparent border-none p-0 cursor-pointer"
            >
              {l}
            </motion.button>
          ))}
        </footer>
      </motion.div>
    </div>
  );
};
