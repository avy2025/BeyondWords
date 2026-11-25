import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Lightbulb,
  ListChecks,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trophy,
  X
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { AslAlphabetClassroom } from '@/components/AslAlphabetClassroom';
import {
  emptyAlphabetProgress,
  normalizeLetters,
  type AlphabetProgress,
  type AlphabetProgressPatch
} from '@/lib/aslAlphabet';
import {
  canSubmitAssessment,
  createEmptyAssessmentAnswers,
  isAssessmentAnswerComplete,
  type AssessmentAnswer,
  type AssessmentMatchingPair
} from '@/lib/aslAssessment';
import { AslVocabularyCards } from '@/components/AslVocabularyCards';
import { AslPracticeActivities } from '@/components/AslPracticeActivities';
import {
  buildVocabularyCards,
  createPracticeActivities,
  createRevisionActivities,
  emptyPracticeJournal,
  getMissedConceptIds,
  getRevisionRecommendations,
  parsePracticeJournal,
  recordPracticeResult,
  summarizePractice,
  toggleRevisionMark,
  type PracticeActivity,
  type PracticeGrade,
  type PracticeJournal
} from '@/lib/aslLearningExperience';

type LearningStage =
  | 'LEARN'
  | 'GUIDED_PRACTICE'
  | 'PRACTICE_CHALLENGE'
  | 'REVISION'
  | 'FINAL_ASSESSMENT';

const STAGES: LearningStage[] = [
  'LEARN',
  'GUIDED_PRACTICE',
  'PRACTICE_CHALLENGE',
  'REVISION',
  'FINAL_ASSESSMENT'
];

const STAGE_LABELS: Record<LearningStage, string> = {
  LEARN: 'Learn',
  GUIDED_PRACTICE: 'Guided Practice',
  PRACTICE_CHALLENGE: 'Challenge',
  REVISION: 'Revision',
  FINAL_ASSESSMENT: 'Assessment'
};

interface Exercise {
  prompt: string;
  options: string[];
  answer: number;
  hint?: string;
  feedback?: string;
}

interface ContentBlock {
  type: string;
  data: any;
}

export interface AslLevel {
  _id: string;
  title: string;
  description: string;
  level: number;
  order: number;
  academy: string;
  stableKey: string;
  xpReward: number;
  isUnlocked?: boolean;
  completedStages?: string[];
  contentBlocks?: ContentBlock[];
  alphabetProgress?: AlphabetProgress;
  userProgress?: {
    status: string;
    score: number;
    bestScore: number;
    attemptsCount: number;
    isPassed: boolean;
    xpEarned?: number;
  } | null;
}

interface QuizQuestion {
  _id: string;
  questionIndex: number;
  type: string;
  prompt: string;
  options?: string[];
  blankText?: string;
  leftItems?: Array<{ id: string; text: string }>;
  rightItems?: Array<{ id: string; text: string }>;
}

interface AssessmentResult {
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  xpGained: number;
}

interface AslLearningProps {
  onLessonComplete?: (lesson: AslLevel, xp: number) => void;
}

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `asl_eval_${crypto.randomUUID()}`;
  }
  return `asl_eval_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function normalizeAlphabetProgress(data: any): AlphabetProgress {
  const empty = emptyAlphabetProgress();
  const activities = ['LETTER_IDENTIFICATION', 'ALPHABET_CHALLENGE', 'REVISION'];
  const studied: string[] = Array.isArray(data?.studiedLetters)
    ? data.studiedLetters.filter(
        (letter: unknown): letter is string => typeof letter === 'string' && /^[A-Z]$/.test(letter)
      )
    : [];
  return {
    studiedLetters: Array.from(new Set(studied)).sort(),
    completedActivities: Array.isArray(data?.completedActivities)
      ? activities.filter(activity => data.completedActivities.includes(activity)) as AlphabetProgress['completedActivities']
      : [],
    challenge: {
      ...empty.challenge,
      ...(data?.challenge && typeof data.challenge === 'object' ? data.challenge : {}),
      missedLetters: Array.isArray(data?.challenge?.missedLetters)
        ? data.challenge.missedLetters.filter(
            (letter: unknown): letter is string => typeof letter === 'string' && /^[A-Z]$/.test(letter)
          )
        : []
    },
    updatedAt: data?.updatedAt || null
  };
}

export const AslLearning = ({ onLessonComplete }: AslLearningProps) => {
  const { token } = useAuth();

  const [levels, setLevels] = useState<AslLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<AslLevel | null>(null);
  const [activeStage, setActiveStage] = useState<LearningStage>('LEARN');
  const [completedStages, setCompletedStages] = useState<string[]>([]);
  const [isCompletingStage, setIsCompletingStage] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);

  const [exerciseAnswers, setExerciseAnswers] = useState<Record<string, number>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [revisionSeed, setRevisionSeed] = useState(0);
  const [alphabetProgress, setAlphabetProgress] = useState<AlphabetProgress>(emptyAlphabetProgress);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [assessmentAnswers, setAssessmentAnswers] = useState<AssessmentAnswer[]>([]);
  const [matchingSelectedLeft, setMatchingSelectedLeft] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);

  // Practice-only state. It is deliberately separate from assessment progress and XP.
  const [practiceJournal, setPracticeJournal] = useState<PracticeJournal>(emptyPracticeJournal);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [expandedCardIds, setExpandedCardIds] = useState<string[]>([]);
  const [revealedCardIds, setRevealedCardIds] = useState<string[]>([]);
  const [stageCompletionNotice, setStageCompletionNotice] = useState<string | null>(null);
  const [revisionMissedSnapshot, setRevisionMissedSnapshot] = useState<string[]>([]);

  const fetchLevels = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/learning/lessons?academy=SIGN_LANGUAGE', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Could not load the ASL curriculum (${res.status}).`);
      const data: AslLevel[] = await res.json();
      setLevels(data);
    } catch (err: any) {
      setError(err.message || 'Could not load the ASL curriculum.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchLevels();
    } else {
      setIsLoading(false);
      setError('Sign in to track your ASL Academy progress.');
    }
  }, [token, fetchLevels]);

  const loadAssessment = useCallback(
    async (lessonId: string) => {
      setIsQuizLoading(true);
      setQuizError(null);
      setAssessmentResult(null);
      setCurrentQuestion(0);
      setIdempotencyKey(createIdempotencyKey());
      try {
        const res = await fetch(`/api/learning/quiz/${lessonId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Could not open the final assessment.');
        }
        setQuizQuestions(data.questions || []);
        setAssessmentAnswers(createEmptyAssessmentAnswers((data.questions || []).length));
        setMatchingSelectedLeft(null);
      } catch (err: any) {
        setQuizQuestions([]);
        setQuizError(err.message || 'Could not open the final assessment.');
      } finally {
        setIsQuizLoading(false);
      }
    },
    [token]
  );

  const loadAlphabetProgress = useCallback(
    async (lessonId: string) => {
      try {
        const res = await fetch(`/api/learning/lesson/${lessonId}/alphabet-progress`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) return;
        setAlphabetProgress(normalizeAlphabetProgress(data));
      } catch {
        // The classroom still works without saved progress; saving will surface errors.
      }
    },
    [token]
  );

  const saveAlphabetProgress = useCallback(
    async (patch: AlphabetProgressPatch) => {
      if (!selectedLevel) throw new Error('Open a lesson before saving alphabet progress.');
      const res = await fetch(`/api/learning/lesson/${selectedLevel._id}/alphabet-progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(patch)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not save alphabet progress.');
      setAlphabetProgress(normalizeAlphabetProgress(data));
    },
    [selectedLevel, token]
  );

  const practiceStorageKey = selectedLevel
    ? `beyondwords.asl43.practice.${selectedLevel.stableKey}`
    : null;

  useEffect(() => {
    if (!practiceStorageKey || typeof window === 'undefined') return;
    try {
      setPracticeJournal(parsePracticeJournal(window.localStorage.getItem(practiceStorageKey)));
    } catch {
      setPracticeJournal(emptyPracticeJournal());
    }
  }, [practiceStorageKey]);

  useEffect(() => {
    if (!practiceStorageKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(practiceStorageKey, JSON.stringify(practiceJournal));
    } catch {
      // Practice notes are a convenience only; the lesson still works without storage.
    }
  }, [practiceJournal, practiceStorageKey]);

  const resetLessonState = (level: AslLevel) => {
    setSelectedLevel(level);
    setCompletedStages(level.completedStages || []);
    setActiveStage('LEARN');
    setStageError(null);
    setIsCompletingStage(false);
    setExerciseAnswers({});
    setRevealedHints({});
    setRevisionSeed(0);
    setAlphabetProgress(
      level.alphabetProgress ? normalizeAlphabetProgress(level.alphabetProgress) : emptyAlphabetProgress()
    );
    setPracticeJournal(emptyPracticeJournal());
    setActiveCardId(null);
    setExpandedCardIds([]);
    setRevealedCardIds([]);
    setStageCompletionNotice(null);
    setRevisionMissedSnapshot([]);
    setQuizQuestions([]);
    setQuizError(null);
    setAssessmentResult(null);
    setAssessmentAnswers([]);
    setMatchingSelectedLeft(null);
    setCurrentQuestion(0);
  };

  const handleSelectLevel = async (level: AslLevel) => {
    if (!level.isUnlocked) return;

    try {
      let lesson = level;
      if (!level.contentBlocks?.length) {
        const res = await fetch(`/api/learning/lesson/${level._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Could not open Level ${level.level}.`);
        lesson = await res.json();
      }
      resetLessonState(lesson);
      if (lesson.stableKey === 'asl_level_01') {
        void loadAlphabetProgress(lesson._id);
      }
    } catch (err: any) {
      setError(err.message || 'Could not open this level.');
    }
  };

  const isStageAvailable = (stage: LearningStage) => {
    if (stage === 'FINAL_ASSESSMENT') return completedStages.length === STAGES.length - 1;
    return STAGES.indexOf(stage) <= completedStages.length;
  };

  const handleStageChange = (stage: LearningStage) => {
    if (!isStageAvailable(stage) || !selectedLevel) return;
    setActiveStage(stage);
    setStageError(null);
    setStageCompletionNotice(null);
    if (stage === 'REVISION') setRevisionMissedSnapshot(getMissedConceptIds(practiceJournal));
    if (stage === 'FINAL_ASSESSMENT' && quizQuestions.length === 0 && !assessmentResult) {
      loadAssessment(selectedLevel._id);
    }
  };

  const completeStage = async () => {
    if (!selectedLevel || activeStage === 'FINAL_ASSESSMENT') return;
    setIsCompletingStage(true);
    setStageError(null);
    try {
      const res = await fetch(`/api/learning/lesson/${selectedLevel._id}/stage-complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ stage: activeStage })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not save stage progress.');

      const updatedStages: string[] = data.completedStages || completedStages;
      setCompletedStages(updatedStages);
      const nextStage = STAGES[STAGES.indexOf(activeStage) + 1];
      setStageCompletionNotice(
        `${STAGE_LABELS[activeStage]} complete. Next: ${STAGE_LABELS[nextStage]}.`
      );
      if (nextStage === 'REVISION') setRevisionMissedSnapshot(getMissedConceptIds(practiceJournal));
      setActiveStage(nextStage);
      if (nextStage === 'FINAL_ASSESSMENT') loadAssessment(selectedLevel._id);
    } catch (err: any) {
      setStageError(err.message || 'Could not save stage progress.');
    } finally {
      setIsCompletingStage(false);
    }
  };

  const submitAssessment = async () => {
    if (!selectedLevel) return;
    setIsSubmitting(true);
    setQuizError(null);
    try {
      const res = await fetch(`/api/learning/quiz/${selectedLevel._id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ answers: assessmentAnswers, idempotencyKey })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Assessment submission failed.');

      setAssessmentResult({
        score: data.score,
        maxScore: data.maxScore,
        percentage: data.percentage,
        passed: data.passed,
        xpGained: data.xpGained || 0
      });
      if (data.passed) {
        onLessonComplete?.(selectedLevel, data.xpGained || 0);
        setSelectedLevel({
          ...selectedLevel,
          userProgress: {
            status: 'PASSED',
            score: data.score,
            bestScore: data.score,
            attemptsCount: 1,
            isPassed: true,
            xpEarned: data.xpGained || 0
          }
        });
        fetchLevels();
      }
    } catch (err: any) {
      setQuizError(err.message || 'Assessment submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryAssessment = () => {
    setAssessmentResult(null);
    setAssessmentAnswers(createEmptyAssessmentAnswers(quizQuestions.length));
    setMatchingSelectedLeft(null);
    setCurrentQuestion(0);
    setIdempotencyKey(createIdempotencyKey());
    setQuizError(null);
  };

  const setAnswerForQuestion = (questionIndex: number, value: AssessmentAnswer) => {
    setAssessmentAnswers(prev => {
      const next = [...prev];
      next[questionIndex] = value;
      return next;
    });
  };

  const handleMatchingPair = (leftId: string, rightId: string) => {
    const current = assessmentAnswers[currentQuestion];
    const pairs: AssessmentMatchingPair[] = Array.isArray(current) ? current : [];
    const next = pairs.filter(pair => pair.leftId !== leftId && pair.rightId !== rightId);
    next.push({ leftId, rightId });
    setAnswerForQuestion(currentQuestion, next);
    setMatchingSelectedLeft(null);
  };

  const handleRemoveMatchingPair = (leftId: string) => {
    const current = assessmentAnswers[currentQuestion];
    const pairs: AssessmentMatchingPair[] = Array.isArray(current) ? current : [];
    setAnswerForQuestion(
      currentQuestion,
      pairs.filter(pair => pair.leftId !== leftId)
    );
  };

  const blocksFor = useCallback(
    (stage: LearningStage) =>
      (selectedLevel?.contentBlocks || []).filter(block => block.data?.stage === stage),
    [selectedLevel]
  );

  const learnBlocks = blocksFor('LEARN');
  const guidedBlocks = blocksFor('GUIDED_PRACTICE');
  const challengeBlocks = blocksFor('PRACTICE_CHALLENGE');

  const exerciseKeys = useMemo(() => {
    if (!selectedLevel) return [];
    return (selectedLevel.contentBlocks || []).flatMap((block, blockIndex) =>
      block.data?.stage === activeStage && Array.isArray(block.data.exercises)
        ? block.data.exercises.map((_: Exercise, exerciseIndex: number) => `${activeStage}-${blockIndex}-${exerciseIndex}`)
        : []
    );
  }, [selectedLevel, activeStage]);

  const answeredCount = exerciseKeys.filter(key => typeof exerciseAnswers[key] === 'number').length;
  const practiceReady = activeStage === 'LEARN' || (exerciseKeys.length > 0 && answeredCount === exerciseKeys.length);

  const levelKey = selectedLevel?.stableKey || '';
  const contentBlocks = useMemo(
    () => selectedLevel?.contentBlocks || [],
    [selectedLevel]
  );

  const vocabularyCards = useMemo(
    () => buildVocabularyCards(contentBlocks, levelKey),
    [contentBlocks, levelKey]
  );
  const missedConceptIds = useMemo(
    () => getMissedConceptIds(practiceJournal),
    [practiceJournal]
  );
  const revisionRecommendations = useMemo(
    () => getRevisionRecommendations(practiceJournal, vocabularyCards),
    [practiceJournal, vocabularyCards]
  );

  useEffect(() => {
    if (vocabularyCards.length && !vocabularyCards.some(card => card.id === activeCardId)) {
      setActiveCardId(vocabularyCards[0].id);
    }
  }, [vocabularyCards, activeCardId]);

  const guidedActivities = useMemo(
    () => createPracticeActivities(contentBlocks, levelKey, `guided:${levelKey}`, { limit: 6 }),
    [contentBlocks, levelKey]
  );
  const challengeActivities = useMemo(
    () => createPracticeActivities(contentBlocks, levelKey, `challenge:${levelKey}`, { limit: 6 }),
    [contentBlocks, levelKey]
  );
  const revisionMissedKey = revisionMissedSnapshot.join('|');
  const revisionActivities = useMemo(
    () => createRevisionActivities(contentBlocks, levelKey, revisionSeed, revisionMissedSnapshot, 8),
    // Snapshot missed concepts when revision opens; a wrong answer must not reshuffle mid-set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentBlocks, levelKey, revisionSeed, revisionMissedKey]
  );

  const currentActivities: PracticeActivity[] =
    activeStage === 'GUIDED_PRACTICE'
      ? guidedActivities
      : activeStage === 'PRACTICE_CHALLENGE'
        ? challengeActivities
        : activeStage === 'REVISION'
          ? revisionActivities
          : [];
  const practiceSummary = useMemo(
    () => summarizePractice(practiceJournal, currentActivities),
    [practiceJournal, currentActivities]
  );

  const recordPractice = useCallback((activity: PracticeActivity, grade: PracticeGrade) => {
    setPracticeJournal(previous => recordPracticeResult(previous, activity, grade));
  }, []);

  const stats = useMemo(() => {
    const passed = levels.filter(level => level.userProgress?.isPassed);
    const xp = levels.reduce((sum, level) => sum + (level.userProgress?.xpEarned || 0), 0);
    const stages = levels.reduce((sum, level) => sum + (level.completedStages?.length || 0), 0);
    return { passed: passed.length, xp, stages };
  }, [levels]);

  const renderExercise = (exercise: Exercise, key: string) => {
    const selected = exerciseAnswers[key];
    const answered = typeof selected === 'number';
    const isCorrect = answered && selected === exercise.answer;
    const hintOpen = !!revealedHints[key];

    return (
      <Card key={key} className="border border-[#102c2615] bg-white rounded-2xl shadow-sm">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#102c26] text-white text-xs font-bold">
              ?
            </span>
            <p className="font-semibold text-[#102c26] leading-relaxed">{exercise.prompt}</p>
          </div>

          {hintOpen && (
            <div className="flex gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{exercise.hint}</span>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {exercise.options.map((option, index) => {
              const chosen = selected === index;
              const correctChoice = answered && index === exercise.answer;
              return (
                <button
                  key={index}
                  type="button"
                  disabled={answered}
                  onClick={() => setExerciseAnswers(prev => ({ ...prev, [key]: index }))}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                    correctChoice
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : chosen
                        ? 'border-rose-400 bg-rose-50 text-rose-900'
                        : 'border-[#102c261a] bg-white text-[#414846] hover:border-[#102c26] hover:bg-[#f6f4ef]'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    {option}
                    {correctChoice && <Check className="w-4 h-4 text-emerald-600" />}
                    {chosen && !correctChoice && <X className="w-4 h-4 text-rose-500" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {!hintOpen && (
              <button
                type="button"
                onClick={() => setRevealedHints(prev => ({ ...prev, [key]: true }))}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1"
              >
                <Lightbulb className="w-3.5 h-3.5" /> Show hint
              </button>
            )}
            {answered && (
              <span
                className={`text-xs font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}
              >
                {isCorrect ? 'Nice work!' : `Not quite. ${exercise.feedback || ''}`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDrillBlocks = (blocks: ContentBlock[], stage: LearningStage) => (
    <div className="space-y-8">
      <AslPracticeActivities
        key={`${stage}-${levelKey}`}
        activities={stage === 'GUIDED_PRACTICE' ? guidedActivities : challengeActivities}
        title={stage === 'GUIDED_PRACTICE' ? 'Guided vocabulary practice' : 'Challenge practice'}
        description={
          stage === 'GUIDED_PRACTICE'
            ? 'Work through matching, gap-fill and contextual checks built from this level’s curriculum.'
            : 'Apply the same ideas in a fresh order; wrong answers explain the reasoning and can be retried.'
        }
        onResult={recordPractice}
      />
      {blocks.map(block => {
        // Use the index from the full curriculum so answer keys match exerciseKeys.
        const blockIndex = (selectedLevel?.contentBlocks || []).indexOf(block);
        return (
          <div key={`${stage}-${blockIndex}`} className="space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#77948c]" />
              <h3 className="text-lg font-bold text-[#102c26]">{block.data?.title || 'Practice'}</h3>
            </div>
            {(block.data?.exercises || []).map((exercise: Exercise, exerciseIndex: number) =>
              renderExercise(exercise, `${stage}-${blockIndex}-${exerciseIndex}`)
            )}
          </div>
        );
      })}
    </div>
  );

  const letterGuide = learnBlocks.find(block => block.type === 'GESTURE_GUIDE');
  const letters = normalizeLetters(letterGuide?.data?.letters);

  const renderLetterGuide = () => {
    if (!letterGuide || letters.length === 0) return null;
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-[#102c26] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-700" /> {letterGuide.data.title}
          </h3>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">{letterGuide.data.visualNotice}</p>
        </div>
        <AslAlphabetClassroom
          letters={letters}
          source={letterGuide.data.source}
          visualNotice={letterGuide.data.visualNotice}
          progress={alphabetProgress}
          onSaveProgress={saveAlphabetProgress}
        />
      </div>
    );
  };

  const renderPhase42Content = (data: any) => {
    const items = Array.isArray(data?.items) ? data.items : [];
    const signs = Array.isArray(data?.signs) ? data.signs : [];
    const markers = Array.isArray(data?.markers) ? data.markers : [];
    const examples = Array.isArray(data?.examples) ? data.examples : [];
    const references = Array.isArray(data?.references) ? data.references : [];

    return (
      <>
        {items.length > 0 && (
          <ul className="space-y-2">
            {items.map((item: any, index: number) => {
              const label = typeof item === 'string' ? item : item.text || item.cue;
              const detail = typeof item === 'string' ? '' : item.success || item.detail || item.use || '';
              return (
                <li key={index} className="rounded-lg border border-[#102c2610] bg-[#f8f7f2] px-3 py-2 text-sm text-[#102c26]">
                  <span className="font-semibold">{label}</span>
                  {detail && <span className="block text-slate-600 mt-0.5">{detail}</span>}
                </li>
              );
            })}
          </ul>
        )}

        {signs.length > 0 && (
          <div className="grid gap-3">
            {signs.map((sign: any, index: number) => (
              <div key={index} className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 space-y-2">
                <p className="font-bold text-purple-900">{sign.label}</p>
                <dl className="grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                  <dt className="font-semibold">Handshape</dt>
                  <dd>{sign.handshape}</dd>
                  <dt className="font-semibold">Palm orientation</dt>
                  <dd>{sign.palmOrientation}</dd>
                  <dt className="font-semibold">Movement</dt>
                  <dd>{sign.movement}</dd>
                  <dt className="font-semibold">Non-manual markers</dt>
                  <dd>{sign.nonManualMarkers}</dd>
                  <dt className="font-semibold">Common mistake</dt>
                  <dd>{sign.commonMistake}</dd>
                </dl>
                {sign.source && (
                  <p className="text-xs font-semibold uppercase tracking-widest text-purple-700">
                    Source: {sign.source} {sign.verification ? `· ${sign.verification}` : ''}
                  </p>
                )}
              </div>
            ))}
            {data.notice && <p className="text-xs text-slate-500">{data.notice}</p>}
          </div>
        )}

        {markers.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {markers.map((marker: any, index: number) => (
              <div key={index} className="rounded-xl border border-[#102c2610] p-4 space-y-1 text-sm">
                <p className="font-bold text-[#102c26]">{marker.cue}</p>
                <p className="text-slate-700"><span className="font-semibold">Use:</span> {marker.use}</p>
                <p className="text-slate-700"><span className="font-semibold">Example:</span> {marker.example}</p>
                <p className="text-rose-700"><span className="font-semibold">Careful:</span> {marker.caution}</p>
              </div>
            ))}
          </div>
        )}

        {examples.length > 0 && (
          <div className="grid gap-3">
            {examples.map((example: any, index: number) => (
              <div key={index} className="rounded-xl border border-[#102c2610] p-4 space-y-1 text-sm">
                <p className="font-bold text-[#102c26]">{example.situation}</p>
                <p className="font-mono text-purple-800">{example.gloss}</p>
                <p className="text-slate-700">{example.meaning}</p>
                <p className="text-xs text-slate-500">Tip: {example.tip}</p>
              </div>
            ))}
          </div>
        )}

        {references.length > 0 && (
          <ul className="space-y-2">
            {references.map((reference: any, index: number) => (
              <li key={index} className="text-sm text-slate-700">
                <a
                  href={reference.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-purple-800 underline underline-offset-2"
                >
                  {reference.name}
                </a>
                {reference.note && <span className="block text-slate-500">{reference.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </>
    );
  };

  const renderLearnStage = () => (
    <div className="space-y-8">
      {learnBlocks.map((block, index) => {
        if (block.type === 'GESTURE_GUIDE') return <div key={index}>{renderLetterGuide()}</div>;
        if (block.type === 'VOCABULARY_DECK') {
          return (
            <div key={index} className="space-y-4">
              <h3 className="text-lg font-bold text-[#102c26] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#77948c]" /> {block.data?.title || 'Vocabulary'}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {(block.data?.terms || []).map((item: any, termIndex: number) => (
                  <Card key={termIndex} className="rounded-xl border border-[#102c2615] bg-white">
                    <CardContent className="p-4">
                      <p className="font-bold text-[#102c26]">{item.term}</p>
                      <p className="text-sm text-slate-600 mt-1">{item.context}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        }
        return (
          <Card key={index} className="border border-[#102c2615] bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-purple-800 font-bold text-xs uppercase tracking-widest">
                <BookOpen className="w-4 h-4" /> {block.type === 'CONCEPT_INTRO' ? 'Concept' : 'Key idea'}
              </div>
              <h3 className="text-xl font-bold text-[#102c26]">{block.data?.title}</h3>
              <p className="text-slate-700 leading-relaxed">{block.data?.body}</p>
              {Array.isArray(block.data?.vocabulary) && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {block.data.vocabulary.map((term: string) => (
                    <Badge key={term} variant="outline" className="border-[#102c2630] text-[#414846]">
                      {term}
                    </Badge>
                  ))}
                </div>
              )}
              {block.data?.suite === 'PHASE_4_2' && renderPhase42Content(block.data)}
            </CardContent>
          </Card>
        );
      })}
      {vocabularyCards.length > 0 && (
        <AslVocabularyCards
          cards={vocabularyCards}
          activeCardId={activeCardId}
          expandedIds={expandedCardIds}
          revealedIds={revealedCardIds}
          revisionMarks={practiceJournal.revisionMarks}
          recommendations={revisionRecommendations}
          onActiveCardChange={setActiveCardId}
          onToggleExpand={cardId =>
            setExpandedCardIds(ids =>
              ids.includes(cardId) ? ids.filter(id => id !== cardId) : [...ids, cardId]
            )
          }
          onToggleReveal={cardId =>
            setRevealedCardIds(ids =>
              ids.includes(cardId) ? ids.filter(id => id !== cardId) : [...ids, cardId]
            )
          }
          onToggleRevisionMark={cardId =>
            setPracticeJournal(previous => toggleRevisionMark(previous, cardId))
          }
        />
      )}
    </div>
  );

  const renderRevisionStage = () => (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#102c26]">Randomized review</h3>
          <p className="text-sm text-slate-600">
            Reproducible shuffles, missed concepts first, and corrective feedback. Practice here never awards XP.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setRevisionSeed(seed => seed + 1);
            setRevisionMissedSnapshot(getMissedConceptIds(practiceJournal));
            setExerciseAnswers({});
            setRevealedHints({});
          }}
          className="rounded-full"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Shuffle again
        </Button>
      </div>
      {(selectedLevel?.contentBlocks || [])
        .filter(block => block.data?.stage === 'REVISION' && !Array.isArray(block.data?.exercises))
        .map((block, index) => (
          <Card key={`summary-${index}`} className="border border-[#102c2615] bg-white rounded-2xl shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-[#102c26]">{block.data?.title}</h3>
              {renderPhase42Content(block.data)}
            </CardContent>
          </Card>
        ))}
      {revisionRecommendations.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-bold">Focus next:</span> {revisionRecommendations.slice(0, 5).join(', ')}
          {revisionRecommendations.length > 5 ? ' and more.' : '.'}
        </div>
      )}
      <AslPracticeActivities
        key={`revision-${levelKey}-${revisionSeed}`}
        activities={revisionActivities}
        title="Revision exercises"
        description="Missed concepts are placed first. Each incorrect answer explains the mistake and can be retried."
        onResult={recordPractice}
      />
    </div>
  );

  const renderAssessmentStage = () => {
    if (isQuizLoading) {
      return (
        <div className="rounded-2xl border border-dashed border-[#102c2630] p-16 text-center text-slate-500">
          Preparing your assessment…
        </div>
      );
    }

    if (quizError) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center space-y-4">
          <AlertTriangle className="w-8 h-8 mx-auto text-rose-600" />
          <p className="font-semibold text-rose-900">{quizError}</p>
          <Button variant="outline" onClick={() => selectedLevel && loadAssessment(selectedLevel._id)}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      );
    }

    if (assessmentResult) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-2xl border p-8 text-center space-y-5 ${
            assessmentResult.passed
              ? 'border-emerald-300 bg-emerald-50/60'
              : 'border-rose-300 bg-rose-50/60'
          }`}
        >
          <div className="text-5xl">{assessmentResult.passed ? '🎉' : '📚'}</div>
          <h3 className="text-2xl font-bold text-[#102c26]">
            {assessmentResult.passed ? 'Level passed!' : 'Keep practicing'}
          </h3>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            {assessmentResult.passed
              ? 'Your progress is saved and the next level is unlocked.'
              : 'You need 70% to pass. Review the practice stages, then try again.'}
          </p>
          <div className="flex justify-center gap-8 text-sm">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-widest">Score</p>
              <p className="text-xl font-bold text-[#102c26]">
                {assessmentResult.score} / {assessmentResult.maxScore}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-widest">XP earned</p>
              <p className="text-xl font-bold text-amber-600">+{assessmentResult.xpGained}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {assessmentResult.passed ? (
              <Button onClick={() => setSelectedLevel(null)} className="bg-[#102c26] hover:bg-[#1d4139]">
                Back to learning path <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAssessmentResult(null);
                    setActiveStage('REVISION');
                  }}
                >
                  Review again
                </Button>
                <Button onClick={retryAssessment} className="bg-[#102c26] hover:bg-[#1d4139]">
                  <RotateCcw className="w-4 h-4 mr-2" /> Retake assessment
                </Button>
              </>
            )}
          </div>
        </motion.div>
      );
    }

    if (quizQuestions.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-[#102c2630] p-16 text-center text-sm text-slate-500">
          No assessment questions are available yet. Ask an administrator to seed the curriculum.
        </div>
      );
    }

    const question = quizQuestions[currentQuestion];
    const answer = assessmentAnswers[currentQuestion];
    const currentAnswered = isAssessmentAnswerComplete(answer, question);
    const allAnswered = canSubmitAssessment(assessmentAnswers, quizQuestions);

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Question {currentQuestion + 1} of {quizQuestions.length}</span>
          <span className="flex items-center gap-1 text-purple-700">
            <ShieldCheck className="w-3.5 h-3.5" /> Graded on the server
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[#102c260d] overflow-hidden">
          <motion.div
            className="h-full bg-purple-600"
            animate={{ width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%` }}
          />
        </div>

        <Card className="rounded-2xl border border-[#102c2615] bg-white shadow-sm">
          <CardContent className="p-6 space-y-5">
            <p className="text-lg font-bold text-[#102c26]">{question.prompt}</p>
            {question.type === 'MULTIPLE_CHOICE' && (
              <div className="grid gap-2 sm:grid-cols-2">
                {(question.options || []).map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setAnswerForQuestion(currentQuestion, index)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                      answer === index
                        ? 'border-purple-600 bg-purple-50 text-purple-900'
                        : 'border-[#102c261a] hover:border-purple-400 hover:bg-purple-50/40'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {question.type === 'FILL_BLANK' && (
              <div className="space-y-3">
                {question.blankText && (
                  <div className="rounded-xl border border-[#102c2615] bg-[#f8f7f2] px-4 py-3 font-mono text-sm text-[#102c26]">
                    {question.blankText}
                  </div>
                )}
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                  Your answer
                  <input
                    type="text"
                    value={typeof answer === 'string' ? answer : ''}
                    onChange={event => setAnswerForQuestion(currentQuestion, event.target.value)}
                    placeholder="Type the missing term…"
                    className="mt-2 w-full rounded-xl border border-[#102c261a] px-4 py-3 text-sm text-[#102c26] focus:border-purple-500 focus:outline-none"
                  />
                </label>
              </div>
            )}

            {question.type === 'MATCHING' && question.leftItems && question.rightItems && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Select an item on the left, then choose its match on the right.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Cue</span>
                    {question.leftItems.map(item => {
                      const pairs: AssessmentMatchingPair[] = Array.isArray(answer) ? answer : [];
                      const isPaired = pairs.some(pair => pair.leftId === item.id);
                      const isSelected = matchingSelectedLeft === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={isPaired}
                          onClick={() => setMatchingSelectedLeft(item.id)}
                          className={`w-full rounded-xl border p-3 text-left text-xs font-bold transition-all ${
                            isPaired
                              ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                              : isSelected
                                ? 'border-purple-600 bg-purple-600 text-white'
                                : 'border-[#102c2615] bg-white text-[#102c26] hover:border-purple-400'
                          }`}
                        >
                          {item.text}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Match</span>
                    {question.rightItems.map(item => {
                      const pairs: AssessmentMatchingPair[] = Array.isArray(answer) ? answer : [];
                      const isPaired = pairs.some(pair => pair.rightId === item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={isPaired || !matchingSelectedLeft}
                          onClick={() => matchingSelectedLeft && handleMatchingPair(matchingSelectedLeft, item.id)}
                          className={`w-full rounded-xl border p-3 text-left text-xs font-bold transition-all ${
                            isPaired
                              ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                              : matchingSelectedLeft
                                ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                                : 'border-[#102c2615] bg-white text-slate-500'
                          }`}
                        >
                          {item.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {Array.isArray(answer) && answer.length > 0 && (
                  <div className="space-y-2 border-t border-[#102c2610] pt-3">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Connected pairs
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {answer.map(pair => {
                        const leftText = question.leftItems?.find(item => item.id === pair.leftId)?.text || pair.leftId;
                        const rightText = question.rightItems?.find(item => item.id === pair.rightId)?.text || pair.rightId;
                        return (
                          <span
                            key={`${pair.leftId}-${pair.rightId}`}
                            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900"
                          >
                            {leftText} ⇄ {rightText}
                            <button
                              type="button"
                              onClick={() => handleRemoveMatchingPair(pair.leftId)}
                              className="font-bold text-emerald-700 hover:text-emerald-900"
                              aria-label={`Remove pair ${leftText} and ${rightText}`}
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
            <div className="flex justify-between gap-3 pt-2">
              <Button
                variant="outline"
                disabled={currentQuestion === 0}
                onClick={() => setCurrentQuestion(index => Math.max(0, index - 1))}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Previous
              </Button>
              {currentQuestion < quizQuestions.length - 1 ? (
                <Button
                  disabled={!currentAnswered}
                  onClick={() => setCurrentQuestion(index => index + 1)}
                  className="bg-[#102c26] hover:bg-[#1d4139]"
                >
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  disabled={!allAnswered || isSubmitting}
                  onClick={submitAssessment}
                  className="bg-purple-700 hover:bg-purple-800"
                >
                  {isSubmitting ? 'Grading…' : 'Submit assessment'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        {quizError && <p className="text-center text-sm font-medium text-rose-700">{quizError}</p>}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-[#102c26]">
        <div className="w-9 h-9 border-4 border-[#102c26] border-t-transparent rounded-full animate-spin" />
        <p className="font-medium italic">Opening the ASL Academy…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center space-y-4">
        <AlertTriangle className="w-8 h-8 mx-auto text-rose-600" />
        <p className="font-semibold text-rose-900">{error}</p>
        {token && (
          <Button variant="outline" onClick={fetchLevels} className="border-rose-300 text-rose-800">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        )}
      </div>
    );
  }

  if (selectedLevel) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#102c261a]">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLevel(null)}
              className="rounded-full border-[#102c2620] text-[#102c26]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Learning path
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[#102c26] text-white text-[10px] font-bold">
                  LEVEL {selectedLevel.level} / 10
                </Badge>
                {selectedLevel.userProgress?.isPassed && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                    COMPLETED
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl font-bold text-[#102c26] mt-1">{selectedLevel.title}</h2>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Reward</p>
            <p className="text-lg font-bold text-amber-600">+{selectedLevel.xpReward} XP</p>
          </div>
        </div>

        <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-xs text-purple-900 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            This academy uses written and interactive exercises. Camera recognition is not required and does not
            support the full alphabet yet.
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 rounded-xl bg-[#f4f2ec] p-1.5 border border-[#102c2610]">
          {STAGES.map((stage, index) => {
            const done = completedStages.includes(stage) || !!selectedLevel.userProgress?.isPassed;
            const available = isStageAvailable(stage) || done;
            return (
              <button
                key={stage}
                type="button"
                disabled={!available}
                onClick={() => handleStageChange(stage)}
                title={available ? stage : 'Complete the previous stage first'}
                className={`rounded-lg px-2 py-2.5 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeStage === stage
                    ? 'bg-white text-[#102c26] shadow-sm'
                    : available
                      ? 'text-slate-600 hover:bg-white/60'
                      : 'text-slate-400 opacity-60 cursor-not-allowed'
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : !available ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <span className="text-purple-700">{index + 1}</span>
                )}
                <span className="hidden sm:inline">{STAGE_LABELS[stage]}</span>
              </button>
            );
          })}
        </div>

        {stageCompletionNotice && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 flex items-start gap-2"
          >
            <ClipboardCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {stageCompletionNotice} Practice notes are saved; final assessment completion stays separate.
            </span>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedLevel._id}-${activeStage}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {activeStage === 'LEARN' && renderLearnStage()}
            {activeStage === 'GUIDED_PRACTICE' && renderDrillBlocks(guidedBlocks, 'GUIDED_PRACTICE')}
            {activeStage === 'PRACTICE_CHALLENGE' && renderDrillBlocks(challengeBlocks, 'PRACTICE_CHALLENGE')}
            {activeStage === 'REVISION' && renderRevisionStage()}
            {activeStage === 'FINAL_ASSESSMENT' && renderAssessmentStage()}

            {activeStage !== 'FINAL_ASSESSMENT' && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#102c2615] bg-white p-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-600">
                    {activeStage === 'LEARN'
                      ? 'Read the material, then continue when you are ready.'
                      : `${answeredCount} of ${exerciseKeys.length} curriculum exercises answered.`}
                  </p>
                  {practiceSummary.answered > 0 && (
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-purple-800" aria-live="polite">
                      <ListChecks className="w-3.5 h-3.5" />
                      {practiceSummary.correct}/{practiceSummary.answered} practice checks correct · no XP from practice
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {stageError && <span className="text-xs font-semibold text-rose-700">{stageError}</span>}
                  <Button
                    onClick={completeStage}
                    disabled={!practiceReady || isCompletingStage || completedStages.includes(activeStage)}
                    className="bg-[#102c26] hover:bg-[#1d4139]"
                  >
                    {isCompletingStage ? 'Saving…' : 'Complete stage'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-purple-900 to-[#102c26] text-white p-8 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <Badge className="bg-purple-200 text-purple-950 border-none text-[10px] font-bold tracking-widest">
              ASL ACADEMY • 10 LEVELS
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight">Learn American Sign Language</h2>
            <p className="text-sm text-purple-100 leading-relaxed">
              A connected path from the A–Z alphabet to guided conversations. Every level includes Learn, Guided
              Practice, Challenge, Revision and a server-graded assessment.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-2xl font-bold">{stats.passed}/10</p>
              <p className="text-[10px] uppercase tracking-widest text-purple-200">Levels</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-2xl font-bold">{stats.stages}/40</p>
              <p className="text-[10px] uppercase tracking-widest text-purple-200">Stages</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="text-2xl font-bold text-amber-200">{stats.xp}</p>
              <p className="text-[10px] uppercase tracking-widest text-purple-200">XP</p>
            </div>
          </div>
        </div>
      </section>

      {levels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#102c2630] p-12 text-center space-y-3">
          <BookOpen className="w-8 h-8 mx-auto text-[#77948c]" />
          <h3 className="font-bold text-[#102c26]">The ASL curriculum has not been seeded yet</h3>
          <p className="text-sm text-slate-600">
            Run <code className="rounded bg-[#102c260d] px-2 py-1">npm --prefix server run seed</code>, then retry.
          </p>
          <Button variant="outline" onClick={fetchLevels} className="mt-2">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#102c26]">Your learning path</h3>
            <span className="text-xs font-semibold text-slate-500">
              Complete a level assessment to unlock the next one
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {levels
              .slice()
              .sort((a, b) => a.level - b.level)
              .map(level => {
                const passed = !!level.userProgress?.isPassed;
                const locked = !level.isUnlocked;
                const stageCount = level.completedStages?.length || 0;
                return (
                  <motion.button
                    key={level._id}
                    type="button"
                    disabled={locked}
                    onClick={() => handleSelectLevel(level)}
                    whileHover={locked ? undefined : { y: -3 }}
                    className={`group flex items-start gap-4 rounded-2xl border p-5 text-left transition-all ${
                      locked
                        ? 'border-[#102c2610] bg-[#f4f2ec] opacity-70 cursor-not-allowed'
                        : passed
                          ? 'border-emerald-300 bg-emerald-50/50 hover:shadow-lg'
                          : 'border-[#102c2615] bg-white hover:border-purple-400 hover:shadow-lg'
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold ${
                        locked
                          ? 'bg-[#102c2610] text-slate-400'
                          : passed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-purple-700 text-white'
                      }`}
                    >
                      {locked ? <Lock className="w-4 h-4" /> : passed ? <Check className="w-5 h-5" /> : level.level}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-[#102c26] truncate">
                          {level.level}. {level.title}
                        </h4>
                        {locked && <Badge variant="outline" className="text-[9px]">LOCKED</Badge>}
                        {passed && (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[9px] border-emerald-300">
                            PASSED
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{level.description}</p>
                      <div className="mt-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <span>{stageCount}/4 stages</span>
                        <span className="text-amber-600">+{level.xpReward} XP</span>
                        {(level.userProgress?.xpEarned || 0) > 0 && (
                          <span className="text-emerald-700">
                            earned {level.userProgress?.xpEarned}
                          </span>
                        )}
                      </div>
                    </div>
                    {!locked && (
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700 shrink-0 mt-1" />
                    )}
                  </motion.button>
                );
              })}
          </div>
          <div className="flex items-center justify-center gap-2 pt-4 text-xs text-slate-500">
            <Trophy className="w-4 h-4 text-amber-600" /> Ten levels, fifty stages, one connected journey.
          </div>
        </section>
      )}
    </div>
  );
};
