import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Volume2 } from 'lucide-react';

interface GermanLesson {
  id: string;
  title: string;
  category: 'VOCAB' | 'GRAMMAR' | 'CONVERSATION';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  german: string;
  english: string;
  pronunciation: string;
  example: string;
  exampleTranslation: string;
  xpReward: number;
}

interface GermanLearningProps {
  onLessonComplete?: (lesson: GermanLesson, xp: number) => void;
}

const GERMAN_LESSONS: GermanLesson[] = [
  {
    id: 'guten_morgen',
    title: 'Good Morning',
    category: 'VOCAB',
    difficulty: 'beginner',
    german: 'Guten Morgen',
    english: 'Good Morning',
    pronunciation: 'GOO-ten MOR-gen',
    example: 'Guten Morgen, wie geht es dir?',
    exampleTranslation: 'Good morning, how are you?',
    xpReward: 10,
  },
  {
    id: 'danke',
    title: 'Thank You',
    category: 'VOCAB',
    difficulty: 'beginner',
    german: 'Danke',
    english: 'Thank You',
    pronunciation: 'DAHN-kuh',
    example: 'Danke für deine Hilfe!',
    exampleTranslation: 'Thanks for your help!',
    xpReward: 10,
  },
  {
    id: 'bitte',
    title: 'Please',
    category: 'VOCAB',
    difficulty: 'beginner',
    german: 'Bitte',
    english: 'Please',
    pronunciation: 'BIT-tuh',
    example: 'Ein Kaffee, bitte.',
    exampleTranslation: 'A coffee, please.',
    xpReward: 10,
  },
  {
    id: 'entschuldigung',
    title: 'Excuse Me',
    category: 'VOCAB',
    difficulty: 'beginner',
    german: 'Entschuldigung',
    english: 'Excuse Me / Sorry',
    pronunciation: 'ENT-shool-dee-goong',
    example: 'Entschuldigung, sprechen Sie Englisch?',
    exampleTranslation: 'Excuse me, do you speak English?',
    xpReward: 10,
  },
  {
    id: 'present_verbs',
    title: 'Present Tense Verbs',
    category: 'GRAMMAR',
    difficulty: 'intermediate',
    german: 'Ich bin, du bist, er/sie/es ist',
    english: 'I am, you are, he/she/it is',
    pronunciation: 'ich bin, du bist, ehr/zee/es ist',
    example: 'Ich bin ein Lehrer. Du bist ein Student.',
    exampleTranslation: 'I am a teacher. You are a student.',
    xpReward: 20,
  },
  {
    id: 'plural_nouns',
    title: 'Plural Nouns',
    category: 'GRAMMAR',
    difficulty: 'intermediate',
    german: 'der Tisch - die Tische',
    english: 'the table - the tables',
    pronunciation: 'dehr TISH - dee TISH-uh',
    example: 'Ein Tisch, zwei Tische.',
    exampleTranslation: 'One table, two tables.',
    xpReward: 20,
  },
  {
    id: 'asking_directions',
    title: 'Asking Directions',
    category: 'CONVERSATION',
    difficulty: 'intermediate',
    german: 'Wo ist die Toilette?',
    english: 'Where is the bathroom?',
    pronunciation: 'Vo ist dee TOH-let-uh?',
    example: 'Entschuldigung, wo ist die nächste Haltestelle?',
    exampleTranslation: 'Excuse me, where is the nearest bus stop?',
    xpReward: 20,
  },
  {
    id: 'perfect_tense',
    title: 'Perfect Tense',
    category: 'GRAMMAR',
    difficulty: 'advanced',
    german: 'Ich habe gegessen',
    english: 'I have eaten',
    pronunciation: 'ich HAH-buh guh-GEST-en',
    example: 'Ich habe schon Frühstück gegessen.',
    exampleTranslation: 'I have already eaten breakfast.',
    xpReward: 30,
  },
  {
    id: 'subordinate_clauses',
    title: 'Subordinate Clauses',
    category: 'GRAMMAR',
    difficulty: 'advanced',
    german: 'Ich weiß, dass du Deutsch lernst.',
    english: 'I know that you are learning German.',
    pronunciation: 'ich vyce, dahs du DOYSH lernst',
    example: 'Sie sagte, dass sie morgen kommt.',
    exampleTranslation: 'She said that she is coming tomorrow.',
    xpReward: 30,
  },
  {
    id: 'business_conversation',
    title: 'Business German',
    category: 'CONVERSATION',
    difficulty: 'advanced',
    german: 'Sehr geehrte Damen und Herren',
    english: 'Dear Sir or Madam',
    pronunciation: 'Zayr guh-EHR-tuh DAH-men oont HEHR-ren',
    example: 'Sehr geehrte Damen und Herren, ich freue mich Sie kennenzulernen.',
    exampleTranslation: 'Dear Sir or Madam, I am pleased to meet you.',
    xpReward: 30,
  },
];

const categoryColors = {
  VOCAB: { icon: '📚', text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  GRAMMAR: { icon: '📝', text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  CONVERSATION: { icon: '🗣️', text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
};

const difficultyColors = {
  beginner: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  intermediate: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  advanced: { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
};

const GermanLessonDetail = ({
  lesson,
  onBack,
  onComplete,
}: {
  lesson: GermanLesson;
  onBack: () => void;
  onComplete: (xp: number) => void;
}) => {
  const [phase, setPhase] = useState<'learn' | 'practice' | 'quiz'>('learn');
  const [quizAnswers, setQuizAnswers] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const playPronunciation = () => {
    const utterance = new SpeechSynthesisUtterance(lesson.pronunciation);
    utterance.lang = 'de-DE';
    speechSynthesis.speak(utterance);
  };

  const handleQuizAnswer = (correct: boolean) => {
    if (correct) {
      setQuizAnswers((c) => {
        const newCount = c + 1;
        if (newCount >= 3) {
          onComplete(lesson.xpReward);
        }
        return newCount;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#102c26]">{lesson.title}</h2>
              <p className="text-slate-600">Learn German • {lesson.difficulty}</p>
            </div>
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b">
            <button
              onClick={() => setPhase('learn')}
              className={`px-4 py-2 font-bold transition-all ${
                phase === 'learn'
                  ? 'text-[#102c26] border-b-2 border-[#102c26]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📖 Learn
            </button>
            <button
              onClick={() => setPhase('practice')}
              className={`px-4 py-2 font-bold transition-all ${
                phase === 'practice'
                  ? 'text-[#102c26] border-b-2 border-[#102c26]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ✍️ Practice
            </button>
            <button
              onClick={() => setPhase('quiz')}
              className={`px-4 py-2 font-bold transition-all ${
                phase === 'quiz'
                  ? 'text-[#102c26] border-b-2 border-[#102c26]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ❓ Quiz
            </button>
          </div>

          {/* Learn Phase */}
          {phase === 'learn' && (
            <div className="space-y-6">
              <div className={`${categoryColors[lesson.category].bg} ${categoryColors[lesson.category].border} border rounded-xl p-6`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-sm font-bold text-slate-600 uppercase tracking-wider">German</div>
                    <h3 className="text-3xl font-bold text-[#102c26] mt-2">{lesson.german}</h3>
                  </div>
                  <Button
                    onClick={playPronunciation}
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                  >
                    <Volume2 className="w-5 h-5" />
                  </Button>
                </div>
                <p className="text-sm text-slate-600">
                  <span className="font-bold">Pronunciation:</span> {lesson.pronunciation}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-6">
                <div className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-2">English Translation</div>
                <p className="text-2xl font-semibold text-slate-900">{lesson.english}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">Example</div>
                <p className="text-lg font-bold text-slate-900 mb-2">"{lesson.example}"</p>
                <p className="text-slate-700">→ {lesson.exampleTranslation}</p>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setPhase('practice')} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Next: Practice
                </Button>
                <Button onClick={onBack} variant="outline" className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Practice Phase */}
          {phase === 'practice' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h3 className="font-bold text-lg text-slate-900 mb-4">Try saying or writing this phrase:</h3>
                <div className="bg-white border-2 border-yellow-400 rounded-lg p-6 text-center">
                  <p className="text-4xl font-bold text-[#102c26]">{lesson.german}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  💡 <strong>Tip:</strong> {lesson.pronunciation}
                </p>
                <p className="text-sm text-slate-600">
                  📝 Remember: "{lesson.example}"
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={playPronunciation} variant="outline" className="flex-1">
                  🔊 Hear Pronunciation
                </Button>
                <Button onClick={() => setPhase('quiz')} className="flex-1 bg-green-600 hover:bg-green-700">
                  Check: Quiz →
                </Button>
              </div>
            </div>
          )}

          {/* Quiz Phase */}
          {phase === 'quiz' && (
            <div className="space-y-6">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-slate-600">Progress</span>
                  <span className="text-sm font-bold text-slate-900">
                    {quizAnswers}/3
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(quizAnswers / 3) * 100}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>

              {quizAnswers < 3 ? (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-slate-900">What does "{lesson.german}" mean?</h3>
                  <div className="space-y-2">
                    {[lesson.english, 'Hello', 'Goodbye', 'Thank you']
                      .sort(() => Math.random() - 0.5)
                      .map((option, idx) => (
                        <Button
                          key={idx}
                          onClick={() =>
                            handleQuizAnswer(option === lesson.english)
                          }
                          variant={option === lesson.english ? 'default' : 'outline'}
                          className="w-full justify-start text-left h-auto py-3 px-4"
                        >
                          {option}
                        </Button>
                      ))}
                  </div>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200"
                >
                  <div className="text-center">
                    <div className="text-5xl mb-3">🎉</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Lesson Complete!</h3>
                    <p className="text-slate-600 mb-4">
                      You earned <span className="font-bold text-emerald-600">+{lesson.xpReward} XP</span>
                    </p>
                    <Button onClick={onBack} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      Continue
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const GermanLearning = ({ onLessonComplete }: GermanLearningProps) => {
  const [selectedLesson, setSelectedLesson] = useState<GermanLesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  const difficultyLessons = useMemo(
    () => GERMAN_LESSONS.filter((l) => l.difficulty === difficulty),
    [difficulty]
  );

  const handleLessonComplete = (xp: number) => {
    if (selectedLesson) {
      setCompletedLessons([...completedLessons, selectedLesson.id]);
      onLessonComplete?.(selectedLesson, xp);
    }
  };

  return (
    <div className="space-y-8">
      {/* Difficulty Selector */}
      <div className="flex gap-2 flex-wrap">
        {(['beginner', 'intermediate', 'advanced'] as const).map((diff) => (
          <Button
            key={diff}
            onClick={() => setDifficulty(diff)}
            variant={difficulty === diff ? 'default' : 'outline'}
            className={`capitalize ${
              difficulty === diff
                ? 'bg-[#102c26] text-white hover:bg-[#102c26]'
                : 'border-[#102c260d]'
            }`}
          >
            {diff === 'beginner' ? '🌱' : diff === 'intermediate' ? '🌿' : '🌳'}{' '}
            {diff.charAt(0).toUpperCase() + diff.slice(1)}
          </Button>
        ))}
      </div>

      {/* Lessons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {difficultyLessons.map((lesson) => {
          const isCompleted = completedLessons.includes(lesson.id);
          const colors = difficultyColors[lesson.difficulty];
          const catColors = categoryColors[lesson.category];

          return (
            <motion.div
              key={lesson.id}
              whileHover={{ scale: 1.05, translateY: -4 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card
                onClick={() => setSelectedLesson(lesson)}
                className={`h-full cursor-pointer transition-all hover:shadow-lg relative overflow-hidden group ${
                  isCompleted ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'
                }`}
              >
                {isCompleted && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 font-bold">
                      ✓
                    </div>
                  </div>
                )}
                <CardContent className="p-6 flex flex-col gap-4 h-full">
                  <div className={`text-3xl inline-block w-fit`}>{catColors.icon}</div>

                  <div>
                    <div className={`${colors.text} text-sm font-bold mb-1`}>{lesson.category}</div>
                    <h3 className="font-bold text-lg text-[#102c26]">{lesson.title}</h3>
                    <p className="text-2xl font-bold text-[#102c26] mt-2">{lesson.german}</p>
                    <p className="text-sm text-slate-600 mt-1">{lesson.english}</p>
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    <Badge variant="outline" className={`text-xs capitalize ${colors.text}`}>
                      {lesson.difficulty}
                    </Badge>
                    <span className="text-sm font-bold text-amber-600">+{lesson.xpReward} XP</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <GermanLessonDetail
          lesson={selectedLesson}
          onBack={() => setSelectedLesson(null)}
          onComplete={handleLessonComplete}
        />
      )}
    </div>
  );
};
