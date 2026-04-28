import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  ClipboardCheck,
  Eye,
  LoaderCircle,
  RefreshCcw,
} from 'lucide-react';
import { format } from 'date-fns';
import { useUserStore } from '../../store/useUserStore';

interface WritingPromptSummary {
  _id: string;
  title: string;
  type: 'Task 1' | 'Task 2';
}

interface PendingSubmission {
  _id: string;
  studentId: string;
  writingId: string | WritingPromptSummary;
  taskType: 'Task 1' | 'Task 2';
  content: string;
  wordCount: number;
  status: 'Pending';
  createdAt: string;
}

const WRITING_API_BASE = 'http://localhost:3000/api/writing';

const getToken = (fallbackToken: string | null) =>
  fallbackToken || localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

const getPromptTitle = (writing: PendingSubmission['writingId']) =>
  typeof writing === 'string' ? 'Writing Prompt' : writing?.title || 'Writing Prompt';

const getStudentLabel = (submission: PendingSubmission) => {
  const studentId = String(submission.studentId || '');
  if (!studentId) return 'Học viên chưa xác định';
  return `Học viên ${studentId.slice(-6).toUpperCase()}`;
};

export default function GradingDashboard() {
  const { token } = useUserStore();
  const navigate = useNavigate();
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  const fetchPendingSubmissions = async () => {
    if (!getToken(token)) {
      setIsLoadingList(false);
      return;
    }

    try {
      setIsLoadingList(true);

      const response = await axios.get(`${WRITING_API_BASE}/submissions/pending`, {
        headers: {
          Authorization: `Bearer ${getToken(token)}`,
        },
      });

      const payload = response.data?.data ?? response.data;
      const nextList = Array.isArray(payload) ? payload : [];

      setPendingSubmissions(nextList);
    } catch (error: any) {
      console.error('Failed to fetch pending writing submissions:', error);
      toast.error(error.response?.data?.message || 'Không thể tải danh sách bài chờ chấm.');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchPendingSubmissions();
  }, [token]);

  const handleNavigateDetail = (id: string) => {
    navigate(`/teacher/writing/${id}`);
  };

  const renderPendingList = () => {
    return (
      <div>
        {isLoadingList ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-red-50 bg-white">
            <div className="flex items-center gap-3 text-red-600">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              <span className="font-semibold">Đang tải...</span>
            </div>
          </div>
        ) : pendingSubmissions.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-red-200 bg-white px-5 py-10 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
            <p className="font-bold text-slate-900">Không còn bài Writing chờ chấm</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Mọi bài nộp hiện tại đã được xử lý hoặc chưa có bài mới xuất hiện trong hàng đợi.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pendingSubmissions.map((submission) => {
              return (
                <div
                  key={submission._id}
                  onClick={() => handleNavigateDetail(submission._id)}
                  className="w-full cursor-pointer rounded-[24px] border border-red-100 bg-white px-4 py-4 text-left transition hover:border-red-200 hover:bg-red-50/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl p-3 bg-red-50 text-red-500">
                      <CircleUserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="truncate font-bold text-slate-900">{getStudentLabel(submission)}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{getPromptTitle(submission.writingId)}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-red-100">{submission.taskType}</span>
                        <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-red-100">{submission.wordCount} từ</span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {format(new Date(submission.createdAt), 'dd/MM/yyyy HH:mm')}
                      </div>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigateDetail(submission._id);
                        }}
                        className="rounded-full border border-red-100 bg-white p-2 text-red-500 shadow-sm transition hover:bg-red-50 hover:text-red-600"
                        title="Xem chi tiết / Chấm bài"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#fef2f2_0%,#ffffff_38%,#f8fafc_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
        <div className="border-b border-red-100 bg-white/85 px-6 py-6 backdrop-blur sm:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-red-600">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Teacher Workspace
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">Chấm IELTS Writing</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Không gian làm việc tập trung để xem danh sách bài viết. Bấm vào mỗi bài để xem đề bài, đánh giá theo 4 tiêu chí IELTS và nhận xét.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Pending</p>
                <p className="mt-1 text-2xl font-black text-amber-900">{pendingSubmissions.length}</p>
              </div>
              <button
                type="button"
                onClick={fetchPendingSubmissions}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <RefreshCcw className="h-4 w-4" />
                Làm mới danh sách
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_100%)] p-6 sm:p-8 min-h-[calc(100vh-13rem)] rounded-[0_0_30px_30px]">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Pending List</p>
                <h3 className="mt-1 text-2xl font-black text-slate-900">Bài chờ chấm</h3>
              </div>
            </div>
            {renderPendingList()}
          </div>
        </div>
      </div>
    </section>
  );
}