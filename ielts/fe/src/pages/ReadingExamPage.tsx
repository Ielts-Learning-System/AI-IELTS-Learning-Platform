import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Split from 'react-split';

interface Question {
  _id: string;
  questionText: string;
  type: 'multiple_choice' | 'true_false_ng' | 'matching' | 'fill_blank';
  options?: string[];
}

interface Passage {
  _id: string;
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
  const { id } = useParams<{ id: string }>();
  const [testData, setTestData] = useState<TestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});

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

  const passage = testData.passages[0];

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = () => {
    console.log('📝 User Answers:', answers);
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
          className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
        >
          Nộp bài
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
            className="prose prose-lg prose-blue max-w-none text-justify p-6"
            dangerouslySetInnerHTML={{ __html: passage.content }}
          />
        </div>

        {/* Right Pane: Questions */}
        <div className="overflow-y-auto bg-slate-50 p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-bold text-slate-900 mb-6">{passage.title}</h2>

            {passage.questions.map((question, index) => (
              <div
                key={question._id}
                className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  {/* Question Number */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-sm font-bold">
                    {index + 1}
                  </div>

                  {/* Question Content */}
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 mb-4">{question.questionText}</p>

                    {/* Options for Multiple Choice or True/False/NG */}
                    {(question.type === 'multiple_choice' ||
                      question.type === 'true_false_ng') && question.options ? (
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
