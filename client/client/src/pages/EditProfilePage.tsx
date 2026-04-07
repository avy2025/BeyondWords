import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageTransition } from "@/components/PageTransition";
import { 
  fadeUp, staggerContainer, buttonTap 
} from "@/lib/animations";

export const EditProfilePage = () => {
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    name: "Elena Moretti",
    email: "elena.m@beyondwords.it",
    bio: "Philologist and curator of linguistic nuances. Passionate about bridging cultural gaps through sophisticated AI intelligence."
  });

  const handleSave = () => {
    // Simulate save
    navigate("/profile");
  };

  return (
    <PageTransition>
      <div className="flex flex-col w-full min-h-screen bg-[#fbf9f5]">
        <nav className="flex w-full items-center justify-between px-8 py-4 bg-[#fbf9f5cc] backdrop-blur-md sticky top-0 z-50">
          <motion.span 
            onClick={() => navigate("/dashboard")}
            whileHover={{ opacity: 0.8 }}
            className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-2xl tracking-[-1.20px] cursor-pointer"
          >
            BeyondWords
          </motion.span>
          <Button 
            variant="ghost" 
            onClick={() => navigate("/profile")}
            className="text-[#414846] font-medium"
          >
            Cancel
          </Button>
        </nav>

        <main className="w-full max-w-2xl mx-auto px-8 py-16">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-12"
          >
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-[url(/figmaAssets/user-profile-sketch-1.png)] bg-cover bg-center border-2 border-[#102c261a]" />
              <div className="flex flex-col gap-1">
                <h1 className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-3xl tracking-tight">
                  Edit Personal Brand
                </h1>
                <p className="text-[#685d4a] text-sm opacity-80 uppercase tracking-widest">
                  CURATOR SETTINGS
                </p>
              </div>
            </div>

            <section className="flex flex-col gap-8 bg-white p-10 rounded-2xl shadow-sm border-none">
              <motion.div variants={fadeUp} className="flex flex-col gap-3">
                <Label htmlFor="name" className="text-[#102c26] font-bold tracking-tight text-sm">FULL NAME</Label>
                <Input 
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-[#f5f3ef] border-transparent focus-visible:ring-1 focus-visible:ring-[#102c2633] h-14 rounded-xl px-6"
                />
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-col gap-3">
                <Label htmlFor="email" className="text-[#102c26] font-bold tracking-tight text-sm">EMAIL ADDRESS</Label>
                <Input 
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-[#f5f3ef] border-transparent focus-visible:ring-1 focus-visible:ring-[#102c2633] h-14 rounded-xl px-6"
                />
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-col gap-3">
                <Label htmlFor="bio" className="text-[#102c26] font-bold tracking-tight text-sm">BIOGRAPHICAL NOTE</Label>
                <Textarea 
                  id="bio"
                  value={formData.bio}
                  rows={4}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="bg-[#f5f3ef] border-transparent focus-visible:ring-1 focus-visible:ring-[#102c2633] rounded-xl px-6 py-4"
                />
              </motion.div>

              <motion.div  variants={fadeUp} className="pt-4 flex items-center justify-between">
                <Button 
                  onClick={handleSave}
                  className="bg-[#102c26] text-white hover:bg-[#1a3d35] px-12 py-7 h-auto rounded-xl shadow-lg font-bold"
                >
                  Save Changes
                </Button>
                <span className="text-xs text-[#685d4a] opacity-60 italic">
                  *Changes will synchronize momentarily
                </span>
              </motion.div>
            </section>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
};
