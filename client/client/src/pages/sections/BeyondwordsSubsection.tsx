import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  fadeUp, fadeLeft, fadeRight, staggerContainer,
  slideUp, scaleIn, cardHover, buttonTap,
} from "@/lib/animations";

import { useAuth } from "@/hooks/use-auth";

const meetingItems = [
  {
    id: 1,
    title: "Linguistic Architecture Sync",
    time: "Today at 2:00 PM",
    bgSrc: "/figmaAssets/background.svg",
    actionLabel: "Join",
  },
  {
    id: 2,
    title: "Cultural Nuance Seminar",
    time: "Tomorrow at 10:30 AM",
    bgSrc: "/figmaAssets/background-1.svg",
    actionLabel: "Details",
  },
];

const learningCards = [
  { id: 1, label: "Linguistic Games", iconSrc: "/figmaAssets/container-7.svg" },
  { id: 2, label: "Curation MCQs", iconSrc: "/figmaAssets/container.svg" },
];

const meetingDefaults = [
  {
    id: "live-translation",
    title: "Live Translation Subtitles",
    description: "Automatically render captions in your native\nlanguage during active sessions.",
    iconSrc: "/figmaAssets/margin-1.svg",
    defaultEnabled: true,
  },
  {
    id: "sign-language",
    title: "Sign Language Overlay",
    description: "Enable a dedicated viewport for AI-driven sign\nlanguage interpretation.",
    iconSrc: "/figmaAssets/margin.svg",
    defaultEnabled: false,
  },
];

const footerLinks = ["PRIVACY", "TERMS", "EDITORIAL POLICY", "CONTACT"];

export const BeyondwordsSubsection = (): JSX.Element => {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [activeNav, setActiveNav] = useState("Meetings");
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({
    "live-translation": true,
    "sign-language": false,
  });

  const heroRef = useRef(null);
  const cardsRef = useRef(null);
  const defaultsRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true, margin: "-60px" });
  const cardsInView = useInView(cardsRef, { once: true, margin: "-60px" });
  const defaultsInView = useInView(defaultsRef, { once: true, margin: "-60px" });

  const handleNavClick = (label: string) => {
    setActiveNav(label);
    if (label === "About") navigate("/about");
  };

  const handleToggle = (id: string) => {
    setToggleStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col w-full items-start bg-[#fbf9f5] relative">
      {/* Navigation Bar */}
      <motion.nav
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex w-full items-center justify-between px-8 py-4 bg-[#fbf9f5cc] shadow-[0px_20px_40px_#102c260f] backdrop-blur-md sticky top-0 z-50"
      >
        <div className="inline-flex flex-col items-start">
          <motion.span
            whileHover={{ opacity: 0.8 }}
            onClick={() => navigate("/")}
            className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-2xl tracking-[-1.20px] leading-8 whitespace-nowrap cursor-pointer"
          >
            BeyondWords
          </motion.span>
        </div>

        <div className="items-center gap-8 inline-flex">
          {[
            { label: "Meetings", target: "/dashboard" },
            { label: "Learning Hub", target: "/learning" },
            { label: "About", target: "/about" },
          ].map((link) => (
            <motion.button
              key={link.label}
              onClick={() => { setActiveNav(link.label); navigate(link.target); }}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.2 }}
              className={`inline-flex flex-col items-start pb-1 px-0 pt-0 ${
                activeNav === link.label ? "border-b-2 border-[#685d4a]" : ""
              }`}
            >
              <span
                className={`[font-family:'Manrope',Helvetica] font-normal text-base tracking-[-0.40px] leading-6 whitespace-nowrap ${
                  activeNav === link.label ? "text-[#102c26] mt-[-2px]" : "text-[#414846]"
                }`}
              >
                {link.label}
              </span>
            </motion.button>
          ))}
        </div>

        <div className="inline-flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-sm font-bold text-[#102c26]">{user?.userName || "Guest"}</span>
            <span className="text-[10px] text-[#414846] opacity-70">{user?.email || "No session"}</span>
          </div>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => navigate("/lobby")}
              className="h-auto px-5 py-2 bg-[#e4e2de] rounded-lg text-[#102c26] [font-family:'Manrope',Helvetica] font-medium text-base leading-6 hover:bg-[#d4d2ce]"
              variant="ghost"
            >
              Join Meeting
            </Button>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.06 }}
            onClick={() => logout()}
            className="flex w-10 h-10 items-center justify-center bg-[#eae8e4] overflow-hidden border-[#c1c8c533] rounded-full border border-solid cursor-pointer"
          >
            <div className="w-full h-full bg-[url(/figmaAssets/user-profile-sketch-1.png)] bg-cover bg-[50%_50%]" />
          </motion.div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <main className="w-full max-w-screen-xl mx-auto px-8 flex flex-col gap-0">
        {/* Hero Section */}
        <section ref={heroRef} className="flex items-center justify-center gap-12 pt-32 pb-16">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={heroInView ? "visible" : "hidden"}
            className="flex flex-col items-start gap-[23.3px] flex-1"
          >
            <motion.div variants={fadeLeft} className="flex flex-col items-start w-full">
              <h1 className="[font-family:'Manrope',Helvetica] font-normal text-[#102c26] text-7xl tracking-[-3.60px] leading-[72px]">
                Connect Beyond
                <br />
                Barriers
              </h1>
            </motion.div>
            <motion.div variants={fadeLeft} className="flex flex-col items-start max-w-lg">
              <p className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-xl tracking-[0] leading-[32.5px]">
                Bridging human connection through sophisticated
                <br />
                linguistic intelligence and cultural curation.
              </p>
            </motion.div>
            <motion.div variants={fadeLeft} className="flex flex-col items-start pt-[16.7px]">
              <motion.div
                whileHover={{ x: 5 }}
                transition={{ duration: 0.25 }}
                className="inline-flex gap-2 items-center cursor-pointer"
              >
                <span className="[font-family:'Manrope',Helvetica] font-bold text-[#001712] text-lg text-center tracking-[0] leading-7 whitespace-nowrap">
                  Explore your dashboard
                </span>
                <img className="flex-shrink-0" alt="Container" src="/figmaAssets/container-13.svg" />
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div
            variants={fadeRight}
            initial="hidden"
            animate={heroInView ? "visible" : "hidden"}
            className="flex flex-col items-start flex-1 relative"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-12 -left-12 w-64 h-64 bg-[#eddec54c] rounded-full blur-[32px] pointer-events-none"
            />
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate("/meeting")}
              transition={{ duration: 0.4 }}
              className="w-full h-[584px] opacity-90 bg-[url(/figmaAssets/ab6axucoyj6hd6xto4y8ypjbmjfb8qdr8jpot-9twoevo7ra1xor1-xgdbr13h4r.png)] bg-cover bg-[50%_50%] rounded-xl cursor-pointer"
            />
          </motion.div>
        </section>

        {/* Cards Grid */}
        <motion.section
          ref={cardsRef}
          variants={staggerContainer}
          initial="hidden"
          animate={cardsInView ? "visible" : "hidden"}
          className="grid grid-cols-12 gap-6 pb-8"
        >
          {/* Your Meetings Card */}
          <motion.div variants={fadeUp} className="col-span-7">
            <Card className="min-h-[400px] flex flex-col justify-between p-8 bg-[#f5f3ef] rounded-xl border-0 shadow-none">
              <CardContent className="p-0 flex flex-col gap-8 w-full">
                <div className="flex items-start justify-between w-full">
                  <div className="inline-flex flex-col items-start gap-2">
                    <span className="[font-family:'Manrope',Helvetica] font-bold text-[#685d4a] text-xs tracking-[1.20px] leading-4 whitespace-nowrap">
                      CURATION
                    </span>
                    <span className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-3xl tracking-[-0.75px] leading-9 whitespace-nowrap">
                      Your Meetings
                    </span>
                  </div>
                  <motion.img
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                    className="w-[28.87px] h-[31.89px]"
                    alt="Icon"
                    src="/figmaAssets/icon-1.svg"
                  />
                </div>

                <motion.div variants={staggerContainer} className="flex flex-col gap-4 w-full">
                  {meetingItems.map((item) => (
                    <motion.div
                      key={item.id}
                      variants={slideUp}
                      whileHover={{ x: 4, boxShadow: "0px 4px 16px rgba(16,44,38,0.1)" }}
                      onClick={() => navigate("/lobby")}
                      className="flex items-center justify-between pl-5 pr-5 py-5 w-full bg-white rounded-lg shadow-[0px_1px_2px_#0000000d] cursor-pointer"
                    >
                      <div className="inline-flex items-center gap-4">
                        <img className="w-12 h-12" alt="Background" src={item.bgSrc} />
                        <div className="inline-flex flex-col items-start">
                          <span className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-base tracking-[0] leading-6 whitespace-nowrap">
                            {item.title}
                          </span>
                          <span className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-sm tracking-[0] leading-5 whitespace-nowrap">
                            {item.time}
                          </span>
                        </div>
                      </div>
                      <div className="inline-flex flex-col justify-center px-4 py-2 bg-[#001712] rounded-lg opacity-0 items-center">
                        <span className="[font-family:'Manrope',Helvetica] font-bold text-white text-sm text-center tracking-[0] leading-5 whitespace-nowrap">
                          {item.actionLabel}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                <div className="flex items-start justify-center gap-4 w-full pt-8">
                  <motion.div variants={buttonTap} whileHover="hover" whileTap="tap" className="flex-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          onClick={() => navigate("/schedule")}
                          className="h-auto flex justify-center gap-2 px-0 py-3 w-full bg-[#102c26] rounded-lg text-white [font-family:'Manrope',Helvetica] font-bold text-base leading-6 hover:bg-[#1a3d35]"
                        >
                          <img className="flex-shrink-0" alt="Container" src="/figmaAssets/container-10.svg" />
                          Schedule New
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#102c26] text-white border-none text-xs font-bold px-3 py-1.5">
                        OPEN SYMPOSIUM CALENDAR
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                  <motion.div variants={buttonTap} whileHover="hover" whileTap="tap" className="flex-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => navigate("/lobby")}
                          className="h-auto flex justify-center gap-2 px-0 py-3 w-full bg-[#e4e2de] rounded-lg text-[#102c26] [font-family:'Manrope',Helvetica] font-bold text-base leading-6 hover:bg-[#d4d2ce]"
                          variant="ghost"
                        >
                          <img className="flex-shrink-0" alt="Container" src="/figmaAssets/container-14.svg" />
                          Join with ID
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#eddec5] text-[#102c26] border-none text-xs font-bold px-3 py-1.5">
                        ENTER EXISTING DIALOGUE
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Learning Hub Card */}
          <motion.div variants={fadeUp} className="col-span-5">
            <Card className="min-h-[400px] flex flex-col justify-center p-8 bg-[#102c26] rounded-xl border-0 shadow-none overflow-hidden relative">
              <motion.div
                animate={{ x: [0, 8, 0], y: [0, -8, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-10 -bottom-10 opacity-20 pointer-events-none"
              >
                <div className="w-48 h-48 bg-[url(/figmaAssets/ab6axuagtaglvlvbdwuyxewnikfp28wzamkvzbwap9pflvvbvxktxjv-styks18v.png)] bg-cover bg-[50%_50%]" />
              </motion.div>
              <CardContent className="p-0 flex flex-col justify-between w-full h-full">
                <div className="flex flex-col items-start w-full">
                  <div className="pb-2">
                    <span className="[font-family:'Manrope',Helvetica] font-bold text-[#77948c] text-xs tracking-[1.20px] leading-4">INTELLECTUAL GROWTH</span>
                  </div>
                  <div className="pb-4">
                    <span className="[font-family:'Manrope',Helvetica] font-bold text-white text-3xl tracking-[-0.75px] leading-9">Learning Hub</span>
                  </div>
                  <div className="pb-8 max-w-xs">
                    <p className="[font-family:'Manrope',Helvetica] font-normal text-[#77948c] text-base tracking-[0] leading-[26px]">
                      Master communication through curated
                      <br />challenges and cognitive exercises.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full mt-auto">
                    {learningCards.map((card) => (
                      <motion.div
                        key={card.id}
                        whileHover={{ backgroundColor: "rgba(255,255,255,0.18)", y: -3 }}
                        transition={{ duration: 0.25 }}
                        onClick={() => navigate("/learning")}
                        className="flex flex-col items-start gap-2 p-4 bg-[#ffffff1a] rounded-lg backdrop-blur-[6px] cursor-pointer"
                      >
                        <img className="w-full" alt="Container" src={card.iconSrc} />
                        <span className="[font-family:'Manrope',Helvetica] font-bold text-white text-sm tracking-[0] leading-5">{card.label}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.section>

        {/* Linguistic Footprint / Analytics Section */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="flex flex-col items-start gap-10 w-full mb-12"
        >
          <div className="flex items-center gap-4 w-full px-4">
            <span className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-2xl tracking-[0] leading-8 whitespace-nowrap uppercase">
              Linguistic Footprint
            </span>
            <Separator className="flex-1 bg-[#c1c8c533]" />
          </div>

          <div className="grid grid-cols-12 gap-6 w-full px-4">
            {/* Stats Row */}
            <div className="col-span-12 grid grid-cols-3 gap-6">
              {[
                { label: "XP EARNED", value: user?.xp?.toLocaleString() || "0", color: "text-[#102c26]" },
                { label: "LESSONS COMPLETED", value: user?.completedLessons?.length.toString() || "0", color: "text-[#685d4a]" },
                { 
                  label: "NUANCE ACCURACY", 
                  value: user?.completedLessons?.length 
                    ? `${Math.round((user.completedLessons.reduce((acc, l) => acc + l.score, 0) / (user.completedLessons.length * 2)) * 100)}%` 
                    : "0%", 
                  color: "text-[#102c26]" 
                }
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  className="bg-white p-6 rounded-xl shadow-sm border border-[#102c260a] flex flex-col gap-1"
                >
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#41484699] uppercase">{stat.label}</span>
                  <span className={`text-4xl font-bold tracking-tight ${stat.color}`}>{stat.value}</span>
                </motion.div>
              ))}
            </div>

            {/* Engagement Graph Simulated */}
            <motion.div 
              variants={scaleIn}
              className="col-span-12 bg-white p-8 rounded-xl shadow-sm border border-[#102c260a] min-h-[220px] flex flex-col gap-6"
            >
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-[#41484699] uppercase">WEEKLY ENGAGEMENT PROFILE</span>
                  <span className="text-xl font-bold text-[#102c26]">Editorial Pulse</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#102c26]" />
                  <span className="text-[10px] font-bold text-[#102c26]">ACTIVE CURATION</span>
                </div>
              </div>

              <div className="flex items-end justify-between w-full h-32 pt-4">
                {[40, 70, 45, 90, 65, 80, 55].map((height, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${height}%` }}
                    transition={{ delay: i * 0.1, duration: 1, ease: "easeOut" }}
                    className="w-[12%] bg-[#102c261a] rounded-t-lg group relative cursor-pointer hover:bg-[#102c2633] transition-colors"
                  >
                    <motion.div 
                      className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#102c26] text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {height}%
                    </motion.div>
                  </motion.div>
                ))}
              </div>
              <div className="flex justify-between w-full px-2">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                  <span key={day} className="text-[9px] font-bold text-[#41484666] w-[12%] text-center tracking-widest">{day}</span>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Meeting Defaults Section */}
        <motion.section
          ref={defaultsRef}
          variants={staggerContainer}
          initial="hidden"
          animate={defaultsInView ? "visible" : "hidden"}
          className="flex flex-col items-start gap-8 p-8 mb-8 bg-[#f5f3ef] rounded-xl w-full"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-4 w-full">
            <span className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-2xl tracking-[0] leading-8 whitespace-nowrap">
              Meeting Defaults
            </span>
            <Separator className="flex-1 bg-[#c1c8c533]" />
          </motion.div>
          <div className="grid grid-cols-2 gap-12 w-full">
            {meetingDefaults.map((setting) => (
              <motion.div
                key={setting.id}
                variants={scaleIn}
                whileHover={{ boxShadow: "0px 4px 20px rgba(16,44,38,0.08)", y: -2 }}
                className="flex items-start justify-between p-6 bg-white rounded-lg border border-solid border-transparent"
              >
                <div className="inline-flex items-start gap-4">
                  <img className="flex-shrink-0" alt="Margin" src={setting.iconSrc} />
                  <div className="inline-flex flex-col items-start">
                    <span className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-lg tracking-[0] leading-7 whitespace-nowrap">
                      {setting.title}
                    </span>
                    <p className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-sm tracking-[0] leading-5 whitespace-pre-line">
                      {setting.description}
                    </p>
                  </div>
                </div>
                <motion.div whileTap={{ scale: 0.9 }} className="inline-flex items-center">
                  <Switch
                    checked={toggleStates[setting.id]}
                    onCheckedChange={() => handleToggle(setting.id)}
                    className={`${toggleStates[setting.id] ? "bg-[#102c26]" : "bg-[#eae8e4]"}`}
                  />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-start px-8 py-12 w-full bg-[#f5f3ef] border-t border-solid border-[#102c261a]"
      >
        <div className="flex max-w-screen-xl items-center justify-between w-full mx-auto">
          <div className="inline-flex flex-col items-start">
            <span className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-lg tracking-[0] leading-7 whitespace-nowrap">BeyondWords</span>
          </div>
          <div className="items-start gap-8 inline-flex">
            {footerLinks.map((link) => (
              <motion.span
                key={link}
                whileHover={{ color: "#102c26", y: -1 }}
                onClick={() => navigate(`/info/${link.toLowerCase().replace(/\s/g, "-")}`)}
                className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-sm tracking-[1.40px] leading-5 whitespace-nowrap cursor-pointer"
              >
                {link}
              </motion.span>
            ))}
          </div>
          <div className="inline-flex flex-col items-start opacity-80">
            <span className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-sm tracking-[1.40px] leading-5 whitespace-nowrap">
              © BEYONDWORDS. CURATING HUMAN CONNECTION THROUGH LANGUAGE.
            </span>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};
