import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Volume2, CheckCircle2, Lock, ArrowRight, ArrowLeft,
  RefreshCw, Trophy, Sparkles, BookOpen, Brain, Check,
  X, AlertTriangle, Lightbulb, Star, ShieldCheck, HelpCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface ContentBlock {
  type: string;
  data: any;
}

export interface GermanLevel {
  _id: string;
  title: string;
  description: string;
  category: 'INTERACTIVE' | 'THEORY' | 'MASTERY';
  difficulty: string;
  level: number;
  order: number;
  academy: string;
  xpReward: number;
  stableKey: string;
  image?: string;
  isUnlocked?: boolean;
  userProgress?: {
    status: string;
    score: number;
    bestScore: number;
    attemptsCount: number;
    isPassed: boolean;
  } | null;
  contentBlocks?: ContentBlock[];
}

interface QuizQuestion {
  _id: string;
  type: 'MULTIPLE_CHOICE' | 'MATCHING' | 'FILL_BLANK' | 'SIGN_PRACTICE';
  prompt?: string;
  options?: string[];
  leftItems?: { id: string; text: string }[];
  rightItems?: { id: string; text: string }[];
  blankText?: string;
  explanation?: string;
  nuance?: string;
}

interface GermanLearningProps {
  onLessonComplete?: (lesson: any, xp: number) => void;
}

type LearningStage = 'LEARN' | 'GUIDED_PRACTICE' | 'PRACTICE_CHALLENGE' | 'REVISION' | 'FINAL_ASSESSMENT';

export const GermanLearning = ({ onLessonComplete }: GermanLearningProps) => {
  const { user, token } = useAuth();
  const [levels, setLevels] = useState<GermanLevel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<GermanLevel | null>(null);
  const [activeStage, setActiveStage] = useState<LearningStage>('LEARN');

  // Flashcards state for Guided Practice
  const [flashcardIdx, setFlashcardIdx] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Sentence builder state
  const [selectedChips, setSelectedChips] = useState<number[]>([]);
  const [sentenceChecked, setSentenceChecked] = useState<boolean>(false);
  const [sentenceCorrect, setSentenceCorrect] = useState<boolean>(false);

  // Practice Challenge interactive state
  const [challengeAnswers, setChallengeAnswers] = useState<Record<number, any>>({});
  const [challengeFeedback, setChallengeFeedback] = useState<Record<number, { isCorrect: boolean; explanation: string }>>({});

  // Final Assessment state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isQuizLoading, setIsQuizLoading] = useState<boolean>(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [assessmentAnswers, setAssessmentAnswers] = useState<any[]>([]);
  const [matchingSelectedLeft, setMatchingSelectedLeft] = useState<string | null>(null);
  const [matchingCurrentPairs, setMatchingCurrentPairs] = useState<{ leftId: string; rightId: string }[]>([]);
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<{
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    xpGained: number;
  } | null>(null);

  // Web Speech API for German pronunciation
  const playPronunciation = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis not available or failed:', e);
    }
  }, []);

  // Fetch all 10 German levels from backend API
  const fetchGermanLevels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/learning/lessons?academy=GERMAN', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(`Failed to load German levels: ${res.statusText}`);
      }
      const data: GermanLevel[] = await res.json();
      setLevels(data);
    } catch (err: any) {
      console.error('Error fetching German levels:', err);
      setError(err.message || 'Failed to load German curriculum.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchGermanLevels();
    }
  }, [token, fetchGermanLevels]);

  // Select and open a level
  const handleSelectLevel = async (level: GermanLevel) => {
    if (!level.isUnlocked) return;
    
    // Reset view states
    setActiveStage('LEARN');
    setFlashcardIdx(0);
    setIsFlipped(false);
    setSelectedChips([]);
    setSentenceChecked(false);
    setSentenceCorrect(false);
    setChallengeAnswers({});
    setChallengeFeedback({});
    setAssessmentResult(null);
    setCurrentQuestionIdx(0);
    setMatchingSelectedLeft(null);
    setMatchingCurrentPairs([]);

    // If level contentBlocks are not present, fetch full lesson
    if (!level.contentBlocks || level.contentBlocks.length === 0) {
      try {
        const res = await fetch(`http://localhost:5000/api/learning/lesson/${level._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const fullLesson = await res.json();
          setSelectedLevel(fullLesson);
          return;
        }
      } catch (err) {
        console.error('Failed to load lesson details:', err);
      }
    }
    setSelectedLevel(level);
  };

  // Load sanitized quiz questions when navigating to Final Assessment
  const handleLoadAssessment = useCallback(async (lessonId: string) => {
    setIsQuizLoading(true);
    setAssessmentResult(null);
    setCurrentQuestionIdx(0);
    setMatchingSelectedLeft(null);
    setMatchingCurrentPairs([]);
    try {
      const res = await fetch(`http://localhost:5000/api/learning/quiz/${lessonId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuizQuestions(data.questions || []);
        // Initialize empty answers array
        setAssessmentAnswers(new Array((data.questions || []).length).fill(null));
      } else {
        const errData = await res.json();
        alert(errData.message || 'Could not load quiz questions.');
      }
    } catch (err) {
      console.error('Failed to load quiz:', err);
    } finally {
      setIsQuizLoading(false);
    }
  }, [token]);

  // Handle switching stage
  const handleStageChange = (stage: LearningStage) => {
    setActiveStage(stage);
    if (stage === 'FINAL_ASSESSMENT' && selectedLevel) {
      handleLoadAssessment(selectedLevel._id);
    }
  };

  // Record answer for current quiz question
  const handleSetAnswer = (answer: any) => {
    setAssessmentAnswers((prev) => {
      const updated = [...prev];
      updated[currentQuestionIdx] = answer;
      return updated;
    });
  };

  // Matching interaction in Assessment
  const handleMatchingPair = (leftId: string, rightId: string) => {
    const nextPairs = matchingCurrentPairs.filter(p => p.leftId !== leftId && p.rightId !== rightId);
    nextPairs.push({ leftId, rightId });
    setMatchingCurrentPairs(nextPairs);
    handleSetAnswer(nextPairs);
    setMatchingSelectedLeft(null);
  };

  const handleRemoveMatchingPair = (leftId: string) => {
    const nextPairs = matchingCurrentPairs.filter(p => p.leftId !== leftId);
    setMatchingCurrentPairs(nextPairs);
    handleSetAnswer(nextPairs);
  };

  // Submit Final Assessment
  const handleSubmitAssessment = async () => {
    if (!selectedLevel) return;
    setIsSubmittingAssessment(true);
    const idempotencyKey = `de_eval_${selectedLevel._id}_${Date.now()}`;

    try {
      const res = await fetch(`http://localhost:5000/api/learning/quiz/${selectedLevel._id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          answers: assessmentAnswers,
          idempotencyKey
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Assessment submission failed');
      }

      setAssessmentResult({
        score: data.score,
        maxScore: data.maxScore,
        percentage: data.percentage,
        passed: data.passed,
        xpGained: data.xpGained || 0
      });

      // Notify parent to update user stats
      if (data.passed) {
        onLessonComplete?.(selectedLevel, data.xpGained || 0);
        // Refresh levels list to unlock next level
        fetchGermanLevels();
      }
    } catch (err: any) {
      console.error('Error submitting assessment:', err);
      alert(err.message || 'Failed to submit assessment.');
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  // Helper getters for content blocks of selected level
  const conceptIntroBlock = useMemo(
    () => selectedLevel?.contentBlocks?.find(b => b.type === 'CONCEPT_INTRO')?.data,
    [selectedLevel]
  );
  const vocabularyBlock = useMemo(
    () => selectedLevel?.contentBlocks?.find(b => b.type === 'VOCABULARY_DECK')?.data,
    [selectedLevel]
  );
  const grammarBlock = useMemo(
    () => selectedLevel?.contentBlocks?.find(b => b.type === 'GRAMMAR_RULE')?.data,
    [selectedLevel]
  );
  const guidedPracticeBlock = useMemo(
    () => selectedLevel?.contentBlocks?.find(b => b.type === 'PRACTICE_DRILL')?.data,
    [selectedLevel]
  );
  const practiceChallengeBlock = useMemo(
    () => selectedLevel?.contentBlocks?.find(b => b.type === 'FORMATIVE_DRILL')?.data,
    [selectedLevel]
  );
  const revisionBlock = useMemo(
    () => selectedLevel?.contentBlocks?.find(b => b.type === 'REVISION_SUMMARY')?.data,
    [selectedLevel]
  );

  // Overall academy stats
  const completedCount = useMemo(
    () => levels.filter(l => l.userProgress?.isPassed).length,
    [levels]
  );
  const totalEarnedXp = useMemo(
    () => levels.filter(l => l.userProgress?.isPassed).reduce((acc, l) => acc + (l.xpReward || 100), 0),
    [levels]
  );

  // ==========================================
  // VIEW: 5-Stage Level Learner Detail
  // ==========================================
  if (selectedLevel) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#102c261a]">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLevel(null)}
              className="rounded-full border-[#102c2620] hover:bg-[#102c260a] text-[#102c26]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> All Levels
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#102c26] text-white text-[10px] font-bold">
                  LEVEL {selectedLevel.level} • CEFR A1
                </Badge>
                {selectedLevel.userProgress?.isPassed && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                    ✓ COMPLETED
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl font-bold text-[#102c26] mt-1">{selectedLevel.title}</h2>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">REWARD</span>
            <div className="text-lg font-bold text-amber-600">+{selectedLevel.xpReward} XP</div>
          </div>
        </div>

        {/* 5-Stage Stepper Navigation */}
        <div className="grid grid-cols-5 gap-2 bg-[#f4f2ec] p-1.5 rounded-xl border border-[#102c2610]">
          {(['LEARN', 'GUIDED_PRACTICE', 'PRACTICE_CHALLENGE', 'REVISION', 'FINAL_ASSESSMENT'] as LearningStage[]).map((stage, idx) => {
            const labels: Record<LearningStage, string> = {
              LEARN: '1. Learn',
              GUIDED_PRACTICE: '2. Guided Practice',
              PRACTICE_CHALLENGE: '3. Challenge',
              REVISION: '4. Revision',
              FINAL_ASSESSMENT: '5. Assessment'
            };
            const isActive = activeStage === stage;
            return (
              <button
                key={stage}
                onClick={() => handleStageChange(stage)}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isActive
                    ? 'bg-white text-[#102c26] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>{labels[stage]}</span>
              </button>
            );
          })}
        </div>

        {/* STAGE 1: LEARN */}
        {activeStage === 'LEARN' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Concept Introduction */}
            {conceptIntroBlock && (
              <Card className="border border-[#102c2615] bg-white shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <BookOpen className="w-4 h-4" />
                    <span>CONCEPT OVERVIEW</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#102c26]">{conceptIntroBlock.title}</h3>
                  <p className="text-slate-700 leading-relaxed">{conceptIntroBlock.overview}</p>
                  {conceptIntroBlock.culturalNote && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
                      <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold uppercase text-amber-800 tracking-wider">Kultur-Tipp (Cultural Note)</div>
                        <p className="text-sm text-amber-900 mt-1">{conceptIntroBlock.culturalNote}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Vocabulary Deck */}
            {vocabularyBlock && vocabularyBlock.items && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#102c26] flex items-center gap-2">
                    <span>📚</span> {vocabularyBlock.title || 'Wortschatz (Vocabulary)'}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">Click audio icon to listen</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vocabularyBlock.items.map((item: any, i: number) => (
                    <Card key={i} className="border border-slate-200 hover:border-slate-300 transition-all rounded-xl p-4 bg-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-[#102c26]">{item.german}</span>
                            <button
                              onClick={() => playPronunciation(item.german)}
                              title="Listen to German pronunciation"
                              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-700 flex items-center justify-center transition-colors"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">[{item.phonetic}]</div>
                        </div>
                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                          {item.english}
                        </Badge>
                      </div>
                      {item.exampleDe && (
                        <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1">
                          <div className="flex items-center justify-between text-slate-800 font-medium">
                            <span>"{item.exampleDe}"</span>
                            <button
                              onClick={() => playPronunciation(item.exampleDe)}
                              className="text-slate-400 hover:text-slate-700"
                              title="Listen to example sentence"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-slate-500 italic">→ {item.exampleEn}</div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Grammar Rule */}
            {grammarBlock && (
              <Card className="border border-blue-200 bg-blue-50/50 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                  <Brain className="w-4 h-4 text-blue-700" />
                  <span>GRAMMAR RULE: {grammarBlock.ruleName}</span>
                </div>
                <h4 className="text-lg font-bold text-blue-950">{grammarBlock.title}</h4>
                <p className="text-slate-700 text-sm leading-relaxed">{grammarBlock.explanation}</p>
                {grammarBlock.examples && (
                  <div className="bg-white rounded-xl p-4 border border-blue-100 space-y-2">
                    <div className="text-xs font-bold uppercase text-slate-500 tracking-wider">Examples in Context</div>
                    {grammarBlock.examples.map((ex: any, i: number) => (
                      <div key={i} className="text-sm border-b border-slate-100 pb-2 last:border-none last:pb-0">
                        <div className="font-bold text-[#102c26] flex items-center justify-between">
                          <span>{ex.german}</span>
                          <button
                            onClick={() => playPronunciation(ex.german)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-slate-600 text-xs mt-0.5">{ex.english}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => handleStageChange('GUIDED_PRACTICE')}
                className="bg-[#102c26] text-white hover:bg-[#1a443c] px-6 py-3 rounded-xl font-bold flex items-center gap-2"
              >
                Proceed to Guided Practice <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STAGE 2: GUIDED PRACTICE */}
        {activeStage === 'GUIDED_PRACTICE' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Interactive Flashcards */}
            {guidedPracticeBlock?.flashcards && guidedPracticeBlock.flashcards.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-[#102c26] flex items-center gap-2">
                  <span>🗂️</span> Interactive Flashcards ({flashcardIdx + 1}/{guidedPracticeBlock.flashcards.length})
                </h3>
                <div className="flex flex-col items-center justify-center">
                  <div
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="w-full max-w-lg min-h-[200px] cursor-pointer bg-white border-2 border-[#102c2620] hover:border-[#102c2650] rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-md transition-all select-none relative"
                  >
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 absolute top-4 left-4">
                      {isFlipped ? 'Translation (Back)' : 'German Term (Front)'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playPronunciation(guidedPracticeBlock.flashcards[flashcardIdx].front);
                      }}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 flex items-center justify-center"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <div className="text-3xl font-bold text-[#102c26]">
                      {isFlipped
                        ? guidedPracticeBlock.flashcards[flashcardIdx].back
                        : guidedPracticeBlock.flashcards[flashcardIdx].front}
                    </div>

                    {guidedPracticeBlock.flashcards[flashcardIdx].hint && (
                      <p className="text-xs text-slate-500 mt-4 italic">
                        💡 Hint: {guidedPracticeBlock.flashcards[flashcardIdx].hint}
                      </p>
                    )}

                    <span className="text-xs font-semibold text-emerald-700 mt-6 bg-emerald-50 px-3 py-1 rounded-full">
                      Click card to {isFlipped ? 'see German' : 'flip & reveal'}
                    </span>
                  </div>

                  <div className="flex gap-4 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={flashcardIdx === 0}
                      onClick={() => {
                        setIsFlipped(false);
                        setFlashcardIdx(flashcardIdx - 1);
                      }}
                      className="rounded-xl"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" /> Previous Card
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={flashcardIdx >= guidedPracticeBlock.flashcards.length - 1}
                      onClick={() => {
                        setIsFlipped(false);
                        setFlashcardIdx(flashcardIdx + 1);
                      }}
                      className="rounded-xl"
                    >
                      Next Card <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Sentence Builder */}
            {guidedPracticeBlock?.sentenceBuilders && guidedPracticeBlock.sentenceBuilders.length > 0 && (
              <Card className="border border-purple-200 bg-purple-50/40 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                  <span>🧩</span> SENTENCE BUILDER DRILL
                </div>
                {guidedPracticeBlock.sentenceBuilders.map((drill: any, dIdx: number) => {
                  const segments = drill.segments || [];
                  const assembledWords = selectedChips.map(idx => segments[idx]);
                  const isReady = selectedChips.length === segments.length;

                  const handleChipClick = (chipIdx: number) => {
                    if (sentenceChecked) return;
                    if (selectedChips.includes(chipIdx)) {
                      setSelectedChips(selectedChips.filter(i => i !== chipIdx));
                    } else {
                      setSelectedChips([...selectedChips, chipIdx]);
                    }
                  };

                  const handleCheckSentence = () => {
                    const isCorrect = JSON.stringify(selectedChips) === JSON.stringify(drill.correctOrder);
                    setSentenceCorrect(isCorrect);
                    setSentenceChecked(true);
                  };

                  const handleReset = () => {
                    setSelectedChips([]);
                    setSentenceChecked(false);
                    setSentenceCorrect(false);
                  };

                  return (
                    <div key={dIdx} className="space-y-4">
                      <p className="text-sm font-bold text-slate-800">{drill.prompt}</p>

                      {/* Assembled sentence box */}
                      <div className="min-h-[50px] p-3 bg-white border border-purple-200 rounded-xl flex items-center gap-2 flex-wrap">
                        {assembledWords.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">Click words below to assemble the sentence...</span>
                        ) : (
                          assembledWords.map((word, i) => (
                            <span key={i} className="px-2.5 py-1 bg-purple-100 text-purple-900 rounded-lg text-sm font-bold">
                              {word}
                            </span>
                          ))
                        )}
                      </div>

                      {/* Chips pool */}
                      <div className="flex flex-wrap gap-2">
                        {segments.map((seg: string, chipIdx: number) => {
                          const isUsed = selectedChips.includes(chipIdx);
                          return (
                            <button
                              key={chipIdx}
                              disabled={sentenceChecked || isUsed}
                              onClick={() => handleChipClick(chipIdx)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                                isUsed
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-white border border-slate-300 hover:border-purple-500 text-[#102c26] shadow-sm'
                              }`}
                            >
                              {seg}
                            </button>
                          );
                        })}
                      </div>

                      {/* Result feedback */}
                      {sentenceChecked && (
                        <div className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${
                          sentenceCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {sentenceCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          {sentenceCorrect ? 'Ausgezeichnet! Correct word order.' : 'Not quite. Check German V2 word order rules.'}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          disabled={!isReady || sentenceChecked}
                          onClick={handleCheckSentence}
                          className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg"
                        >
                          Check Sentence
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleReset}
                          className="text-xs font-bold rounded-lg"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" /> Reset
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </Card>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => handleStageChange('LEARN')}
                className="rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Learn
              </Button>
              <Button
                onClick={() => handleStageChange('PRACTICE_CHALLENGE')}
                className="bg-[#102c26] text-white hover:bg-[#1a443c] px-6 py-3 rounded-xl font-bold flex items-center gap-2"
              >
                Proceed to Challenge <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STAGE 3: PRACTICE CHALLENGE */}
        {activeStage === 'PRACTICE_CHALLENGE' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-center">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <div className="text-sm text-amber-900">
                <span className="font-bold">Practice Challenge:</span> Test your comprehension with immediate feedback before taking the graded Final Assessment.
              </div>
            </div>

            {practiceChallengeBlock?.drills && practiceChallengeBlock.drills.map((drill: any, idx: number) => {
              const selectedAnswer = challengeAnswers[idx];
              const feedback = challengeFeedback[idx];

              const handleSelectOption = (optIdx: number) => {
                if (feedback) return;
                const isCorrect = optIdx === drill.answer;
                setChallengeAnswers({ ...challengeAnswers, [idx]: optIdx });
                setChallengeFeedback({
                  ...challengeFeedback,
                  [idx]: {
                    isCorrect,
                    explanation: drill.explanation || (isCorrect ? 'Correct!' : 'Incorrect.')
                  }
                });
              };

              return (
                <Card key={idx} className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs uppercase font-bold text-slate-500">
                      CHALLENGE DRILL {idx + 1} • {drill.type}
                    </Badge>
                    {feedback && (
                      <Badge className={feedback.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}>
                        {feedback.isCorrect ? '✓ Correct' : '✕ Try Reviewing'}
                      </Badge>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-[#102c26]">{drill.prompt}</h4>

                  {drill.type === 'MCQ' && drill.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {drill.options.map((opt: string, optIdx: number) => {
                        let btnStyle = 'border-slate-200 hover:border-slate-400 bg-white text-slate-800';
                        if (feedback) {
                          if (optIdx === drill.answer) btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                          else if (selectedAnswer === optIdx) btnStyle = 'border-rose-400 bg-rose-50 text-rose-800';
                          else btnStyle = 'border-slate-200 opacity-50 bg-slate-50';
                        } else if (selectedAnswer === optIdx) {
                          btnStyle = 'border-[#102c26] bg-[#102c2610] text-[#102c26] font-bold';
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={!!feedback}
                            onClick={() => handleSelectOption(optIdx)}
                            className={`p-3.5 rounded-xl border text-sm text-left transition-all ${btnStyle}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {feedback && (
                    <div className={`p-4 rounded-xl text-xs space-y-1 ${
                      feedback.isCorrect ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                    }`}>
                      <div className="font-bold">{feedback.isCorrect ? 'Well done!' : 'Explanation:'}</div>
                      <div>{feedback.explanation}</div>
                    </div>
                  )}
                </Card>
              );
            })}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => handleStageChange('GUIDED_PRACTICE')}
                className="rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Guided Practice
              </Button>
              <Button
                onClick={() => handleStageChange('REVISION')}
                className="bg-[#102c26] text-white hover:bg-[#1a443c] px-6 py-3 rounded-xl font-bold flex items-center gap-2"
              >
                Proceed to Revision <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STAGE 4: REVISION */}
        {activeStage === 'REVISION' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {revisionBlock && (
              <>
                {/* Grammar Cheat Sheet */}
                {revisionBlock.cheatSheet && (
                  <Card className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-bold text-[#102c26] flex items-center gap-2">
                      <span>📑</span> Key Takeaways & Cheat Sheet
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {revisionBlock.cheatSheet.map((item: any, i: number) => (
                        <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                          <div className="font-bold text-sm text-[#102c26]">{item.concept}</div>
                          <div className="text-xs text-slate-600 leading-relaxed">{item.rule}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Common Pitfalls */}
                {revisionBlock.commonPitfalls && (
                  <Card className="border border-rose-200 bg-rose-50/30 rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-bold text-rose-900 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600" /> Common Mistakes to Avoid
                    </h3>
                    <div className="space-y-2">
                      {revisionBlock.commonPitfalls.map((pitfall: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-rose-950 font-medium">
                          <span className="text-rose-600 font-bold">•</span>
                          <span>{pitfall}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Quick Check Questions */}
                {revisionBlock.quickCheckQuestions && (
                  <Card className="border border-emerald-200 bg-emerald-50/30 rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-emerald-600" /> Quick Self-Check
                    </h3>
                    <div className="space-y-3">
                      {revisionBlock.quickCheckQuestions.map((q: string, i: number) => (
                        <div key={i} className="p-3 bg-white border border-emerald-200 rounded-xl text-xs text-slate-800 font-medium">
                          {q}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => handleStageChange('PRACTICE_CHALLENGE')}
                className="rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Challenge
              </Button>
              <Button
                onClick={() => handleStageChange('FINAL_ASSESSMENT')}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md"
              >
                Start Final Assessment <Trophy className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STAGE 5: FINAL ASSESSMENT */}
        {activeStage === 'FINAL_ASSESSMENT' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {isQuizLoading ? (
              <div className="text-center py-20 text-slate-500 font-medium">Loading assessment questions...</div>
            ) : assessmentResult ? (
              /* Assessment Graded Outcome Card */
              <Card className={`border-2 rounded-2xl p-8 text-center shadow-lg ${
                assessmentResult.passed ? 'border-emerald-400 bg-emerald-50/50' : 'border-rose-400 bg-rose-50/50'
              }`}>
                <div className="text-6xl mb-4">{assessmentResult.passed ? '🎉' : '📖'}</div>
                <h3 className="text-3xl font-bold text-[#102c26]">
                  {assessmentResult.passed ? 'Level Passed!' : 'Need More Practice'}
                </h3>
                <p className="text-slate-600 mt-2 max-w-md mx-auto">
                  {assessmentResult.passed
                    ? 'Congratulations! You demonstrated mastery of this level and unlocked the next chapter in your German journey.'
                    : 'You scored below the 70% passing threshold. Review the Revision stage to consolidate key rules before retaking.'}
                </p>

                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto my-6 p-4 bg-white rounded-xl border border-slate-200">
                  <div>
                    <div className="text-xs uppercase text-slate-500 font-bold">SCORE</div>
                    <div className="text-2xl font-bold text-[#102c26]">
                      {assessmentResult.score} / {assessmentResult.maxScore}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-slate-500 font-bold">PERCENTAGE</div>
                    <div className="text-2xl font-bold text-[#102c26]">{assessmentResult.percentage}%</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-slate-500 font-bold">XP EARNED</div>
                    <div className="text-2xl font-bold text-amber-600">+{assessmentResult.xpGained} XP</div>
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  {assessmentResult.passed ? (
                    <Button
                      onClick={() => {
                        setSelectedLevel(null);
                        fetchGermanLevels();
                      }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-6 py-2.5 rounded-xl"
                    >
                      Return to Curriculum Roadmap
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => handleStageChange('REVISION')}
                        className="font-bold px-6 rounded-xl"
                      >
                        Review Revision Notes
                      </Button>
                      <Button
                        onClick={() => handleLoadAssessment(selectedLevel._id)}
                        className="bg-[#102c26] text-white hover:bg-[#1a443c] font-bold px-6 rounded-xl"
                      >
                        Retake Assessment
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ) : quizQuestions.length === 0 ? (
              <div className="text-center py-20 text-slate-500">No questions found for this level.</div>
            ) : (
              /* Question Runner */
              <div className="space-y-6">
                {/* Progress bar */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Question {currentQuestionIdx + 1} of {quizQuestions.length}</span>
                  <span>Pass Threshold: 70%</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${((currentQuestionIdx + 1) / quizQuestions.length) * 100}%` }}
                  />
                </div>

                {/* Active Question Box */}
                {(() => {
                  const q = quizQuestions[currentQuestionIdx];
                  const currentAnswer = assessmentAnswers[currentQuestionIdx];

                  return (
                    <Card className="border border-slate-200 bg-white rounded-2xl p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs uppercase font-bold text-slate-500">
                          {q.type.replace('_', ' ')}
                        </Badge>
                        {q.prompt && (
                          <button
                            onClick={() => playPronunciation(q.prompt!)}
                            className="text-slate-400 hover:text-slate-700 flex items-center gap-1 text-xs font-bold"
                          >
                            <Volume2 className="w-4 h-4" /> Listen
                          </button>
                        )}
                      </div>

                      <h3 className="text-lg font-bold text-[#102c26] leading-snug">{q.prompt}</h3>

                      {/* MULTIPLE CHOICE */}
                      {q.type === 'MULTIPLE_CHOICE' && q.options && (
                        <div className="space-y-3">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = currentAnswer === optIdx;
                            return (
                              <button
                                key={optIdx}
                                onClick={() => handleSetAnswer(optIdx)}
                                className={`w-full p-4 rounded-xl border text-left text-sm transition-all flex items-center justify-between ${
                                  isSelected
                                    ? 'border-[#102c26] bg-[#102c260d] text-[#102c26] font-bold shadow-sm'
                                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                                }`}
                              >
                                <span>{opt}</span>
                                {isSelected && <Check className="w-4 h-4 text-[#102c26]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* FILL IN THE BLANK */}
                      {q.type === 'FILL_BLANK' && (
                        <div className="space-y-4">
                          {q.blankText && (
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-800">
                              {q.blankText}
                            </div>
                          )}
                          <div>
                            <label className="text-xs uppercase font-bold text-slate-500 tracking-wider block mb-1">
                              Your Answer
                            </label>
                            <input
                              type="text"
                              value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                              onChange={(e) => handleSetAnswer(e.target.value)}
                              placeholder="Type the missing German word..."
                              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#102c26]"
                            />
                          </div>
                        </div>
                      )}

                      {/* MATCHING */}
                      {q.type === 'MATCHING' && q.leftItems && q.rightItems && (
                        <div className="space-y-4">
                          <p className="text-xs text-slate-500">
                            Click an item on the left, then click its corresponding match on the right.
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            {/* Left Column */}
                            <div className="space-y-2">
                              <span className="text-xs uppercase font-bold text-slate-500">German</span>
                              {q.leftItems.map((item) => {
                                const isPaired = (matchingCurrentPairs || []).some(p => p.leftId === item.id);
                                const isSelected = matchingSelectedLeft === item.id;
                                return (
                                  <button
                                    key={item.id}
                                    disabled={isPaired}
                                    onClick={() => setMatchingSelectedLeft(item.id)}
                                    className={`w-full p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                                      isPaired
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                        : isSelected
                                        ? 'bg-[#102c26] text-white border-[#102c26]'
                                        : 'bg-white border-slate-200 hover:border-slate-400 text-slate-800'
                                    }`}
                                  >
                                    {item.text}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Right Column */}
                            <div className="space-y-2">
                              <span className="text-xs uppercase font-bold text-slate-500">English</span>
                              {q.rightItems.map((item) => {
                                const isPaired = (matchingCurrentPairs || []).some(p => p.rightId === item.id);
                                return (
                                  <button
                                    key={item.id}
                                    disabled={isPaired || !matchingSelectedLeft}
                                    onClick={() => {
                                      if (matchingSelectedLeft) {
                                        handleMatchingPair(matchingSelectedLeft, item.id);
                                      }
                                    }}
                                    className={`w-full p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                                      isPaired
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                        : matchingSelectedLeft
                                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                                        : 'bg-white border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {item.text}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Connected Pairs Display */}
                          {matchingCurrentPairs.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Connected Pairs:</span>
                              <div className="flex flex-wrap gap-2">
                                {matchingCurrentPairs.map((p, pIdx) => {
                                  const leftTxt = q.leftItems?.find(i => i.id === p.leftId)?.text || p.leftId;
                                  const rightTxt = q.rightItems?.find(i => i.id === p.rightId)?.text || p.rightId;
                                  return (
                                    <span
                                      key={pIdx}
                                      className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-bold flex items-center gap-1.5"
                                    >
                                      <span>{leftTxt} ⇄ {rightTxt}</span>
                                      <button
                                        onClick={() => handleRemoveMatchingPair(p.leftId)}
                                        className="text-emerald-700 hover:text-emerald-900 font-bold"
                                      >
                                        ✕
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })()}

                {/* Question Stepper Controls */}
                <div className="flex justify-between items-center pt-2">
                  <Button
                    variant="outline"
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                    className="rounded-xl"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                  </Button>

                  {currentQuestionIdx < quizQuestions.length - 1 ? (
                    <Button
                      onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                      className="bg-[#102c26] text-white hover:bg-[#1a443c] rounded-xl font-bold px-6"
                    >
                      Next <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      disabled={isSubmittingAssessment}
                      onClick={handleSubmitAssessment}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold px-8 shadow-md"
                    >
                      {isSubmittingAssessment ? 'Grading on Server...' : 'Submit Assessment ✓'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: 10-Level Curriculum Roadmap
  // ==========================================
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Academy Overview Banner */}
      <Card className="border-none bg-gradient-to-br from-[#102c26] to-[#1e4d43] text-white rounded-3xl p-8 relative overflow-hidden shadow-xl">
        <div className="max-w-2xl relative z-10 space-y-4">
          <Badge className="bg-[#eddec5] text-[#102c26] font-bold text-xs uppercase tracking-widest px-3 py-1">
            🇩🇪 CEFR A1 CURRICULUM
          </Badge>
          <h2 className="text-4xl font-bold tracking-tight">German Language Academy</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Follow a structured 10-level progression designed for complete beginners. Each level features five immersive stages: Learn concepts, Guided Practice drills, comprehension Challenges, quick Revision, and authoritative server-graded Final Assessments.
          </p>

          <div className="flex flex-wrap gap-6 pt-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#77948c]">COMPLETION</span>
              <div className="text-2xl font-bold font-mono text-[#eddec5]">
                {completedCount} / 10 Levels
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#77948c]">GERMAN XP EARNED</span>
              <div className="text-2xl font-bold font-mono text-white">
                {totalEarnedXp} XP
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#77948c]">TARGET PROFICIENCY</span>
              <div className="text-2xl font-bold text-white">CEFR A1</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Levels Roadmap Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#102c26]">Curriculum Progression Path</h3>
          <span className="text-xs text-slate-500 font-medium">Sequential unlocking: pass level N (≥70%) to unlock level N+1</span>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-slate-500 italic">Discovering curriculum levels...</div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-center">
            <p>{error}</p>
            <Button
              variant="outline"
              onClick={fetchGermanLevels}
              disabled={isLoading}
              className="mt-4 border-rose-300 text-rose-800 hover:bg-rose-100"
            >
              Retry
            </Button>
          </div>
        ) : levels.length === 0 ? (
          <div className="p-8 bg-white border border-[#102c261a] rounded-2xl text-center">
            <BookOpen className="w-8 h-8 mx-auto text-[#77948c]" />
            <h4 className="mt-3 font-bold text-[#102c26]">German curriculum is not available yet</h4>
            <p className="mt-2 text-sm text-slate-600">
              The lesson database is empty. Seed the learning content on the server, then try again.
            </p>
            <Button
              variant="outline"
              onClick={fetchGermanLevels}
              disabled={isLoading}
              className="mt-4 border-[#102c2640] text-[#102c26]"
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {levels.map((lvl) => {
              const isUnlocked = lvl.isUnlocked;
              const isPassed = lvl.userProgress?.isPassed;
              const bestScore = lvl.userProgress?.bestScore;

              return (
                <motion.div
                  key={lvl._id}
                  whileHover={isUnlocked ? { scale: 1.02, translateY: -2 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    onClick={() => isUnlocked && handleSelectLevel(lvl)}
                    className={`h-full rounded-2xl border transition-all relative overflow-hidden flex flex-col ${
                      !isUnlocked
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : isPassed
                        ? 'bg-white border-emerald-200 hover:border-emerald-300 shadow-sm cursor-pointer'
                        : 'bg-white border-slate-200 hover:border-[#102c2640] shadow-sm cursor-pointer'
                    }`}
                  >
                    <CardContent className="p-6 flex flex-col h-full gap-4">
                      {/* Top status bar */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={
                            isPassed
                              ? 'bg-emerald-100 text-emerald-800'
                              : isUnlocked
                              ? 'bg-[#102c26] text-white'
                              : 'bg-slate-200 text-slate-500'
                          }>
                            LEVEL {lvl.level}
                          </Badge>
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                            CEFR A1
                          </span>
                        </div>

                        {/* Lock / Completed Badge */}
                        {isPassed ? (
                          <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4" /> Passed ({bestScore} pts)
                          </div>
                        ) : isUnlocked ? (
                          <Badge variant="outline" className="text-xs text-blue-700 bg-blue-50 border-blue-200">
                            Ready to Learn
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                            <Lock className="w-3.5 h-3.5" /> Locked
                          </div>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="text-lg font-bold text-[#102c26] leading-snug">{lvl.title}</h4>
                        <p className="text-slate-600 text-xs mt-1.5 leading-relaxed line-clamp-2">
                          {lvl.description}
                        </p>
                      </div>

                      {/* Footer Info & Action */}
                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                          <span>⏱ ~20 min</span>
                          <span>•</span>
                          <span className="font-bold text-amber-600">+{lvl.xpReward} XP</span>
                        </div>

                        {isUnlocked ? (
                          <span className="text-xs font-bold text-[#102c26] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            {isPassed ? 'Review Level' : 'Start Level'} <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Complete Level {lvl.level - 1} first
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
