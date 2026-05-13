import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Split from 'react-split';
import toast, { Toaster } from 'react-hot-toast';

interface Question {
  _id: string;
  text: string;
  type: 'MULTIPLE_CHOICE' | 'FILL_IN_BLANK' | 'MATCHING' | 'TFNG' | 'YNNG';
  options?: string[];
  questionNumber?: number;
  correctAnswer?: string;
}

interface Passage {
  _id: string;
  passageNumber?: number;
  title: string;
  content: string;
  questions: Question[];
}

interface TestData {
  _id: string;
  title: string;
  description: string;
  passages: Passage[];
}

export function ReadingExamPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  // ?passage=N means student is practising a single passage (from the flattened list page)
  const passageParam = searchParams.get('passage') ? Number(searchParams.get('passage')) : null;

  const [testData, setTestData] = useState<TestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(() => Date.now());

  // All questions flattened — used for legacy full-test submit
  const allQuestions = useMemo(
    () => testData?.passages.flatMap((item) => item.questions) || [],
    [testData],
  );

  useEffect(() => {
    const fetchTest = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`http://localhost:3000/api/reading/${id}`);
        setTestData(response.data.data);
      } catch (error) {
        console.error('❌ Error fetching reading test:', error);
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
        <p className="text-lg text-slate-600">Đang tải đề thi...</p>
      </div>
    );
  }

  if (!testData || testData.passages.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-lg text-red-600">Không tìm thấy đề thi</p>
      </div>
    );
  }

  // When ?passage=N is set, isolate that specific passage
  const activePassage: Passage | undefined = passageParam
    ? testData.passages.find((p) => p.passageNumber === passageParam)
    : testData.passages[0];

  // Guard: passage requested but not found
  if (!activePassage) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-lg text-red-600">
          Passage {passageParam} không tồn tại trong đề thi này.
        </p>
      </div>
    );
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!id || !testData) return;

    const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
    if (!token) {
      toast.error('Bạn cần đăng nhập trước khi nộp bài.');
      return;
    }

    const timeSpent = Math.max(0, Math.floor((Date.now() - startTime) / 1000));

    try {
      setIsSubmitting(true);
      let response;

      if (passageParam && activePassage) {
        // ── Single-passage submission ────────────────────────
        const studentAnswers = activePassage.questions.map(
          (q) => String(answers[q._id] || ''),
        );
        response = await axios.post(
          `http://localhost:3000/api/reading/${id}/submit-passage`,
          { studentAnswers, timeSpent, passageNumber: passageParam },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } else {
        // ── Full-test submission (legacy / no ?passage param) ──
        const studentAnswers = allQuestions.map((q) => String(answers[q._id] || ''));
        response = await axios.post(
          `http://localhost:3000/api/reading/${id}/submit`,
          { studentAnswers, timeSpent },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }

      const attempt = response.data?.data;
      const payload = { attempt, module: 'Reading' as const };
      sessionStorage.setItem('latestAttemptResult', JSON.stringify(payload));
      navigate('/results', { state: payload });
    } catch (error: any) {
      console.error('❌ Error submitting reading test:', error);
      toast.error(error.response?.data?.message || 'Không thể nộp bài Reading.');
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
          <h1 className="text-2xl font-bold text-slate-900">
            {testData.title}
            {passageParam && (
              <span className="ml-2 text-indigo-600">— Passage {passageParam}</span>
            )}
          </h1>
          {passageParam ? (
            <button
              onClick={() => navigate(-1)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ← Quay lại danh sách
            </button>
          ) : (
            <p className="text-sm text-slate-500">{testData.description}</p>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-md disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {isSubmitting ? 'Đang nộp...' : 'Nộp bài'}
        </button>
      </div>

      {/* Split Pane */}
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
        <div className="overflow-y-auto bg-white">
          <div
            className="prose prose-lg prose-red max-w-none text-justify p-6"
            dangerouslySetInnerHTML={{ __html: activePassage.content }}
          />
        </div>

        {/* Right Pane: Questions */}
        <div className="overflow-y-auto bg-slate-50 p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">{activePassage.title}</h2>

            {activePassage.questions.map((question, index) => (
              <div
                key={question._id}
                className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  {/* Question Number */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-bold">
                    {question.questionNumber || index + 1}
                  </div>

                  {/* Question Content */}
                  <div className="flex-1">
                    <div
                      className="font-medium text-slate-900 mb-4 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: question.text }}
                    />

                    {/* Options for Multiple Choice, TFNG, or YNNG */}
                    {(question.type === 'MULTIPLE_CHOICE' ||
                      question.type === 'TFNG' ||
                      question.type === 'YNNG') &&
                      question.options &&
                      question.options.length > 0 ? (
                      <div className="space-y-3">
                        {question.options.map((option) => (
                          <label
                            key={option}
                            className="flex items-center gap-3 cursor-pointer hover:bg-indigo-50 p-3 rounded-lg transition-colors"
                          >
                            <input
                              type="radio"
                              name={question._id}
                              value={option}
                              checked={answers[question._id] === option}
                              onChange={(e) =>
                                handleAnswerChange(question._id, e.target.value)
                              }
                              className="h-4 w-4 text-indigo-600 cursor-pointer"
                            />
                            <span className="text-sm text-slate-700 font-medium">
                              {option}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      /* Text Input for Fill in the Blank */
                      <input
                        type="text"
                        value={answers[question._id] || ''}
                        onChange={(e) =>
                          handleAnswerChange(question._id, e.target.value)
                        }
                        placeholder="Nhập câu trả lời của bạn..."
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                      />
                    )}
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
