import { useEffect, useState } from 'react';
import { useExamStore } from '../store/useExamStore';
import { mockSpeakingTest } from '../mockData/exam-content';
import { Mic, Square, Play } from 'lucide-react';

export function SpeakingExamPage() {
  const { startExam } = useExamStore();
  const exam = mockSpeakingTest;
  const [currentPart, setCurrentPart] = useState<1 | 2 | 3>(1);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    startExam(exam.id, 15); // 15 minutes
  }, [exam.id, startExam]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Part Navigation */}
      <div className="flex items-center gap-2 bg-white border-b border-slate-200 px-6 py-2">
        {[1, 2, 3].map((part) => (
          <button
            key={part}
            onClick={() => setCurrentPart(part as 1 | 2 | 3)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              currentPart === part 
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Part {part}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          
          {/* Content Area */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 min-h-[400px]">
            {currentPart === 1 && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-slate-800">Part 1: Introduction and Interview</h2>
                {exam.part_1.map((topic, idx) => (
                  <div key={idx} className="space-y-4">
                    <h3 className="text-lg font-semibold text-indigo-600">Topic: {topic.topic}</h3>
                    <ul className="space-y-3">
                      {topic.questions.map((q, i) => (
                        <li key={i} className="flex gap-3 text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <Play className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {currentPart === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800">Part 2: Long Turn (Cue Card)</h2>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
                  <p className="text-sm font-semibold text-amber-800 uppercase tracking-wider mb-4">Candidate Task Card</p>
                  <h3 className="text-xl font-bold text-slate-900 mb-6">{exam.part_2.topic}</h3>
                  <p className="font-medium text-slate-700 mb-4">You should say:</p>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-6">
                    {exam.part_2.points_to_cover.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                  <div className="mt-6 pt-6 border-t border-amber-200/50 flex items-center justify-between">
                    <span className="text-sm text-amber-700 font-medium">Preparation time: {exam.part_2.preparation_time_seconds} seconds</span>
                    <span className="text-sm text-amber-700 font-medium">Speaking time: 1-2 minutes</span>
                  </div>
                </div>
              </div>
            )}

            {currentPart === 3 && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-slate-800">Part 3: Two-way Discussion</h2>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-indigo-600">Topic: {exam.part_3.topic}</h3>
                  <ul className="space-y-3">
                    {exam.part_3.questions.map((q, i) => (
                      <li key={i} className="flex gap-3 text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <Play className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Recorder Controls */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col items-center justify-center gap-4">
            <div className="text-sm font-medium text-slate-500">
              {isRecording ? 'Recording in progress...' : 'Click to start recording your answer'}
            </div>
            <button 
              onClick={() => setIsRecording(!isRecording)}
              className={`h-16 w-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-200' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
            >
              {isRecording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            {isRecording && (
              <div className="font-mono text-lg font-bold text-slate-700">
                00:12
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
