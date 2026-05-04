import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Star, ArrowRight, PenLine, FileText } from 'lucide-react';
import axios from 'axios';

/* ------------------------------------------------------------------ */
/*  Types (mirrors MongoDB Writing schema)                             */
/* ------------------------------------------------------------------ */

type TaskType = 'Task 1' | 'Task 2';

interface SampleInfoEntry {
  _id: string;
  bandScore: number;
  contentHtml: string;
  author: string;
}

interface WritingItem {
  _id: string;
  title: string;
  type: TaskType;
  category?: string;
  timeLimit: number;
  contentHtml: string;
  isSample: boolean;
  sampleInfos: SampleInfoEntry[];
  tags: string[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type Tab = 'practice' | 'samples';
type Filter = 'All' | 'Task 1' | 'Task 2';

// ── Pagination Component ──────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ← Trước
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-slate-400">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`h-9 w-9 rounded-xl text-sm font-semibold transition-colors ${
              currentPage === p
                ? 'bg-red-600 text-white shadow-sm shadow-red-200'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Tiếp →
      </button>
    </div>
  );
}

export default function WritingListPage() {
  const [items, setItems] = useState<WritingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('practice');
  const [filter, setFilter] = useState<Filter>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filter]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({ page: String(currentPage), limit: '6' });
        if (filter !== 'All') params.set('type', filter);
        const res = await axios.get<{ data: WritingItem[]; totalPages: number; currentPage: number; totalItems: number }>(
          `http://localhost:3000/api/writing/items?${params}`,
          { signal: controller.signal },
        );
        setItems(res.data.data);
        setTotalPages(res.data.totalPages);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('Failed to fetch writing items:', err);
        }
      } finally {
        setIsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [currentPage, filter]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'practice', label: 'Luyện tập' },
    { key: 'samples', label: 'Bài mẫu' },
  ];

  const filters: Filter[] = ['All', 'Task 1', 'Task 2'];

  /* ---------- derived / filtered data ---------- */
  // Backend already filters by type and paginates; split practice vs sample client-side
  const practiceItems = useMemo(
    () => items.filter((i) => activeTab === 'practice' ? true : false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );

  // A "sample" card = any writing that has at least one sampleInfo entry
  const sampleItems = useMemo(
    () => items.filter((i) => i.sampleInfos?.length > 0),
    [items],
  );

  const visibleItems = activeTab === 'practice' ? items : sampleItems;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* ---- Header ---- */}
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          IELTS Writing Hub
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">
          Luyện viết và tham khảo bài mẫu chất lượng cao
        </p>

        {/* Tabs */}
        <div className="mt-6 flex gap-6 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-red-600 text-red-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter pills */}
        <div className="mt-4 flex items-center gap-3">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-red-100 text-red-700 font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'All' ? 'Tất cả' : f}
            </button>
          ))}
        </div>
      </header>

      {/* ---- Loading skeleton ---- */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex gap-2">
                <div className="h-5 w-16 rounded-full bg-slate-200" />
                <div className="h-5 w-20 rounded-full bg-slate-200" />
              </div>
              <div className="mb-3 h-5 w-3/4 rounded bg-slate-200" />
              <div className="h-4 w-1/3 rounded bg-slate-200" />
              <div className="mt-4 flex gap-2">
                <div className="h-4 w-14 rounded bg-slate-100" />
                <div className="h-4 w-14 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Grid ---- */}
      {!isLoading && visibleItems.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item) =>
              item.isSample ? (
                <SampleCard key={item._id} item={item} />
              ) : (
                <PracticeCard key={item._id} item={item} />
              ),
            )}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* ---- Empty state ---- */}
      {!isLoading && visibleItems.length === 0 && (
        <div className="flex flex-col items-center py-20 text-slate-400">
          <FileText className="mb-4 h-12 w-12" />
          <p className="text-lg font-medium">Không có bài viết nào phù hợp</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Cards                                                              */
/* ------------------------------------------------------------------ */

function TaskBadge({ type }: { type: TaskType }) {
  const colors =
    type === 'Task 1'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-purple-100 text-purple-700';
  return <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${colors}`}>{type}</span>;
}

function PracticeCard({ item }: { item: WritingItem }) {
  return (
    <div className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="flex-1 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <TaskBadge type={item.type} />
          {item.category && (
            <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-500">
              {item.category}
            </span>
          )}
        </div>
        <h3 className="mb-3 text-base font-bold text-slate-800 line-clamp-2">{item.title}</h3>
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <Clock className="h-4 w-4" />
          <span>{item.timeLimit} phút</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded bg-slate-50 px-2 py-0.5 text-xs text-slate-400">#{tag}</span>
          ))}
        </div>
      </div>
      <Link
        to={`/writing/${item._id}`}
        className="flex items-center justify-center gap-2 border-t border-slate-100 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
      >
        <PenLine className="h-4 w-4" />
        Bắt đầu viết
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function SampleCard({ item }: { item: WritingItem }) {
  const samples = item.sampleInfos ?? [];
  const maxBand = samples.length > 0 ? Math.max(...samples.map((s) => s.bandScore)) : null;

  return (
    <div className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="flex-1 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <TaskBadge type={item.type} />
          <span className="rounded-full bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-700">
            {samples.length} bài mẫu
          </span>
        </div>
        <h3 className="mb-3 text-base font-bold text-slate-800 line-clamp-2">{item.title}</h3>
        {maxBand !== null && (
          <div className="flex flex-wrap items-center gap-2">
            {samples.map((s) => (
              <span
                key={s._id}
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-600"
              >
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                Band {s.bandScore.toFixed(1)}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <span key={tag} className="rounded bg-slate-50 px-2 py-0.5 text-xs text-slate-400">#{tag}</span>
          ))}
        </div>
      </div>
      <Link
        to={`/writing/${item._id}`}
        className="flex items-center justify-center gap-2 border-t border-slate-100 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
      >
        <FileText className="h-4 w-4" />
        Đọc bài mẫu
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
