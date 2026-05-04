import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Mic,
  RefreshCcw,
  Search,
} from 'lucide-react';
import {
  fetchSpeakingTests,
  type SpeakingTestListItem,
} from '../api/speaking.api';
import { apiClient } from '../lib/api/client';
import { Pagination } from '../components/Pagination';

interface SubmissionStatus {
  /** Most recent submission id for this test */
  id: string;
  status: 'Pending' | 'Graded';
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Ngày chưa cập nhật';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Ngày không hợp lệ';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getErrorMessage(err: unknown): string {
  if (axios.isCancel(err)) return '';
  if (axios.isAxiosError(err)) {
    if (err.response) {
      const data = err.response.data as { message?: string } | undefined;
      return data?.message ?? `Không thể tải danh sách đề Speaking (${err.response.status}).`;
    }
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
  }

  return err instanceof Error
    ? err.message
    : 'Đã xảy ra lỗi khi tải danh sách đề Speaking.';
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`speaking-skeleton-${index}`}
          className="animate-pulse rounded-[28px] border border-red-100 bg-white p-6 shadow-sm"
        >
          <div className="mb-5 h-6 w-24 rounded-full bg-red-100" />
          <div className="mb-3 h-6 w-4/5 rounded bg-slate-200" />
          <div className="mb-2 h-4 w-full rounded bg-slate-100" />
          <div className="mb-6 h-4 w-3/4 rounded bg-slate-100" />
          <div className="mb-6 h-4 w-1/2 rounded bg-slate-100" />
          <div className="h-11 w-full rounded-2xl bg-red-100" />
        </div>
      ))}
    </div>
  );
}

export default function SpeakingListPage() {
  const [tests, setTests] = useState<SpeakingTestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  /** Map of testId → most recent submission status */
  const [submissionMap, setSubmissionMap] = useState<Record<string, SubmissionStatus>>({});

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const controller = new AbortController();

    const loadTests = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchSpeakingTests(controller.signal, currentPage, 6);
        setTests(result.data);
        setTotalPages(result.totalPages);
      } catch (err) {
        const message = getErrorMessage(err);
        if (message) setError(message);
      } finally {
        setLoading(false);
      }
    };

    const loadSubmissions = async () => {
      try {
        const res = await apiClient.get('/speaking/submissions/my-submissions', {
          signal: controller.signal,
        });
        const all = (res.data?.data ?? []) as any[];
        // Build map: testId → most recent submission (array is already sorted desc)
        const map: Record<string, SubmissionStatus> = {};
        for (const sub of all) {
          const tid = sub.testId?._id ?? String(sub.testId);
          if (tid && !map[tid]) {
            map[tid] = { id: sub._id, status: sub.status };
          }
        }
        setSubmissionMap(map);
      } catch {
        // not critical — just won't show badges
      }
    };

    loadTests();
    loadSubmissions();

    return () => controller.abort();
  }, [currentPage]);

  const filteredTests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return tests;

    return tests.filter((test) => test.title.toLowerCase().includes(normalizedSearch));
  }, [tests, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            IELTS Speaking Practice
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">
            Duyệt kho đề Speaking theo chủ đề, mở từng bài để xem đầy đủ Part 1, Part 2 và Part 3,
            rồi luyện nói theo đúng cấu trúc IELTS.
          </p>

          {/* Search */}
          <div className="mt-6">
            <div className="relative max-w-xl">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm đề theo tiêu đề..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-slate-700 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>
        </header>

        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
              <div>
                <h2 className="text-lg font-semibold">Không thể tải danh sách đề Speaking</h2>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Mic className="h-9 w-9" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Chưa tìm thấy đề phù hợp</h2>
            <p className="mt-2 text-slate-600">
              Thử một từ khóa khác để xem thêm các đề Speaking hiện có.
            </p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTests.map((test, index) => (
              <article
                key={test._id}
                className="group flex flex-col rounded-[28px] border border-red-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(239,68,68,0.15)]"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-red-600">
                    <Mic className="h-3.5 w-3.5" />
                    Speaking Test
                  </span>
                  {(() => {
                    const sub = submissionMap[test._id];
                    if (!sub) return (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">3 Parts</span>
                    );
                    if (sub.status === 'Graded') return (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />Đã chấm
                      </span>
                    );
                    return (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                        <Clock3 className="h-3.5 w-3.5" />Chờ chấm
                      </span>
                    );
                  })()}
                </div>

                <h2 className="line-clamp-2 min-h-14 text-xl font-bold leading-8 text-slate-900">
                  {test.title}
                </h2>
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <CalendarDays className="h-4 w-4 text-red-500" />
                  {formatDate(test.createdAt)}
                </p>
                <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
                  Đề luyện nói theo cấu trúc IELTS chuẩn với Part 1, cue card Part 2 và phần thảo luận mở rộng ở Part 3.
                </p>

                {submissionMap[test._id] ? (
                  <div className="mt-6 flex flex-col gap-2">
                    <Link
                      to={`/speaking/${test._id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      Xem lại bài đã nộp
                    </Link>
                    <Link
                      to={`/speaking/${test._id}?redo=true`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Làm lại
                    </Link>
                  </div>
                ) : (
                  <Link
                    to={`/speaking/${test._id}`}
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    Luyện tập ngay
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </article>
            ))}
          </section>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
