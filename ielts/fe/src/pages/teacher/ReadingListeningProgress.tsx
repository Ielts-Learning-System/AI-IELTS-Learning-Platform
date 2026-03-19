import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { LoaderCircle, Search } from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';

type ModuleType = 'Reading' | 'Listening';

interface AttemptRecord {
  _id: string;
  module: ModuleType;
  createdAt: string;
  rawScore: number;
  bandScore: number;
  timeSpent: number;
  studentId: string | { _id?: string; name?: string; fullName?: string };
  testId: string | { _id?: string; title?: string };
  studentName?: string;
}

const API_BASE = 'http://localhost:3000/api';

const getToken = (fallbackToken: string | null) =>
  fallbackToken || localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const mm = Math.floor(safe / 60)
    .toString()
    .padStart(2, '0');
  const ss = Math.floor(safe % 60)
    .toString()
    .padStart(2, '0');
  return `${mm}:${ss}`;
};

const getStudentName = (attempt: AttemptRecord) => {
  if (attempt.studentName) return attempt.studentName;
  if (typeof attempt.studentId === 'object') {
    return attempt.studentId.name || attempt.studentId.fullName || attempt.studentId._id || 'Unknown Student';
  }
  const text = String(attempt.studentId || '');
  return text ? `Student ${text.slice(-6).toUpperCase()}` : 'Unknown Student';
};

const getStudentId = (attempt: AttemptRecord) => {
  if (typeof attempt.studentId === 'object') {
    return String(attempt.studentId._id || '').trim();
  }

  return String(attempt.studentId || '').trim();
};

const getTestName = (attempt: AttemptRecord) => {
  if (typeof attempt.testId === 'object') {
    return attempt.testId.title || 'Untitled Test';
  }
  return 'Untitled Test';
};

export default function ReadingListeningProgress() {
  const { token } = useUserStore();
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<'All' | ModuleType>('All');

  useEffect(() => {
    const fetchAttempts = async () => {
      const authToken = getToken(token);
      if (!authToken) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [readingRes, listeningRes] = await Promise.all([
          axios.get(`${API_BASE}/reading/attempts`, {
            headers: { Authorization: `Bearer ${authToken}` },
          }),
          axios.get(`${API_BASE}/listening/attempts`, {
            headers: { Authorization: `Bearer ${authToken}` },
          }),
        ]);

        const readingList = (readingRes.data?.data ?? []).map((item: AttemptRecord) => ({
          ...item,
          module: 'Reading' as const,
        }));
        const listeningList = (listeningRes.data?.data ?? []).map((item: AttemptRecord) => ({
          ...item,
          module: 'Listening' as const,
        }));

        const merged = [...readingList, ...listeningList].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const studentIds = [...new Set(merged.map(getStudentId).filter(Boolean))];

        if (studentIds.length > 0) {
          try {
            const userLookupRes = await axios.post(
              `${API_BASE}/users/lookup`,
              { ids: studentIds },
              {
                headers: { Authorization: `Bearer ${authToken}` },
              }
            );

            const users = userLookupRes.data?.data ?? [];
            const userMap = new Map<string, string>();

            users.forEach((user: { _id?: string; name?: string; email?: string }) => {
              const id = String(user._id || '').trim();
              if (!id) return;
              const name = String(user.name || user.email || '').trim();
              if (name) {
                userMap.set(id, name);
              }
            });

            const enriched = merged.map((attempt) => {
              const studentId = getStudentId(attempt);
              const resolvedName = userMap.get(studentId);

              if (!resolvedName) {
                return attempt;
              }

              return {
                ...attempt,
                studentName: resolvedName,
              };
            });

            setAttempts(enriched);
            return;
          } catch (lookupError) {
            // Fallback to existing anonymous labels if user lookup fails.
            console.error('Failed to enrich student names from user service:', lookupError);
          }
        }

        setAttempts(merged);
      } catch (error) {
        console.error('Failed to fetch auto-graded attempts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttempts();
  }, [token]);

  const filteredAttempts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return attempts.filter((attempt) => {
      const byModule = moduleFilter === 'All' ? true : attempt.module === moduleFilter;
      if (!byModule) return false;

      if (!normalizedSearch) return true;

      const studentName = getStudentName(attempt).toLowerCase();
      return studentName.includes(normalizedSearch);
    });
  }, [attempts, moduleFilter, search]);

  return (
    <section className="space-y-6">
      <div className="rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_44%,#f8fafc_100%)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <h2 className="text-3xl font-black tracking-tight text-slate-900">Auto-Graded Results</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Theo dõi tiến độ bài Reading và Listening đã auto-grade của học viên theo thời gian thực.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-[220px_1fr]">
          <select
            value={moduleFilter}
            onChange={(event) => setModuleFilter(event.target.value as 'All' | ModuleType)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none ring-red-100 transition focus:border-red-300 focus:ring"
          >
            <option value="All">All Modules</option>
            <option value="Reading">Reading</option>
            <option value="Listening">Listening</option>
          </select>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by student name"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none ring-red-100 transition focus:border-red-300 focus:ring"
            />
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <div className="flex items-center gap-3 text-red-600">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              <span className="font-semibold">Đang tải dữ liệu...</span>
            </div>
          </div>
        ) : filteredAttempts.length === 0 ? (
          <div className="px-6 py-14 text-center text-slate-500">Không tìm thấy attempt nào phù hợp bộ lọc hiện tại.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Test</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Module</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Time Spent</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Band Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredAttempts.map((attempt) => (
                  <tr key={`${attempt.module}-${attempt._id}`} className="transition hover:bg-red-50/40">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                      {format(new Date(attempt.createdAt), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-800">
                      {getStudentName(attempt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{getTestName(attempt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          attempt.module === 'Reading'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {attempt.module}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      {formatDuration(attempt.timeSpent)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-black text-[#E31837]">
                      {Number(attempt.bandScore || 0).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}