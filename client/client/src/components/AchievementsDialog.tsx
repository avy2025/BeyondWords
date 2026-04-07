import { motion, AnimatePresence } from "framer-motion";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Trophy, Star, Award, Globe, Lock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const iconMap = {
  Trophy: Trophy,
  Star: Star,
  Award: Award,
  Globe: Globe,
};

const ALL_ACHIEVEMENTS = [
  {
    title: 'First Nuance Captured',
    description: 'You completed your first linguistic challenge.',
    icon: 'Trophy'
  },
  {
    title: 'Perfect Scholar',
    description: 'You captured every single nuance in a lesson with 100% accuracy.',
    icon: 'Star'
  },
  {
    title: 'Philologist in Making',
    description: 'You reached 500 XP and showed deep dedication.',
    icon: 'Award'
  },
  {
    title: 'Cultural Ambassador',
    description: 'You completed all current modules and mastered the core curriculum.',
    icon: 'Globe'
  }
];

export const AchievementsDialog = ({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void 
}) => {
  const { user } = useAuth();
  
  const unlockedTitles = user?.achievements?.map(a => a.title) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#fbf9f5cc] backdrop-blur-xl border-none shadow-2xl rounded-[32px] p-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#102c261a] to-transparent pointer-events-none" />
        
        <DialogHeader className="p-8 pb-0 relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-[#102c26] rounded-2xl shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col items-start">
              <DialogTitle className="text-3xl font-bold text-[#102c26] tracking-tight">Your Hall of Mastery</DialogTitle>
              <DialogDescription className="text-[#685d4a] font-medium italic">
                {unlockedTitles.length} of {ALL_ACHIEVEMENTS.length} philological milestones reached
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 pt-6 max-h-[70vh] overflow-y-auto custom-scrollbar relative z-10">
          <div className="grid grid-cols-1 gap-4">
            {ALL_ACHIEVEMENTS.map((achievement, idx) => {
              const Icon = iconMap[achievement.icon as keyof typeof iconMap] || Trophy;
              const isUnlocked = unlockedTitles.includes(achievement.title);
              
              return (
                <motion.div
                  key={achievement.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className={`group relative p-6 border-none transition-all duration-500 overflow-hidden ${
                    isUnlocked 
                      ? "bg-white shadow-md hover:shadow-xl" 
                      : "bg-[#102c2605] opacity-60"
                  }`}>
                    <div className="flex items-center gap-6 relative z-10">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                        isUnlocked 
                          ? "bg-[#102c26] text-white shadow-lg group-hover:scale-110" 
                          : "bg-[#102c261a] text-[#102c264d]"
                      }`}>
                        {isUnlocked ? <Icon className="w-8 h-8" /> : <Lock className="w-6 h-6" />}
                      </div>
                      
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-bold text-lg tracking-tight ${isUnlocked ? "text-[#102c26]" : "text-[#102c2680]"}`}>
                            {achievement.title}
                          </h4>
                          {isUnlocked && (
                            <Badge className="bg-[#eddec5] text-[#102c26] border-none text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                              UNLOCKED
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed ${isUnlocked ? "text-[#414846]" : "text-[#41484666]"}`}>
                          {achievement.description}
                        </p>
                      </div>

                      {isUnlocked && (
                        <div className="text-green-600 opacity-20 group-hover:opacity-100 transition-opacity">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {isUnlocked && (
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:opacity-10 transition-opacity duration-700">
                        <Icon className="w-24 h-24" />
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="p-8 bg-[#102c2605] border-t border-[#102c260d] flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-widest text-[#102c2666] uppercase">PHILOLOGICAL RANK</span>
            <span className="text-[#102c26] font-bold">{user?.rank || 'Novice'}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold tracking-widest text-[#102c2666] uppercase">TOTAL XP</span>
            <span className="text-[#102c26] font-bold font-mono">{user?.xp || 0}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
