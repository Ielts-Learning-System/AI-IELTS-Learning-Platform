import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Headphones,
  HelpCircle,
  Layers,
  Search,
} from 'lucide-react';
import { fetchListeningTests, type ListeningTest } from '../api/listening.api';
import axios from 'axios';

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

function getPartCount(test: ListeningTest): number {
  if (typeof test.partCount === 'number') return test.partCount;
  return Array.isArray(test.parts) ? test.parts.length : 0;
}

function getQuestionCount(test: ListeningTest): number {
  if (typeof test.totalQuestionCount === 'number') return test.totalQuestionCount;

  if (Array.isArray(test.parts)) {
    return test.parts.reduce(
      (sum, part) =>
        sum + (Array.isArray(part.questions) ? part.questions.length : 0),
      0,
    );
  }

  return 0;
}

function getErrorMessage(err: unknown): string {
  if (axios.isCancel(err)) return '';
  if (axios.isAxiosError(err)) {
    if (err.response) {
      const data = err.response.data as { message?: string } | undefined;
      return (
        data?.message ??
        `Không thể tải danh sách đề thi (${err.response.status}).`
      );
    }
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
  }
  return err instanceof Error
    ? err.message
    : 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.';
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={`listening-skeleton-${index}`}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex gap-2">
            <div className="h-6 w-24 rounded-full bg-slate-200" />
          </div>
          <div className="mb-2 h-5 w-3/4 rounded bg-slate-200" />
          <div className="mb-2 h-4 w-full rounded bg-slate-100" />
          <div className="mb-5 h-4 w-5/6 rounded bg-slate-100" />
          <div className="mb-4 h-4 w-2/3 rounded bg-slate-100" />
          <div className="h-10 w-full rounded-lg bg-red-100" />
        </div>
      ))}
    </div>
  );
}

export default function ListeningListPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<ListeningTest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const controller = new AbortController();

    const loadTests = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchListeningTests(controller.signal);
        setTests(data);
      } catch (err) {
        const msg = getErrorMessage(err);
        if (msg) setError(msg);
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

    return tests.filter((test) => {
      const title = (test.title ?? '').toLowerCase();
      return title.includes(normalizedSearch);
    });
  }, [tests, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            IELTS Listening Practice
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">
            Rèn luyện kỹ năng nghe mỗi ngày để nắm bắt thông tin nhanh hơn, cải
            thiện phản xạ và chinh phục band điểm mục tiêu.
          </p>

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

        {/* Content */}
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-red-500" size={20} />
              <div>
                <h2 className="text-lg font-semibold">
                  Không thể tải danh sách đề thi
                </h2>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Headphones size={36} />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Chưa có đề phù hợp
            </h2>
            <p className="mt-2 text-slate-600">
              Hãy thử từ khóa khác để khám phá thêm bài luyện Listening.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTests.map((test) => {
              const partCount = getPartCount(test);
              const questionCount = getQuestionCount(test);
              const title = test.title ?? 'Untitled Listening Test';

              return (
                <article
                  key={test._id}
                  onClick={() => navigate(`/listening/ielts/${test._id}`)}
                  className="group flex cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Badge */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                      <Headphones size={12} />
                      Listening
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="line-clamp-2 text-lg font-bold text-slate-900">
                    {title}
                  </h3>

                  {/* Description */}
                  <p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-600">
                    {test.description ||
                      'Bài luyện tập mô phỏng đề IELTS Listening với nhiều dạng câu hỏi thực chiến.'}
                  </p>

                  {/* Meta */}
                  <div className="mt-4 space-y-2 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-red-500" />
                      <span>{partCount} Parts</span>
                      <span className="text-slate-300">•</span>
                      <HelpCircle size={16} className="text-red-500" />
                      <span>{questionCount} Questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays size={16} className="text-red-500" />
                      <span>{formatDate(test.createdAt)}</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/listening/ielts/${test._id}`);
                    }}
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                  >
                    Bắt đầu làm bài
                    <ChevronRight size={16} />
                  </button>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
