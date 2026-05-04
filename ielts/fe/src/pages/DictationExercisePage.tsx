'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, RotateCcw, ChevronRight, Volume2 } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard';

interface DictationLesson {
  _id: string;
  audioUrl: string;
  transcript: string;
  difficulty: Difficulty;
  speaker: string;
}

interface LessonStat {
  lessonId: string;
  correct: boolean;
  playCount: number;
}

// ── Config ─────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    tagBg: string;
    tagText: string;
    accentHex: string;
    hint: string;
  }
> = {
  easy: {
    label: 'Dễ',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-500',
    tagBg: 'bg-green-100',
    tagText: 'text-green-800',
    accentHex: '#16a34a',
    hint: '≤ 9 từ — phù hợp người mới bắt đầu',
  },
  medium: {
    label: 'Trung bình',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-500',
    tagBg: 'bg-yellow-100',
    tagText: 'text-yellow-800',
    accentHex: '#ca8a04',
    hint: '10–11 từ — cần tập trung lắng nghe',
  },
  hard: {
    label: 'Khó',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-500',
    tagBg: 'bg-red-100',
    tagText: 'text-red-800',
    accentHex: '#dc2626',
    hint: '≥ 12 từ — thách thức cao, câu phức tạp',
  },
};

// ── Helpers ────────────────────────────────────────────────────────

const normalizeAnswer = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[.,!?;:'"()\-]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

const generateHint = (transcript: string): string =>
  transcript
    .split(' ')
    .map((word) => {
      let shown = false;
      return word
        .split('')
        .map((ch) => {
          if (!/[a-zA-Z]/.test(ch)) return ch;
          if (!shown) { shown = true; return ch; }
          return '_';
        })
        .join('');
    })
    .join(' ');

// ── Component ──────────────────────────────────────────────────────

export default function DictationExercisePage() {
  // VITE_API_URL = "http://localhost:3000/api"
  // We strip /api to get the gateway base for both /api/* calls and /audio/* static files.
  const gatewayBase =
    (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/api$/, '');

  // ── All lessons (fetched once) ───────────────────────────────────
  const [allLessons, setAllLessons] = useState<DictationLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Level selection ──────────────────────────────────────────────
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);

  // ── Exercise state ───────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [stats, setStats] = useState<LessonStat[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  // ── Derived ──────────────────────────────────────────────────────

  /** Lessons filtered to the selected difficulty for the active session */
  const activeLessons = useMemo<DictationLesson[]>(() => {
    if (!selectedDifficulty) return [];
    return allLessons.filter((l) => l.difficulty === selectedDifficulty);
  }, [allLessons, selectedDifficulty]);

  /** Per-difficulty counts for the level picker */
  const counts = useMemo(
    () => ({
      easy: allLessons.filter((l) => l.difficulty === 'easy').length,
      medium: allLessons.filter((l) => l.difficulty === 'medium').length,
      hard: allLessons.filter((l) => l.difficulty === 'hard').length,
    }),
    [allLessons]
  );

  // ── Fetch ────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${gatewayBase}/api/dictation?limit=200`);
        if (!res.ok) throw new Error('Failed to fetch dictation lessons');
        const data = await res.json();
        const arr: DictationLesson[] = data.data ?? data;
        if (!Array.isArray(arr)) throw new Error('API returned invalid data structure');
        if (arr.length === 0) throw new Error('No dictation lessons available');
        const valid = arr.every((l) => l._id && l.audioUrl && l.transcript);
        if (!valid) throw new Error('Lesson data is missing required fields');
        setAllLessons(arr);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, [gatewayBase]);

  // ── Handlers ─────────────────────────────────────────────────────

  const resetExercise = () => {
    setCurrentIndex(0);
    setPlayCount(0);
    setUserInput('');
    setIsSubmitted(false);
    setIsCorrect(false);
    setShowHint(false);
    setStats([]);
    setIsFinished(false);
  };

  const handleSelectDifficulty = (d: Difficulty) => {
    setSelectedDifficulty(d);
    resetExercise();
  };

  const handleBackToLevelPicker = () => {
    setSelectedDifficulty(null);
    resetExercise();
  };

  const handlePlayAudio = () => {
    if (!audioRef.current || isSubmitted) return;
    audioRef.current.play().catch(console.error);
    setPlayCount((p) => p + 1);
  };

  const handleSubmit = () => {
    if (!userInput.trim()) {
      alert('Vui lòng nhập câu trả lời trước khi nộp bài');
      return;
    }
    const lesson = activeLessons[currentIndex];
    if (!lesson) return;
    const correct =
      normalizeAnswer(userInput) === normalizeAnswer(lesson.transcript);
    setIsCorrect(correct);
    setIsSubmitted(true);
    setStats((prev) => [
      ...prev,
      { lessonId: lesson._id, correct, playCount },
    ]);
  };

  const handleNext = () => {
    if (currentIndex < activeLessons.length - 1) {
      setCurrentIndex((p) => p + 1);
      setUserInput('');
      setIsSubmitted(false);
      setIsCorrect(false);
      setShowHint(false);
      setPlayCount(0);
    } else {
      setIsFinished(true);
    }
  };

  const handleTryAgain = () => {
    setUserInput('');
    setIsSubmitted(false);
    setIsCorrect(false);
    setShowHint(false);
    setPlayCount(0);
  };

  // ── Derived stats ─────────────────────────────────────────────────

  const correctCount = stats.filter((s) => s.correct).length;
  const totalCount = stats.length;
  const accuracy =
    totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const avgReplays =
    totalCount > 0
      ? (stats.reduce((sum, s) => sum + s.playCount, 0) / totalCount).toFixed(1)
      : '0';

  // ── Loading ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải bài luyện tập...</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-red-600 text-lg">❌ {error}</p>
      </div>
    );
  }

  // ── Level picker ──────────────────────────────────────────────────

  if (!selectedDifficulty) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-lg mx-auto px-6 py-20">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Dictation Practice
            </h1>
            <p className="text-gray-500 text-base">
              Chọn cấp độ để bắt đầu luyện chép chính tả
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => {
              const cfg = DIFFICULTY_CONFIG[d];
              const count = counts[d];
              return (
                <button
                  key={d}
                  onClick={() => handleSelectDifficulty(d)}
                  disabled={count === 0}
                  className={`flex items-center justify-between p-6 rounded-2xl border-2 shadow-sm
                    transition-all duration-200 text-left
                    ${cfg.bg} ${cfg.border}
                    hover:shadow-md hover:scale-[1.01] active:scale-[0.99]
                    disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <div>
                    <p className={`text-xl font-bold ${cfg.color}`}>{cfg.label}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{cfg.hint}</p>
                  </div>
                  <span
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold ${cfg.tagBg} ${cfg.tagText}`}
                  >
                    {count} câu
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const diffCfg = DIFFICULTY_CONFIG[selectedDifficulty];

  // ── Results ───────────────────────────────────────────────────────

  if (isFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-lg mx-auto px-6 py-12 space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-800 text-center mb-2">
              Kết quả
            </h2>
            <p
              className={`text-center text-xs font-semibold mb-6 px-3 py-1 rounded-full w-fit mx-auto ${diffCfg.tagBg} ${diffCfg.tagText}`}
            >
              {diffCfg.label}
            </p>

            <div className="space-y-4">
              {/* Main accuracy */}
              <div className="bg-red-50 rounded-xl p-5 text-center">
                <p className="text-gray-500 text-sm mb-1">Độ chính xác</p>
                <p className="text-5xl font-bold text-red-600">{accuracy}%</p>
                <p className="text-gray-400 text-sm mt-2">
                  {correctCount} / {totalCount} câu đúng
                </p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-gray-500 text-sm mb-1">Phát lại TB</p>
                  <p className="text-3xl font-bold text-purple-600">{avgReplays}x</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-gray-500 text-sm mb-1">Xếp loại</p>
                  <p className="text-2xl font-bold">
                    {accuracy >= 80
                      ? '🌟 Xuất sắc'
                      : accuracy >= 60
                      ? '👍 Tốt'
                      : accuracy >= 40
                      ? '📚 Cần luyện'
                      : '💪 Thử lại'}
                  </p>
                </div>
              </div>

              {/* Per-question breakdown */}
              <div className="max-h-52 overflow-y-auto space-y-2">
                {stats.map((stat, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm flex justify-between items-center ${
                      stat.correct
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <span className="font-medium text-gray-700">Câu {idx + 1}</span>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{stat.playCount}× phát</span>
                      <span
                        className={`font-bold text-sm ${
                          stat.correct ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {stat.correct ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleSelectDifficulty(selectedDifficulty)}
                  style={{ background: diffCfg.accentHex }}
                  className="py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  <RotateCcw className="inline mr-2" size={16} />
                  Luyện lại
                </button>
                <button
                  onClick={handleBackToLevelPicker}
                  className="py-3 rounded-xl font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                >
                  Chọn cấp khác
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Exercise ──────────────────────────────────────────────────────

  const currentLesson = activeLessons[currentIndex];

  if (!currentLesson?.audioUrl || !currentLesson.transcript) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">❌ Không tìm thấy dữ liệu âm thanh cho bài này</p>
      </div>
    );
  }

  // Resolve local paths (/audio/...) through the API gateway
  const resolvedAudio = currentLesson.audioUrl.startsWith('http')
    ? currentLesson.audioUrl
    : `${gatewayBase}${currentLesson.audioUrl}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-lg mx-auto px-6 py-10 space-y-5">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Dictation</h1>
              <span
                className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold ${diffCfg.tagBg} ${diffCfg.tagText}`}
              >
                {diffCfg.label}
              </span>
            </div>
            <div className="text-right space-y-1">
              <span className="block bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                {currentIndex + 1} / {activeLessons.length}
              </span>
              <button
                onClick={handleBackToLevelPicker}
                className="block text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Chọn cấp khác
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / activeLessons.length) * 100}%`,
                background: diffCfg.accentHex,
              }}
            />
          </div>
        </div>

        {/* Audio card */}
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <p className="text-gray-400 text-xs uppercase tracking-widest mb-6 capitalize">
            {currentLesson.speaker}
          </p>
          <audio ref={audioRef} src={resolvedAudio} className="hidden" />
          <button
            onClick={handlePlayAudio}
            disabled={isSubmitted}
            className={`flex items-center justify-center gap-3 mx-auto px-10 py-4 rounded-xl font-semibold text-white text-lg transition-all active:scale-95
              ${isSubmitted ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
          >
            <Play size={26} />
            Nghe Audio
          </button>
          <p className="text-gray-400 text-sm mt-4">
            Đã phát:{' '}
            <span className="font-bold text-red-600">{playCount}</span> lần
          </p>
        </div>

        {/* Answer card */}
        <div className="bg-white rounded-2xl shadow p-6">
          <label className="block text-gray-700 font-semibold mb-3">
            Bạn nghe được gì?
          </label>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isSubmitted) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isSubmitted}
            placeholder="Gõ những gì bạn vừa nghe..."
            className={`w-full border-2 rounded-xl p-4 font-mono text-sm focus:outline-none transition-colors resize-none
              ${
                isSubmitted
                  ? isCorrect
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-400 bg-red-50'
                  : 'border-gray-300 focus:border-red-500'
              }`}
            rows={3}
          />

          {showHint && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border-2 border-dashed border-amber-300">
              <p className="text-amber-800 text-xs font-semibold mb-1">💡 Gợi ý</p>
              <p className="text-amber-900 font-mono text-sm break-words">
                {generateHint(currentLesson.transcript)}
              </p>
            </div>
          )}

          {isSubmitted && (
            <div className="mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-gray-500 text-xs font-semibold mb-1">Đáp án đúng:</p>
              <p className="text-gray-800 font-mono text-sm">
                {currentLesson.transcript}
              </p>
            </div>
          )}
        </div>

        {/* Feedback banner */}
        {isSubmitted && (
          <div
            className={`rounded-2xl p-5 text-center font-semibold text-base ${
              isCorrect
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-red-100 text-red-700 border border-red-300'
            }`}
          >
            {isCorrect
              ? '✅ Chính xác! Tuyệt vời!'
              : '❌ Chưa đúng. Xem lại đáp án và thử tiếp.'}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 justify-center pb-6">
          {!isSubmitted ? (
            <>
              <button
                onClick={() => setShowHint((p) => !p)}
                className="flex items-center gap-2 px-6 py-3 bg-amber-100 text-amber-800 border border-amber-300 rounded-xl font-semibold hover:bg-amber-200 transition-colors"
              >
                {showHint ? 'Ẩn gợi ý' : '💡 Gợi ý'}
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                <Volume2 size={18} />
                Nộp bài
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleTryAgain}
                className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
              >
                <RotateCcw size={18} />
                Thử lại
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-8 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                {currentIndex === activeLessons.length - 1
                  ? 'Xem kết quả'
                  : 'Câu tiếp theo'}
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
