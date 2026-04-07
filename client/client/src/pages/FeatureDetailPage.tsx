import { motion, useScroll, useTransform } from "framer-motion";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Globe, Zap, Shield, Sparkles, 
  Quote, ArrowRight, MousePointer2 
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { 
  fadeUp, staggerContainer, scaleIn, fadeIn 
} from "@/lib/animations";
import { useRef } from "react";

export const FeatureDetailPage = () => {
  const [, navigate] = useLocation();
  const { slug } = useParams();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const progressHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const content = {
    title: "Contextual Depth",
    subtitle: "THE NUANCE ENGINE",
    description: "Beyond literal translation, we capture the tone, the pause, and the cultural weight of every word shared.",
    heroImage: "/figmaAssets/translation-sketch.png",
    sections: [
      {
        title: "Biological Rhythm",
        text: "Language is not a static data set. It is a biological rhythm, a cultural heartbeat, and a bridge built from human intent. Our engine synchronizes with the cadence of speech to preserve emotional resonance.",
        icon: Zap
      },
      {
        title: "Cultural Curation",
        text: "We believe every voice—whether spoken, signed, or written—is treated with equal editorial gravitas. Our AI layers understand regional idioms and historical context without losing speed.",
        icon: Globe
      },
      {
        title: "Zero-Knowledge Security",
        text: "Your conversations are sacred. Encrypted end-to-end with zero-knowledge architecture, ensuring your nuances remain private and secure.",
        icon: Shield
      }
    ]
  };

  return (
    <PageTransition>
      <div ref={containerRef} className="flex flex-col w-full min-h-screen bg-[#fbf9f5] relative">
        {/* Scroll Progress Indicator */}
        <div className="fixed left-0 top-0 w-1 h-full bg-[#102c260d] z-50">
          <motion.div 
            style={{ height: progressHeight }}
            className="w-full bg-[#102c26]"
          />
        </div>

        {/* Global Nav */}
        <nav className="flex w-full items-center justify-between px-8 py-4 bg-[#fbf9f5cc] backdrop-blur-md sticky top-0 z-50">
          <motion.span 
            onClick={() => navigate("/dashboard")}
            whileHover={{ opacity: 0.8 }}
            className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-2xl tracking-[-1.20px] cursor-pointer"
          >
            BeyondWords
          </motion.span>
          <div className="inline-flex gap-8">
            <Button variant="ghost" onClick={() => navigate("/about")} className="text-[#414846] font-medium">Philosophy</Button>
            <Button variant="ghost" className="text-[#414846] font-medium">The Collective</Button>
          </div>
        </nav>

        <main className="w-full max-w-5xl mx-auto px-8 pt-16 pb-32">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-24"
          >
            {/* Header Section */}
            <header className="flex flex-col gap-6 text-center max-w-3xl mx-auto">
              <motion.div variants={fadeUp}>
                <span className="text-[#685d4a] text-xs font-bold uppercase tracking-[0.2em]">{content.subtitle}</span>
              </motion.div>
              <motion.h1 
                variants={fadeUp} 
                className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-7xl md:text-8xl tracking-tight leading-[0.85]"
              >
                {content.title}
              </motion.h1>
              <motion.p variants={fadeUp} className="text-[#414846] text-2xl leading-relaxed mt-6 italic">
                "{content.description}"
              </motion.p>
            </header>

            {/* Hero Image */}
            <motion.div 
              variants={scaleIn}
              className="relative w-full aspect-video rounded-3xl overflow-hidden bg-[#f5f3ef] shadow-2xl flex items-center justify-center"
            >
              <div 
                className="absolute inset-0 opacity-40 bg-cover bg-center"
                style={{ backgroundImage: `url(${content.heroImage})` }}
              />
              <Sparkles className="w-16 h-16 text-[#102c261a] relative z-10" />
            </motion.div>

            {/* Editorial Content */}
            <section className="grid grid-cols-1 md:grid-cols-12 gap-16 items-start">
              <div className="md:col-span-4 sticky top-32 flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                  <h3 className="text-[#102c26] font-bold text-lg uppercase tracking-widest">KEY PILLARS</h3>
                  <Separator className="bg-[#102c261a]" />
                </div>
                <div className="flex flex-col gap-4">
                  {content.sections.map((s, i) => (
                    <motion.div 
                      key={s.title} 
                      variants={fadeUp}
                      className="flex items-center gap-4 text-[#414846] group cursor-pointer"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#102c26] group-hover:scale-150 transition-transform" />
                      <span className="font-bold text-sm tracking-tight">{s.title}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-8 flex flex-col gap-32">
                {content.sections.map((section, idx) => (
                  <motion.div 
                    key={section.title}
                    variants={fadeUp}
                    className="flex flex-col gap-8"
                  >
                    <div className="flex items-center justify-center w-16 h-16 bg-[#102c26] text-white rounded-2xl shadow-xl">
                      <section.icon className="w-7 h-7" />
                    </div>
                    <div className="flex flex-col gap-6">
                      <h2 className="text-[#102c26] font-bold text-4xl tracking-tight leading-none">{section.title}</h2>
                      <p className="text-[#414846] text-[22px] leading-[1.6] opacity-90 first-letter:text-4xl first-letter:font-bold first-letter:mr-2">
                        {section.text}
                      </p>
                    </div>
                    {idx < content.sections.length - 1 && <Separator className="bg-[#102c260d] mt-8" />}
                  </motion.div>
                ))}
              </div>
            </section>

            {/* Call to Action Card */}
            <motion.div variants={scaleIn}>
              <Card className="bg-[#102c26] border-none rounded-[40px] p-16 text-center shadow-3xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-16 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                  <Globe className="w-64 h-64 text-white" />
                </div>
                <div className="flex flex-col items-center gap-8 relative z-10">
                  <h2 className="text-white text-5xl font-bold tracking-tight max-w-2xl leading-tight">
                    Experience the nuanced rhythm of dialogue for yourself.
                  </h2>
                  <div className="flex gap-4">
                    <Button 
                      onClick={() => navigate("/dashboard")}
                      className="bg-[#eddec5] text-[#1a1a1a] hover:bg-white px-10 py-8 h-auto rounded-2xl font-bold text-lg shadow-xl"
                    >
                      Start Synchronizing
                    </Button>
                    <Button 
                      variant="ghost"
                      className="text-white/60 hover:text-white px-10 py-8 h-auto rounded-2xl font-bold text-lg border-white/10 border"
                    >
                      Case Studies
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
};
