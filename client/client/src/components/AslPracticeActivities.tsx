import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  RotateCcw,
  Target,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  asMatchingPairs,
  gradePracticeActivity,
  type PracticeActivity,
  type PracticeAnswer,
  type PracticeGrade
} from '@/lib/aslLearningExperience';

interface PracticeActivitiesProps {
  activities: PracticeActivity[];
  title: string;
  description: string;
  onResult: (activity: PracticeActivity, grade: PracticeGrade) => void;
  xpNeutralNotice?: string;
}

const KIND_LABELS: Record<PracticeActivity['kind'], string> = {
  MATCHING: 'Matching',
  MULTIPLE_CHOICE: 'Choose the answer',
  FILL_BLANK: 'Fill the gap',
  CONTEXT_CHOICE: 'Context check',
  ORDERING: 'Put it in order'
};

export const AslPracticeActivities = ({
  activities,
  title,
  description,
  onResult,
  xpNeutralNotice = 'Practice is XP-neutral. Only the final assessment affects progression.'
}: PracticeActivitiesProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, PracticeAnswer>>({});
  const [grades, setGrades] = useState<Record<string, PracticeGrade>>({});
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [hints, setHints] = useState<Record<string, boolean>>({});
  const [orderDraft, setOrderDraft] = useState<string[]>([]);

  const activity = activities[currentIndex];

  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setGrades({});
    setSelectedLeft(null);
    setHints({});
    setOrderDraft(activity?.steps ? activity.steps.map(step => step.id) : []);
    // Activities are remounted per stage by the parent; this guard handles reshuffles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities]);

  useEffect(() => {
    setSelectedLeft(null);
    setOrderDraft(activity?.steps ? activity.steps.map(step => step.id) : []);
  }, [activity?.id]);

  const gradedCount = useMemo(
    () => activities.filter(item => grades[item.id]?.answered).length,
    [activities, grades]
  );
  const correctCount = useMemo(
    () => activities.filter(item => grades[item.id]?.correct).length,
    [activities, grades]
  );

  if (!activity) {
    return (
      <div className="rounded-2xl border border-dashed border-[#102c2630] p-8 text-center text-sm text-slate-500">
        No practice activities are available for this stage.
      </div>
    );
  }

  const setAnswer = (value: PracticeAnswer) =>
    setAnswers(previous => ({ ...previous, [activity.id]: value }));

  const currentAnswer = answers[activity.id] ?? null;
  const grade = grades[activity.id];

  const check = () => {
    if (grade?.correct) return;
    const result = gradePracticeActivity(activity, currentAnswer);
    setGrades(previous => ({ ...previous, [activity.id]: result }));
    onResult(activity, result);
  };

  const retry = () => {
    setGrades(previous => {
      const next = { ...previous };
      delete next[activity.id];
      return next;
    });
    setAnswers(previous => ({ ...previous, [activity.id]: null }));
    setSelectedLeft(null);
    setOrderDraft(activity.steps ? activity.steps.map(step => step.id) : []);
  };

  const connectPair = (rightId: string) => {
    if (!selectedLeft) return;
    const pairs = asMatchingPairs(currentAnswer);
    const next = pairs.filter(pair => pair.leftId !== selectedLeft && pair.rightId !== rightId);
    next.push({ leftId: selectedLeft, rightId });
    setAnswer(next);
    setSelectedLeft(null);
  };

  const moveStep = (stepId: string, direction: 1 | -1) => {
    const from = orderDraft.indexOf(stepId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= orderDraft.length) return;
    const next = [...orderDraft];
    [next[from], next[to]] = [next[to], next[from]];
    setOrderDraft(next);
    setAnswer(next);
  };

  const matchingPairs = asMatchingPairs(currentAnswer);
  const allMatched = Boolean(
    activity.leftItems &&
      activity.leftItems.every(item => matchingPairs.some(pair => pair.leftId === item.id))
  );
  const canCheck =
    activity.kind === 'MATCHING'
      ? allMatched
      : activity.kind === 'ORDERING'
        ? orderDraft.length === (activity.steps?.length || 0)
        : activity.kind === 'FILL_BLANK'
          ? typeof currentAnswer === 'string' && currentAnswer.trim().length > 0
          : typeof currentAnswer === 'number';

  return (
    <section className="space-y-4" aria-label={title}>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-[#102c26] flex items-center gap-2">
            <Target className="w-5 h-5 text-[#77948c]" /> {title}
          </h3>
          <span className="text-xs font-bold text-slate-500" aria-live="polite">
            {correctCount} correct · {gradedCount}/{activities.length} checked
          </span>
        </div>
        <p className="text-sm text-slate-600">{description}</p>
      </div>

      <div className="h-1.5 rounded-full bg-[#102c260d] overflow-hidden" aria-hidden="true">
        <motion.div
          className="h-full bg-purple-600"
          animate={{ width: `${activities.length ? ((currentIndex + 1) / activities.length) * 100 : 0}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="rounded-2xl border border-[#102c2615] bg-white shadow-sm">
            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge className="bg-purple-100 text-purple-900 border-purple-200 text-[10px] font-bold">
                  {KIND_LABELS[activity.kind]}
                </Badge>
                <span className="text-xs font-semibold text-slate-500">
                  Activity {currentIndex + 1} of {activities.length}
                </span>
              </div>

              <p className="text-base font-bold leading-relaxed text-[#102c26]">{activity.prompt}</p>
              {activity.instruction && <p className="text-sm text-slate-600">{activity.instruction}</p>}

              {activity.kind === 'MULTIPLE_CHOICE' || activity.kind === 'CONTEXT_CHOICE' ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(activity.options || []).map(option => {
                    const chosen = currentAnswer === (activity.options || []).indexOf(option);
                    const showCorrect = Boolean(grade?.answered) && option.id === activity.correctOptionId;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={grade?.correct}
                        onClick={() => setAnswer((activity.options || []).indexOf(option))}
                        aria-pressed={chosen}
                        className={`min-h-[48px] rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                          showCorrect
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                            : chosen && grade && !grade.correct
                              ? 'border-rose-400 bg-rose-50 text-rose-900'
                              : chosen
                                ? 'border-purple-600 bg-purple-50 text-purple-900'
                                : 'border-[#102c261a] bg-white text-[#414846] hover:border-purple-400 hover:bg-purple-50/40'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          {option.text}
                          {showCorrect && <Check className="w-4 h-4 text-emerald-600" />}
                          {chosen && grade && !grade.correct && <X className="w-4 h-4 text-rose-500" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {activity.kind === 'FILL_BLANK' && (
                <div className="space-y-3">
                  {activity.blankText && (
                    <div className="rounded-xl border border-[#102c2615] bg-[#f8f7f2] px-4 py-3 font-mono text-sm text-[#102c26]">
                      {activity.blankText}
                    </div>
                  )}
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">
                    Missing expression
                    <input
                      type="text"
                      value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                      onChange={event => setAnswer(event.target.value)}
                      disabled={grade?.correct}
                      className="mt-2 w-full rounded-xl border border-[#102c261a] px-4 py-3 text-sm text-[#102c26] focus:border-purple-500 focus:outline-none"
                      placeholder="Type the missing expression…"
                    />
                  </label>
                </div>
              )}

              {activity.kind === 'MATCHING' && activity.leftItems && activity.rightItems && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Select a cue, then choose the matching item. Connected pairs can be removed.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Cue</span>
                      {activity.leftItems.map(item => {
                        const paired = matchingPairs.some(pair => pair.leftId === item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            disabled={paired || grade?.correct}
                            onClick={() => setSelectedLeft(item.id)}
                            aria-pressed={selectedLeft === item.id}
                            className={`min-h-[48px] w-full rounded-xl border p-3 text-left text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                              paired
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : selectedLeft === item.id
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
                      {activity.rightItems.map(item => {
                        const paired = matchingPairs.some(pair => pair.rightId === item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            disabled={paired || !selectedLeft || grade?.correct}
                            onClick={() => connectPair(item.id)}
                            className={`min-h-[48px] w-full rounded-xl border p-3 text-left text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                              paired
                                ? 'border-slate-200 bg-slate-100 text-slate-500'
                                : selectedLeft
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
                  {matchingPairs.length > 0 && (
                    <div className="flex flex-wrap gap-2 border-t border-[#102c2610] pt-3">
                      {matchingPairs.map(pair => (
                        <button
                          key={`${pair.leftId}-${pair.rightId}`}
                          type="button"
                          disabled={grade?.correct}
                          onClick={() =>
                            setAnswer(matchingPairs.filter(candidate => candidate.leftId !== pair.leftId))
                          }
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 hover:border-emerald-500"
                          aria-label="Remove connected pair"
                        >
                          {activity.leftItems?.find(item => item.id === pair.leftId)?.text} ⇄{' '}
                          {activity.rightItems?.find(item => item.id === pair.rightId)?.text} ✕
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activity.kind === 'ORDERING' && activity.steps && (
                <ol className="space-y-2">
                  {orderDraft.map((stepId, index) => {
                    const step = activity.steps?.find(item => item.id === stepId);
                    return (
                      <li
                        key={stepId}
                        className="flex items-center gap-2 rounded-xl border border-[#102c2615] bg-[#f8f7f2] p-3"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#102c26] text-xs font-bold text-white">
                          {index + 1}
                        </span>
                        <span className="flex-1 text-sm text-[#414846]">{step?.text}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={index === 0 || Boolean(grade?.correct)}
                          onClick={() => moveStep(stepId, -1)}
                          aria-label={`Move step ${index + 1} up`}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={index === orderDraft.length - 1 || Boolean(grade?.correct)}
                          onClick={() => moveStep(stepId, 1)}
                          aria-label={`Move step ${index + 1} down`}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ol>
              )}

              {!hints[activity.id] && activity.hint && (
                <button
                  type="button"
                  onClick={() => setHints(previous => ({ ...previous, [activity.id]: true }))}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <Lightbulb className="w-3.5 h-3.5" /> Show hint
                </button>
              )}
              {hints[activity.id] && activity.hint && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {activity.hint}
                </p>
              )}

              {grade?.answered && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`rounded-xl border p-4 text-sm leading-relaxed ${
                    grade.correct
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-rose-200 bg-rose-50 text-rose-900'
                  }`}
                >
                  <span className="flex items-center gap-2 font-bold">
                    {grade.correct ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {grade.correct ? 'Correct' : 'Not quite — try again'}
                  </span>
                  <span className="mt-1 block">{grade.feedback}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#102c2610] pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(index => index - 1)}
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Previous
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  {grade && !grade.correct && (
                    <Button type="button" variant="outline" size="sm" onClick={retry}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retry
                    </Button>
                  )}
                  {!grade?.correct && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={!canCheck}
                      onClick={check}
                      className="bg-[#102c26] hover:bg-[#1d4139]"
                    >
                      Check answer
                    </Button>
                  )}
                  {currentIndex < activities.length - 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setCurrentIndex(index => index + 1)}
                      className="text-[#414846]"
                    >
                      Skip <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  )}
                </div>
              </div>

              {activity.reference?.url && (
                <p className="text-xs text-slate-500">
                  Reference:{' '}
                  <a
                    href={activity.reference.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-semibold text-purple-800 underline underline-offset-2"
                  >
                    {activity.reference.label}
                    <ExternalLink className="ml-1 inline h-3 w-3" />
                  </a>
                </p>
              )}
              <p className="text-xs text-slate-500">{xpNeutralNotice}</p>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </section>
  );
};
