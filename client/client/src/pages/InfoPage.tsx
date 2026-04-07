import { motion } from "framer-motion";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageTransition } from "@/components/PageTransition";
import { 
  fadeUp, staggerContainer, fadeIn 
} from "@/lib/animations";

export const InfoPage = () => {
  const [, navigate] = useLocation();
  const { slug } = useParams();

  const getPageContent = () => {
    const activeSlug = slug?.toLowerCase().replace(/\s/g, "-");
    
    switch(activeSlug) {
      case 'privacy':
        return {
          title: "Privacy Commitment",
          subtitle: "ZERO-KNOWLEDGE ARCHITECTURE",
          content: "Your conversations are sacred. We employ end-to-end encryption and zero-knowledge data management to ensure that your nuances remain yours alone. BeyondWords does not store the original auditory data after synchronization is complete. Our systems are built on the principle of minimal data retention, meaning once a dialogue is translated and delivered, the raw voice prints are purged from our volatile memory. We don't just protect your words; we protect the biological rhythm of your intent."
        };
      case 'terms':
        return {
          title: "Terms of Dialogue",
          subtitle: "EDITORIAL INTEGRITY",
          content: "BeyondWords is a platform for human connection. By engaging with our synchronization layers, you agree to respect the linguistic dignity of all participants. Misuse of translation features for deception, harassment, or cultural appropriation is grounds for immediate termination of your curator status. All users are expected to maintain the 'Editorial Collective' standard—prioritizing clarity, respect, and the preservation of secondary linguistic nuances. We provide the bridge; you provide the integrity."
        };
      case 'editorial-policy':
        return {
          title: "Editorial Policy",
          subtitle: "CURATING NUANCE",
          content: "Our AI is guided by a collective of philologists and cultural curators. We prioritize systemic accuracy over literal word-for-word translation, ensuring that the 'unclothed' thought is always the priority. This means our engine understands regional idioms, historical weight, and emotional cadence. We avoid 'sterilized' translation, instead opting for a curation that reflects the speaker's true cultural gravity. When we translate, we translate the spirit of the message, not just the syntax."
        };
      case 'contact':
        return {
          title: "Contact the Collective",
          subtitle: "FEEDBACK & DIALOGUE",
          content: "The BeyondWords Collective thrives on global feedback. Whether you've discovered a missing regional nuance or want to suggest a new linguistic layer, your voice is essential to our growth. Reach out to our primary editorial team at collective@beyondwords.it or visit our physical archives at the Milan Linguistic Hub. We are curators of human connection, and that begins with our connection to you. Our response window is typically one complete rotation of the sun."
        };
      case 'help':
        return {
          title: "Curator Help Center",
          subtitle: "SYSTEM NAVIGATION",
          content: "Navigating the complexities of global dialogue should be effortless. Our Help Center provides step-by-step guidance on setting up your Nuance Engine, managing participant layers, and optimizing your synchronization hardware. If you're experiencing technical drift or linguistic latency, our support curators are available 24/7 to help you realign your connection."
        };
      default:
        return {
          title: "Information Hub",
          subtitle: "RESOURCE CENTER",
          content: "Select a topic from our editorial archives to learn more about our commitment to linguistic excellence and the preservation of human thought."
        };
    }
  };

  const { title, subtitle, content } = getPageContent();

  return (
    <PageTransition>
      <div className="flex flex-col w-full min-h-screen bg-[#fbf9f5]">
        <nav className="flex w-full items-center justify-between px-8 py-4 bg-[#fbf9f5cc] backdrop-blur-md sticky top-0 z-50">
          <motion.span 
            onClick={() => navigate("/")}
            whileHover={{ opacity: 0.8 }}
            className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-2xl tracking-[-1.20px] cursor-pointer"
          >
            BeyondWords
          </motion.span>
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard")}
            className="text-[#414846] font-medium"
          >
            Dashboard
          </Button>
        </nav>

        <main className="w-full max-w-3xl mx-auto px-8 py-32 flex flex-col gap-12">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-8"
          >
            <motion.div variants={fadeUp} className="flex flex-col gap-2">
              <span className="text-[#685d4a] text-xs font-bold uppercase tracking-[0.2em]">{subtitle}</span>
              <h1 className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-6xl tracking-tight leading-none">
                {title}
              </h1>
            </motion.div>

            <Separator className="bg-[#102c261a]" />

            <motion.div variants={fadeUp} className="flex flex-col gap-12">
              <p className="text-[#414846] text-2xl leading-relaxed opacity-90 first-letter:text-5xl first-letter:font-bold first-letter:mr-2">
                {content}
              </p>

              <Card className="bg-white border-none p-10 rounded-2xl shadow-sm italic text-[#685d4a] opacity-80 leading-relaxed">
                "In the spaces between words, we find the true essence of human connection. Our commitment to this philosophy is unwavering across every technical layer of our platform."
              </Card>

              {slug?.toUpperCase() === 'CONTACT' && (
                <div className="flex flex-col gap-6 pt-12">
                  <h3 className="text-[#102c26] font-bold text-lg uppercase tracking-widest">CONNECT DIRECTLY</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                      className="bg-[#102c26] text-white hover:bg-[#1a3d35] h-16 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      Email Collective
                    </Button>
                    <Button 
                      variant="outline"
                      className="text-[#102c26] border-[#102c261a] h-16 rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      Visit Office
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
};

import { Card } from "@/components/ui/card";
