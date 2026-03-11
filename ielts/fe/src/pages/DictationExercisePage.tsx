'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, ChevronRight, Volume2, Zap } from 'lucide-react';

interface DictationLesson {
  lessonId: number;
  audio: string;
  transcript: string;
  difficulty: string;
  speaker: string;
}

interface LessonStat {
  lessonId: number;
  correct: boolean;
  playCount: number;
}

const normalizeAnswer = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()\-]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
};

export default function DictationExercisePage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const [lessons, setLessons] = useState<DictationLesson[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [playCount, setPlayCount] = useState<number>(0);
  const [userInput, setUserInput] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [stats, setStats] = useState<LessonStat[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const generateHint = (transcript: string): string => {
    return transcript
      .split(' ')
      .map((word) => {
        let hasShownFirstLetter = false;
        return word
          .split('')
          .map((char) => {
            if (!/[a-zA-Z]/.test(char)) return char;
            if (!hasShownFirstLetter) {
              hasShownFirstLetter = true;
              return char;
            }
            return '_';
          })
          .join('');
      })
      .join(' ');
  };

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${apiUrl}/api/dictation`);
        if (!response.ok) throw new Error('Failed to fetch dictation lessons');
        const data = await response.json();
        
        // 🔍 DEBUG: Log the actual API response structure
        console.log('Dictation API Response:', data);
        
        // SAFE STATE UPDATE: Validate that we have an array before setting state
        const lessonArray = data.data || data;
        if (!Array.isArray(lessonArray)) {
          throw new Error('API returned invalid data structure (expected an array)');
        }
        if (lessonArray.length === 0) {
          throw new Error('No dictation lessons available');
        }
        
        // Validate each lesson has required fields
        const validLessons = lessonArray.every(lesson => 
          lesson.lessonId && lesson.audio && lesson.transcript
        );
        if (!validLessons) {
          throw new Error('Lesson data is missing required fields (lessonId, audio, transcript)');
        }
        
        setLessons(lessonArray);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Dictation Fetch Error:', errorMsg);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, [apiUrl]);

  const handlePlayAudio = () => {
    if (!audioRef.current) {
      console.error('Audio ref not available');
      return;
    }
    if (isSubmitted) {
      return;
    }
    audioRef.current.play().catch(err => {
      console.error('Failed to play audio:', err);
    });
    setPlayCount((prev) => prev + 1);
  };

  const handleSubmit = () => {
    if (!userInput.trim()) {
      alert('Please type your answer before submitting');
      return;
    }
    const currentLesson = lessons[currentIndex];
    if (!currentLesson || !currentLesson.transcript) {
      alert('Lesson data is unavailable');
      return;
    }
    const normalized = normalizeAnswer(userInput);
    const correctNormalized = normalizeAnswer(currentLesson.transcript || '');
    const correct = normalized === correctNormalized;
    setIsCorrect(correct);
    setIsSubmitted(true);
    setStats((prev) => [
      ...prev,
      { lessonId: currentLesson.lessonId || 0, correct, playCount },
    ]);
  };

  const handleNext = () => {
    if (currentIndex < lessons.length - 1) {
      setCurrentIndex((prev) => prev + 1);
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

  const handleResetAll = () => {
    setCurrentIndex(0);
    setUserInput('');
    setIsSubmitted(false);
    setIsCorrect(false);
    setShowHint(false);
    setPlayCount(0);
    setStats([]);
    setIsFinished(false);
  };

  const correctCount = stats.filter((s) => s.correct).length;
  const totalCount = stats.length;
  const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const avgReplays = totalCount > 0 ? (stats.reduce((sum, s) => sum + s.playCount, 0) / totalCount).toFixed(1) : '0';

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header ...existing code... */}
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex items-center justify-center py-16 bg-white">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-lg text-gray-700">Loading dictation exercises...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || lessons.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header ...existing code... */}
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex items-center justify-center py-16 bg-white">
            <div className="text-center">
              <p className="text-lg text-red-600">❌ {error || 'No dictation lessons available'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Finished results screen
  if (isFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header ...existing code... */}
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="w-full max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Results</h2>
              <div className="space-y-6">
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-sm mb-2">Accuracy</p>
                  <p className="text-4xl font-bold text-red-600">{accuracy}%</p>
                  <p className="text-gray-500 text-sm mt-2">
                    {correctCount} out of {totalCount} correct
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-sm mb-2">Average Replays</p>
                  <p className="text-3xl font-bold text-purple-600">{avgReplays}x</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-gray-600 text-sm mb-2">Performance</p>
                  <p className="text-2xl font-bold">
                    {accuracy >= 80
                      ? '🌟 Excellent'
                      : accuracy >= 60
                        ? '👍 Good'
                        : accuracy >= 40
                          ? '📚 Keep Practicing'
                          : '💪 Try Again'}
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <h3 className="font-semibold text-gray-700 mb-3">Question Details</h3>
                  <div className="space-y-2">
                    {stats.map((stat, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg text-sm ${
                          stat.correct
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700">Question {idx + 1}</span>
                          <span className={stat.correct ? 'text-green-600' : 'text-red-600'}>
                            {stat.correct ? '✓ Correct' : '✗ Incorrect'}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">Replays: {stat.playCount}x</p>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleResetAll}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  <RotateCcw className="inline mr-2" size={18} />
                  Start Over
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border-t border-red-200 py-8 mt-12">
          <div className="max-w-7xl mx-auto px-8">
            <h3 className="text-lg font-semibold text-red-900 mb-4">💡 Tips for Success</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-4 border border-red-100">
                <h4 className="font-semibold text-gray-800 mb-2">Listen Actively</h4>
                <p className="text-sm text-gray-600">
                  Focus on understanding every word. Take notes if helpful, then type your answer carefully.
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-red-100">
                <h4 className="font-semibold text-gray-800 mb-2">Replay as Needed</h4>
                <p className="text-sm text-gray-600">
                  Don't hesitate to replay the audio multiple times. This is normal and helps reinforce learning.
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-red-100">
                <h4 className="font-semibold text-gray-800 mb-2">Learn from Mistakes</h4>
                <p className="text-sm text-gray-600">
                  When you get a question wrong, review the correct answer to understand what you missed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🛡️ Declare currentLesson before validation
  const currentLesson = lessons[currentIndex];

  // 🛡️ ROBUST NULL-CHECKING: Validate before rendering main exercise
  // If currentLesson or its required properties are missing, show safe fallback
  if (!currentLesson || !currentLesson.audio || !currentLesson.transcript) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header ...existing code... */}
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex items-center justify-center py-16 bg-white">
            <div className="text-center">
              <p className="text-lg text-red-600">❌ No audio data found for this lesson</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🛡️ OPTIONAL CHAINING: Safely build audioUrl with fallback
  const audioUrl = currentLesson.audio.startsWith('http') 
    ? currentLesson.audio 
    : `${apiUrl}${currentLesson.audio}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header ...existing code... */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold text-gray-800">Dictation Practice</h1>
              <span className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                Question {currentIndex + 1} of {lessons.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / lessons.length) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <p className="text-gray-600 text-sm mb-4 uppercase tracking-widest">
                {currentLesson?.difficulty || 'Unknown'} • {currentLesson?.speaker || 'Unknown'}
              </p>
              {audioUrl ? (
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  className="w-full mb-6"
                  onEnded={() => {}}
                />
              ) : (
                <div className="w-full mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">⚠️ Audio URL could not be loaded</p>
                </div>
              )}
              <button
                onClick={handlePlayAudio}
                disabled={isSubmitted || !audioUrl}
                className={`flex items-center justify-center gap-3 mx-auto px-8 py-4 rounded-lg font-semibold text-white transition-all ${
                  isSubmitted || !audioUrl
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 active:scale-95'
                }`}
              >
                <Play size={24} />
                Play Audio
              </button>
              <p className="text-gray-500 text-sm mt-4">
                Times played: <span className="font-bold text-red-600">{playCount}</span>
              </p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8">
            <label className="block text-gray-700 font-semibold mb-4">What did you hear?</label>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={isSubmitted}
              placeholder="Type what you heard in the audio..."
              className={`w-full border-2 rounded-lg p-4 font-mono text-sm focus:outline-none transition-colors ${
                isSubmitted
                  ? `bg-gray-50 border-gray-300 cursor-not-allowed ${
                      isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                    }`
                  : 'border-gray-300 focus:border-red-500'
              }`}
              rows={4}
            />
            {showHint && (
              <div className="mt-4 p-4 rounded-lg bg-amber-50 border-2 border-dashed border-amber-300">
                <p className="text-amber-800 text-sm font-semibold mb-2">Hint</p>
                <p className="text-amber-900 font-mono text-sm break-words">
                  {generateHint(currentLesson.transcript)}
                </p>
              </div>
            )}
            {isSubmitted && currentLesson?.transcript && (
              <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-300">
                <p className="text-gray-600 text-sm mb-2 font-semibold">Correct Answer:</p>
                <p className="text-gray-800 font-mono text-sm">{currentLesson.transcript}</p>
              </div>
            )}
          </div>
          {isSubmitted && (
            <div
              className={`rounded-lg p-6 text-center font-semibold text-lg ${
                isCorrect
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-red-100 text-red-700 border border-red-300'
              }`}
            >
              {isCorrect ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">✅</span>
                  <span>Excellent! Your answer is correct.</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">❌</span>
                  <span>Not quite right. Try again or move to the next question.</span>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-4 justify-center">
            {!isSubmitted ? (
              <>
                <button
                  onClick={() => setShowHint((prev) => !prev)}
                  className="flex items-center gap-2 px-8 py-3 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg font-semibold hover:bg-amber-200 transition-colors active:scale-95"
                >
                  {showHint ? 'Hide Hint' : '💡 Show Hint'}
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors active:scale-95"
                >
                  <Volume2 size={20} />
                  Submit Answer
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleTryAgain}
                  className="flex items-center gap-2 px-8 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors active:scale-95"
                >
                  <RotateCcw size={20} />
                  Try Again
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-8 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors active:scale-95"
                >
                  {currentIndex === lessons.length - 1 ? (
                    <>
                      View Results
                      <ChevronRight size={20} />
                    </>
                  ) : (
                    <>
                      Next Question
                      <ChevronRight size={20} />
                    </>
                  )}
                </button>
              </>
            )}
          </div>
          <div className="text-center text-gray-600 text-sm mt-8">
            <p>
              💡 Listen carefully, you can play the audio as many times as you need. Type exactly
              what you hear and submit your answer.
            </p>
          </div>
        </div>
      </div>
      <div className="bg-red-50 border-t border-red-200 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-8">
          <h3 className="text-lg font-semibold text-red-900 mb-4">💡 Tips for Success</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 border border-red-100">
              <h4 className="font-semibold text-gray-800 mb-2">Listen Actively</h4>
              <p className="text-sm text-gray-600">
                Focus on understanding every word. Take notes if helpful, then type your answer carefully.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-red-100">
              <h4 className="font-semibold text-gray-800 mb-2">Replay as Needed</h4>
              <p className="text-sm text-gray-600">
                Don't hesitate to replay the audio multiple times. This is normal and helps reinforce learning.
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-red-100">
              <h4 className="font-semibold text-gray-800 mb-2">Learn from Mistakes</h4>
              <p className="text-sm text-gray-600">
                When you get a question wrong, review the correct answer to understand what you missed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
