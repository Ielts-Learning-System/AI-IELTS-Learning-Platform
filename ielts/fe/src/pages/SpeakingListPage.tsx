import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Mic,
  Search,
} from 'lucide-react';
import {
  fetchSpeakingTests,
  type SpeakingTestListItem,
} from '../api/speaking.api';

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

  useEffect(() => {
    const controller = new AbortController();

    const loadTests = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSpeakingTests(controller.signal);
        setTests(data);
      } catch (err) {
        const message = getErrorMessage(err);
        if (message) setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadTests();

    return () => controller.abort();
  }, []);

  const filteredTests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return tests;

    return tests.filter((test) => test.title.toLowerCase().includes(normalizedSearch));
  }, [tests, searchTerm]);

  return (
    <div
      className="min-h-screen bg-slate-50 px-4 py-8 md:px-8 lg:px-12"
      style={{ fontFamily: '"Segoe UI", Tahoma, sans-serif' }}
    >
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="overflow-hidden rounded-[32px] border border-red-100 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-red-600">
                <Mic className="h-3.5 w-3.5" />
                Speaking Library
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                Chọn một đề Speaking để bắt đầu luyện tập
              </h1>
              <p className="text-sm leading-7 text-slate-600 md:text-base">
                Duyệt kho đề Speaking theo chủ đề, mở từng bài để xem đầy đủ Part 1, Part 2 và Part 3,
                rồi luyện nói theo đúng cấu trúc IELTS.
              </p>
            </div>

            <div className="relative w-full max-w-md">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm đề theo tiêu đề..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 text-slate-700 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
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
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    3 Parts
                  </span>
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

                <Link
                  to={`/speaking/${test._id}`}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Luyện tập ngay
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
