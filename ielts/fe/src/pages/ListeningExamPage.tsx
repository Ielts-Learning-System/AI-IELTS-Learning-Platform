import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Split from 'react-split';
import { CheckCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

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
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [testData, setTestData] = useState<TestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentPartIndex, setCurrentPartIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(() => Date.now());

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

  const handleSubmit = async () => {
    if (!id || !testData) return;

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
    if (!token) {
      toast.error('Bạn cần đăng nhập trước khi nộp bài.');
      return;
    }

    const allQuestions = testData.parts.flatMap((part) => part.questions);
    const studentAnswers = allQuestions.map((question) => String(answers[question._id] || ''));
    const timeSpent = Math.max(0, Math.floor((Date.now() - startTime) / 1000));

    try {
      setIsSubmitting(true);
      const response = await axios.post(
        `http://localhost:3000/api/listening/${id}/submit`,
        {
          studentAnswers,
          timeSpent,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const attempt = response.data?.data;
      const payload = {
        attempt,
        module: 'Listening' as const,
      };
      sessionStorage.setItem('latestAttemptResult', JSON.stringify(payload));

      navigate('/results', { state: payload });
    } catch (error: any) {
      console.error('❌ Error submitting listening test:', error);
      toast.error(error.response?.data?.message || 'Không thể nộp bài Listening.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <Toaster position="top-right" />
      {/* Header */}
      <div className="h-16 border-b border-slate-200 bg-white shadow-sm flex items-center justify-between px-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{testData.title}</h1>
          <p className="text-sm text-slate-500">{testData.description}</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-8 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all shadow-md shadow-red-200 active:scale-95 disabled:cursor-not-allowed disabled:bg-red-300"
        >
          <CheckCircle className="h-4 w-4" />
          {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
        </button>
      </div>

      {/* Control bar */}
      <div className="sticky top-16 bg-white z-10 border-b border-slate-200 flex items-center gap-4 px-8 py-3">
        <div className="flex gap-2 shrink-0">
          {testData.parts.map((p, idx) => (
            <button
              key={p.partNumber}
              onClick={() => setCurrentPartIndex(idx)}
              className={`px-5 py-2 text-sm rounded-lg transition-colors ${
                currentPartIndex === idx
                  ? 'bg-red-600 text-white font-bold shadow-sm'
                  : 'bg-slate-100 text-slate-600 font-medium hover:bg-red-50 hover:text-red-700'
              }`}
            >
              Part {p.partNumber}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
          <audio
            controls
            preload="none"
            src={currentPart.audioUrl}
            key={currentPart.audioUrl}
            className="w-full"
          />
        </div>
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
          className="overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
          style={{ height: 'calc(100vh - 150px)' }}
        >
          <div
            className="prose prose-slate prose-lg max-w-none p-6 prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: currentPart.description }}
          />
        </div>

        {/* Right - questions */}
        <div
          className="overflow-y-auto bg-slate-50/50 p-6 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
          style={{ height: 'calc(100vh - 150px)' }}
        >
          <div className="max-w-2xl mx-auto space-y-6">
            {currentPart.questions.map((q, idx) => (
              <div
                key={q._id || idx}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-white text-sm font-bold">
                    {startingIndex + idx + 1}
                  </div>
                  <div className="flex-1 space-y-4">
                    <p className="font-medium text-slate-900">{q.questionText.replace(/^\d+\.\s*/, '')}</p>

                    {q.type === 'multiple_choice' && q.options ? (
                      <div className="space-y-2">
                        {q.options.map((opt) => (
                          <label
                            key={opt}
                            className="flex items-center gap-3 cursor-pointer hover:bg-red-50 p-3 rounded-lg transition-colors"
                          >
                            <input
                              type="radio"
                              name={q._id}
                              value={opt}
                              checked={answers[q._id] === opt}
                              onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                              className="h-4 w-4 accent-red-600 text-red-600 focus:ring-red-500"
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
                        className="w-full mt-3 px-4 py-3 border border-slate-300 rounded-xl text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent focus:bg-white transition-all"
                      />
                    ) : (q.type === 'map_labeling' || q.type === 'matching') && q.options ? (
                      <select
                        value={answers[q._id] || ''}
                        onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                        className="w-full border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
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
