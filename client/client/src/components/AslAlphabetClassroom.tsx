import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ExternalLink,
  Hand,
  Lightbulb,
  Loader2,
  RotateCcw,
  Sparkles,
  Target,
  X
} from 'lucide-react';
import {
  ALPHABET,
  createChallengeQuestions,
  createIdentificationQuestions,
  createRevisionQuestions,
  findLetter,
  getAlphabetCoverage,
  getAlphabetStats,
  gradeQuestion,
  isMovementLetter,
  navigateLetter,
  summarizeChallenge,
  type AlphabetLetter,
  type AlphabetProgress,
  type AlphabetProgressPatch,
  type AlphabetQuestion
} from '@/lib/aslAlphabet';

type ClassroomMode = 'EXPLORE' | 'IDENTIFY' | 'CHALLENGE' | 'REVISION';

interface AslAlphabetClassroomProps {
  letters: AlphabetLetter[];
  source?: { name?: string; url?: string };
  visualNotice?: string;
  progress: AlphabetProgress;
  onSaveProgress: (patch: AlphabetProgressPatch) => Promise<void>;
}

const MODES: { id: ClassroomMode; label: string; icon: typeof BookOpen }[] = [
  { id: 'EXPLORE', label: 'Explore', icon: BookOpen },
  { id: 'IDENTIFY', label: 'Identify', icon: Target },
  { id: 'CHALLENGE', label: 'Alphabet challenge', icon: Sparkles },
  { id: 'REVISION', label: 'Revision', icon: RotateCcw }
];

const DetailBlock = ({
  label,
  value,
  highlight = false,
  icon
}: {
  label: string;
  value?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) => (
  <div
    className={`rounded-xl border p-4 ${
      highlight ? 'border-amber-200 bg-amber-50/70' : 'border-[#102c2612] bg-white'
    }`}
  >
    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
      {icon}
      {label}
    </p>
    <p className="mt-2 text-sm leading-relaxed text-slate-700">
      {value || 'This detail is not available in the curriculum reference yet.'}
    </p>
  </div>
);

const QuestionCard = ({
  question,
  index,
  total,
  selectedLetter,
  onSelect,
  onNext,
  nextLabel = 'Next letter'
}: {
  question: AlphabetQuestion;
  index: number;
  total: number;
  selectedLetter?: string;
  onSelect: (letter: string) => void;
  onNext: () => void;
  nextLabel?: string;
}) => {
  const graded = gradeQuestion(question, selectedLetter || null);

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -14 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-[#102c2615] bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700">
            Question {index + 1} of {total}
          </p>
          <p className="mt-2 font-bold text-[#102c26]">{question.prompt}</p>
        </div>
        {question.movementFocus && (
          <Badge className="border-amber-200 bg-amber-100 text-amber-900 text-[9px] font-bold">
            MOVEMENT
          </Badge>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-[#102c2610] bg-[#f8faf9] p-4">
        <p className="text-sm leading-relaxed text-slate-700">{question.cue}</p>
        {question.referenceUrl && (
          <a
            href={question.referenceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900"
          >
            {question.referenceLabel || 'ASL University reference'} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Letter choices">
        {question.options.map(option => {
          const isCorrect = graded.answered && option === question.correctLetter;
          const isWrong = graded.answered && option === selectedLetter && !graded.correct;
          return (
            <button
              key={option}
              type="button"
              disabled={graded.answered}
              aria-label={`Choose letter ${option}`}
              aria-pressed={selectedLetter === option}
              onClick={() => onSelect(option)}
              className={`h-11 w-11 rounded-xl border text-sm font-black transition-colors ${
                isCorrect
                  ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                  : isWrong
                    ? 'border-rose-400 bg-rose-100 text-rose-800'
                    : 'border-[#102c261f] text-[#102c26] hover:border-purple-500 hover:bg-purple-50 disabled:cursor-default'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {graded.answered && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${
              graded.correct
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
            role="status"
          >
            {graded.correct ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{graded.feedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {graded.answered && (
        <div className="mt-5 flex justify-end">
          <Button type="button" onClick={onNext} className="rounded-xl bg-[#102c26] text-white hover:bg-[#1a443b]">
            {nextLabel} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export const AslAlphabetClassroom = ({
  letters,
  source,
  visualNotice,
  progress,
  onSaveProgress
}: AslAlphabetClassroomProps) => {
  const [mode, setMode] = useState<ClassroomMode>('EXPLORE');
  const [selectedLetter, setSelectedLetter] = useState(letters[0]?.letter || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [identifyQuestions, setIdentifyQuestions] = useState<AlphabetQuestion[]>([]);
  const [identifyAnswers, setIdentifyAnswers] = useState<Record<string, string | undefined>>({});
  const [identifyIndex, setIdentifyIndex] = useState(0);
  const [identifyFinished, setIdentifyFinished] = useState(false);
  const identifySaved = useRef(false);

  const [challengeQuestions, setChallengeQuestions] = useState<AlphabetQuestion[]>([]);
  const [challengeAnswers, setChallengeAnswers] = useState<Record<string, string | undefined>>({});
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [challengeFinished, setChallengeFinished] = useState(false);
  const [challengeIsRetry, setChallengeIsRetry] = useState(false);
  const challengeSaved = useRef(false);

  const [revisionQuestions, setRevisionQuestions] = useState<AlphabetQuestion[]>([]);
  const [revisionAnswers, setRevisionAnswers] = useState<Record<string, string | undefined>>({});
  const [revisionIndex, setRevisionIndex] = useState(0);
  const [revisionFinished, setRevisionFinished] = useState(false);
  const revisionSaved = useRef(false);

  const coverage = useMemo(() => getAlphabetCoverage(letters), [letters]);
  const stats = useMemo(() => getAlphabetStats(progress), [progress]);
  const selectedEntry = useMemo(
    () => findLetter(letters, selectedLetter),
    [letters, selectedLetter]
  );
  const studiedLetters = useMemo(
    () => ALPHABET.filter(letter => progress.studiedLetters.includes(letter)),
    [progress.studiedLetters]
  );
  const challengeSummary = useMemo(
    () => summarizeChallenge(challengeQuestions, challengeAnswers),
    [challengeQuestions, challengeAnswers]
  );
  const identifyAnswered = identifyQuestions.filter(question => identifyAnswers[question.letter]).length;
  const revisionAnswered = revisionQuestions.filter(question => revisionAnswers[question.letter]).length;

  useEffect(() => {
    if (letters.length === 0) {
      setSelectedLetter('');
      return;
    }
    if (!letters.some(entry => entry.letter === selectedLetter)) {
      setSelectedLetter(letters[0].letter);
    }
  }, [letters, selectedLetter]);

  const persist = useCallback(
    async (patch: AlphabetProgressPatch) => {
      setIsSaving(true);
      setSaveError(null);
      try {
        await onSaveProgress(patch);
      } catch (error: any) {
        setSaveError(error?.message || 'Could not save classroom progress.');
      } finally {
        setIsSaving(false);
      }
    },
    [onSaveProgress]
  );

  const changeLetter = useCallback(
    (direction: 1 | -1) => {
      setSelectedLetter(previous => navigateLetter(letters, previous, direction) || previous);
      setMode('EXPLORE');
    },
    [letters]
  );

  useEffect(() => {
    if (mode !== 'EXPLORE') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        changeLetter(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        changeLetter(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, changeLetter]);

  const startIdentification = () => {
    setIdentifyQuestions(createIdentificationQuestions(letters, Math.random, 6));
    setIdentifyAnswers({});
    setIdentifyIndex(0);
    setIdentifyFinished(false);
    identifySaved.current = false;
    setSaveError(null);
  };

  const answerIdentification = (letter: string) => {
    const question = identifyQuestions[identifyIndex];
    if (!question || identifyAnswers[question.letter]) return;
    const nextAnswers = { ...identifyAnswers, [question.letter]: letter };
    setIdentifyAnswers(nextAnswers);

    if (
      !identifySaved.current &&
      identifyQuestions.every(item => nextAnswers[item.letter])
    ) {
      identifySaved.current = true;
      void persist({ completedActivities: ['LETTER_IDENTIFICATION'] });
    }
  };

  const startChallenge = (retryLetters: string[] = []) => {
    setChallengeQuestions(createChallengeQuestions(letters, Math.random, retryLetters));
    setChallengeAnswers({});
    setChallengeIndex(0);
    setChallengeFinished(false);
    setChallengeIsRetry(retryLetters.length > 0);
    challengeSaved.current = false;
    setSaveError(null);
  };

  const answerChallenge = (letter: string) => {
    const question = challengeQuestions[challengeIndex];
    if (!question || challengeAnswers[question.letter]) return;
    const nextAnswers = { ...challengeAnswers, [question.letter]: letter };
    setChallengeAnswers(nextAnswers);

    if (!challengeSaved.current && challengeQuestions.every(item => nextAnswers[item.letter])) {
      challengeSaved.current = true;
      const summary = summarizeChallenge(challengeQuestions, nextAnswers);
      void persist({
        completedActivities: ['ALPHABET_CHALLENGE'],
        challenge: {
          lastCorrect: summary.correct,
          lastTotal: summary.total,
          missedLetters: summary.missedLetters
        }
      });
    }
  };

  const startRevision = () => {
    setRevisionQuestions(createRevisionQuestions(letters, studiedLetters, Math.random));
    setRevisionAnswers({});
    setRevisionIndex(0);
    setRevisionFinished(false);
    revisionSaved.current = false;
    setSaveError(null);
  };

  const answerRevision = (letter: string) => {
    const question = revisionQuestions[revisionIndex];
    if (!question || revisionAnswers[question.letter]) return;
    const nextAnswers = { ...revisionAnswers, [question.letter]: letter };
    setRevisionAnswers(nextAnswers);

    if (!revisionSaved.current && revisionQuestions.every(item => nextAnswers[item.letter])) {
      revisionSaved.current = true;
      void persist({ completedActivities: ['REVISION'] });
    }
  };

  const activeChallengeQuestion = challengeQuestions[challengeIndex];
  const activeIdentifyQuestion = identifyQuestions[identifyIndex];
  const activeRevisionQuestion = revisionQuestions[revisionIndex];

  if (letters.length === 0) {
    return (
      <Card className="rounded-2xl border border-dashed border-[#102c2630] bg-white">
        <CardContent className="p-8 text-center text-sm text-slate-600">
          <Hand className="mx-auto h-6 w-6 text-purple-700" />
          <p className="mt-3 font-bold text-[#102c26]">The alphabet reference is unavailable.</p>
          <p className="mt-1">
            Run the curriculum seed to restore the verified A–Z reference, then reopen this lesson.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#102c2615] bg-gradient-to-br from-[#f6f3ff] via-white to-[#eef8f4] p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-700">ASL Alphabet Classroom</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-[#102c26] sm:text-3xl">
              Learn A–Z with verified references
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Explore each handshape, practise recognition, then take a 26-letter challenge. No camera is needed: every visual is an educational reference link.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/80 px-3 py-2 shadow-sm">
              <p className="text-lg font-black text-[#102c26]">{stats.studied}/26</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Studied</p>
            </div>
            <div className="rounded-2xl bg-white/80 px-3 py-2 shadow-sm">
              <p className="text-lg font-black text-[#102c26]">{stats.challengeAttempts}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Challenges</p>
            </div>
            <div className="rounded-2xl bg-white/80 px-3 py-2 shadow-sm">
              <p className="text-lg font-black text-[#102c26]">{stats.bestScore.split('/')[0]}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Best /26</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Alphabet classroom activities">
          {MODES.map(item => {
            const Icon = item.icon;
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMode(item.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  active
                    ? 'bg-[#102c26] text-white shadow-sm'
                    : 'border border-[#102c2615] bg-white text-slate-600 hover:border-purple-400'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {item.label}
              </button>
            );
          })}
        </div>

        {isSaving && (
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-purple-700" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving your progress…
          </p>
        )}
        {saveError && (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" /> {saveError}
          </p>
        )}
      </div>

      {mode === 'EXPLORE' && (
        <div className="space-y-5">
          <Card className="rounded-2xl border border-[#102c2615] bg-white">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-[#102c26]">Alphabet selector</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Click a letter or use ← / → to move. Dots mark studied letters.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Previous letter"
                    onClick={() => changeLetter(-1)}
                    className="h-9 rounded-lg"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Next letter"
                    onClick={() => changeLetter(1)}
                    className="h-9 rounded-lg"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1.5 sm:grid-cols-9 lg:grid-cols-[repeat(13,minmax(0,1fr))]">
                {letters.map(entry => {
                  const active = entry.letter === selectedLetter;
                  const studied = studiedLetters.includes(entry.letter);
                  return (
                    <button
                      key={entry.letter}
                      type="button"
                      aria-label={`Select letter ${entry.letter}`}
                      aria-pressed={active}
                      onClick={() => setSelectedLetter(entry.letter)}
                      className={`relative flex h-11 items-center justify-center rounded-xl border text-sm font-black transition-all sm:h-12 ${
                        active
                          ? 'border-purple-700 bg-purple-700 text-white shadow-md scale-[1.03]'
                          : studied
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-400'
                            : 'border-[#102c2615] bg-white text-[#102c26] hover:border-purple-400 hover:bg-purple-50'
                      }`}
                    >
                      {entry.letter}
                      {studied && (
                        <span
                          className={`absolute bottom-1 h-1 w-1 rounded-full ${
                            active ? 'bg-white' : 'bg-emerald-500'
                          }`}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <AnimatePresence mode="wait">
            {selectedEntry && (
              <motion.div
                key={selectedEntry.letter}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"
              >
                <Card className="overflow-hidden rounded-2xl border border-[#102c2615] bg-white">
                  <div className="relative flex min-h-48 items-center justify-center bg-gradient-to-br from-[#102c26] to-[#3d2a65] p-6">
                    <motion.span
                      key={selectedEntry.letter}
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-8xl font-black text-white drop-shadow-lg sm:text-9xl"
                    >
                      {selectedEntry.letter}
                    </motion.span>
                    <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                      {isMovementLetter(selectedEntry) && (
                        <Badge className="border-amber-300 bg-amber-100 text-amber-900 text-[9px] font-bold">
                          MOVEMENT LETTER
                        </Badge>
                      )}
                      {studiedLetters.includes(selectedEntry.letter) && (
                        <Badge className="border-emerald-300 bg-emerald-100 text-emerald-900 text-[9px] font-bold">
                          <Check className="mr-1 h-3 w-3" /> STUDIED
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardContent className="space-y-4 p-5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Verified visual demonstration
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {selectedEntry.demonstration?.description ||
                          'Open the linked educational reference to see the handshape.'}
                      </p>
                      {selectedEntry.demonstration?.referenceUrl ? (
                        <a
                          href={selectedEntry.demonstration.referenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-800 hover:border-purple-400"
                        >
                          {selectedEntry.demonstration.label || 'Open verified reference'}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <p className="mt-3 text-xs font-semibold text-amber-800">
                          No verified visual link is available for this letter yet.
                        </p>
                      )}
                    </div>
                    {source?.url && (
                      <p className="text-xs text-slate-500">
                        Source:{' '}
                        <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-purple-700 hover:underline">
                          {source.name || 'ASL educational reference'} <ExternalLink className="inline h-3 w-3" />
                        </a>
                      </p>
                    )}
                    {visualNotice && (
                      <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                        {visualNotice}
                      </p>
                    )}
                    <Button
                      type="button"
                      disabled={studiedLetters.includes(selectedEntry.letter) || isSaving}
                      onClick={() => void persist({ studiedLetters: [selectedEntry.letter] })}
                      className="w-full rounded-xl bg-[#102c26] text-white hover:bg-[#1a443b] disabled:opacity-60"
                    >
                      {studiedLetters.includes(selectedEntry.letter) ? (
                        <><CheckCircle2 className="mr-2 h-4 w-4" /> Studied</>
                      ) : (
                        <><Check className="mr-2 h-4 w-4" /> Mark {selectedEntry.letter} as studied</>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailBlock label="Handshape" value={selectedEntry.handshape} />
                  <DetailBlock
                    label="Palm & finger orientation"
                    value={selectedEntry.orientation}
                    icon={<Hand className="h-3 w-3" />}
                  />
                  <DetailBlock
                    label="Movement"
                    value={selectedEntry.movement}
                    highlight={isMovementLetter(selectedEntry)}
                    icon={<Sparkles className="h-3 w-3" />}
                  />
                  <DetailBlock label="Common mistakes" value={selectedEntry.commonMistake} />
                  <DetailBlock
                    label="Learning tip"
                    value={selectedEntry.tip}
                    highlight
                    icon={<Lightbulb className="h-3 w-3" />}
                  />
                  <div className="rounded-xl border border-[#102c2612] bg-[#f8faf9] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Alphabet progress</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <motion.div
                        className="h-full rounded-full bg-emerald-500"
                        initial={false}
                        animate={{ width: `${stats.percentage}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-600">
                      {stats.studied} of 26 letters studied · {coverage.missing.length} still to go
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {mode === 'IDENTIFY' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4">
            <p className="font-bold text-purple-900">Letter identification</p>
            <p className="mt-1 text-xs leading-relaxed text-purple-800">
              Match each written handshape cue to its letter, then check the linked ASL University reference. This is a reading exercise, not camera recognition.
            </p>
          </div>

          {identifyQuestions.length === 0 || identifyFinished ? (
            <Card className="rounded-2xl border border-[#102c2615] bg-white">
              <CardContent className="p-8 text-center">
                <Target className="mx-auto h-7 w-7 text-purple-700" />
                <p className="mt-3 font-bold text-[#102c26]">
                  {identifyFinished ? 'Identification round complete' : 'Ready to identify letters?'}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {identifyFinished
                    ? `${identifyAnswered} of ${identifyQuestions.length} cues answered. Start another round whenever you like.`
                    : 'Six randomized cues from the A–Z curriculum.'}
                </p>
                <Button
                  type="button"
                  onClick={startIdentification}
                  className="mt-5 rounded-xl bg-[#102c26] text-white hover:bg-[#1a443b]"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> {identifyFinished ? 'Try another round' : 'Start identification'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence mode="wait">
              {activeIdentifyQuestion && (
                <QuestionCard
                  question={activeIdentifyQuestion}
                  index={identifyIndex}
                  total={identifyQuestions.length}
                  selectedLetter={identifyAnswers[activeIdentifyQuestion.letter]}
                  onSelect={answerIdentification}
                  onNext={() =>
                    identifyIndex === identifyQuestions.length - 1
                      ? setIdentifyFinished(true)
                      : setIdentifyIndex(index => index + 1)
                  }
                  nextLabel={identifyIndex === identifyQuestions.length - 1 ? 'See results' : 'Next cue'}
                />
              )}
            </AnimatePresence>
          )}
        </div>
      )}

      {mode === 'CHALLENGE' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-emerald-900">26-letter alphabet challenge</p>
                <p className="mt-1 text-xs text-emerald-800">
                  Every question comes from the verified curriculum and appears in a randomized order.
                </p>
              </div>
              <div className="flex gap-4 text-center text-sm font-bold text-emerald-900">
                <span>{challengeSummary.correct} correct</span>
                <span>{challengeSummary.incorrect} incorrect</span>
              </div>
            </div>
            {challengeQuestions.length > 0 && !challengeFinished && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-100">
                <motion.div
                  className="h-full rounded-full bg-emerald-600"
                  initial={false}
                  animate={{ width: `${(challengeSummary.answered / challengeQuestions.length) * 100}%` }}
                />
              </div>
            )}
          </div>

          {challengeQuestions.length === 0 || challengeFinished ? (
            <Card className="rounded-2xl border border-[#102c2615] bg-white">
              <CardContent className="p-8 text-center">
                {challengeFinished ? (
                  <>
                    <TrophyIcon correct={challengeSummary.correct} total={challengeSummary.total} />
                    <p className="mt-3 text-2xl font-black text-[#102c26]">
                      {challengeSummary.correct}/{challengeSummary.total} correct
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {challengeSummary.perfect
                        ? 'Excellent work — every letter matched.'
                        : `Review these letters: ${challengeSummary.missedLetters.join(', ') || 'none'}`}
                    </p>
                    {challengeSummary.missedLetters.length > 0 && (
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {challengeSummary.missedLetters.map(letter => (
                          <button
                            key={letter}
                            type="button"
                            onClick={() => {
                              setMode('EXPLORE');
                              setSelectedLetter(letter);
                            }}
                            className="h-9 w-9 rounded-lg border border-amber-300 bg-amber-50 text-sm font-black text-amber-900 hover:border-amber-500"
                          >
                            {letter}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {challengeSummary.missedLetters.length > 0 && (
                        <Button
                          type="button"
                          onClick={() => startChallenge(challengeSummary.missedLetters)}
                          className="rounded-xl bg-amber-600 text-white hover:bg-amber-700"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" /> Retry mistakes
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={() => startChallenge()}
                        variant="outline"
                        className="rounded-xl"
                      >
                        Start a full 26-letter challenge
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Sparkles className="mx-auto h-7 w-7 text-purple-700" />
                    <p className="mt-3 font-bold text-[#102c26]">Ready for the full alphabet?</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {coverage.isComplete
                        ? 'All 26 verified letters are available.'
                        : `${coverage.total} letters are available; ${coverage.missing.join(', ')} are missing from the reference.`}
                    </p>
                    <Button
                      type="button"
                      disabled={!coverage.isComplete}
                      onClick={() => startChallenge()}
                      className="mt-5 rounded-xl bg-[#102c26] text-white hover:bg-[#1a443b] disabled:opacity-50"
                    >
                      Start challenge <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence mode="wait">
              {activeChallengeQuestion && (
                <QuestionCard
                  question={activeChallengeQuestion}
                  index={challengeIndex}
                  total={challengeQuestions.length}
                  selectedLetter={challengeAnswers[activeChallengeQuestion.letter]}
                  onSelect={answerChallenge}
                  onNext={() =>
                    challengeIndex === challengeQuestions.length - 1
                      ? setChallengeFinished(true)
                      : setChallengeIndex(index => index + 1)
                  }
                  nextLabel={challengeIndex === challengeQuestions.length - 1 ? 'See results' : 'Next letter'}
                />
              )}
            </AnimatePresence>
          )}
          {challengeIsRetry && !challengeFinished && (
            <p className="text-center text-xs font-semibold text-amber-800">
              Focused retry: {challengeQuestions.length} previously missed letters.
            </p>
          )}
        </div>
      )}

      {mode === 'REVISION' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold text-[#102c26]">Revision</p>
                <p className="mt-1 text-xs text-slate-600">
                  Review only the letters you have studied. Mark letters in Explore to grow this set.
                </p>
              </div>
              <p className="text-sm font-black text-[#102c26]">{stats.studied}/26 studied</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className="h-full rounded-full bg-purple-600"
                initial={false}
                animate={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>

          {studiedLetters.length === 0 ? (
            <Card className="rounded-2xl border border-dashed border-[#102c2630] bg-white">
              <CardContent className="p-8 text-center">
                <BookOpen className="mx-auto h-7 w-7 text-purple-700" />
                <p className="mt-3 font-bold text-[#102c26]">No studied letters yet</p>
                <p className="mt-1 text-sm text-slate-600">
                  Explore a letter and mark it as studied to unlock revision.
                </p>
                <Button
                  type="button"
                  onClick={() => setMode('EXPLORE')}
                  className="mt-5 rounded-xl bg-[#102c26] text-white hover:bg-[#1a443b]"
                >
                  Explore letters <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ) : revisionQuestions.length === 0 || revisionFinished ? (
            <Card className="rounded-2xl border border-[#102c2615] bg-white">
              <CardContent className="p-8 text-center">
                <RotateCcw className="mx-auto h-7 w-7 text-purple-700" />
                <p className="mt-3 font-bold text-[#102c26]">
                  {revisionFinished ? 'Revision round complete' : 'Ready to revisit your letters?'}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {revisionFinished
                    ? `${revisionAnswered} of ${revisionQuestions.length} review cues answered.`
                    : `${studiedLetters.length} studied letters are available for review.`}
                </p>
                <Button
                  type="button"
                  onClick={startRevision}
                  className="mt-5 rounded-xl bg-[#102c26] text-white hover:bg-[#1a443b]"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> {revisionFinished ? 'Review again' : 'Start revision'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence mode="wait">
              {activeRevisionQuestion && (
                <QuestionCard
                  question={activeRevisionQuestion}
                  index={revisionIndex}
                  total={revisionQuestions.length}
                  selectedLetter={revisionAnswers[activeRevisionQuestion.letter]}
                  onSelect={answerRevision}
                  onNext={() =>
                    revisionIndex === revisionQuestions.length - 1
                      ? setRevisionFinished(true)
                      : setRevisionIndex(index => index + 1)
                  }
                  nextLabel={revisionIndex === revisionQuestions.length - 1 ? 'See results' : 'Next review'}
                />
              )}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
};

const TrophyIcon = ({ correct, total }: { correct: number; total: number }) => (
  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
    {correct === total ? <Sparkles className="h-7 w-7" /> : <X className="h-7 w-7" />}
  </div>
);
