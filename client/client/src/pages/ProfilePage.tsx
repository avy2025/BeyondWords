import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageTransition } from "@/components/PageTransition";
import { 
  fadeUp, staggerContainer, buttonTap, scaleIn 
} from "@/lib/animations";

export const ProfilePage = () => {
  const [, navigate] = useLocation();

  const user = {
    name: "Elena Moretti",
    email: "elena.m@beyondwords.it",
    bio: "Philologist and curator of linguistic nuances. Passionate about bridging cultural gaps through sophisticated AI intelligence.",
    joined: "March 2024",
    stats: [
      { label: "Meetings Hosted", value: "124" },
      { label: "Languages Mastered", value: "12" },
      { label: "Sync Hours", value: "450h" }
    ]
  };

  return (
    <PageTransition>
      <div className="flex flex-col w-full min-h-screen bg-[#fbf9f5]">
        {/* Simple Nav */}
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
            onClick={() => navigate("/dashboard")}
            className="text-[#414846] font-medium"
          >
            Back to Dashboard
          </Button>
        </nav>

        <main className="w-full max-w-4xl mx-auto px-8 py-16">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-12"
          >
            {/* Header Section */}
            <section className="flex items-center gap-8">
              <motion.div 
                variants={scaleIn}
                className="w-32 h-32 rounded-full border-4 border-[#102c261a] bg-[url(/figmaAssets/user-profile-sketch-1.png)] bg-cover bg-center shadow-xl"
              />
              <div className="flex flex-col gap-2">
                <motion.h1 variants={fadeUp} className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-4xl tracking-tight">
                  {user.name}
                </motion.h1>
                <motion.p variants={fadeUp} className="text-[#685d4a] font-medium tracking-wide text-sm opacity-80">
                  CURATOR & PHILOLOGIST
                </motion.p>
              </div>
              <motion.div variants={fadeUp} className="ml-auto">
                <Button 
                  onClick={() => navigate("/profile/edit")}
                  className="bg-[#102c26] text-white hover:bg-[#1a3d35] px-8 py-6 h-auto rounded-xl shadow-lg"
                >
                  Edit Profile
                </Button>
              </motion.div>
            </section>

            <Separator className="bg-[#102c260d]" />

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Stats Section */}
              <div className="md:col-span-1 flex flex-col gap-6">
                <motion.div variants={fadeUp} className="flex flex-col gap-4">
                  <h3 className="text-[#102c26] font-bold text-lg">Metrics</h3>
                  {user.stats.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Card className="bg-white border-none shadow-sm overflow-hidden group">
                        <CardContent className="p-4 flex flex-col gap-1 transition-colors group-hover:bg-[#102c2605]">
                          <motion.span 
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className="text-2xl font-bold text-[#102c26]"
                          >
                            {stat.value}
                          </motion.span>
                          <span className="text-xs text-[#685d4a] uppercase tracking-widest">{stat.label}</span>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* About Section */}
              <div className="md:col-span-2 flex flex-col gap-8">
                <motion.div variants={fadeUp} className="flex flex-col gap-4">
                  <h3 className="text-[#102c26] font-bold text-lg">Biographical Note</h3>
                  <p className="text-[#414846] text-lg leading-relaxed italic">
                    "{user.bio}"
                  </p>
                </motion.div>

                <motion.div variants={fadeUp} className="flex flex-col gap-4">
                  <h3 className="text-[#102c26] font-bold text-lg">Account Information</h3>
                  <div className="bg-[#f5f3ef] rounded-xl p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[#685d4a] text-sm">Email Address</span>
                      <span className="text-[#102c26] font-medium">{user.email}</span>
                    </div>
                    <Separator className="bg-[#102c260a]" />
                    <div className="flex justify-between items-center">
                      <span className="text-[#685d4a] text-sm">Member Since</span>
                      <span className="text-[#102c26] font-medium">{user.joined}</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
};
