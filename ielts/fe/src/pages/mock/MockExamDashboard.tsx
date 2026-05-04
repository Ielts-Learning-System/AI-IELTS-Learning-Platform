import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Clock3, PlayCircle, BarChart3 } from 'lucide-react';
import { fetchStudentMockExams, startExam, type ExamItem } from '../../api/exam.api';

function statusLabel(status?: string) {
  if (!status) return 'Chưa bắt đầu';
  if (status === 'IN_PROGRESS') return 'Đang làm bài';
  if (status === 'SUBMITTED') return 'Đã nộp';
  if (status === 'EXPIRED') return 'Hết giờ';
  if (status === 'GRADED') return 'Đã chấm';
  return status;
}

export default function MockExamDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [startingExamId, setStartingExamId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    fetchStudentMockExams()
      .then((data) => {
        if (!alive) return;
        setExams(data);
      })
      .catch((error) => {
        toast.error(error?.response?.data?.message || 'Không thể tải danh sách thi thử.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const totalInProgress = useMemo(
    () => exams.filter((e) => e.latestAttempt?.status === 'IN_PROGRESS').length,
    [exams]
  );

  const handleStart = async (exam: ExamItem) => {
    if (exam.latestAttempt?._id) {
      navigate(`/dashboard/mock-tests/${exam._id}/attempt/${exam.latestAttempt._id}`);
      return;
    }

    try {
      setStartingExamId(exam._id);
      const attempt = await startExam(exam._id);
      navigate(`/dashboard/mock-tests/${exam._id}/attempt/${attempt._id}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể bắt đầu bài thi.');
    } finally {
      setStartingExamId(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Thi thử IELTS</h1>
        <p className="mt-2 text-slate-600">
          Mỗi Full Mock Test có giới hạn tổng 24 giờ và lock tiến trình theo từng kỹ năng.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          <BarChart3 className="h-4 w-4" />
          {totalInProgress} bài đang làm dở
        </div>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Đang tải danh sách đề thi...
        </div>
      ) : exams.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Chưa có đề thi thử nào được publish.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {exams.map((exam) => {
            const status = exam.latestAttempt?.status;
            const progress = exam.progress?.percent ?? 0;
            return (
              <article key={exam._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{exam.title}</h3>
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{exam.description || 'Full Mock Test chuẩn IELTS.'}</p>

                <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1">
                    <Clock3 className="h-4 w-4" />
                    Tổng thời lượng: {exam.durationMinutes} phút
                  </span>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1">
                    Global limit: {exam.globalLimitHours}h
                  </span>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1">
                    {statusLabel(status)}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Tiến độ</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100">
                    <div
                      className="h-2.5 rounded-full bg-blue-600 transition-all"
                      style={{ width: `${Math.max(4, progress)}%` }}
                    />
                  </div>
                </div>

                <button
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  onClick={() => handleStart(exam)}
                  disabled={startingExamId === exam._id}
                >
                  <PlayCircle className="h-4 w-4" />
                  {startingExamId === exam._id
                    ? 'Đang khởi tạo...'
                    : status === 'IN_PROGRESS'
                      ? 'Tiếp tục làm bài'
                      : status === 'SUBMITTED' || status === 'EXPIRED'
                        ? 'Xem lại bài đã nộp'
                        : status === 'GRADED'
                          ? 'Xem kết quả và feedback'
                          : 'Bắt đầu'}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
