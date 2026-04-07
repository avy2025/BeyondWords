import { useState, useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  fadeUp, fadeLeft, fadeRight, staggerContainer,
  scaleIn, slideUp, cardHover, buttonTap,
} from "@/lib/animations";

const missionCards = [
  {
    imgSrc: "/figmaAssets/container-5.svg",
    imgAlt: "Container",
    title: "Preserving Nuance",
    description: "Beyond literal translation, we capture the\ntone, the pause, and the cultural weight of\nevery word shared.",
  },
  {
    imgSrc: "/figmaAssets/container-8.svg",
    imgAlt: "Container",
    title: "Radical Inclusion",
    description: "Ensuring every voice—whether spoken,\nsigned, or written—is treated with equal\neditorial gravitas.",
  },
];

const footerLinks = [
  { label: "PRIVACY" },
  { label: "TERMS" },
  { label: "EDITORIAL POLICY" },
  { label: "CONTACT" },
];

export const AboutBeyondwordsSubsection = (): JSX.Element => {
  const [email, setEmail] = useState("");
  const [, navigate] = useLocation();

  const heroRef = useRef(null);
  const missionRef = useRef(null);
  const featuresRef = useRef(null);
  const newsletterRef = useRef(null);
  const imageRef = useRef(null);

  const heroInView = useInView(heroRef, { once: true, margin: "-60px" });
  const missionInView = useInView(missionRef, { once: true, margin: "-80px" });
  const featuresInView = useInView(featuresRef, { once: true, margin: "-80px" });
  const newsletterInView = useInView(newsletterRef, { once: true, margin: "-60px" });

  const { scrollYProgress: imageScroll } = useScroll({
    target: imageRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(imageScroll, [0, 1], ["-5%", "5%"]);

  return (
    <div className="flex flex-col w-full items-start bg-[#fbf9f5] relative">
      {/* Navigation Bar */}
      <motion.nav
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex w-full items-center justify-between px-8 py-4 bg-[#fbf9f5cc] shadow-[0px_20px_40px_#102c260f] backdrop-blur-md sticky top-0 z-50"
      >
        <div className="inline-flex items-center gap-8">
          <motion.span
            whileHover={{ opacity: 0.8 }}
            onClick={() => navigate("/")}
            className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-2xl tracking-[-1.20px] leading-8 whitespace-nowrap cursor-pointer"
          >
            BeyondWords
          </motion.span>
          <div className="items-center gap-6 inline-flex">
            {[
              { label: "Meetings", href: "/dashboard", active: false },
              { label: "Learning Hub", href: "/dashboard", active: false },
              { label: "About", href: "/about", active: true },
            ].map((link) => (
              <motion.div
                key={link.label}
                whileHover={{ y: -1 }}
                onClick={() => navigate(link.href)}
                className={`inline-flex flex-col items-start cursor-pointer pt-0 pb-1 px-0 ${link.active ? "border-b-2 border-[#685d4a]" : ""}`}
              >
                <span className={`[font-family:'Manrope',Helvetica] font-normal text-base tracking-[-0.40px] leading-6 whitespace-nowrap ${link.active ? "text-[#102c26]" : "text-[#414846]"}`}>
                  {link.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="inline-flex items-center gap-4">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              className="h-auto px-4 py-2 rounded-lg [font-family:'Manrope',Helvetica] font-normal text-[#414846] text-base tracking-[-0.40px] leading-6"
            >
              Join Meeting
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Button
              onClick={() => navigate("/login")}
              className="h-auto px-6 py-2.5 bg-[#102c26] rounded-lg [font-family:'Manrope',Helvetica] font-normal text-white text-base tracking-[-0.40px] leading-6 hover:bg-[#102c26]/90"
            >
              Schedule Meeting
            </Button>
          </motion.div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="flex flex-col items-center gap-32 pt-32 pb-24 px-0 w-full">
        {/* Hero Section */}
        <div ref={heroRef} className="grid grid-cols-2 w-full max-w-[1216px] mx-auto gap-16 px-0">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={heroInView ? "visible" : "hidden"}
            className="relative self-center w-full h-fit flex flex-col items-start gap-6"
          >
            <motion.div variants={fadeLeft}>
              <p className="[font-family:'Manrope',Helvetica] font-normal text-[#685d4a] text-base tracking-[3.20px] leading-6">
                THE KINETIC BRIDGE
              </p>
            </motion.div>
            <motion.div variants={fadeLeft}>
              <h1 className="[font-family:'Manrope',Helvetica] font-normal text-[#102c26] text-7xl tracking-[-3.60px] leading-[72px]">
                <span className="tracking-[-2.59px]">The architecture<br />of </span>
                <span className="font-light tracking-[-2.59px]">understanding</span>
                <span className="tracking-[-2.59px]">.</span>
              </h1>
            </motion.div>
            <motion.div variants={fadeLeft} className="flex flex-col max-w-lg items-start pt-[7px]">
              <p className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-xl tracking-[0] leading-[32.5px]">
                We believe language is more than data. It is a biological
                <br />rhythm, a cultural heartbeat, and a bridge built from
                <br />human intent.
              </p>
            </motion.div>
            <motion.div variants={fadeLeft} className="flex items-center gap-4 pt-4 w-full">
              <div className="w-12 h-0.5 bg-[#685d4a]" />
              <span className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-sm tracking-[1.40px] leading-5 whitespace-nowrap">
                ESTABLISHED 2024
              </span>
            </motion.div>
          </motion.div>

          <motion.div
            ref={imageRef}
            variants={fadeRight}
            initial="hidden"
            animate={heroInView ? "visible" : "hidden"}
            className="relative self-center w-full h-fit flex flex-col items-start"
          >
            <motion.div
              className="flex items-center justify-center p-12 w-full bg-[#f5f3ef] rounded-full overflow-hidden"
              style={{ y: imageY }}
              whileHover={{ scale: 1.02 }}
            >
              <img className="flex-1 self-stretch" alt="Img mask group" src="/figmaAssets/img-mask-group.svg" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20, y: 20 }}
              animate={heroInView ? { opacity: 1, x: 0, y: 0 } : {}}
              transition={{ delay: 0.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex flex-col max-w-60 items-start pl-6 pr-[33.73px] py-6 absolute -left-8 -bottom-8 bg-[#eddec5] rounded-lg shadow-[0px_8px_10px_-6px_#0000001a,0px_20px_25px_-5px_#0000001a]"
            >
              <p className="[font-family:'Manrope',Helvetica] font-normal text-[#4f4533] text-sm tracking-[0] leading-[19.2px]">
                &ldquo;Art is the only way to run
                <br />away without leaving home.&rdquo;
                <br />— Exploring the borders of
                <br />thought.
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Mission Section */}
        <motion.section
          ref={missionRef}
          variants={staggerContainer}
          initial="hidden"
          animate={missionInView ? "visible" : "hidden"}
          className="flex flex-col items-start px-8 py-32 w-full bg-[#f5f3ef]"
        >
          <div className="flex items-start justify-between w-full max-w-screen-xl mx-auto">
            <motion.div variants={fadeLeft} className="flex flex-col w-96 items-start gap-[23.25px]">
              <h2 className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-4xl tracking-[-0.90px] leading-10">Our Mission</h2>
              <p className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-lg tracking-[0] leading-[29.2px]">
                To curate a digital space where technology
                <br />respects the nuance of human dialogue,
                <br />bridging the gap between silence and speech.
              </p>
            </motion.div>
            <div className="grid grid-cols-2 w-[768px] gap-12">
              {missionCards.map((card) => (
                <motion.div key={card.title} variants={slideUp} whileHover="hover" initial="rest" animate="rest">
                  <motion.div variants={cardHover}>
                    <Card className="h-[256.25px] bg-[#fbf9f5] rounded-lg shadow-[0px_1px_2px_#0000000d] border-0 relative overflow-hidden cursor-pointer">
                      <CardContent className="p-0 h-full relative">
                        <img className="absolute w-[calc(100%_-_80px)] top-10 left-10 h-[31px]" alt={card.imgAlt} src={card.imgSrc} />
                        <div className="w-[calc(100%_-_80px)] items-start absolute top-[104px] left-10 flex flex-col">
                          <h3 className="[font-family:'Manrope',Helvetica] font-bold text-[#1b1c1a] text-xl tracking-[0] leading-7 whitespace-nowrap">{card.title}</h3>
                        </div>
                        <div className="flex flex-col w-[calc(100%_-_80px)] items-start absolute top-[147px] left-10">
                          <p className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-sm tracking-[0] leading-[22.8px]">
                            {card.description.split("\n").map((line, i, arr) => (
                              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                            ))}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Feature Cards Grid */}
        <motion.div
          ref={featuresRef}
          variants={staggerContainer}
          initial="hidden"
          animate={featuresInView ? "visible" : "hidden"}
          className="grid grid-cols-12 w-full max-w-[1216px] mx-auto gap-8"
        >
          <motion.div
            variants={fadeLeft}
            whileHover={{ scale: 1.01 }}
            className="col-span-7 w-full min-h-[500px] flex flex-col items-start justify-between p-12 bg-[#102c26] rounded-xl overflow-hidden relative cursor-pointer"
          >
            <motion.div
              animate={{ rotate: [12, 16, 12] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col w-[75%] items-start absolute left-[36.49%] -bottom-20 opacity-20 pointer-events-none"
            >
              <div className="w-full h-[522px] bg-[url(/figmaAssets/ab6axudhxbwygti1jcavjw4r8j2jaftjsrc3eqsdeirgkcyjc-rfvhpt3dtwlc-d.png)] bg-cover bg-[50%_50%]" />
            </motion.div>
            <div className="flex flex-col items-start gap-4 w-full relative z-10">
              <p className="[font-family:'Manrope',Helvetica] font-bold text-[#eddec5] text-xs tracking-[1.20px] leading-4">CORE INNOVATION</p>
              <h2 className="[font-family:'Manrope',Helvetica] font-bold text-[#fbf9f5] text-4xl tracking-[-0.90px] leading-10">Real-time Translation</h2>
              <div className="flex flex-col max-w-md items-start pt-[7.25px]">
                <p className="[font-family:'Manrope',Helvetica] font-normal text-[#77948c] text-lg tracking-[0] leading-[29.2px]">
                  A low-latency engine that doesn&apos;t just swap words,
                  <br />but weaves contexts. Fluent communication as fast as
                  <br />thought itself.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start pt-12 w-full relative z-10">
              <motion.div variants={buttonTap} whileHover="hover" whileTap="tap" className="pt-6">
              <Button 
                onClick={() => navigate("/features/contextual-depth")}
                className="h-auto inline-flex gap-3 px-8 py-4 bg-[#102c26] rounded-lg items-center border-none hover:bg-[#1a3d35]"
              >
                <span className="[font-family:'Manrope',Helvetica] font-bold text-white text-lg text-center tracking-[0] leading-7 whitespace-nowrap">
                  Explore the Engine
                </span>
                <img className="flex-shrink-0" alt="Container" src="/figmaAssets/container-3.svg" />
              </Button>
            </motion.div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeRight}
            whileHover={{ scale: 1.01 }}
            className="col-span-5 w-full min-h-[500px] flex flex-col items-start justify-between p-12 bg-[#eddec5] rounded-xl relative cursor-pointer"
          >
            <div className="flex flex-col items-start gap-4 w-full">
              <p className="[font-family:'Manrope',Helvetica] font-bold text-[#685d4a] text-xs tracking-[1.20px] leading-4">VISUAL DIALECTS</p>
              <h2 className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-4xl tracking-[-0.90px] leading-10">Sign Language<br />Synthesis</h2>
              <div className="flex flex-col items-start pt-[7.25px] w-full">
                <p className="[font-family:'Manrope',Helvetica] font-normal text-[#4f4533] text-lg tracking-[0] leading-[29.2px]">
                  Translating auditory signals into precise kinetic
                  <br />movements. A breakthrough in accessibility
                  <br />through visual rhythm.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start pt-8 w-full">
              <div className="flex items-start justify-center w-full">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  className="max-w-[392px] w-48 h-48 opacity-70 bg-[url(/figmaAssets/ab6axuausvoyxjdov-kqq3asbmv-vyj8u6mjq-yiqfl28rs6wasfvj6tiod1onsg.png)] bg-cover bg-[50%_50%]"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="col-span-12 w-full h-fit flex flex-col items-start p-12 bg-[#e4e2de] rounded-xl border border-solid border-[#c1c8c51a]"
          >
            <div className="grid grid-cols-2 gap-12 w-full">
              <motion.div whileHover={{ scale: 1.01 }} className="self-center w-full h-80 rounded-lg shadow-[inset_0px_2px_4px_#0000000d] bg-[url(/figmaAssets/ab6axuckxir7lewqssnw48gfcgpyqxrhyvwbbhmslyojrrem57nksz24ur64ojcu.png)] bg-cover bg-[50%_50%] overflow-hidden" />
              <div className="self-center w-full h-fit flex flex-col items-start gap-4">
                <p className="[font-family:'Manrope',Helvetica] font-bold text-[#685d4a] text-xs tracking-[1.20px] leading-4">ECOSYSTEM</p>
                <h2 className="[font-family:'Manrope',Helvetica] font-normal text-[#102c26] text-5xl tracking-[-2.40px] leading-[48px]">The Learning Hub</h2>
                <div className="flex flex-col items-start pt-[7px] pb-4 w-full">
                  <p className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-xl tracking-[0] leading-[32.5px]">
                    Not just a tool, but a curriculum for the modern citizen.
                    <br />Master the nuances of cross-cultural communication
                    <br />through our curated linguistic modules.
                  </p>
                </div>
                <motion.div variants={buttonTap} whileHover="hover" whileTap="tap">
                  <Button
                    onClick={() => navigate("/login")}
                    className="h-auto px-8 py-4 bg-[#102c26] rounded-lg [font-family:'Manrope',Helvetica] font-bold text-[#fbf9f5] text-base tracking-[-0.40px] leading-6 hover:bg-[#102c26]/90 shadow-[0px_4px_6px_-4px_#0000001a,0px_10px_15px_-3px_#0000001a]"
                  >
                    Enter the Hub
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Newsletter Section */}
        <motion.div
          ref={newsletterRef}
          variants={staggerContainer}
          initial="hidden"
          animate={newsletterInView ? "visible" : "hidden"}
          className="flex flex-col items-center w-full max-w-[768px] mx-auto px-8 gap-0"
        >
          <motion.div variants={scaleIn} className="flex justify-center w-full mb-[42px]">
            <motion.img
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-[34px] h-[30px]"
              alt="Container"
              src="/figmaAssets/container-1.svg"
            />
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-col items-center w-full mb-4">
            <h2 className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-4xl text-center tracking-[0] leading-10 whitespace-nowrap">
              The Editorial Dispatch
            </h2>
          </motion.div>
          <motion.div variants={fadeUp} className="flex flex-col items-center w-full mb-10">
            <p className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-base text-center tracking-[0] leading-6">
              Monthly insights on language, technology, and the future of human connection.
            </p>
          </motion.div>
          <motion.div variants={fadeUp} className="flex w-full items-stretch gap-4 mb-4">
            <Input
              className="flex-1 px-6 py-[17px] h-auto bg-[#f5f3ef] rounded-lg border-0 [font-family:'Manrope',Helvetica] font-normal text-gray-500 text-base tracking-[0] leading-normal placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <motion.div variants={buttonTap} whileHover="hover" whileTap="tap">
              <Button className="h-auto px-10 py-4 bg-[#102c26] rounded-lg [font-family:'Manrope',Helvetica] font-bold text-[#fbf9f5] text-base tracking-[-0.40px] leading-6 hover:bg-[#102c26]/90 whitespace-nowrap">
                Subscribe
              </Button>
            </motion.div>
          </motion.div>
          <motion.div variants={fadeUp} className="flex justify-center w-full">
            <p className="[font-family:'Manrope',Helvetica] font-normal text-[#41484699] text-[10px] text-center tracking-[1.00px] leading-[15px] whitespace-nowrap">
              RESPECTING YOUR PRIVACY AS MUCH AS YOUR VOICE.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-start px-8 py-12 w-full bg-[#f5f3ef] border-t border-[#102c261a]"
      >
        <div className="flex max-w-screen-xl items-center justify-between w-full mx-auto">
          <div className="inline-flex flex-col items-start gap-2">
            <span className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-lg tracking-[0] leading-7 whitespace-nowrap">BeyondWords</span>
            <span className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-sm tracking-[1.40px] leading-5 whitespace-nowrap">
              © BEYONDWORDS. CURATING HUMAN CONNECTION THROUGH LANGUAGE.
            </span>
          </div>
          <div className="items-start gap-8 inline-flex">
            {footerLinks.map((link) => (
              <motion.span
                key={link.label}
                whileHover={{ color: "#102c26", y: -1 }}
                onClick={() => navigate(`/info/${link.label.toLowerCase().replace(/\s/g, '-')}`)}
                className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-sm tracking-[1.40px] leading-5 whitespace-nowrap cursor-pointer"
              >
                {link.label}
              </motion.span>
            ))}
          </div>
        </div>
      </motion.footer>
    </div>
  );
};
