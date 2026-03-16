import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import Split from 'react-split';

interface Writing {
  _id: string;
  title: string;
  type: 'Task 1' | 'Task 2';
  category: string;
  timeLimit: number;
  contentHtml: string;
  isSample: boolean;
  sampleInfo?: {
    bandScore: number;
    contentHtml: string;
    author: string;
  };
  tags: string[];
}

export function WritingExamPage() {
  const { id } = useParams<{ id: string }>();
  const [writing, setWriting] = useState<Writing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [noteText, setNoteText] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [highlightContent, setHighlightContent] = useState(false);

  useEffect(() => {
    const fetchWriting = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get(`http://localhost:3000/api/writing/items/${id}`);
        setWriting(res.data?.data ?? res.data);
      } catch (err) {
        console.error('Error fetching writing:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchWriting();
    }
  }, [id]);

  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-lg text-slate-600">Đang nạp đề thi...</p>
      </div>
    );
  }

  if (!writing) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-lg text-red-600">Không tìm thấy đề thi</p>
      </div>
    );
  }

  const minWords = writing.type === 'Task 1' ? 150 : 250;
  const wordCount = getWordCount(answer);
  const isWordCountValid = wordCount >= minWords;

  const handleSubmit = () => {
    console.log('Submitting answer', { testId: writing._id, answer });
    // TODO: call API to submit
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header & Toolbar - Sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{writing.title}</h1>
            <p className="text-sm text-slate-500">{writing.type} &middot; {writing.category} &middot; {writing.timeLimit} phút</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600">
              Time: {writing.timeLimit}:00
            </div>
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-md"
            >
              Nộp bài
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-end px-6 pb-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={highlightContent}
              onChange={(e) => setHighlightContent(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
            />
            Highlight nội dung
          </label>
        </div>
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
        {/* Left Pane: Task Content */}
        <div
          className="overflow-y-auto bg-white p-6"
          style={{ height: 'calc(100vh - 140px)' }}
        >
          <div
            className={`prose prose-lg max-w-none ${highlightContent ? 'prose-indigo' : ''}`}
            dangerouslySetInnerHTML={{ __html: writing.contentHtml }}
          />
        </div>

        {/* Right Pane: Writing Area */}
        <div
          className="flex flex-col bg-slate-50 p-6"
          style={{ height: 'calc(100vh - 140px)' }}
        >
          {/* Notes Section */}
          <div className="mb-4">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              <span>{showNotes ? '▼' : '▶'}</span>
              Thêm ghi chú / dàn ý
            </button>
            {showNotes && (
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ghi chú dàn ý của bạn ở đây..."
                className="w-full mt-2 p-3 bg-slate-100 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
                rows={4}
              />
            )}
          </div>

          {/* Main Writing Area */}
          <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <span className="text-sm font-medium text-slate-600">Bài làm của bạn</span>
              <span className={`text-sm font-medium ${isWordCountValid ? 'text-green-600' : 'text-red-600'}`}>
                {wordCount} từ (Tối thiểu: {minWords})
              </span>
            </div>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Bắt đầu viết bài luận của bạn ở đây..."
              className="flex-1 w-full p-6 resize-none focus:outline-none focus:ring-0 text-slate-700 leading-relaxed bg-white"
            />
          </div>
        </div>
      </Split>
    </div>
  );
}
