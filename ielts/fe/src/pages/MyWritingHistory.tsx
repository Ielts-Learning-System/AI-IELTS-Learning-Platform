import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardList,
  FilePenLine,
  LoaderCircle,
  MessageSquareQuote,
  X,
} from 'lucide-react';
import { useUserStore } from '../store/useUserStore';

type CriteriaKey = 'TR' | 'CC' | 'LR' | 'GRA';

interface WritingRef {
  _id?: string;
  title?: string;
  type?: 'Task 1' | 'Task 2';
}

interface GradingCriteria {
  TR: number;
  CC: number;
  LR: number;
  GRA: number;
}

interface GradingInfo {
  criteria: GradingCriteria;
  overallBand: number;
  teacherFeedback: string;
  gradedAt: string;
}

interface SubmissionItem {
  _id: string;
  writingId: string | WritingRef;
  taskType: 'Task 1' | 'Task 2';
  content: string;
  wordCount: number;
  status: 'Pending' | 'Graded';
  createdAt: string;
  grading?: GradingInfo;
}

const WRITING_API_BASE = 'http://localhost:3000/api/writing';

const getToken = (fallbackToken: string | null) =>
  fallbackToken || localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

const criteriaMeta: Array<{ key: CriteriaKey; label: string; description: string }> = [
  { key: 'TR', label: 'Task Response', description: 'Mức độ trả lời đúng trọng tâm đề bài.' },
  { key: 'CC', label: 'Coherence & Cohesion', description: 'Tổ chức ý và liên kết đoạn văn.' },
  { key: 'LR', label: 'Lexical Resource', description: 'Độ đa dạng và chính xác của từ vựng.' },
  { key: 'GRA', label: 'Grammar Range & Accuracy', description: 'Phạm vi cấu trúc và độ chính xác ngữ pháp.' },
];

const getWritingTitle = (writing: SubmissionItem['writingId']) => {
  if (typeof writing === 'string') return 'Writing Prompt';
  return writing?.title || 'Writing Prompt';
};

const statusBadgeMap = {
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  Graded: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

export default function MyWritingHistory() {
  const { token } = useUserStore();
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchSubmissions = async () => {
      if (!getToken(token)) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        const response = await axios.get(`${WRITING_API_BASE}/submissions/my-submissions`, {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${getToken(token)}`,
          },
        });

        const payload = response.data?.data ?? response.data;
        setSubmissions(Array.isArray(payload) ? payload : []);
      } catch (error: any) {
        if (!axios.isCancel(error)) {
          console.error('Failed to fetch writing history:', error);
          toast.error(error.response?.data?.message || 'Không thể tải lịch sử Writing.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
    return () => controller.abort();
  }, [token]);

  const gradedCount = useMemo(
    () => submissions.filter((submission) => submission.status === 'Graded').length,
    [submissions],
  );

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      <div className="overflow-hidden rounded-[30px] border border-red-100 bg-[linear-gradient(135deg,#fff8f8_0%,#ffffff_45%,#fff1f2_100%)] shadow-[0_24px_80px_rgba(127,29,29,0.08)]">
        <div className="grid gap-4 border-b border-red-100 bg-white/85 px-6 py-6 sm:grid-cols-3 sm:px-8">
          <div className="space-y-2 sm:col-span-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
              <ClipboardList className="h-3.5 w-3.5" />
              Writing History
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Lịch sử bài Writing</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-500">
              Theo dõi các bài đã nộp, trạng thái chấm điểm và mở chi tiết nhận xét của giáo viên khi bài được hoàn tất.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:self-start">
            <div className="rounded-[24px] border border-red-100 bg-white px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Đã nộp</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{submissions.length}</p>
            </div>
            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 px-4 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Đã chấm</p>
              <p className="mt-2 text-2xl font-black text-emerald-900">{gradedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white px-4 py-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-[24px] border border-red-50 bg-red-50/40">
              <div className="flex items-center gap-3 text-red-600">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                <span className="font-semibold">Đang tải lịch sử bài viết...</span>
              </div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[24px] border border-dashed border-red-200 bg-[linear-gradient(180deg,#fff7f7_0%,#ffffff_100%)] px-6 text-center">
              <FilePenLine className="mb-4 h-10 w-10 text-red-400" />
              <p className="text-lg font-bold text-slate-900">Bạn chưa có bài Writing nào được nộp</p>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Hãy hoàn thành một bài Writing để bắt đầu nhận phản hồi và theo dõi tiến độ theo từng bài.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-red-100">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] bg-white">
                  <thead>
                    <tr className="bg-red-50/70 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-5 py-4 font-semibold">Test Title</th>
                      <th className="px-5 py-4 font-semibold">Date Submitted</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Band Score</th>
                      <th className="px-5 py-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((submission) => (
                      <tr key={submission._id} className="border-t border-red-50 transition hover:bg-red-50/30">
                        <td className="px-5 py-5 align-top">
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900">{getWritingTitle(submission.writingId)}</p>
                            <p className="text-sm text-slate-500">{submission.taskType} · {submission.wordCount} từ</p>
                          </div>
                        </td>
                        <td className="px-5 py-5 align-top text-sm text-slate-600">
                          <div className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-red-400" />
                            {format(new Date(submission.createdAt), 'dd/MM/yyyy HH:mm')}
                          </div>
                        </td>
                        <td className="px-5 py-5 align-top">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusBadgeMap[submission.status]}`}>
                            {submission.status === 'Pending' ? 'Chờ chấm' : 'Đã chấm'}
                          </span>
                        </td>
                        <td className="px-5 py-5 align-top text-sm font-bold text-slate-900">
                          {submission.grading?.overallBand?.toFixed(1) ?? '-'}
                        </td>
                        <td className="px-5 py-5 align-top text-right">
                          {submission.status === 'Graded' ? (
                            <button
                              type="button"
                              onClick={() => setSelectedSubmission(submission)}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                            >
                              <MessageSquareQuote className="h-4 w-4" />
                              Xem nhận xét
                            </button>
                          ) : (
                            <span className="text-sm text-slate-400">Đang chờ giáo viên</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedSubmission && (
        <FeedbackModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </section>
  );
}

interface FeedbackModalProps {
  submission: SubmissionItem;
  onClose: () => void;
}

function FeedbackModal({ submission, onClose }: FeedbackModalProps) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const grading = submission.grading;
  if (!grading) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[32px] border border-red-100 bg-white shadow-[0_32px_120px_rgba(15,23,42,0.28)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-10 rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-red-200 hover:text-red-500"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid max-h-[92vh] grid-cols-1 overflow-y-auto lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-red-100 bg-[linear-gradient(180deg,#fff9f9_0%,#ffffff_100%)] p-6 lg:border-b-0 lg:border-r lg:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                <FilePenLine className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Original Essay</p>
                <h2 className="text-2xl font-black text-slate-900">{getWritingTitle(submission.writingId)}</h2>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap gap-3 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-red-100">
                <CalendarDays className="h-4 w-4 text-red-400" />
                {format(new Date(submission.createdAt), 'dd/MM/yyyy HH:mm')}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-red-100">
                <Circle className="h-4 w-4 fill-red-400 text-red-400" />
                {submission.wordCount} từ
              </span>
            </div>

            <div className="rounded-[28px] border border-red-100 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Bài làm của học viên</p>
              <div className="max-h-[52vh] overflow-y-auto whitespace-pre-wrap text-[15px] leading-8 text-slate-700">
                {submission.content}
              </div>
            </div>
          </div>

          <div className="space-y-6 bg-white p-6 lg:p-8">
            <div className="rounded-[28px] border border-red-100 bg-[linear-gradient(180deg,#fff6f6_0%,#ffffff_100%)] p-6 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-500">Overall Band</p>
              <div className="mx-auto mt-5 flex h-36 w-36 items-center justify-center rounded-full border-[10px] border-red-100 bg-white shadow-inner">
                <span className="text-5xl font-black tracking-tight text-[#E31837]">
                  {grading.overallBand.toFixed(1)}
                </span>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Đã chấm xong
              </div>
            </div>

            <div className="rounded-[28px] border border-red-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                <MessageSquareQuote className="h-4 w-4" />
                Teacher Feedback
              </div>
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {grading.teacherFeedback || 'Giáo viên chưa để lại nhận xét chi tiết.'}
              </p>
            </div>

            <div className="grid gap-4">
              {criteriaMeta.map((criterion) => (
                <div
                  key={criterion.key}
                  className="rounded-[24px] border border-red-100 bg-[linear-gradient(180deg,#ffffff_0%,#fffafa_100%)] px-5 py-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{criterion.key}</p>
                      <p className="mt-1 text-sm text-slate-500">{criterion.label}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-400">{criterion.description}</p>
                    </div>
                    <div className="rounded-2xl bg-red-50 px-4 py-3 text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-500">Score</p>
                      <p className="mt-1 text-2xl font-black text-[#E31837]">
                        {grading.criteria[criterion.key].toFixed(1)}
                      </p>
                    </div>
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