import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const smallTiles = [
  {
    name: "ELENA MORETTI",
    bgImage: "url(/figmaAssets/ab6axuc58lnfjtdsds4lsqb919v4p08zwbv00q-s8uo75hhfmitvbwjjatm-clko.png)",
    bgColor: "bg-[#f5f3ef]",
    labelBg: "bg-[#e4e2dee6]",
    labelColor: "text-[#001712]",
    opacity: "opacity-60",
    iconSrc: "/figmaAssets/container-3.svg",
    showIcon: true,
    row: "row-[1_/_2]",
    col: "col-[3_/_4]",
    delay: 0.3,
  },
  {
    name: "MARCUS VANCE",
    bgImage: "url(/figmaAssets/ab6axudvjmdycwz2rtz1auiar40y6ne7dthncl95flgpbympkn2kr-loaciye-t-.png)",
    bgColor: "bg-[#f5f3ef]",
    labelBg: "bg-[#e4e2dee6]",
    labelColor: "text-[#001712]",
    opacity: "opacity-60",
    iconSrc: "",
    showIcon: false,
    row: "row-[1_/_2]",
    col: "col-[4_/_5]",
    delay: 0.45,
  },
  {
    name: "SL INTERPRETER",
    bgImage: "url(/figmaAssets/ab6axuacyklv-9u5hup3gi8hkqbzqwh5eqv5bqruso-gz9178honlyneasr7qmwj.png)",
    bgColor: "bg-[#102c26]",
    labelBg: "bg-[#685d4ae6]",
    labelColor: "text-white",
    opacity: "opacity-80",
    iconSrc: "/figmaAssets/container-11.svg",
    showIcon: true,
    row: "row-[2_/_3]",
    col: "col-[3_/_4]",
    delay: 0.6,
    isHighlighted: true,
  },
  {
    name: "SARAH J.",
    bgImage: "url(/figmaAssets/ab6axucv9jrupszx7mcwioz7bfklhsqfumq-woyvqce-ispge4rvf4ytmqjcunj7.png)",
    bgColor: "bg-[#f5f3ef]",
    labelBg: "bg-[#e4e2dee6]",
    labelColor: "text-[#001712]",
    opacity: "opacity-60",
    iconSrc: "",
    showIcon: false,
    row: "row-[2_/_3]",
    col: "col-[4_/_5]",
    delay: 0.75,
  },
];

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (idx < text.length) {
      const timer = setTimeout(() => {
        setDisplayed((prev) => prev + text[idx]);
        setIdx((i) => i + 1);
      }, 28);
      return () => clearTimeout(timer);
    }
  }, [idx, text]);

  return (
    <span>
      {displayed}
      {idx < text.length && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.7, repeat: Infinity }}
          className="inline-block w-[2px] h-[14px] bg-white align-middle ml-[2px]"
        />
      )}
    </span>
  );
}

export const BeyondwordsMeetingSubsection = (): JSX.Element => {
  const [, navigate] = useLocation();
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [reactions, setReactions] = useState<{ id: number; emoji: string }[]>([]);
  const [activeSpeakerIdx, setActiveSpeakerIdx] = useState(0);
  const gridRef = useRef(null);
  const gridInView = useInView(gridRef, { once: true, margin: "-60px" });

  // Simulate active speaker switching
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSpeakerIdx((prev) => (prev + 1) % 5);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const addReaction = (emoji: string) => {
    const id = Date.now();
    setReactions((prev) => [...prev, { id, emoji }]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3000);
  };

  const navLinks = [
    { label: "MEETINGS", href: "/dashboard" },
    { label: "LEARNING HUB", href: "/dashboard" },
    { label: "ABOUT", href: "/about" },
  ];

  return (
    <div className="flex flex-col w-full items-start relative bg-[#fbf9f5]">
      {/* Top Navigation Bar */}
      <motion.nav
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex w-full items-center justify-between px-8 py-4 bg-[#fbf9f5cc] shadow-[0px_20px_40px_#102c260f] backdrop-blur-md z-10"
      >
        <div className="inline-flex items-center gap-6 flex-shrink-0">
          <motion.span
            whileHover={{ opacity: 0.8 }}
            onClick={() => navigate("/dashboard")}
            className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-2xl tracking-[-1.20px] leading-8 whitespace-nowrap cursor-pointer"
          >
            BeyondWords
          </motion.span>
          <div className="w-px h-6 bg-[#c1c8c54c]" />
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="inline-flex flex-col items-start flex-shrink-0"
          >
            <span className="[font-family:'Manrope',Helvetica] font-normal text-[#102c26] text-base tracking-[-0.40px] leading-6 whitespace-nowrap">
              Weekly Philology Symposium
            </span>
            <span className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-xs tracking-[1.20px] leading-4 whitespace-nowrap">
              00:42:15 • 12 PARTICIPANTS
            </span>
          </motion.div>
        </div>

        <div className="inline-flex items-center gap-8 flex-shrink-0">
          {navLinks.map((link) => (
            <motion.button
              key={link.label}
              onClick={() => navigate(link.href)}
              whileHover={{ color: "#102c26", y: -1 }}
              transition={{ duration: 0.2 }}
              className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-sm tracking-[1.40px] leading-5 whitespace-nowrap"
            >
              {link.label}
            </motion.button>
          ))}
        </div>

        <div className="inline-flex items-center gap-4 flex-shrink-0">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => navigate("/dashboard")}
              className="h-auto px-6 py-2 bg-[#e4e2de] rounded-lg hover:bg-[#d8d6d2] border-none shadow-none"
              variant="ghost"
            >
              <span className="[font-family:'Manrope',Helvetica] font-normal text-[#102c26] text-sm tracking-[0] leading-5 whitespace-nowrap">
                Meeting Info
              </span>
            </Button>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.06 }}
            onClick={() => navigate("/profile")}
            className="flex w-10 h-10 items-center justify-center bg-[#eae8e4] overflow-hidden border-[#c1c8c533] rounded-full border border-solid cursor-pointer"
          >
            <div className="w-full h-full bg-[url(/figmaAssets/user-profile-sketch-1.png)] bg-cover bg-[50%_50%]" />
          </motion.div>
        </div>
      </motion.nav>

      {/* Main Video Grid Area */}
      <div
        ref={gridRef}
        className="flex flex-col w-full items-center justify-center pt-24 pb-32 px-8 relative min-h-[1052px]"
      >
        <motion.div
          animate={{ rotate: [12, 15, 12], opacity: [0.03, 0.05, 0.03] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col w-96 h-96 items-start justify-center absolute -left-24 -bottom-24 pointer-events-none"
        >
          <div
            className="flex-1 self-stretch w-full bg-cover bg-center"
            style={{ backgroundImage: "url(/figmaAssets/ab6axudyzgoeygw-xi8ctdapjcevhxaplh6s-y4mfgziytdjatseiuok-wnnbf89.png)" }}
          />
        </motion.div>

        <motion.div
          animate={{ rotate: [-12, -15, -12], opacity: [0.03, 0.05, 0.03] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col w-80 h-80 items-start justify-center absolute top-24 -right-24 pointer-events-none"
        >
          <div
            className="flex-1 self-stretch w-full bg-cover bg-center"
            style={{ backgroundImage: "url(/figmaAssets/ab6axucv22vdawhfgjstsn2trm3lrtvrx6zhsx45duhd-fckml7logoyimip-vk4.png)" }}
          />
        </motion.div>

        {/* Video Grid */}
        <div className="grid grid-cols-4 grid-rows-[346px_346px] w-full max-w-screen-xl max-h-[716px] h-[716px] gap-6">
          {/* Large Presenter Tile */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={gridInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative row-[1_/_3] col-[1_/_3] w-full h-full flex flex-col items-center justify-center bg-[#f5f3ef] rounded-xl overflow-hidden border-2 border-solid border-[#685d4a33]"
          >
            <div
              className="absolute inset-0.5 opacity-40 bg-cover bg-center"
              style={{ backgroundImage: "url(/figmaAssets/ab6axuabtrcoism4m2hszsfg64kckbwyxsda1rpe0dhadqgqxl56cgyveidmcade.png)" }}
            />
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={gridInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 absolute top-[18px] left-[18px] bg-[#102c26cc] rounded backdrop-blur-[2px] z-10"
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-[#685d4a] rounded-full flex-shrink-0"
              />
              <span className="[font-family:'Manrope',Helvetica] font-normal text-white text-xs tracking-[0] leading-4 whitespace-nowrap">
                Dr. Aris Thorne (Presenter)
              </span>
            </motion.div>

            <img className="relative flex-[0_0_auto] z-10" alt="Container" src="/figmaAssets/container-12.svg" />

            {/* Floating Reactions Layer */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
              {reactions.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ y: "100%", x: Math.random() * 80 + 10 + "%", opacity: 0, scale: 0.5 }}
                  animate={{ y: "-20%", opacity: [0, 1, 1, 0], scale: [0.5, 1.2, 1, 0.8] }}
                  transition={{ duration: 3, ease: "easeOut" }}
                  className="absolute text-5xl"
                >
                  {r.emoji}
                </motion.div>
              ))}
            </div>

            {/* Translation overlay with typewriter */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={gridInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex flex-col w-[79.46%] items-start p-4 absolute left-[10.27%] bottom-[26px] bg-[#102c26e6] rounded-lg backdrop-blur-[6px] z-10"
            >
              <div className="absolute w-full h-full top-0 left-0 bg-[#ffffff01] rounded-lg shadow-[0px_8px_10px_-6px_#0000001a,0px_20px_25px_-5px_#0000001a]" />
              <div className="relative self-stretch w-full h-[45.5px]">
                <div className="absolute top-1 left-0 w-[54px] h-[17px] flex items-center [font-family:'Manrope',Helvetica] font-bold text-[#77948c] text-[10px] tracking-[1.00px] leading-[16.2px] whitespace-nowrap">
                  {activeSpeakerIdx === 0 ? "Dr. Aris" : smallTiles[activeSpeakerIdx - 1]?.name.split(' ')[0]}:
                </div>
                <div className="absolute -top-px left-[62px] w-[316px] h-[23px] flex items-center [font-family:'Manrope',Helvetica] font-medium text-white text-sm tracking-[0.35px] leading-[22.8px] whitespace-nowrap">
                  {gridInView && <TypewriterText text={activeSpeakerIdx === 0 ? `"The nuance of language lies not in the words` : `"Capturing the subtle pulse of dialogue..."`} />}
                </div>
                <div className="absolute top-[22px] left-0 w-[327px] h-[23px] flex items-center [font-family:'Manrope',Helvetica] font-medium text-white text-sm tracking-[0.35px] leading-[22.8px] whitespace-nowrap">
                  {activeSpeakerIdx === 0 ? `themselves, but in the spaces between them..."` : `This is where true understanding resides.`}
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Small participant tiles */}
          {smallTiles.map((tile, idx) => (
            <motion.div
              key={tile.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={gridInView ? { opacity: 1, scale: idx + 1 === activeSpeakerIdx ? 1.05 : 1 } : {}}
              transition={{ delay: tile.delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.02, zIndex: 20 }}
              className={`${tile.row} ${tile.col} relative w-full h-full flex items-center justify-center ${tile.bgColor} rounded-xl overflow-hidden cursor-pointer`}
            >
              {(tile.isHighlighted || idx + 1 === activeSpeakerIdx) && (
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  animate={{
                    boxShadow: [
                      "0px 0px 0px 4px rgba(104,93,74,0.3)",
                      "0px 0px 0px 8px rgba(104,93,74,0.08)",
                      "0px 0px 0px 4px rgba(104,93,74,0.3)",
                    ],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
              )}
              <div
                className={`relative flex-1 self-stretch grow ${tile.opacity} bg-cover bg-center`}
                style={{ backgroundImage: tile.bgImage }}
              />
              <div className={`inline-flex flex-col items-start px-2 py-1 absolute left-4 bottom-4 ${tile.labelBg} rounded`}>
                <span className={`[font-family:'Manrope',Helvetica] font-bold ${tile.labelColor} text-[11px] tracking-[-0.55px] leading-[16.5px] whitespace-nowrap`}>
                  {tile.name}
                </span>
              </div>
              {tile.showIcon && tile.iconSrc && (
                <img className="absolute top-4 right-4 w-3 h-3" alt="Container" src={tile.iconSrc} />
              )}
            </motion.div>
          ))}
        </div>

        {/* Bottom Control Bar */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={gridInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.9, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-4 px-8 py-4 absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#ffffffcc] rounded-2xl border border-solid border-[#102c260d] shadow-[0px_20px_40px_#102c261a] backdrop-blur-[20px] z-10"
        >
          <motion.div
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 flex items-center justify-center rounded-full cursor-pointer transition-colors ${isMuted ? "bg-red-500" : "hover:bg-gray-100"}`}
          >
            <img className={`w-8 h-8 ${isMuted ? "invert" : ""}`} alt="Mic" src="/figmaAssets/button---mic-toggle.svg" />
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsCameraOff(!isCameraOff)}
            className={`w-12 h-12 flex items-center justify-center rounded-full cursor-pointer transition-colors ${isCameraOff ? "bg-red-500" : "hover:bg-gray-100"}`}
          >
            <img className={`w-8 h-8 ${isCameraOff ? "invert" : ""}`} alt="Camera" src="/figmaAssets/button---camera-toggle.svg" />
          </motion.div>

          <div className="flex items-center gap-2 px-4 py-2 bg-[#102c260a] rounded-xl border border-[#102c260d]">
             {['✨', '🌍', '🧡', '🔥'].map(emoji => (
               <motion.button
                 key={emoji}
                 whileHover={{ scale: 1.2 }}
                 whileTap={{ scale: 0.9 }}
                 onClick={() => addReaction(emoji)}
                 className="text-2xl hover:opacity-80 transition-opacity"
               >
                 {emoji}
               </motion.button>
             ))}
          </div>

          <div className="flex flex-col w-[16.89px] h-8 items-start px-2 py-0">
            <div className="w-px h-8 bg-[#c1c8c54c]" />
          </div>

          <motion.div
            whileHover={{ backgroundColor: "#e4d4b0" }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex h-12 items-center gap-3 px-6 py-0 bg-[#eddec5] rounded-full border-2 border-solid border-[#685d4a33] flex-shrink-0 cursor-pointer"
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <img className="flex-shrink-0" alt="Container" src="/figmaAssets/container-2.svg" />
            </motion.div>
            <div className="inline-flex flex-col items-center pl-[7.62px] pr-[7.64px] py-0">
              <span className="w-[94.94px] h-8 [font-family:'Manrope',Helvetica] font-bold text-[#6c614e] text-xs text-center tracking-[1.20px] leading-4">
                LIVE<br />TRANSLATION
              </span>
            </div>
          </motion.div>

          <motion.img
            whileHover={{ scale: 1.12, y: -2 }}
            whileTap={{ scale: 0.94 }}
            className="w-[43.27px] h-12 flex-shrink-0 cursor-pointer"
            alt="Sign language"
            src="/figmaAssets/button---sign-language-toggle.svg"
          />
          <div className="flex flex-col w-[16.89px] h-8 items-start px-2 py-0">
            <div className="w-px h-8 bg-[#c1c8c54c]" />
          </div>

          {/* LEAVE — navigates back to dashboard */}
          <motion.div
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/dashboard")}
            className="relative inline-flex items-center gap-3 px-8 py-0 bg-[#ba1a1a] h-12 rounded-full flex-shrink-0 cursor-pointer"
          >
            <div className="absolute w-full top-0 left-0 bg-[#ffffff01] shadow-[0px_4px_6px_-4px_#ba1a1a33,0px_10px_15px_-3px_#ba1a1a33] h-12 rounded-full" />
            <img className="flex-shrink-0 relative" alt="Container" src="/figmaAssets/container-9.svg" />
            <div className="inline-flex flex-col items-center relative">
              <span className="[font-family:'Manrope',Helvetica] font-bold text-white text-xs text-center tracking-[1.20px] leading-4 whitespace-nowrap">
                LEAVE
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
