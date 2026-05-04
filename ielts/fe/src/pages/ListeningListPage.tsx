import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Headphones,
  HelpCircle,
  RotateCcw,
  Search,
} from 'lucide-react';
import axios from 'axios';
import {
  fetchListeningTests,
  fetchMyListeningAttempts,
  type FlattenedPart,
  type ListeningTest,
  type PartAttemptSummary,
} from '../api/listening.api';
import { Pagination } from '../components/Pagination';

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

/** Build the `${testId}-${partNumber}` Set from the user's attempt history */
function buildCompletedKeys(attempts: PartAttemptSummary[]): Set<string> {
  const keys = new Set<string>();
  attempts.forEach((a) => {
    if (!a || a.partNumber == null) return;
    const tid =
      a.testId != null && typeof a.testId === 'object'
        ? (a.testId as { _id: string })._id ?? ''
        : String(a.testId ?? '');
    if (tid) keys.add(`${tid}-${a.partNumber}`);
  });
  return keys;
}

// ── Types ──────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'done' | 'new';

// ── Skeleton ───────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`sk-${i}`}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex gap-2">
            <div className="h-6 w-24 rounded-full bg-slate-200" />
            <div className="h-6 w-20 rounded-full bg-slate-100" />
          </div>
          <div className="mb-2 h-5 w-3/4 rounded bg-slate-200" />
          <div className="mb-5 h-4 w-full rounded bg-slate-100" />
          <div className="mb-4 h-4 w-1/2 rounded bg-slate-100" />
          <div className="h-10 w-full rounded-lg bg-red-100" />
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export default function ListeningListPage() {
  const navigate = useNavigate();

  // ── Data state ───────────────────────────────────────────────────
  const [tests, setTests] = useState<ListeningTest[]>([]);
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filter state ─────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [partFilter, setPartFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // ── Fetch tests + my attempts in parallel ────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [testsResult, attemptsResult] = await Promise.allSettled([
          fetchListeningTests(controller.signal),
          fetchMyListeningAttempts(controller.signal),
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
        // If attempts fetch fails (not logged in etc.), just leave completedKeys empty
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

  // ── Flatten tests → individual part cards ────────────────────────
  const flatParts = useMemo<FlattenedPart[]>(() => {
    return tests.filter((test): test is ListeningTest => test != null && typeof test === 'object' && Boolean(test._id)).flatMap((test) =>
      (test.parts ?? []).map((part) => ({
        key: `${test._id}-${part.partNumber ?? 0}`,
        testId: test._id,
        testTitle: test.title ?? 'Untitled Listening Test',
        testCreatedAt: test.createdAt,
        partNumber: part.partNumber ?? 0,
        partTitle: part.title,
        questionCount: part.questionCount ?? (part.questions?.length ?? 0),
      })),
    );
  }, [tests]);

  // ── Apply search + part + status filters ─────────────────────────
  const filteredParts = useMemo<FlattenedPart[]>(() => {
    const q = searchTerm.trim().toLowerCase();
    return flatParts.filter((fp) => {
      if (q && !fp.testTitle.toLowerCase().includes(q)) return false;
      if (partFilter !== 'all' && fp.partNumber !== partFilter) return false;
      const done = completedKeys.has(fp.key);
      if (statusFilter === 'done' && !done) return false;
      if (statusFilter === 'new' && done) return false;
      return true;
    });
  }, [flatParts, searchTerm, partFilter, statusFilter, completedKeys]);

  // ── Pagination ────────────────────────────────────────────────────
  const PAGE_LIMIT = 6;
  const totalPages = Math.max(1, Math.ceil(filteredParts.length / PAGE_LIMIT));

  // Reset to page 1 when filters change
  useMemo(() => { setCurrentPage(1); }, [searchTerm, partFilter, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const pagedParts = useMemo(
    () => filteredParts.slice((currentPage - 1) * PAGE_LIMIT, currentPage * PAGE_LIMIT),
    [filteredParts, currentPage],
  );

  // ── Summary counts (for filter badges) ───────────────────────────
  const doneParts = flatParts.filter((fp) => completedKeys.has(fp.key)).length;
  const newParts = flatParts.length - doneParts;

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            IELTS Listening Practice
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">
            Rèn luyện từng Part riêng biệt để bắt kịp tiến độ học tập và theo dõi
            kết quả chi tiết hơn.
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
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-slate-700 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>

          {/* Filter bar */}
          {!loading && !error && flatParts.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {/* Part filter */}
              <select
                value={String(partFilter)}
                onChange={(e) =>
                  setPartFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              >
                <option value="all">Tất cả Parts</option>
                <option value="1">Part 1</option>
                <option value="2">Part 2</option>
                <option value="3">Part 3</option>
                <option value="4">Part 4</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="done">Đã hoàn thành ({doneParts})</option>
                <option value="new">Chưa làm ({newParts})</option>
              </select>

              {/* Result count */}
              {(partFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
                <span className="text-sm text-slate-500">
                  {filteredParts.length} kết quả
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
        ) : filteredParts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Headphones size={36} />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Chưa có đề phù hợp</h2>
            <p className="mt-2 text-slate-600">
              {flatParts.length === 0
                ? 'Chưa có đề thi nào được thêm vào hệ thống.'
                : 'Hãy thử bỏ bộ lọc hoặc đổi từ khóa.'}
            </p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pagedParts.map((fp) => {
              const isDone = completedKeys.has(fp.key);

              return (
                <article
                  key={fp.key}
                  onClick={() =>
                    navigate(`/listening/ielts/${fp.testId}?part=${fp.partNumber}`)
                  }
                  className="group flex cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* Badges row */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                      <Headphones size={12} />
                      Listening
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Part {fp.partNumber}
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
                    <span className="text-red-600">— Part {fp.partNumber}</span>
                  </h3>

                  {/* Part subtitle */}
                  {fp.partTitle && (
                    <p className="mt-1 line-clamp-1 text-sm text-slate-500 italic">
                      {fp.partTitle}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="mt-4 space-y-2 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <HelpCircle size={16} className="text-red-500" />
                      <span>{fp.questionCount} Questions</span>
                    </div>
                    {fp.testCreatedAt && (
                      <div className="flex items-center gap-2">
                        <CalendarDays size={16} className="text-red-500" />
                        <span>{formatDate(fp.testCreatedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/listening/ielts/${fp.testId}?part=${fp.partNumber}`);
                    }}
                    className={`mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                      isDone
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
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
