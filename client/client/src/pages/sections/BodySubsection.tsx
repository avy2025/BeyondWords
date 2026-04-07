import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  fadeUp,
  fadeIn,
  staggerContainer,
  heroTitle,
  heroSubtitle,
  heroCta,
  scaleIn,
  cardHover,
  buttonTap,
  slideUp,
} from "@/lib/animations";

import { useAuth } from "@/hooks/use-auth";

const navLinks = [
  { label: "MEETINGS", href: "/dashboard" },
  { label: "LEARNING HUB", href: "/dashboard" },
  { label: "ABOUT", href: "/about" },
];

const footerLinks = [
  { label: "PRIVACY" },
  { label: "TERMS" },
  { label: "EDITORIAL POLICY" },
  { label: "CONTACT" },
];

const featureItems = [
  {
    icon: "/figmaAssets/icon-3.svg",
    title: "Universal Access",
    description:
      "Every dialect, every region. A global network of curated connection points.",
  },
  {
    icon: "/figmaAssets/icon.svg",
    title: "Nuanced Engine",
    description:
      "We don't just translate text; we translate culture, emotion, and human intent.",
  },
  {
    icon: "/figmaAssets/icon-2.svg",
    title: "Human Privacy",
    description:
      "Your conversations are sacred. Encrypted end-to-end with zero-knowledge architecture.",
  },
];

export const BodySubsection = (): JSX.Element => {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const featuresRef = useRef(null);
  const quoteRef = useRef(null);
  const heroRef = useRef(null);

  const featuresInView = useInView(featuresRef, { once: true, margin: "-80px" });
  const quoteInView = useInView(quoteRef, { once: true, margin: "-80px" });

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.8], [0.1, 0.04]);

  return (
    <div className="flex flex-col w-full items-start bg-[#fbf9f5] relative">
      {/* Sticky Navigation Bar */}
      <motion.nav
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-50 flex w-full items-center justify-between pl-8 pr-8 py-4 bg-[#fbf9f5cc] shadow-[0px_20px_40px_#102c260f] backdrop-blur-md"
      >
        <div className="inline-flex items-center gap-12">
          <motion.span
            whileHover={{ opacity: 0.8 }}
            onClick={() => navigate("/")}
            className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-2xl tracking-[-1.20px] leading-8 whitespace-nowrap cursor-pointer"
          >
            BeyondWords
          </motion.span>
          <div className="items-center gap-8 inline-flex">
            {navLinks.map((link) => (
              <motion.button
                key={link.label}
                whileHover={{ color: "#102c26", y: -1 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(link.href)}
                className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-sm tracking-[1.40px] leading-5 whitespace-nowrap"
              >
                {link.label}
              </motion.button>
            ))}
          </div>
        </div>
        
        <div className="inline-flex items-center gap-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              className="h-auto px-5 py-2 rounded-lg [font-family:'Manrope',Helvetica] font-normal text-[#102c26] text-sm tracking-[0] leading-5"
            >
              Login
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Button
              onClick={() => navigate("/login")}
              className="h-auto px-6 py-2 bg-[#102c26] rounded-lg [font-family:'Manrope',Helvetica] font-normal text-white text-sm tracking-[0] leading-5 hover:bg-[#1a3d35]"
            >
              Sign Up
            </Button>
          </motion.div>
        </div>
      </motion.nav>

      <main className="flex flex-col items-start w-full">
        {/* Hero Section */}
        <section
          ref={heroRef}
          className="flex-col min-h-[870px] px-8 py-[305px] relative w-full bg-[#fbf9f5] flex items-center justify-center overflow-hidden"
        >
          {/* Parallax background sketch */}
          <motion.div
            style={{ y: bgY, opacity: bgOpacity }}
            className="absolute inset-0 flex items-center justify-center w-full h-full pointer-events-none"
          >
            <div className="relative w-full max-w-screen-lg h-[1024px] -rotate-3 bg-[url(/figmaAssets/global-connection-sketch.png)] bg-cover bg-[50%_50%]" />
          </motion.div>

          <div className="inline-flex flex-col max-w-4xl items-center gap-6 relative z-10">
            <motion.h1
              variants={heroTitle}
              initial="hidden"
              animate="visible"
              className="[font-family:'Manrope',Helvetica] font-normal text-[#102c26] text-8xl text-center tracking-[-4.80px] leading-[96px] whitespace-nowrap"
            >
              BeyondWords
            </motion.h1>

            <motion.p
              variants={heroSubtitle}
              initial="hidden"
              animate="visible"
              className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-2xl text-center tracking-[0] leading-8 whitespace-nowrap"
            >
              Not just connecting people but also the languages.
            </motion.p>

            <motion.div
              variants={heroCta}
              initial="hidden"
              animate="visible"
              className="flex items-center justify-center gap-4 pt-6 w-full"
            >
              <motion.div variants={buttonTap} whileHover="hover" whileTap="tap">
                <Button
                  onClick={() => navigate("/lobby")}
                  className="h-auto inline-flex gap-3 px-8 py-4 bg-[#102c26] rounded-lg items-center hover:bg-[#1a3d35]"
                >
                  <span className="[font-family:'Manrope',Helvetica] font-bold text-white text-lg text-center tracking-[0] leading-7 whitespace-nowrap">
                    Start Meeting
                  </span>
                  <img className="flex-shrink-0" alt="Container" src="/figmaAssets/container-6.svg" />
                </Button>
              </motion.div>

              <motion.div variants={buttonTap} whileHover="hover" whileTap="tap">
                <Button
                  onClick={() => navigate("/lobby")}
                  className="h-auto inline-flex px-8 py-4 bg-[#e4e2de] rounded-lg items-center hover:bg-[#d4d2ce]"
                  variant="secondary"
                >
                  <span className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-lg text-center tracking-[0] leading-7 whitespace-nowrap">
                    Join Meeting
                  </span>
                </Button>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="w-px h-8 bg-gradient-to-b from-[#102c2640] to-transparent"
            />
          </motion.div>
        </section>

        {/* Features Section */}
        <section
          ref={featuresRef}
          className="flex flex-col items-start px-8 py-24 w-full bg-[#f5f3ef]"
        >
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={featuresInView ? "visible" : "hidden"}
            className="flex flex-col max-w-screen-xl items-start gap-16 w-full"
          >
            <motion.div variants={fadeUp} className="flex flex-col items-start gap-4 w-full">
              <p className="[font-family:'Manrope',Helvetica] font-normal text-[#685d4a] text-sm tracking-[4.20px] leading-5">
                CURATED FEATURES
              </p>
              <h2 className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-5xl tracking-[-1.20px] leading-[48px]">
                The Art of Translation
              </h2>
            </motion.div>

            <div className="grid grid-cols-12 gap-8 w-full">
              <motion.div variants={fadeUp} className="col-span-7" whileHover="hover" initial="rest" animate="rest">
                <motion.div variants={cardHover}>
                  <Card className="bg-white rounded-xl overflow-hidden border-0 shadow-none">
                    <CardContent className="p-10 relative flex flex-col items-start justify-between h-full min-h-[462px]">
                      <div className="absolute top-0 left-[50%] w-[50%] h-full opacity-20 pointer-events-none">
                        <div className="w-full h-full bg-[url(/figmaAssets/translation-sketch.png)] bg-cover bg-[50%_50%]" />
                      </div>
                      <div className="flex flex-col items-start justify-between relative w-full h-full">
                        <div className="flex flex-col items-start gap-[15.25px] w-full">
                          <h3 className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-3xl tracking-[0] leading-9">
                            Real-time Translation Subtitles
                          </h3>
                          <p className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-lg tracking-[0] leading-[29.2px] max-w-md">
                            Experience conversations without borders. Our editorial-grade translation layer captures nuances, not just words.
                          </p>
                        </div>
                        <div className="flex flex-col items-start pt-12 w-full">
                          <motion.div
                            whileHover={{ x: 4 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => navigate("/features/contextual-depth")}
                            className="inline-flex flex-col items-start pb-1 border-b-2 border-[#685d4a] cursor-pointer"
                          >
                            <span className="[font-family:'Manrope',Helvetica] font-bold text-[#685d4a] text-base tracking-[0] leading-6 whitespace-nowrap hover:opacity-80 transition-opacity">
                              Learn about Contextual Depth →
                            </span>
                          </motion.div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              <motion.div variants={fadeUp} className="col-span-5" whileHover="hover" initial="rest" animate="rest">
                <motion.div variants={cardHover}>
                  <Card className="bg-[#eddec5] rounded-xl overflow-hidden border-0 shadow-none">
                    <CardContent className="p-10 flex flex-col items-start gap-20 h-full min-h-[462px]">
                      <div className="flex flex-col items-start gap-[15.12px] w-full">
                        <h3 className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-3xl tracking-[0] leading-9">
                          Sign Language Interpreter
                        </h3>
                        <p className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-lg tracking-[0] leading-[29.2px]">
                          Bridging the gap with inclusive, high-fidelity AI interpretation for the deaf community.
                        </p>
                      </div>
                      <motion.div
                        animate={{ scale: [1, 1.02, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="w-full h-48 opacity-40 bg-[url(/figmaAssets/interpreter-sketch.png)] bg-cover bg-[50%_50%]"
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate={featuresInView ? "visible" : "hidden"}
                className="col-span-12 pt-12"
              >
                <div className="grid grid-cols-3 gap-12 pt-16 border-t border-[#102c260d]">
                  {featureItems.map((item) => (
                    <motion.div key={item.title} variants={slideUp} className="flex flex-col gap-4">
                      <motion.img
                        whileHover={{ rotate: 8, scale: 1.1 }}
                        transition={{ duration: 0.3 }}
                        className="w-8 h-8 object-contain"
                        alt="Icon"
                        src={item.icon}
                      />
                      <div className="flex flex-col gap-2 mt-2">
                        <h4 className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-xl tracking-[0] leading-7">
                          {item.title}
                        </h4>
                        <p className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-sm tracking-[0] leading-5">
                          {item.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Quote Section */}
        <section ref={quoteRef} className="flex flex-col items-start px-48 py-32 w-full bg-[#fbf9f5]">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={quoteInView ? "visible" : "hidden"}
            className="flex flex-col max-w-4xl items-center gap-8 w-full mx-auto"
          >
            <motion.div variants={scaleIn}>
              <Separator className="w-12 h-1 bg-[#685d4a] border-0" />
            </motion.div>
            <motion.blockquote
              variants={fadeUp}
              className="[font-family:'Manrope',Helvetica] font-light text-[#102c26] text-5xl text-center tracking-[0] leading-[48px] w-full pb-4"
            >
              &ldquo;Language is the dress of thought.
              <br />
              BeyondWords ensures that thought is
              <br />
              never left unclothed, regardless of the
              <br />
              tongue it speaks.&rdquo;
            </motion.blockquote>
            <motion.p
              variants={fadeIn}
              className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-sm text-center tracking-[2.80px] leading-5 whitespace-nowrap"
            >
              — THE EDITORIAL COLLECTIVE
            </motion.p>
          </motion.div>
        </section>

        {/* Final CTA Section */}
        <section className="flex flex-col items-center px-8 py-32 w-full bg-[#102c26] relative overflow-hidden">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 0.1, scale: 1.2 }}
            transition={{ duration: 10, repeat: Infinity, repeatType: "mirror" }}
            className="absolute inset-0 bg-[url(/figmaAssets/global-connection-sketch.png)] bg-cover bg-center pointer-events-none filter invert"
          />
          <div className="flex flex-col items-center gap-10 relative z-10 max-w-2xl text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="[font-family:'Manrope',Helvetica] font-normal text-white text-6xl tracking-[-2.40px] leading-[64px]"
            >
              Ready to transcend the boundaries of language?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="[font-family:'Manrope',Helvetica] font-light text-[#fbf9f5cc] text-xl leading-8"
            >
              Join a global network curated for nuance, culture, and connection.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={() => navigate("/login")}
                className="h-auto px-12 py-6 bg-[#eddec5] rounded-xl [font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-2xl tracking-tight hover:bg-[#f5e7d3] shadow-2xl transition-all"
              >
                Create Your Account
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-start px-8 py-12 w-full bg-[#f5f3ef] border-t border-[#102c261a]"
      >
        <div className="flex max-w-screen-xl items-center justify-between w-full">
          <div className="inline-flex flex-col items-start gap-2">
            <span className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-lg tracking-[0] leading-7 whitespace-nowrap">
              BeyondWords
            </span>
            <span className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-sm tracking-[1.40px] leading-5 whitespace-nowrap">
              © BEYONDWORDS. CURATING HUMAN CONNECTION THROUGH LANGUAGE.
            </span>
          </div>
          <nav className="items-start gap-8 inline-flex">
            {footerLinks.map((link) => (
              <motion.button
                key={link.label}
                whileHover={{ color: "#102c26", y: -1 }}
                transition={{ duration: 0.2 }}
                onClick={() => navigate(`/info/${link.label.toLowerCase().replace(/\s/g, "-")}`)}
                className="[font-family:'Manrope',Helvetica] font-normal text-[#414846] text-sm tracking-[1.40px] leading-5 whitespace-nowrap"
              >
                {link.label}
              </motion.button>
            ))}
          </nav>
        </div>
      </motion.footer>
    </div>
  );
};
