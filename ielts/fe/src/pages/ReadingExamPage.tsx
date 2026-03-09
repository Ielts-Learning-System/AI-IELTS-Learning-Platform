import { useEffect, useState } from 'react';
import Split from 'react-split';
import { useExamStore } from '../store/useExamStore';
import { mockReadingTest } from '../mockData/exam-content';
import ReactMarkdown from 'react-markdown';

export function ReadingExamPage() {
  const { startExam, answers, setAnswer, isSubmitted } = useExamStore();
  const exam = mockReadingTest;
  const [currentPassageIdx, setCurrentPassageIdx] = useState(0);

  useEffect(() => {
    startExam(exam.id, 60); // 60 minutes
  }, [exam.id, startExam]);

  const currentPassage = exam.passages[currentPassageIdx];

  return (
    <div className="flex flex-col h-full">
      {/* Passage Navigation */}
      <div className="flex items-center gap-2 bg-white border-b border-slate-200 px-6 py-2">
        {exam.passages.map((p, idx) => (
          <button
            key={p.passage_number}
            onClick={() => setCurrentPassageIdx(idx)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              currentPassageIdx === idx 
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Passage {p.passage_number}
          </button>
        ))}
      </div>

      <Split 
        className="flex flex-1 w-full overflow-hidden"
        sizes={[50, 50]}
        minSize={300}
        gutterSize={8}
        gutterAlign="center"
        snapOffset={30}
        dragInterval={1}
        direction="horizontal"
        cursor="col-resize"
      >
        {/* Left Pane: Passage */}
        <div className="h-full overflow-y-auto bg-white p-8 shadow-inner">
          <div className="prose prose-slate max-w-none prose-headings:text-indigo-950 prose-p:text-slate-700 prose-p:leading-relaxed">
            <h2>{currentPassage.title}</h2>
            {currentPassage.content.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Right Pane: Questions */}
        <div className="h-full overflow-y-auto bg-slate-50 p-8">
          <div className="max-w-2xl mx-auto space-y-8">
            {currentPassage.question_groups.map((group) => (
              <div key={group.group_id} className="space-y-6">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                  <p className="font-medium text-indigo-900">{group.instruction}</p>
                </div>

                {group.questions.map((q) => (
                  <div key={q.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                        {q.number}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 mb-4">{q.text}</p>
                        
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
                            className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            disabled={isSubmitted}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Split>
    </div>
  );
}
