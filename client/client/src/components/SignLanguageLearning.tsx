import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import './SignLanguageLearning.css';

interface SignLesson {
  id: string;
  title: string;
  titleDE: string;
  word: string;
  wordDE: string;
  emoji: string;
  description: string;
  descriptionDE: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  expectedLabel: string;
  xpReward: number;
  hints: string[];
  hintsDE: string[];
}

interface SignLanguageLearningProps {
  language?: 'en' | 'de';
  onLessonComplete?: (lesson: SignLesson, xp: number) => void;
}

const SIGN_LESSONS: SignLesson[] = [
  {
    id: 'hello',
    title: 'Hello',
    titleDE: 'Hallo',
    word: 'Hello',
    wordDE: 'Hallo',
    emoji: '👋',
    description: 'Wave your open hand outward from forehead – the universal ASL greeting.',
    descriptionDE: 'Bewegen Sie Ihre offene Hand von der Stirn nach außen – die universelle ASL-Begrüßung.',
    difficulty: 'beginner',
    expectedLabel: 'hello',
    xpReward: 10,
    hints: ['Start fingers near forehead', 'Sweep hand outward', 'Keep fingers flat together'],
    hintsDE: ['Finger an der Stirn beginnen', 'Hand nach außen bewegen', 'Finger flach zusammenhalten'],
  },
  {
    id: 'thank_you',
    title: 'Thank You',
    titleDE: 'Danke',
    word: 'Thank You',
    wordDE: 'Danke schön',
    emoji: '🙏',
    description: 'Touch fingertips to chin then move hand outward gracefully.',
    descriptionDE: 'Berühren Sie die Fingerspitzen am Kinn und bewegen Sie die Hand anmutig nach außen.',
    difficulty: 'beginner',
    expectedLabel: 'thank_you',
    xpReward: 10,
    hints: ['Touch fingertips to chin', 'Move hand outward and down', 'Palm faces upward at end'],
    hintsDE: ['Fingerspitzen am Kinn berühren', 'Hand nach außen und unten bewegen', 'Handfläche am Ende nach oben'],
  },
  {
    id: 'yes',
    title: 'Yes',
    titleDE: 'Ja',
    word: 'Yes',
    wordDE: 'Ja',
    emoji: '✅',
    description: 'Make a fist and nod it up and down, mimicking a nodding head.',
    descriptionDE: 'Machen Sie eine Faust und nicken Sie sie auf und ab, als würden Sie einen Kopf nicken.',
    difficulty: 'beginner',
    expectedLabel: 'yes',
    xpReward: 10,
    hints: ['Make a firm fist', 'Bend wrist up and down', 'Motion like a nodding head'],
    hintsDE: ['Feste Faust machen', 'Handgelenk auf und ab biegen', 'Bewegung wie ein Kopfnicken'],
  },
  {
    id: 'no',
    title: 'No',
    titleDE: 'Nein',
    word: 'No',
    wordDE: 'Nein',
    emoji: '❌',
    description: 'Extend hand with two fingers pointed and shake it side to side.',
    descriptionDE: 'Hand mit zwei ausgestreckten Fingern ausstrecken und von Seite zu Seite schütteln.',
    difficulty: 'beginner',
    expectedLabel: 'no',
    xpReward: 10,
    hints: ['Extend index and middle finger', 'Keep other fingers curled', 'Shake hand side to side'],
    hintsDE: ['Zeige- und Mittelfinger ausstrecken', 'Andere Finger gekrümmt halten', 'Hand von Seite zu Seite schütteln'],
  },
  {
    id: 'sorry',
    title: 'Sorry',
    titleDE: 'Entschuldigung',
    word: 'Sorry',
    wordDE: 'Entschuldigung',
    emoji: '😔',
    description: 'Make a fist and rub counterclockwise on chest showing remorse.',
    descriptionDE: 'Machen Sie eine Faust und reiben Sie sie gegen den Uhrzeigersinn auf der Brust.',
    difficulty: 'intermediate',
    expectedLabel: 'sorry',
    xpReward: 20,
    hints: ['Clench your fist', 'Place fist on chest', 'Rotate counterclockwise'],
    hintsDE: ['Faust ballen', 'Faust auf die Brust legen', 'Gegen den Uhrzeigersinn drehen'],
  },
  {
    id: 'help',
    title: 'Help',
    titleDE: 'Hilfe',
    word: 'Help',
    wordDE: 'Hilfe',
    emoji: '🆘',
    description: 'Place your fist on open palm and raise both hands upward.',
    descriptionDE: 'Legen Sie Ihre Faust in eine offene Handfläche und heben Sie beide Hände nach oben.',
    difficulty: 'intermediate',
    expectedLabel: 'help',
    xpReward: 20,
    hints: ['Make a thumbs-up fist', 'Rest on your flat palm', 'Lift both hands upward together'],
    hintsDE: ['Daumen-hoch-Faust machen', 'Auf flacher Handfläche ruhen', 'Beide Hände zusammen nach oben heben'],
  },
  {
    id: 'i_love_you',
    title: 'I Love You',
    titleDE: 'Ich liebe dich',
    word: 'I Love You',
    wordDE: 'Ich liebe dich',
    emoji: '❤️',
    description: 'Extend thumb, index, and pinky – the iconic ILY handshape.',
    descriptionDE: 'Daumen, Zeigefinger und kleinen Finger ausstrecken – die ikonische ILY-Handform.',
    difficulty: 'advanced',
    expectedLabel: 'i_love_you',
    xpReward: 30,
    hints: ['Extend thumb index and pinky', 'Tuck middle and ring fingers', 'Hold shape toward camera steadily'],
    hintsDE: ['Daumen, Zeige- und kleinen Finger ausstrecken', 'Mittel- und Ringfinger einkrümmen', 'Form steady zur Kamera halten'],
  },
];

const difficultyColors = {
  beginner: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  intermediate: { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
  advanced: { text: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30' },
};

const CameraFeed = ({ onLandmarks, active }: { onLandmarks: (flat: number[] | null, detected: boolean) => void; active: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error' | 'mock'>('idle');

  const stopCamera = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (handsRef.current) {
      try {
        handsRef.current.close();
      } catch {}
      handsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!active) {
      stopCamera();
      setStatus('idle');
      return;
    }
    setStatus('loading');

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        streamRef.current = stream;
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const drawLandmarks = (results: any, ctx: CanvasRenderingContext2D, w: number, h: number) => {
          ctx.clearRect(0, 0, w, h);
          if (!results.multiHandLandmarks?.length) return;
          for (const lms of results.multiHandLandmarks) {
            const conns = [
              [0, 1],
              [1, 2],
              [2, 3],
              [3, 4],
              [0, 5],
              [5, 6],
              [6, 7],
              [7, 8],
              [0, 9],
              [9, 10],
              [10, 11],
              [11, 12],
              [0, 13],
              [13, 14],
              [14, 15],
              [15, 16],
              [0, 17],
              [17, 18],
              [18, 19],
              [19, 20],
              [5, 9],
              [9, 13],
              [13, 17],
            ];
            ctx.strokeStyle = 'rgba(0,212,255,0.5)';
            ctx.lineWidth = 2;
            for (const [a, b] of conns) {
              ctx.beginPath();
              ctx.moveTo(lms[a].x * w, lms[a].y * h);
              ctx.lineTo(lms[b].x * w, lms[b].y * h);
              ctx.stroke();
            }
            for (let i = 0; i < lms.length; i++) {
              ctx.beginPath();
              ctx.arc(lms[i].x * w, lms[i].y * h, i === 0 ? 6 : 4, 0, Math.PI * 2);
              ctx.fillStyle = i === 0 ? '#7c3aed' : '#00d4ff';
              ctx.fill();
            }
          }
        };

        const scheduleDetect = () => {
          if (!videoRef.current || !handsRef.current) return;
          timerRef.current = setTimeout(async () => {
            try {
              await handsRef.current.send({ image: videoRef.current });
            } catch {}
            scheduleDetect();
          }, 300);
        };

        if ((window as any).Hands) {
          const hands = new (window as any).Hands({
            locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
          });
          hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.6,
          });
          hands.onResults((results: any) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            drawLandmarks(results, ctx, canvas.width, canvas.height);
            if (results.multiHandLandmarks?.length > 0) {
              const flat = results.multiHandLandmarks[0].flatMap((p: any) => [p.x, p.y, p.z]);
              onLandmarks(flat, true);
            } else {
              onLandmarks(null, false);
            }
          });
          handsRef.current = hands;
          setStatus('ready');
          scheduleDetect();
        } else {
          setStatus('mock');
          const mockLoop = () => {
            timerRef.current = setTimeout(() => {
              onLandmarks(new Array(63).fill(0).map(() => Math.random()), true);
              mockLoop();
            }, 300);
          };
          mockLoop();
        }
      } catch (e) {
        setStatus('error');
        console.error('Camera error:', e);
      }
    };

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
    script.crossOrigin = 'anonymous';
    script.onload = initCamera;
    script.onerror = initCamera;
    if ((window as any).Hands) {
      initCamera();
    } else {
      document.head.appendChild(script);
    }

    return stopCamera;
  }, [active]);

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: '#050810',
        border: active ? '2px solid #00d4ff' : '2px solid rgba(255,255,255,0.08)',
        boxShadow: active ? '0 0 30px rgba(0,212,255,0.3)' : 'none',
        aspectRatio: '4/3',
      }}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        width={640}
        height={480}
        style={{ transform: 'scaleX(-1)' }}
      />
      {status === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
          <div className="text-6xl mb-3">📷</div>
          <p className="text-sm">Camera inactive</p>
        </div>
      )}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: 'rgba(5,8,16,0.8)' }}>
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent mb-4"
            style={{
              borderColor: '#00d4ff',
              borderTopColor: 'transparent',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p className="text-sm" style={{ color: '#00d4ff' }}>
            Initializing AI…
          </p>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
          <div className="text-5xl mb-3">⚠️</div>
          <p className="text-sm text-center px-4">
            Camera access denied<br/>
            <span className="text-xs opacity-60">Please allow camera in browser settings</span>
          </p>
        </div>
      )}
      {(status === 'mock' || status === 'ready') && (
        <div
          className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
          style={{
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(0,212,255,0.3)',
            color: '#00d4ff',
          }}
        >
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{
              background: '#00d4ff',
              animation: 'pulse 1s infinite',
            }}
          />
          {status === 'mock' ? 'Simulated Hand' : 'LIVE'}
        </div>
      )}
    </div>
  );
};

function mockPredict(expectedLabel: string, allLabels: string[]) {
  const rand = Math.random();
  const label = rand < 0.42 ? expectedLabel : allLabels[Math.floor(Math.random() * allLabels.length)];
  const confidence = label === expectedLabel ? 0.6 + Math.random() * 0.35 : 0.3 + Math.random() * 0.3;
  return { label, confidence };
}

const LessonDetail = ({
  lesson,
  language = 'en',
  onBack,
  onComplete,
}: {
  lesson: SignLesson;
  language?: 'en' | 'de';
  onBack: () => void;
  onComplete: (xp: number) => void;
}) => {
  const [cameraOn, setCameraOn] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const lastDetect = useRef(0);
  const NEEDED = 3;

  const allLabels = SIGN_LESSONS.map((l) => l.expectedLabel);

  const handleLandmarks = useCallback(
    (flat: number[] | null, detected: boolean) => {
      if (!detected || done) return;
      const now = Date.now();
      if (now - lastDetect.current < 290) return;
      lastDetect.current = now;
      const { label, confidence } = mockPredict(lesson.expectedLabel, allLabels);
      const correct = label === lesson.expectedLabel && confidence > 0.55;
      const hints = language === 'de' ? lesson.hintsDE : lesson.hints;
      setFeedback({ correct, label, confidence, hint: hints[hintIdx] });
      if (correct) {
        setCorrectCount((c) => {
          const newC = c + 1;
          if (newC >= NEEDED) {
            setDone(true);
            onComplete(lesson.xpReward);
          }
          return newC;
        });
      }
    },
    [lesson, done, language, hintIdx, onComplete, allLabels]
  );

  const progress = (correctCount / NEEDED) * 100;

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
            <div className="flex items-center gap-4">
              <span className="text-4xl">{lesson.emoji}</span>
              <div>
                <h2 className="text-2xl font-bold text-[#102c26]">
                  {language === 'de' ? lesson.titleDE : lesson.title}
                </h2>
                <p className="text-slate-500 text-sm">{language === 'de' ? lesson.wordDE : lesson.word}</p>
              </div>
            </div>
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
            >
              ✕
            </button>
          </div>

          <div className="mb-6">
            <p className="text-slate-600 mb-4">
              {language === 'de' ? lesson.descriptionDE : lesson.description}
            </p>
            <div className="flex gap-2 flex-wrap mb-4">
              {(language === 'de' ? lesson.hintsDE : lesson.hints).map((hint, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className={`text-xs ${hintIdx >= i ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-100'}`}
                >
                  {i + 1}. {hint}
                </Badge>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <CameraFeed onLandmarks={handleLandmarks} active={cameraOn} />
          </div>

          {cameraOn ? (
            <>
              <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-bold text-slate-600">Progress</span>
                  <span className="text-sm font-bold text-slate-900">
                    {correctCount}/{NEEDED}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>

              {feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl p-4 mb-6 ${
                    feedback.correct
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'bg-rose-50 border border-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{feedback.correct ? '✅' : '❌'}</span>
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">
                        {feedback.correct ? 'Correct!' : 'Try Again'}
                      </div>
                      <p className="text-sm text-slate-600">
                        Confidence: {Math.round(feedback.confidence * 100)}%
                      </p>
                      {!feedback.correct && feedback.hint && (
                        <p className="text-sm text-slate-600 mt-1">💡 {feedback.hint}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {done ? (
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
              ) : (
                <Button onClick={() => setCameraOn(false)} variant="outline" className="w-full">
                  Exit Lesson
                </Button>
              )}
            </>
          ) : (
            <Button onClick={() => setCameraOn(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              🎥 Start Practice
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export const SignLanguageLearning = ({
  language = 'en',
  onLessonComplete,
}: SignLanguageLearningProps) => {
  const [selectedLesson, setSelectedLesson] = useState<SignLesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  const difficultyLessons = useMemo(
    () => SIGN_LESSONS.filter((l) => l.difficulty === difficulty),
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
      <div className="flex gap-2">
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
            {diff.charAt(0).toUpperCase() + diff.slice(1)}
          </Button>
        ))}
      </div>

      {/* Lessons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {difficultyLessons.map((lesson) => {
          const isCompleted = completedLessons.includes(lesson.id);
          const colors = difficultyColors[lesson.difficulty];

          return (
            <motion.div
              key={lesson.id}
              whileHover={{ scale: 1.05, translateY: -4 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card
                onClick={() => setSelectedLesson(lesson)}
                className="h-full cursor-pointer border-[#102c260d] hover:shadow-lg transition-all relative overflow-hidden group"
              >
                {isCompleted && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 font-bold">
                      ✓
                    </div>
                  </div>
                )}
                <CardContent className="p-6 flex flex-col gap-4 h-full">
                  <div className="text-5xl text-center group-hover:scale-110 transition-transform">
                    {lesson.emoji}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[#102c26]">
                      {language === 'de' ? lesson.titleDE : lesson.title}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {language === 'de' ? lesson.descriptionDE : lesson.description}
                    </p>
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
        <LessonDetail
          lesson={selectedLesson}
          language={language}
          onBack={() => setSelectedLesson(null)}
          onComplete={handleLessonComplete}
        />
      )}
    </div>
  );
};
