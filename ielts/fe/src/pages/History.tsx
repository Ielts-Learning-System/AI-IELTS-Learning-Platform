import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  BookOpen,
  Headphones,
  Mic2,
} from 'lucide-react';
import { useUserStore } from '../store/useUserStore';

type SkillType = 'Reading' | 'Listening' | 'Writing' | 'Speaking';
type TabType = 'all' | 'reading' | 'listening' | 'writing' | 'speaking';
type CriteriaKey = 'TR' | 'CC' | 'LR' | 'GRA';

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

interface WritingRef {
  _id?: string;
  title?: string;
  type?: 'Task 1' | 'Task 2';
}

interface WritingSubmission {
  _id: string;
  writingId: string | WritingRef;
  taskType: 'Task 1' | 'Task 2';
  content: string;
  wordCount: number;
  status: 'Pending' | 'Graded';
  createdAt: string;
  grading?: GradingInfo;
}

interface SpeakingSubmission {
  _id: string;
  speakingId?: string;
  title?: string;
  status: 'Pending' | 'Graded';
  createdAt: string;
  grading?: GradingInfo;
}

interface ReadingTest {
  _id: string;
  title: string;
  score: number;
  totalScore: number;
  createdAt: string;
}

interface ListeningTest {
  _id: string;
  title: string;
  score: number;
  totalScore: number;
  createdAt: string;
}

interface UnifiedHistoryItem {
  id: string;
  skill: SkillType;
  title: string;
  date: string;
  status: 'Pending' | 'Graded';
  score?: number;
  totalScore?: number;
  bandScore?: number;
  grading?: GradingInfo;
  wordCount?: number;
  taskType?: string;
  content?: string;
  writingId?: string | WritingRef;
}

const API_BASE = 'http://localhost:3000/api';

const READING_API = `${API_BASE}/reading/history`;
const LISTENING_API = `${API_BASE}/listening/history`;
const WRITING_API = `${API_BASE}/writing/submissions/my-submissions`;
const SPEAKING_API = `${API_BASE}/speaking/submissions/my-submissions`;

const getToken = (fallbackToken: string | null) =>
  fallbackToken || localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

const criteriaMeta: Array<{ key: CriteriaKey; label: string; description: string }> = [
  { key: 'TR', label: 'Task Response', description: 'Mức độ trả lời đúng trọng tâm đề bài.' },
  { key: 'CC', label: 'Coherence & Cohesion', description: 'Tổ chức ý và liên kết đoạn văn.' },
  { key: 'LR', label: 'Lexical Resource', description: 'Độ đa dạng và chính xác của từ vựng.' },
  { key: 'GRA', label: 'Grammar Range & Accuracy', description: 'Phạm vi cấu trúc và độ chính xác ngữ pháp.' },
];

const skillIcons: Record<SkillType, typeof BookOpen> = {
  Reading: BookOpen,
  Listening: Headphones,
  Writing: FilePenLine,
  Speaking: Mic2,
};

const skillColors: Record<SkillType, { bg: string; text: string; border: string; badge: string }> = {
  Reading: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', badge: 'bg-blue-50 text-blue-700 border border-blue-200' },
  Listening: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', badge: 'bg-purple-50 text-purple-700 border border-purple-200' },
  Writing: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', badge: 'bg-red-50 text-red-700 border border-red-200' },
  Speaking: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
};

const statusBadgeMap = {
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  Graded: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

// Transform API responses to unified format
const transformReadingData = (items: ReadingTest[]): UnifiedHistoryItem[] =>
  (Array.isArray(items) ? items : []).map((item) => ({
    id: item._id,
    skill: 'Reading',
    title: item.title || 'Reading Test',
    date: item.createdAt,
    status: 'Graded',
    score: item.score,
    totalScore: item.totalScore,
  }));

const transformListeningData = (items: ListeningTest[]): UnifiedHistoryItem[] =>
  (Array.isArray(items) ? items : []).map((item) => ({
    id: item._id,
    skill: 'Listening',
    title: item.title || 'Listening Test',
    date: item.createdAt,
    status: 'Graded',
    score: item.score,
    totalScore: item.totalScore,
  }));

const transformWritingData = (items: WritingSubmission[]): UnifiedHistoryItem[] =>
  (Array.isArray(items) ? items : []).map((item) => ({
    id: item._id,
    skill: 'Writing',
    title: typeof item.writingId === 'string' ? 'Writing Prompt' : item.writingId?.title || 'Writing Prompt',
    date: item.createdAt,
    status: item.status,
    bandScore: item.grading?.overallBand,
    grading: item.grading,
    wordCount: item.wordCount,
    taskType: item.taskType,
    content: item.content,
    writingId: item.writingId,
  }));

const transformSpeakingData = (items: SpeakingSubmission[]): UnifiedHistoryItem[] =>
  (Array.isArray(items) ? items : []).map((item) => ({
    id: item._id,
    skill: 'Speaking',
    title: item.title || 'Speaking Prompt',
    date: item.createdAt,
    status: item.status,
    bandScore: item.grading?.overallBand,
    grading: item.grading,
  }));

const TAB_CONFIG: Array<{ id: TabType; label: string; skill?: SkillType }> = [
  { id: 'all', label: 'Tất cả' },
  { id: 'reading', label: 'Reading', skill: 'Reading' },
  { id: 'listening', label: 'Listening', skill: 'Listening' },
  { id: 'writing', label: 'Writing', skill: 'Writing' },
  { id: 'speaking', label: 'Speaking', skill: 'Speaking' },
];

interface FetchResult {
  status: 'fulfilled' | 'rejected';
  value?: UnifiedHistoryItem[];
  reason?: any;
}

export default function MySkillsHistory() {
  const { token } = useUserStore();
  const navigate = useNavigate();
  const [allItems, setAllItems] = useState<UnifiedHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedItem, setSelectedItem] = useState<UnifiedHistoryItem | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchAllSkills = async () => {
      if (!getToken(token)) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const authHeader = {
          Authorization: `Bearer ${getToken(token)}`,
        };

        const results = await Promise.allSettled([
          axios.get(READING_API, { signal: controller.signal, headers: authHeader }),
          axios.get(LISTENING_API, { signal: controller.signal, headers: authHeader }),
          axios.get(WRITING_API, { signal: controller.signal, headers: authHeader }),
          axios.get(SPEAKING_API, { signal: controller.signal, headers: authHeader }),
        ]);

        const items: UnifiedHistoryItem[] = [];

        // Process reading
        if (results[0].status === 'fulfilled') {
          const payload = results[0].value?.data?.data ?? results[0].value?.data ?? [];
          items.push(...transformReadingData(payload));
        } else if (results[0].status === 'rejected') {
          console.warn('Failed to fetch reading history:', results[0].reason);
        }

        // Process listening
        if (results[1].status === 'fulfilled') {
          const payload = results[1].value?.data?.data ?? results[1].value?.data ?? [];
          items.push(...transformListeningData(payload));
        } else if (results[1].status === 'rejected') {
          console.warn('Failed to fetch listening history:', results[1].reason);
        }

        // Process writing
        if (results[2].status === 'fulfilled') {
          const payload = results[2].value?.data?.data ?? results[2].value?.data ?? [];
          items.push(...transformWritingData(payload));
        } else if (results[2].status === 'rejected') {
          console.warn('Failed to fetch writing history:', results[2].reason);
        }

        // Process speaking
        if (results[3].status === 'fulfilled') {
          const payload = results[3].value?.data?.data ?? results[3].value?.data ?? [];
          items.push(...transformSpeakingData(payload));
        } else if (results[3].status === 'rejected') {
          console.warn('Failed to fetch speaking history:', results[3].reason);
        }

        // Sort by date descending
        items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllItems(items);
      } catch (error: any) {
        if (!axios.isCancel(error)) {
          console.error('Failed to fetch history:', error);
          toast.error('Không thể tải lịch sử kỹ năng.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllSkills();
    return () => controller.abort();
  }, [token]);

  // Filter items based on active tab
  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return allItems;
    const skillMap: Record<Exclude<TabType, 'all'>, SkillType> = {
      reading: 'Reading',
      listening: 'Listening',
      writing: 'Writing',
      speaking: 'Speaking',
    };
    return allItems.filter((item) => item.skill === skillMap[activeTab]);
  }, [allItems, activeTab]);

  // Calculate counts per skill
  const skillCounts = useMemo(() => {
    return {
      all: allItems.length,
      reading: allItems.filter((item) => item.skill === 'Reading').length,
      listening: allItems.filter((item) => item.skill === 'Listening').length,
      writing: allItems.filter((item) => item.skill === 'Writing').length,
      speaking: allItems.filter((item) => item.skill === 'Speaking').length,
    };
  }, [allItems]);

  const gradedCount = useMemo(() => filteredItems.filter((item) => item.status === 'Graded').length, [filteredItems]);

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#f8f9fA_0%,#ffffff_45%,#f5f7fb_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-white/85 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          {/* Left: title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
              <ClipboardList className="h-3.5 w-3.5" />
              Learning history
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Lịch sử học tập</h1>
            <p className="max-w-xl text-sm leading-6 text-slate-500">
              Xem chi tiết kết quả của bạn trên tất cả các kỹ năng: Reading, Listening, Writing, và Speaking.
            </p>
          </div>

          {/* Right: stats */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-[20px] border border-slate-200 bg-white px-5 py-3 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Tổng số</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{skillCounts.all}</p>
            </div>
            <div className="rounded-[20px] border border-emerald-100 bg-emerald-50 px-5 py-3 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Đã chấm</p>
              <p className="mt-1 text-2xl font-black text-emerald-900">{gradedCount}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex overflow-x-auto">
            {TAB_CONFIG.map((tab) => {
              const count = skillCounts[tab.id];
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap border-b-2 px-4 py-4 text-sm font-bold transition ${isActive
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {tab.label} <span className="ml-2 text-xs text-slate-400">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white px-4 py-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-[24px] border border-slate-100 bg-slate-50/40">
              <div className="flex items-center gap-3 text-slate-600">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                <span className="font-semibold">Đang tải lịch sử...</span>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-[linear-gradient(180deg,#f8f9fa_0%,#ffffff_100%)] px-6 text-center">
              <FilePenLine className="mb-4 h-10 w-10 text-slate-400" />
              <p className="text-lg font-bold text-slate-900">Bạn chưa có bài làm nào cho kỹ năng này</p>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Hoàn thành một bài test để xem kết quả trong phần lịch sử này.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] bg-white">
                  <thead>
                    <tr className="bg-slate-50/70 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-5 py-4 font-semibold">Kỹ Năng</th>
                      <th className="px-5 py-4 font-semibold">Tiêu Đề</th>
                      <th className="px-5 py-4 font-semibold whitespace-nowrap">Ngày Làm</th>
                      <th className="px-5 py-4 font-semibold">Trạng Thái</th>
                      <th className="px-5 py-4 font-semibold text-right">Kết Quả</th>
                      <th className="px-5 py-4 font-semibold text-center w-14"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const Icon = skillIcons[item.skill];
                      const colors = skillColors[item.skill];
                      return (
                        <tr key={item.id} className="border-t border-slate-100 transition hover:bg-slate-50/30">

                          {/* Kỹ năng */}
                          <td className="px-5 py-4 align-middle">
                            <div className={`inline-flex items-center gap-2 rounded-full ${colors.badge} px-3 py-1 text-xs font-bold whitespace-nowrap`}>
                              <Icon className="h-3.5 w-3.5" />
                              {item.skill}
                            </div>
                          </td>

                          {/* Tiêu đề — taskType & wordCount cùng dòng */}
                          <td className="px-5 py-4 align-middle">
                            <p className="font-bold text-slate-900 leading-snug">{item.title}</p>
                            {(item.taskType || item.wordCount) && (
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                                {item.taskType && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">{item.taskType}</span>}
                                {item.wordCount && <span>{item.wordCount} từ</span>}
                              </div>
                            )}
                          </td>

                          {/* Ngày */}
                          <td className="px-5 py-4 align-middle text-sm text-slate-500 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                              {format(new Date(item.date), 'dd/MM/yyyy HH:mm')}
                            </div>
                          </td>

                          {/* Trạng thái */}
                          <td className="px-5 py-4 align-middle">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusBadgeMap[item.status]}`}>
                              {item.status === 'Pending' ? 'Chờ chấm' : 'Đã chấm'}
                            </span>
                          </td>

                          {/* Kết quả */}
                          <td className="px-5 py-4 align-middle text-right font-bold text-slate-900">
                            {item.skill === 'Reading' || item.skill === 'Listening' ? (
                              <span>{item.score ?? '-'}&nbsp;/&nbsp;{item.totalScore ?? '-'}</span>
                            ) : (
                              <span className="text-[#E31837]">
                                {item.bandScore != null ? item.bandScore.toFixed(1) : '—'}
                              </span>
                            )}
                          </td>

                          {/* Hành động — icon only */}
                          <td className="px-5 py-4 align-middle text-center">
                            {item.status === 'Graded' && (item.grading || item.skill === 'Reading' || item.skill === 'Listening') ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/history/writing/${item.id}`)}
                                title="Xem nhận xét"
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                              >
                                <MessageSquareQuote className="h-4 w-4" />
                              </button>
                            ) : (
                              <span className="text-slate-300 select-none">—</span>
                            )}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedItem && <DetailsModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </section>
  );
}

interface DetailsModalProps {
  item: UnifiedHistoryItem;
  onClose: () => void;
}

function DetailsModal({ item, onClose }: DetailsModalProps) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const colors = skillColors[item.skill];
  const Icon = skillIcons[item.skill];

  // For Writing and Speaking with grading
  if ((item.skill === 'Writing' || item.skill === 'Speaking') && item.grading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className="relative max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_32px_120px_rgba(15,23,42,0.28)]">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 z-10 rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="grid max-h-[92vh] grid-cols-1 overflow-y-auto lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left side - Content */}
            <div className={`border-b ${colors.border} bg-gradient-to-b from-white/60 to-white p-6 lg:border-b-0 lg:border-r lg:p-8`}>
              <div className="mb-6 flex items-center gap-3">
                <div className={`rounded-2xl ${colors.bg} ${colors.text} p-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${colors.text}`}>{item.skill}</p>
                  <h2 className="text-2xl font-black text-slate-900">{item.title}</h2>
                </div>
              </div>

              <div className="mb-5 flex flex-wrap gap-3 text-sm text-slate-500">
                <span className={`inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm ring-1 ${colors.border}`}>
                  <CalendarDays className="h-4 w-4" />
                  {format(new Date(item.date), 'dd/MM/yyyy HH:mm')}
                </span>
                {item.taskType && (
                  <span className={`inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm ring-1 ${colors.border}`}>
                    <Circle className={`h-4 w-4 fill-current text-slate-400`} />
                    {item.taskType}
                  </span>
                )}
                {item.wordCount && (
                  <span className={`inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm ring-1 ${colors.border}`}>
                    <Circle className={`h-4 w-4 fill-current text-slate-400`} />
                    {item.wordCount} từ
                  </span>
                )}
              </div>

              <div className={`rounded-[28px] border ${colors.border} bg-white p-5 shadow-sm`}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Bài làm của học viên</p>
                <div className="max-h-[52vh] overflow-y-auto whitespace-pre-wrap text-[15px] leading-8 text-slate-700">
                  {item.content || 'Không có nội dung để hiển thị'}
                </div>
              </div>
            </div>

            {/* Right side - Grading */}
            <div className="space-y-6 bg-white p-6 lg:p-8">
              <div className={`rounded-[28px] border ${colors.border} bg-gradient-to-b from-white/40 to-white p-6 text-center shadow-sm`}>
                <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${colors.text}`}>Overall Band</p>
                <div className={`mx-auto mt-5 flex h-36 w-36 items-center justify-center rounded-full border-[10px] ${colors.border} bg-white shadow-inner`}>
                  <span className={`text-5xl font-black tracking-tight text-red-600`}>
                    {item.grading.overallBand.toFixed(1)}
                  </span>
                </div>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã chấm xong
                </div>
              </div>

              <div className={`rounded-[28px] border ${colors.border} bg-white p-5 shadow-sm`}>
                <div className={`mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] ${colors.text}`}>
                  <MessageSquareQuote className="h-4 w-4" />
                  Teacher Feedback
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {item.grading.teacherFeedback || 'Giáo viên chưa để lại nhận xét chi tiết.'}
                </p>
              </div>

              <div className="grid gap-4">
                {criteriaMeta.map((criterion) => (
                  <div
                    key={criterion.key}
                    className={`rounded-[24px] border ${colors.border} bg-gradient-to-br from-white to-white/50 px-5 py-4 shadow-sm`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{criterion.key}</p>
                        <p className="mt-1 text-sm text-slate-500">{criterion.label}</p>
                        <p className="mt-2 text-xs leading-5 text-slate-400">{criterion.description}</p>
                      </div>
                      <div className={`rounded-2xl ${colors.bg} px-4 py-3 text-right`}>
                        <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${colors.text}`}>Score</p>
                        <p className="mt-1 text-2xl font-black text-red-600">
                          {item.grading.criteria[criterion.key].toFixed(1)}
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

  // For Reading and Listening
  if ((item.skill === 'Reading' || item.skill === 'Listening') && item.score !== undefined) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className="relative max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_32px_120px_rgba(15,23,42,0.28)]">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 z-10 rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className={`border-b ${colors.border} bg-gradient-to-b from-white/60 to-white p-6 lg:p-8`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`rounded-2xl ${colors.bg} ${colors.text} p-3`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${colors.text}`}>{item.skill}</p>
                    <h2 className="text-2xl font-black text-slate-900">{item.title}</h2>
                  </div>
                </div>
                <div className={`rounded-[24px] ${colors.bg} px-6 py-4 text-center`}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${colors.text}`}>Your Score</p>
                  <p className={`mt-2 text-3xl font-black ${colors.text}`}>
                    {item.score} / {item.totalScore}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-500">
                <span className={`inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm ring-1 ${colors.border}`}>
                  <CalendarDays className="h-4 w-4" />
                  {format(new Date(item.date), 'dd/MM/yyyy HH:mm')}
                </span>
                <span className={`inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm ring-1 ${colors.border}`}>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Đã chấm
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 lg:p-8">
              <div className={`rounded-[28px] border ${colors.border} bg-white p-6 shadow-sm`}>
                <p className={`mb-4 text-sm font-bold ${colors.text} uppercase tracking-[0.18em]`}>Test Details</p>
                <div className="space-y-4 text-sm text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-900">Score Breakdown:</span> You answered{' '}
                    <span className="font-bold text-emerald-600">{item.score}</span> out of{' '}
                    <span className="font-bold">{item.totalScore}</span> questions correctly.
                  </p>
                  <p className="text-slate-500">
                    {item.skill === 'Reading' &&
                      'Review the passages and questions to identify areas for improvement in vocabulary, comprehension, and critical reading skills.'}
                    {item.skill === 'Listening' &&
                      'Listen to the audio recordings again and review your answers to improve listening comprehension and note-taking abilities.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}