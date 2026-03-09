import { useEffect, useState } from 'react';
import Split from 'react-split';
import { useExamStore } from '../store/useExamStore';
import { mockWritingTest } from '../mockData/exam-content';

export function WritingExamPage() {
  const { startExam, answers, setAnswer, isSubmitted } = useExamStore();
  const exam = mockWritingTest;
  const [currentTask, setCurrentTask] = useState<1 | 2>(1);

  useEffect(() => {
    startExam(exam.id, 60); // 60 minutes for writing
  }, [exam.id, startExam]);

  const task = currentTask === 1 ? exam.task_1 : exam.task_2;
  const answerKey = `task_${currentTask}`;
  const currentAnswer = answers[answerKey] || '';
  const wordCount = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Task Navigation */}
      <div className="flex items-center gap-2 bg-white border-b border-slate-200 px-6 py-2">
        <button
          onClick={() => setCurrentTask(1)}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            currentTask === 1 
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Task 1
        </button>
        <button
          onClick={() => setCurrentTask(2)}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            currentTask === 2 
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Task 2
        </button>
      </div>

      <Split 
        className="flex flex-1 w-full overflow-hidden"
        sizes={[40, 60]}
        minSize={300}
        gutterSize={8}
        gutterAlign="center"
        snapOffset={30}
        dragInterval={1}
        direction="horizontal"
        cursor="col-resize"
      >
        {/* Left Pane: Prompt */}
        <div className="h-full overflow-y-auto bg-white p-8 shadow-inner">
          <div className="prose prose-slate max-w-none">
            <h2 className="text-xl font-bold text-indigo-950 mb-4">Writing Task {currentTask}</h2>
            <p className="text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
              {task.prompt}
            </p>
            {currentTask === 1 && 'image_url' in task && (
              <div className="mt-6 rounded-xl overflow-hidden border border-slate-200">
                <img src={task.image_url} alt="Task 1 Chart" className="w-full h-auto" referrerPolicy="no-referrer" />
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Editor */}
        <div className="h-full flex flex-col bg-slate-50 p-8">
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <span className="text-sm font-medium text-slate-600">Your Answer</span>
              <span className={`text-sm font-medium ${wordCount < (currentTask === 1 ? 150 : 250) ? 'text-amber-600' : 'text-emerald-600'}`}>
                {wordCount} words {wordCount > 0 && `(Min: ${currentTask === 1 ? 150 : 250})`}
              </span>
            </div>
            <textarea
              value={currentAnswer}
              onChange={(e) => setAnswer(answerKey, e.target.value)}
              placeholder="Start writing your essay here..."
              className="flex-1 w-full p-6 resize-none focus:outline-none focus:ring-0 text-slate-700 leading-relaxed"
              disabled={isSubmitted}
            />
          </div>
        </div>
      </Split>
    </div>
  );
}
