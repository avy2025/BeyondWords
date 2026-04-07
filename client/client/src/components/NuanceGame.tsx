import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Trophy, ArrowRight, RefreshCcw, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Question {
  idiom: string;
  origin: string;
  options: string[];
  correct: number;
  nuance: string;
}

interface Quiz {
  _id: string;
  lessonId: string;
  questions: Question[];
}

export const NuanceGame = ({ 
  lessonId, 
  onComplete 
}: { 
  lessonId: string;
  onComplete?: () => void 
}) => {
  const { token, updateProgress } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<"loading" | "playing" | "result">("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/learning/quiz/${lessonId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setQuiz(data);
          setGameState("playing");
        } else {
          console.error("Quiz not found");
          onComplete?.();
        }
      } catch (err) {
        console.error("Failed to fetch quiz:", err);
        onComplete?.();
      }
    };

    if (token && lessonId) fetchQuiz();
  }, [token, lessonId, onComplete]);

  const challenge = quiz?.questions[currentIdx];

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === challenge?.correct;
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);
  };

  const nextStep = async () => {
    if (!quiz) return;
    
    if (currentIdx < quiz.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
      setIsCorrect(null);
    } else {
      setIsSubmitting(true);
      await updateProgress(lessonId, score, quiz.questions.length);
      setIsSubmitting(false);
      setGameState("result");
    }
  };

  const reset = () => {
    setCurrentIdx(0);
    setSelected(null);
    setIsCorrect(null);
    setScore(0);
    setGameState("playing");
  };

  if (gameState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#102c26]" />
        <p className="text-[#102c26] font-medium italic">Preparing your symposium...</p>
      </div>
    );
  }

  if (gameState === "result") {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-8 text-center p-12 bg-white rounded-[32px] shadow-2xl border-none"
      >
        <div className="w-24 h-24 bg-[#102c26] text-white rounded-full flex items-center justify-center shadow-xl">
          <Trophy className="w-12 h-12" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-bold text-[#102c26] tracking-tight">Symposium Complete</h2>
          <p className="text-[#685d4a] text-lg font-medium italic">You captured {score} out of {quiz?.questions.length} cultural nuances.</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={reset} variant="outline" className="h-14 px-8 rounded-xl border-[#102c261a] text-[#102c26] font-bold">
            <RefreshCcw className="mr-2 w-4 h-4" /> Try Again
          </Button>
          <Button onClick={onComplete} className="h-14 px-8 rounded-xl bg-[#102c26] text-white font-bold">
            Back to Hub <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  if (!challenge) return null;

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto">
      <div className="flex justify-between items-center px-2">
        <span className="text-[#685d4a] text-xs font-bold tracking-[0.2em] uppercase">NUANCE CHALLENGE {currentIdx + 1}/{quiz?.questions.length}</span>
        <span className="text-[#102c26] text-xs font-bold font-mono">SCORE: {score}</span>
      </div>

      <Card className="p-10 bg-white rounded-[32px] border-none shadow-xl flex flex-col gap-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none select-none">
           <span className="text-9xl font-serif">“</span>
        </div>
        
        <div className="flex flex-col gap-4 relative z-10">
          <span className="text-[#685d4a] text-sm font-medium italic opacity-70">— FROM THE {challenge.origin.toUpperCase()}</span>
          <h3 className="text-[#102c26] text-3xl font-bold tracking-tight leading-tight italic">
            &ldquo;{challenge.idiom}&rdquo;
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-3 content-stretch">
          {challenge.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrectOption = i === challenge.correct;
            let statusClass = "bg-[#f5f3ef] text-[#414846] border-transparent";
            
            if (selected !== null) {
              if (isCorrectOption) statusClass = "bg-green-50 text-green-700 border-green-200";
              else if (isSelected) statusClass = "bg-red-50 text-red-700 border-red-200";
              else statusClass = "bg-[#f5f3ef] text-[#414846] opacity-40 border-transparent";
            }

            return (
              <motion.button
                key={i}
                whileHover={selected === null ? { x: 8, backgroundColor: "#f0ede8" } : {}}
                onClick={() => handleSelect(i)}
                className={`flex items-center justify-between p-6 rounded-2xl border text-left transition-all ${statusClass} ${selected === null ? "cursor-pointer" : "cursor-default"}`}
              >
                <span className="font-bold text-base tracking-tight">{opt}</span>
                {selected !== null && isCorrectOption && <CheckCircle2 className="w-6 h-6 text-green-600" />}
                {selected !== null && isSelected && !isCorrectOption && <XCircle className="w-6 h-6 text-red-600" />}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {selected !== null && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-6 pt-6 border-t border-[#102c260d]"
            >
              <div className="bg-[#102c26] text-white p-6 rounded-2xl relative">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">EDITORIAL NUANCE</span>
                </div>
                <p className="text-sm leading-relaxed italic opacity-90">{challenge.nuance}</p>
              </div>
              <Button 
                onClick={nextStep}
                disabled={isSubmitting}
                className="w-full h-14 bg-[#102c26] hover:bg-[#1a3d35] text-white rounded-xl font-bold shadow-lg"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  currentIdx < (quiz?.questions.length || 0) - 1 ? "Next Nuance" : "See Results"
                )} 
                {!isSubmitting && <ArrowRight className="ml-2 w-4 h-4" />}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};
