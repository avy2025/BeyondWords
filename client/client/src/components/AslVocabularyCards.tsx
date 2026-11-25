import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lightbulb,
  ShieldCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { VocabularyCard as VocabularyCardData } from '@/lib/aslLearningExperience';

interface VocabularyCardsProps {
  cards: VocabularyCardData[];
  activeCardId: string | null;
  expandedIds: string[];
  revealedIds: string[];
  revisionMarks: string[];
  recommendations: string[];
  onActiveCardChange: (cardId: string) => void;
  onToggleExpand: (cardId: string) => void;
  onToggleReveal: (cardId: string) => void;
  onToggleRevisionMark: (cardId: string) => void;
  title?: string;
}

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-[#102c2610] bg-[#f8f7f2] p-3">
    <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
    <dd className="mt-1 text-sm leading-relaxed text-[#414846]">{value}</dd>
  </div>
);

export const AslVocabularyCards = ({
  cards,
  activeCardId,
  expandedIds,
  revealedIds,
  revisionMarks,
  recommendations,
  onActiveCardChange,
  onToggleExpand,
  onToggleReveal,
  onToggleRevisionMark,
  title = 'Interactive vocabulary cards'
}: VocabularyCardsProps) => {
  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#102c2630] p-8 text-center text-sm text-slate-500">
        Vocabulary cards are not available for this level yet.
      </div>
    );
  }

  const activeIndex = Math.max(
    0,
    cards.findIndex(card => card.id === activeCardId)
  );
  const card = cards[activeIndex];
  const expanded = expandedIds.includes(card.id);
  const revealed = revealedIds.includes(card.id);
  const marked = revisionMarks.includes(card.id);
  const recommended = recommendations.includes(card.term);

  const move = (direction: 1 | -1) => {
    const nextIndex = (activeIndex + direction + cards.length) % cards.length;
    onActiveCardChange(cards[nextIndex].id);
  };

  return (
    <section className="space-y-4" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#77948c]" />
          <h3 className="text-lg font-bold text-[#102c26]">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-[#102c2620] text-[10px] font-bold text-slate-600">
            {activeIndex + 1} / {cards.length}
          </Badge>
          {marked && (
            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
              <Bookmark className="w-3 h-3 mr-1" /> Revision
            </Badge>
          )}
          {recommended && !marked && (
            <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px] font-bold">
              Review suggested
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Vocabulary items">
        {cards.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === card.id}
            onClick={() => onActiveCardChange(item.id)}
            className={`min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
              item.id === card.id
                ? 'border-purple-700 bg-purple-700 text-white'
                : revisionMarks.includes(item.id)
                  ? 'border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-500'
                  : 'border-[#102c261a] bg-white text-[#414846] hover:border-purple-400'
            }`}
          >
            {index + 1}. {item.term}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          <Card className="rounded-2xl border border-[#102c2615] bg-white shadow-sm">
            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-purple-700">
                    Word / expression
                  </p>
                  <h4 className="text-2xl font-bold text-[#102c26]">{card.term}</h4>
                  <p className="text-sm text-slate-600">{card.meaning}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleRevisionMark(card.id)}
                  aria-pressed={marked}
                  aria-label={marked ? `Remove ${card.term} from revision` : `Mark ${card.term} for revision`}
                  className={`rounded-full text-xs ${
                    marked
                      ? 'border-amber-400 bg-amber-50 text-amber-900'
                      : 'border-[#102c2620] text-[#102c26]'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 mr-1.5 ${marked ? 'fill-amber-500 text-amber-600' : ''}`} />
                  {marked ? 'Marked' : 'Mark for revision'}
                </Button>
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 text-xs text-purple-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{card.visualNotice}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onToggleReveal(card.id)}
                  aria-expanded={revealed}
                  className="rounded-full text-xs"
                >
                  <Lightbulb className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                  {revealed ? 'Hide explanation' : 'Reveal explanation'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleExpand(card.id)}
                  aria-expanded={expanded}
                  className="text-xs text-[#414846]"
                >
                  {expanded ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
                  {expanded ? 'Collapse details' : 'Expand details'}
                </Button>
              </div>

              <AnimatePresence initial={false}>
                {revealed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                      <p className="font-bold text-xs uppercase tracking-[0.14em] mb-1">Beginner explanation</p>
                      <p className="leading-relaxed">{card.explanation}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 pt-1">
                      <dl className="grid gap-2 sm:grid-cols-2">
                        <Detail label="Handshape" value={card.handshape} />
                        <Detail label="Palm orientation" value={card.palmOrientation} />
                        <Detail label="Movement" value={card.movement} />
                        <Detail label="Facial expression / non-manual markers" value={card.nonManualMarkers} />
                      </dl>
                      <Detail label="Example usage" value={card.example} />
                      <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-rose-700">
                          Common mistake
                        </p>
                        <p className="mt-1 text-sm text-rose-900">{card.commonMistake}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="border-t border-[#102c2610] pt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Verified educational reference
                </p>
                {card.reference.url ? (
                  <a
                    href={card.reference.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-purple-800 underline decoration-purple-300 underline-offset-4 hover:text-purple-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                  >
                    {card.reference.label}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">
                    {card.reference.label} — no direct URL was supplied for this item. Check the lesson source list.
                  </p>
                )}
                {card.reference.note && <p className="mt-1 text-xs text-slate-500">{card.reference.note}</p>}
                {card.reference.verification && (
                  <p className="mt-1 text-xs text-slate-500">{card.reference.verification}</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-[#102c2610] pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => move(-1)}
                  aria-label="Previous vocabulary item"
                  className="rounded-full"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Previous
                </Button>
                <span className="text-xs text-slate-500" aria-live="polite">
                  {marked ? 'Saved to your revision list for this level.' : 'Tap a card number or use Next to navigate.'}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => move(1)}
                  aria-label="Next vocabulary item"
                  className="rounded-full"
                >
                  Next <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </section>
  );
};
