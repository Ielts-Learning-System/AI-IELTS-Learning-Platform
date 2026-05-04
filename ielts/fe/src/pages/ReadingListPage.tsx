import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  HelpCircle,
  RotateCcw,
  Search,
} from 'lucide-react';
import axios from 'axios';
import {
  fetchReadingTests,
  fetchMyReadingAttempts,
  type FlattenedPassage,
  type ReadingTest,
  type PassageAttemptSummary,
} from '../api/reading.api';

// ── Helpers ────────────────────────────────────────────────────────

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
      return data?.message ?? `Không thể tải danh sách đề thi (${err.response.status}).`;
    }
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
  }
  return err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải dữ liệu.';
}

/** Build `${testId}-${passageNumber}` completion Set from attempt history */
function buildCompletedKeys(attempts: PassageAttemptSummary[]): Set<string> {
  const keys = new Set<string>();
  attempts.forEach((a) => {
    if (a.passageNumber != null) {
      const tid =
        a.testId !== null && typeof a.testId === 'object'
          ? (a.testId as { _id: string })._id
          : String(a.testId);
      keys.add(`${tid}-${a.passageNumber}`);
    }
  });
  return keys;
}

// ── Types ──────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'done' | 'new';

// ── Skeleton ───────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={`sk-${i}`}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex gap-2">
            <div className="h-6 w-20 rounded-full bg-slate-200" />
            <div className="h-6 w-24 rounded-full bg-slate-100" />
          </div>
          <div className="mb-2 h-5 w-3/4 rounded bg-slate-200" />
          <div className="mb-5 h-4 w-full rounded bg-slate-100" />
          <div className="mb-4 h-4 w-1/2 rounded bg-slate-100" />
          <div className="h-10 w-full rounded-lg bg-indigo-100" />
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export default function ReadingListPage() {
  const navigate = useNavigate();

  // ── Data state ───────────────────────────────────────────────────
  const [tests, setTests] = useState<ReadingTest[]>([]);
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filter state ─────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [passageFilter, setPassageFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // ── Fetch tests + my attempts in parallel ────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [testsResult, attemptsResult] = await Promise.allSettled([
          fetchReadingTests(controller.signal),
          fetchMyReadingAttempts(controller.signal),
        ]);

        if (testsResult.status === 'rejected') {
          const msg = getErrorMessage(testsResult.reason);
          if (msg) setError(msg);
          return;
        }

        setTests(testsResult.value);

        if (attemptsResult.status === 'fulfilled') {
          setCompletedKeys(buildCompletedKeys(attemptsResult.value));
        }
      } catch (err) {
        const msg = getErrorMessage(err);
        if (msg) setError(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, []);

  // ── Flatten tests → individual passage cards ─────────────────────
  const flatPassages = useMemo<FlattenedPassage[]>(() => {
    return tests.flatMap((test) =>
      (test.passages ?? []).map((passage) => ({
        key: `${test._id}-${passage.passageNumber ?? 0}`,
        testId: test._id,
        testTitle: test.title ?? test.name ?? 'Untitled Reading Test',
        testCreatedAt: test.createdAt,
        passageNumber: passage.passageNumber ?? 0,
        passageTitle: passage.title,
        questionCount: passage.questionCount ?? (passage.questions?.length ?? 0),
      })),
    );
  }, [tests]);

  // ── Apply search + passage + status filters ───────────────────────
  const filteredPassages = useMemo<FlattenedPassage[]>(() => {
    const q = searchTerm.trim().toLowerCase();
    return flatPassages.filter((fp) => {
      if (q && !fp.testTitle.toLowerCase().includes(q)) return false;
      if (passageFilter !== 'all' && fp.passageNumber !== passageFilter) return false;
      const done = completedKeys.has(fp.key);
      if (statusFilter === 'done' && !done) return false;
      if (statusFilter === 'new' && done) return false;
      return true;
    });
  }, [flatPassages, searchTerm, passageFilter, statusFilter, completedKeys]);

  // ── Summary counts for filter badges ─────────────────────────────
  const doneCount = flatPassages.filter((fp) => completedKeys.has(fp.key)).length;
  const newCount = flatPassages.length - doneCount;

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            IELTS Reading Practice
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">
            Luyện từng Passage riêng biệt để tập trung vào từng loại văn bản và theo
            dõi tiến bộ chi tiết hơn.
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
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên đề thi..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* Filter bar */}
          {!loading && !error && flatPassages.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {/* Passage filter */}
              <select
                value={String(passageFilter)}
                onChange={(e) =>
                  setPassageFilter(
                    e.target.value === 'all' ? 'all' : Number(e.target.value),
                  )
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="all">Tất cả Passages</option>
                <option value="1">Passage 1</option>
                <option value="2">Passage 2</option>
                <option value="3">Passage 3</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="done">Đã hoàn thành ({doneCount})</option>
                <option value="new">Chưa làm ({newCount})</option>
              </select>

              {/* Result count */}
              {(passageFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
                <span className="text-sm text-slate-500">
                  {filteredPassages.length} kết quả
                </span>
              )}
            </div>
          )}
        </header>

        {/* ── Content ────────────────────────────────────────── */}
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-red-500" size={20} />
              <div>
                <h2 className="text-lg font-semibold">Không thể tải danh sách đề thi</h2>
                <p className="mt-1 text-sm">{error}</p>
              </div>
            </div>
          </div>
        ) : filteredPassages.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <BookOpenText size={36} />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Chưa có đề phù hợp</h2>
            <p className="mt-2 text-slate-600">
              {flatPassages.length === 0
                ? 'Chưa có đề thi nào được công bố.'
                : 'Hãy thử bỏ bộ lọc hoặc đổi từ khóa.'}
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPassages.map((fp) => {
              const isDone = completedKeys.has(fp.key);

              return (
                <article
                  key={fp.key}
                  onClick={() =>
                    navigate(`/reading/${fp.testId}?passage=${fp.passageNumber}`)
                  }
                  className="group flex cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Badge row */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                      <BookOpenText size={12} />
                      Reading
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Passage {fp.passageNumber}
                    </span>
                    {/* Status badge */}
                    {isDone ? (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        <CheckCircle2 size={11} />
                        Đã hoàn thành
                      </span>
                    ) : (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                        <Circle size={11} />
                        Chưa làm
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="line-clamp-2 text-lg font-bold text-slate-900">
                    {fp.testTitle}{' '}
                    <span className="text-indigo-600">— Passage {fp.passageNumber}</span>
                  </h3>

                  {/* Passage subtitle */}
                  {fp.passageTitle && (
                    <p className="mt-1 line-clamp-1 text-sm text-slate-500 italic">
                      {fp.passageTitle}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="mt-4 space-y-2 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <HelpCircle size={16} className="text-indigo-500" />
                      <span>{fp.questionCount} Questions</span>
                    </div>
                    {fp.testCreatedAt && (
                      <div className="flex items-center gap-2">
                        <CalendarDays size={16} className="text-indigo-500" />
                        <span>{formatDate(fp.testCreatedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/reading/${fp.testId}?passage=${fp.passageNumber}`);
                    }}
                    className={`mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                      isDone
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {isDone ? (
                      <>
                        <RotateCcw size={15} />
                        Làm lại
                      </>
                    ) : (
                      <>
                        Bắt đầu làm bài
                        <ChevronRight size={16} />
                      </>
                    )}
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
