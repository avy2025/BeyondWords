import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, BookOpen, Brain, Star, Clock, 
  ArrowRight, Search, LayoutGrid, List, Hand, Globe
} from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { 
  fadeUp, staggerContainer, scaleIn, cardHover, buttonTap 
} from "@/lib/animations";
import { NuanceGame } from "@/components/NuanceGame";
import { SignLanguageLearning } from "@/components/SignLanguageLearning";
import { GermanLearning } from "@/components/GermanLearning";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AchievementsDialog } from "@/components/AchievementsDialog";

interface Lesson {
  _id: string;
  title: string;
  category: "INTERACTIVE" | "THEORY" | "MASTERY";
  description: string;
  language: string;
  difficulty: "Apprentice" | "Explorer" | "Master" | "Sage";
  order: number;
  image: string;
}

const iconMap = {
  "INTERACTIVE": Brain,
  "THEORY": BookOpen,
  "MASTERY": Star
};

const getRankThreshold = (rank: string) => {
  if (rank === 'Philologist Apprentice') return 500;
  if (rank === 'Linguistic Explorer') return 1500;
  if (rank === 'Contextual Master') return 3000;
  return 5000;
};

export const LearningHubPage = () => {
  const [, navigate] = useLocation();
  const { user, token } = useAuth();
  const [showGame, setShowGame] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PROGRESS' | 'CHALLENGES' | 'SIGN_LANGUAGE' | 'GERMAN'>('ALL');
  const [showAchievements, setShowAchievements] = useState(false);
  const [signLanguageLanguage, setSignLanguageLanguage] = useState<'en' | 'de'>('en');
  const [completedSignLanguageLessons, setCompletedSignLanguageLessons] = useState<string[]>([]);
  const [completedGermanLessons, setCompletedGermanLessons] = useState<string[]>([]);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/learning/lessons', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setLessons(data);
        }
      } catch (err) {
        console.error("Failed to fetch lessons:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchLessons();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const filteredLessons = useMemo(() => {
    if (activeTab === 'SIGN_LANGUAGE' || activeTab === 'GERMAN') return []; // These have their own components
    if (activeTab === 'ALL') return lessons;
    if (activeTab === 'PROGRESS') {
      return lessons.filter(l => user?.completedLessons?.some(cl => cl.lessonId === l._id));
    }
    if (activeTab === 'CHALLENGES') {
      return lessons.filter(l => !user?.completedLessons?.some(cl => cl.lessonId === l._id));
    }
    return lessons;
  }, [lessons, activeTab, user]);

  const handleStartLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setShowGame(true);
  };

  const getUserProgress = (lessonId: string) => {
    const completion = user?.completedLessons?.find(l => l.lessonId === lessonId);
    return completion ? 100 : 0; 
  };

  const getXPProgress = () => {
    if (!user) return 0;
    const threshold = getRankThreshold(user.rank);
    return Math.min((user.xp / threshold) * 100, 100);
  };

  const handleSignLanguageLessonComplete = (lesson: any, xp: number) => {
    // Update user's XP and track completion
    console.log(`Completed sign language lesson: ${lesson.title}, Earned: ${xp} XP`);
    setCompletedSignLanguageLessons([...completedSignLanguageLessons, lesson.id]);
    // You can dispatch an action here or make API call to update user progress
  };

  const handleGermanLessonComplete = (lesson: any, xp: number) => {
    // Update user's XP and track completion
    console.log(`Completed German lesson: ${lesson.title}, Earned: ${xp} XP`);
    setCompletedGermanLessons([...completedGermanLessons, lesson.id]);
    // You can dispatch an action here or make API call to update user progress
  };

  if (showGame && selectedLessonId) {
    return (
      <PageTransition>
        <div className="flex flex-col w-full min-h-screen bg-[#fbf9f5]">
          <nav className="flex w-full items-center justify-between px-8 py-4 bg-[#fbf9f5cc] backdrop-blur-md sticky top-0 z-50">
            <motion.span 
              onClick={() => setShowGame(false)}
              whileHover={{ opacity: 0.8 }}
              className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-2xl tracking-[-1.20px] cursor-pointer"
            >
              BeyondWords
            </motion.span>
            <Button variant="ghost" onClick={() => setShowGame(false)} className="text-[#414846] font-medium">Exit Lesson</Button>
          </nav>
          <main className="w-full max-w-7xl mx-auto px-8 py-16 flex items-center justify-center min-h-[80vh]">
            <NuanceGame lessonId={selectedLessonId} onComplete={() => setShowGame(false)} />
          </main>
        </div>
      </PageTransition>
    );
  }

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
          <div className="inline-flex gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="text-[#414846] font-medium">Dashboard</Button>
            <Button variant="ghost" onClick={() => setShowAchievements(true)} className="text-[#414846] font-medium">Achievements</Button>
          </div>
        </nav>

        <main className="w-full max-w-7xl mx-auto px-8 py-16">
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-16"
          >
            {/* Hero Section */}
            <section className="flex flex-col md:flex-row items-center justify-between gap-12 pt-8">
              <div className="flex flex-col items-start gap-4 max-w-xl">
                <motion.div variants={fadeUp}>
                  <Badge className="bg-[#102c261a] text-[#102c26] border-none px-3 py-1 font-bold tracking-widest uppercase text-[10px]">
                    INTELLECTUAL GROWTH
                  </Badge>
                </motion.div>
                <motion.h1 variants={fadeUp} className="[font-family:'Manrope',Helvetica] font-bold text-[#102c26] text-6xl tracking-tight leading-[0.9]">
                  Master the <br /> 
                  <span className="font-light italic">Art of Dialogue</span>
                </motion.h1>
                <motion.p variants={fadeUp} className="text-[#414846] text-xl leading-relaxed mt-4">
                  Master communication through curated challenges, cognitive exercises, and philological mastery.
                </motion.p>
              </div>

              <motion.div variants={scaleIn} className="flex-1 w-full max-w-sm">
                <Card className="bg-[#102c26] border-none shadow-2xl p-8 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Trophy className="w-32 h-32 text-white" />
                  </div>
                  <div className="flex flex-col gap-6 relative z-10">
                    <div className="flex flex-col gap-1">
                      <span className="text-[#77948c] text-xs font-bold uppercase tracking-widest">CURRENT RANK</span>
                      <span className="text-white text-3xl font-bold tracking-tight">{user?.rank || 'Philologist Apprentice'}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-end">
                        <span className="text-[#77948c] text-[10px] font-bold uppercase tracking-widest">XP Progress</span>
                        <span className="text-white text-xs font-bold font-mono">{user?.xp || 0} / {getRankThreshold(user?.rank || '')}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          key={user?.xp}
                          initial={{ width: 0 }}
                          animate={{ width: `${getXPProgress()}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-[#eddec5]"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </section>

            {/* Modules Grid Header */}
            <section className="flex items-center justify-between border-b pb-8 border-[#102c260d]">
              <div className="flex items-center gap-6 flex-wrap">
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveTab('ALL')}
                  className={`font-bold transition-all rounded-none px-0 h-auto pb-4 ${activeTab === 'ALL' ? 'text-[#102c26] border-b-2 border-[#102c26]' : 'text-[#414846] opacity-60'}`}
                >
                  ALL MODULES
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveTab('PROGRESS')}
                  className={`font-bold transition-all rounded-none px-0 h-auto pb-4 ${activeTab === 'PROGRESS' ? 'text-[#102c26] border-b-2 border-[#102c26]' : 'text-[#414846] opacity-60'}`}
                >
                  MY PROGRESS
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveTab('CHALLENGES')}
                  className={`font-bold transition-all rounded-none px-0 h-auto pb-4 ${activeTab === 'CHALLENGES' ? 'text-[#102c26] border-b-2 border-[#102c26]' : 'text-[#414846] opacity-60'}`}
                >
                  CHALLENGES
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveTab('SIGN_LANGUAGE')}
                  className={`font-bold transition-all rounded-none px-0 h-auto pb-4 flex items-center gap-2 ${activeTab === 'SIGN_LANGUAGE' ? 'text-[#102c26] border-b-2 border-[#102c26]' : 'text-[#414846] opacity-60'}`}
                >
                  <Hand className="w-4 h-4" />
                  SIGN LANGUAGE
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveTab('GERMAN')}
                  className={`font-bold transition-all rounded-none px-0 h-auto pb-4 flex items-center gap-2 ${activeTab === 'GERMAN' ? 'text-[#102c26] border-b-2 border-[#102c26]' : 'text-[#414846] opacity-60'}`}
                >
                  <Globe className="w-4 h-4" />
                  GERMAN
                </Button>
              </div>
              <div className="flex items-center gap-4">
                {activeTab === 'SIGN_LANGUAGE' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setSignLanguageLanguage('en')}
                      variant={signLanguageLanguage === 'en' ? 'default' : 'outline'}
                      className="text-sm"
                    >
                      🇬🇧 English
                    </Button>
                    <Button
                      onClick={() => setSignLanguageLanguage('de')}
                      variant={signLanguageLanguage === 'de' ? 'default' : 'outline'}
                      className="text-sm"
                    >
                      🇩🇪 Deutsch
                    </Button>
                  </div>
                )}
                <Button variant="outline" size="icon" className="rounded-full"><Search className="w-4 h-4" /></Button>
              </div>
            </section>

            {/* Grid */}
            {activeTab === 'SIGN_LANGUAGE' ? (
              <section className="pb-32">
                <SignLanguageLearning 
                  language={signLanguageLanguage} 
                  onLessonComplete={handleSignLanguageLessonComplete}
                />
              </section>
            ) : activeTab === 'GERMAN' ? (
              <section className="pb-32">
                <GermanLearning 
                  onLessonComplete={handleGermanLessonComplete}
                />
              </section>
            ) : (
              <>
                {/* Progress Summary from All Modules */}
                {(activeTab === 'PROGRESS' || activeTab === 'CHALLENGES') && (
                  <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                      <CardContent className="p-6">
                        <div className="text-3xl mb-2">📚</div>
                        <h3 className="font-bold text-[#102c26] mb-1">Language Lessons</h3>
                        <p className="text-sm text-slate-600 mb-3">Interactive grammar & vocabulary</p>
                        <span className="font-bold text-blue-600">{completedGermanLessons.length} / 10 Completed</span>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                      <CardContent className="p-6">
                        <div className="text-3xl mb-2">🖐️</div>
                        <h3 className="font-bold text-[#102c26] mb-1">Sign Language</h3>
                        <p className="text-sm text-slate-600 mb-3">Hand gestures & recognition</p>
                        <span className="font-bold text-purple-600">{completedSignLanguageLessons.length} / 7 Completed</span>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                      <CardContent className="p-6">
                        <div className="text-3xl mb-2">🌍</div>
                        <h3 className="font-bold text-[#102c26] mb-1">Overall Progress</h3>
                        <p className="text-sm text-slate-600 mb-3">All modules combined</p>
                        <span className="font-bold text-emerald-600">{completedGermanLessons.length + completedSignLanguageLessons.length} / 17 Completed</span>
                      </CardContent>
                    </Card>
                  </section>
                )}
                
                <section className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-32">
                  {isLoading ? (
                    <div className="col-span-3 text-center py-20 text-[#102c26] font-medium italic">Discovering lessons...</div>
                  ) : filteredLessons.length === 0 ? (
                    <div className="col-span-3 text-center py-20 text-[#102c26] font-medium italic opacity-60">
                      <div className="mb-4">No modules found in this category.</div>
                      {activeTab === 'PROGRESS' && (
                        <div className="text-sm text-slate-600">
                          💡 View your progress in <span className="font-bold cursor-pointer hover:text-blue-600" onClick={() => setActiveTab('GERMAN')}>German Learning</span> and <span className="font-bold cursor-pointer hover:text-purple-600" onClick={() => setActiveTab('SIGN_LANGUAGE')}>Sign Language</span> tabs
                        </div>
                      )}
                    </div>
                  ) : (
                    filteredLessons.map((m) => {
                      const Icon = iconMap[m.category] || Brain;
                      const progress = getUserProgress(m._id);
                      return (
                        <motion.div key={m._id} variants={fadeUp} whileHover="hover" initial="rest" animate="rest" className="h-full">
                          <motion.div variants={cardHover} className="h-full">
                            <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden cursor-pointer h-full flex flex-col group">
                              <div className="w-full h-48 relative bg-[#f5f3ef] p-6 flex items-center justify-center">
                                <img src={m.image} alt={m.title} className="w-full h-full object-contain filter group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute top-4 left-4">
                                  <Badge className="bg-white/80 backdrop-blur-md text-[#685d4a] border-none text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                                    {m.category}
                                  </Badge>
                                </div>
                                <div className="absolute top-4 right-4 bg-white/50 p-2 rounded-full">
                                  <Icon className="w-4 h-4 text-[#102c26]" />
                                </div>
                              </div>
                              <CardContent className="p-8 flex-1 flex flex-col gap-6">
                                <div className="flex flex-col gap-2 text-left">
                                  <h3 className="text-[#102c26] font-bold text-2xl tracking-tight leading-tight">{m.title}</h3>
                                  <p className="text-[#414846] text-sm leading-relaxed opacity-80">{m.description}</p>
                                </div>
                                
                                <div className="mt-auto flex flex-col gap-4">
                                  <div className="flex justify-between items-center text-[10px] font-bold tracking-widest text-[#685d4a] opacity-60">
                                    <span>{m.difficulty.toUpperCase()}</span>
                                    <span>{progress}% COMPLETE</span>
                                  </div>
                                  <div className="w-full h-1 bg-[#102c260d] rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progress}%` }}
                                      transition={{ duration: 1, delay: 0.5 }}
                                      className="h-full bg-[#102c26]"
                                    />
                                  </div>
                                  <Button 
                                    onClick={() => handleStartLesson(m._id)}
                                    className="w-full group/btn bg-transparent hover:bg-[#102c26] text-[#102c26] hover:text-white border-[#102c261a] border h-12 rounded-xl flex items-center justify-center gap-2 transition-all"
                                  >
                                    <span className="font-bold text-sm">{progress > 0 ? "Review Lesson" : "Start Learning"}</span>
                                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        </motion.div>
                      );
                    })
                  )}
                </section>
              </>
            )}
          </motion.div>
        </main>

        <AchievementsDialog 
          open={showAchievements} 
          onOpenChange={setShowAchievements} 
        />
      </div>
    </PageTransition>
  );
};

