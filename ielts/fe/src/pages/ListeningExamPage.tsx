import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Split from 'react-split';

interface Question {
  _id: string;
  questionText: string;
  type: 'multiple_choice' | 'fill_blank' | 'map_labeling' | 'matching';
  options?: string[];
}

interface Part {
  partNumber: number;
  title: string;
  description: string;
  audioUrl: string;
  questions: Question[];
}

interface TestData {
  _id: string;
  title: string;
  description: string;
  parts: Part[];
}

export function ListeningExamPage() {
  const { id } = useParams<{ id: string }>();
  const [testData, setTestData] = useState<TestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentPartIndex, setCurrentPartIndex] = useState(0);

  useEffect(() => {
    const fetchTest = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get(`http://localhost:3000/api/listening/${id}`);
        // backend may wrap response like { success: true, data: test }
        setTestData(res.data?.data ?? res.data);
      } catch (err) {
        console.error('❌ Error fetching listening test:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchTest();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-lg text-slate-600">Đang nạp đề thi...</p>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-lg text-red-600">Không tìm thấy đề thi</p>
      </div>
    );
  }

  const currentPart = testData.parts[currentPartIndex];

  // Calculate starting index for continuous numbering (1-40)
  const startingIndex = testData.parts.slice(0, currentPartIndex).reduce((acc, part) => acc + part.questions.length, 0);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    console.log('📝 Submitting answers', answers);
    // TODO: call API to submit
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="h-16 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between px-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{testData.title}</h1>
          <p className="text-sm text-slate-500">{testData.description}</p>
        </div>
        <button
          onClick={handleSubmit}
          className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-md"
        >
          Nộp bài
        </button>
      </div>

      {/* Control bar */}
      <div className="sticky top-16 bg-white z-10 border-b border-slate-200 flex items-center justify-between px-8 py-2">
        <div className="flex gap-2">
          {testData.parts.map((p, idx) => (
            <button
              key={p.partNumber}
              onClick={() => setCurrentPartIndex(idx)}
              className={`px-3 py-1 text-sm font-medium rounded ${
                currentPartIndex === idx
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Part {p.partNumber}
            </button>
          ))}
        </div>
        <audio
          controls
          src={currentPart.audioUrl}
          key={currentPart.audioUrl}
          className="w-full max-w-md"
        />
      </div>

      {/* Split pane */}
      <Split
        className="flex flex-1 w-full overflow-hidden"
        sizes={[50, 50]}
        minSize={200}
        gutterSize={8}
        gutterAlign="center"
        snapOffset={30}
        dragInterval={1}
        direction="horizontal"
        cursor="col-resize"
      >
        {/* Left - description */}
        <div
          className="overflow-y-auto bg-white"
          style={{ height: 'calc(100vh - 150px)' }}
        >
          <div
            className="prose prose-lg max-w-none p-6"
            dangerouslySetInnerHTML={{ __html: currentPart.description }}
          />
        </div>

        {/* Right - questions */}
        <div
          className="overflow-y-auto bg-slate-50 p-6"
          style={{ height: 'calc(100vh - 150px)' }}
        >
          <div className="max-w-2xl mx-auto space-y-6">
            {currentPart.questions.map((q, idx) => (
              <div
                key={q._id || idx}
                className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-bold">
                    {startingIndex + idx + 1}
                  </div>
                  <div className="flex-1 space-y-4">
                    <p className="font-medium text-slate-900">{q.questionText.replace(/^\d+\.\s*/, '')}</p>

                    {q.type === 'multiple_choice' && q.options ? (
                      <div className="space-y-2">
                        {q.options.map((opt) => (
                          <label
                            key={opt}
                            className="flex items-center gap-3 cursor-pointer hover:bg-indigo-50 p-3 rounded-lg transition-colors"
                          >
                            <input
                              type="radio"
                              name={q._id}
                              value={opt}
                              checked={answers[q._id] === opt}
                              onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                              className="h-4 w-4 text-indigo-600"
                            />
                            <span className="text-sm text-slate-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : q.type === 'fill_blank' ? (
                      <input
                        type="text"
                        value={answers[q._id] || ''}
                        onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                        placeholder="Nhập câu trả lời..."
                        className="w-full mt-3 px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                    ) : (q.type === 'map_labeling' || q.type === 'matching') && q.options ? (
                      <select
                        value={answers[q._id] || ''}
                        onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                        className="w-full border border-slate-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      >
                        <option value="">Chọn đáp án</option>
                        {q.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Split>
    </div>
  );
}
