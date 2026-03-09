import { useEffect, useState } from 'react';
import { useExamStore } from '../store/useExamStore';
import { mockListeningTest } from '../mockData/exam-content';
import { Play, Pause, Volume2 } from 'lucide-react';

export function ListeningExamPage() {
  const { startExam, answers, setAnswer, isSubmitted } = useExamStore();
  const exam = mockListeningTest;
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    startExam(exam.id, 40); // 40 minutes
  }, [exam.id, startExam]);

  const currentSection = exam.sections[currentSectionIdx];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Section Navigation */}
      <div className="flex items-center gap-2 bg-white border-b border-slate-200 px-6 py-2">
        {exam.sections.map((s, idx) => (
          <button
            key={s.section_number}
            onClick={() => setCurrentSectionIdx(idx)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              currentSectionIdx === idx 
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Part {s.section_number}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Audio Player Mock */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex items-center gap-6">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="h-14 w-14 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
            </button>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-sm font-medium text-slate-600">
                <span>Part {currentSection.section_number} Audio</span>
                <span>{isPlaying ? '01:24' : '00:00'} / 05:30</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: isPlaying ? '25%' : '0%' }}></div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Volume2 className="h-5 w-5" />
            </div>
          </div>

          {/* Questions */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Questions</h2>
            
            <div className="space-y-8">
              {currentSection.questions.map((q) => (
                <div key={q.id} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {q.number}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 mb-4">
                      {q.text} 
                      {q.timestamp && <span className="ml-2 text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded">[{q.timestamp}]</span>}
                    </p>
                    
                    {q.options ? (
                      <div className="space-y-3">
                        {q.options.map((opt) => (
                          <label 
                            key={opt} 
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all ${
                              answers[q.id] === opt 
                                ? 'border-indigo-600 bg-indigo-50/50' 
                                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                            } ${isSubmitted ? 'pointer-events-none opacity-70' : ''}`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={opt}
                              checked={answers[q.id] === opt}
                              onChange={(e) => setAnswer(q.id, e.target.value)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-600"
                              disabled={isSubmitted}
                            />
                            <span className="text-sm font-medium text-slate-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full max-w-md rounded-xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        disabled={isSubmitted}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
