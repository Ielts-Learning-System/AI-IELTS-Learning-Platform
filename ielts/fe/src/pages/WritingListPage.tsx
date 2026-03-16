import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Star, ArrowRight, PenLine, FileText } from 'lucide-react';
import axios from 'axios';

/* ------------------------------------------------------------------ */
/*  Types (mirrors MongoDB Writing schema)                             */
/* ------------------------------------------------------------------ */

type TaskType = 'Task 1' | 'Task 2';

interface SampleInfo {
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
  sampleInfo?: SampleInfo;
  tags: string[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type Tab = 'practice' | 'samples';
type Filter = 'All' | 'Task 1' | 'Task 2';

export default function WritingListPage() {
  const [items, setItems] = useState<WritingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('practice');
  const [filter, setFilter] = useState<Filter>('All');

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setIsLoading(true);
        const res = await axios.get<WritingItem[]>('http://localhost:3000/api/writing/items', {
          signal: controller.signal,
        });
        setItems(res.data);
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('Failed to fetch writing items:', err);
        }
      } finally {
        setIsLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'practice', label: 'Luyện tập' },
    { key: 'samples', label: 'Bài mẫu' },
  ];

  const filters: Filter[] = ['All', 'Task 1', 'Task 2'];

  /* ---------- derived / filtered data ---------- */
  const practiceItems = useMemo(
    () => items.filter((i) => !i.isSample && (filter === 'All' || i.type === filter)),
    [items, filter],
  );

  const sampleItems = useMemo(
    () => items.filter((i) => i.isSample && (filter === 'All' || i.type === filter)),
    [items, filter],
  );

  const visibleItems = activeTab === 'practice' ? practiceItems : sampleItems;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">IELTS Writing Hub</h1>
        <p className="mt-1 text-slate-500">Luyện viết và tham khảo bài mẫu chất lượng cao</p>
      </div>

      {/* ---- Tabs ---- */}
      <div className="flex gap-6 border-b border-slate-200">
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

      {/* ---- Filter pills ---- */}
      <div className="flex items-center gap-3">
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) =>
            item.isSample ? (
              <SampleCard key={item._id} item={item} />
            ) : (
              <PracticeCard key={item._id} item={item} />
            ),
          )}
        </div>
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
  return (
    <div className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
      <div className="flex-1 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <TaskBadge type={item.type} />
          <span className="rounded-full bg-amber-50 px-3 py-0.5 text-xs font-semibold text-amber-700">
            {item.sampleInfo?.author ?? 'IELTS Master'}
          </span>
        </div>
        <h3 className="mb-3 text-base font-bold text-slate-800 line-clamp-2">{item.title}</h3>
        {item.sampleInfo && (
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-lg font-bold text-amber-600">{item.sampleInfo.bandScore.toFixed(1)}</span>
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
