import { useEffect, useMemo, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { BookOpen, Trophy, Crown, UserCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api/client';

type HistoryItem = {
  id: string;
  title: string;
  skill: 'Reading' | 'Listening' | 'Writing' | 'Speaking';
  score: number | null;
  createdAt: string;
  link: string;
};

type SkillChartRow = {
  subject: string;
  A: number;
};

const SKILL_LABELS = ['Reading', 'Listening', 'Writing', 'Speaking'] as const;

const defaultChartData: SkillChartRow[] = SKILL_LABELS.map((skill) => ({ subject: skill, A: 0 }));

const toNumber = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const formatScore = (score: number | null) => (score == null ? 'N/A' : score.toFixed(1));

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('vi-VN');
};

/**
 * Normalize a plan code or raw plan name (from DB or JWT) to a Vietnamese display label.
 * Handles: "PRO", "IELTS_PRO_6M", "Gói Pro", "plus", "PLUS_3M", etc.
 */
const normalizePlanName = (raw: string): string => {
  if (!raw || raw === 'N/A') return 'N/A';
  const upper = raw.toUpperCase();
  if (upper === 'FREE' || upper.includes('FREE') || upper.includes('MIEN_PHI')) return 'Gói Miễn Phí';
  if (upper.includes('PRO')) return 'Gói Pro';
  if (upper.includes('PLUS')) return 'Gói Plus';
  if (upper.includes('BASIC')) return 'Gói Basic';
  // Return the raw value if no known pattern matched (e.g. a custom plan name from DB)
  return raw;
};

export default function StudentDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [planName, setPlanName] = useState('N/A');
  const [displayName, setDisplayName] = useState('Học viên');
  const [totalTests, setTotalTests] = useState(0);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [chartData, setChartData] = useState<SkillChartRow[]>(defaultChartData);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);

      try {
        const [profileRes, subscriptionRes, readingRes, listeningRes, writingRes, speakingRes] = await Promise.allSettled([
          apiClient.get('/auth/profile'),
          apiClient.get('/billing/my-subscription'),
          apiClient.get('/reading/my-attempts'),
          apiClient.get('/listening/my-attempts'),
          apiClient.get('/writing/submissions/my-submissions'),
          apiClient.get('/speaking/submissions/my-submissions'),
        ]);

        if (cancelled) return;

        const profile = profileRes.status === 'fulfilled' ? profileRes.value.data?.data : null;
        const subscriptionPayload = subscriptionRes.status === 'fulfilled' ? subscriptionRes.value.data : null;

        const readingAttempts =
          readingRes.status === 'fulfilled' ? toArray<any>(readingRes.value.data?.data) : [];
        const listeningAttempts =
          listeningRes.status === 'fulfilled' ? toArray<any>(listeningRes.value.data?.data) : [];
        const writingSubmissions =
          writingRes.status === 'fulfilled' ? toArray<any>(writingRes.value.data?.data) : [];
        const speakingSubmissions =
          speakingRes.status === 'fulfilled' ? toArray<any>(speakingRes.value.data?.data) : [];

        const subscriptionPlanName =
          subscriptionPayload?.data?.planId?.name ||
          subscriptionPayload?.planFallback?.name ||
          profile?.subscriptionPlan ||
          profile?.plan ||
          'N/A';

        const readingScores = readingAttempts.map((item) => toNumber(item?.bandScore)).filter((x): x is number => x != null);
        const listeningScores = listeningAttempts.map((item) => toNumber(item?.bandScore)).filter((x): x is number => x != null);
        const writingScores = writingSubmissions
          .filter((item) => String(item?.status || '').toLowerCase() === 'graded')
          .map((item) => toNumber(item?.grading?.overallBand))
          .filter((x): x is number => x != null);
        const speakingScores = speakingSubmissions
          .filter((item) => String(item?.status || '').toLowerCase() === 'graded')
          .map((item) => toNumber(item?.grading?.overallBand))
          .filter((x): x is number => x != null);

        const allScores = [...readingScores, ...listeningScores, ...writingScores, ...speakingScores];
        const averageOverall = allScores.length
          ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
          : null;

        const skillAverages: SkillChartRow[] = [
          {
            subject: 'Reading',
            A: readingScores.length ? Number((readingScores.reduce((s, v) => s + v, 0) / readingScores.length).toFixed(2)) : 0,
          },
          {
            subject: 'Listening',
            A: listeningScores.length ? Number((listeningScores.reduce((s, v) => s + v, 0) / listeningScores.length).toFixed(2)) : 0,
          },
          {
            subject: 'Writing',
            A: writingScores.length ? Number((writingScores.reduce((s, v) => s + v, 0) / writingScores.length).toFixed(2)) : 0,
          },
          {
            subject: 'Speaking',
            A: speakingScores.length ? Number((speakingScores.reduce((s, v) => s + v, 0) / speakingScores.length).toFixed(2)) : 0,
          },
        ];

        const history: HistoryItem[] = [
          ...readingAttempts.map((item) => ({
            id: String(item?._id || Math.random()),
            title: item?.testId?.title || 'Reading Test',
            skill: 'Reading' as const,
            score: toNumber(item?.bandScore),
            createdAt: item?.createdAt || '',
            link: '/history',
          })),
          ...listeningAttempts.map((item) => ({
            id: String(item?._id || Math.random()),
            title: item?.testId?.title || 'Listening Test',
            skill: 'Listening' as const,
            score: toNumber(item?.bandScore),
            createdAt: item?.createdAt || '',
            link: '/history',
          })),
          ...writingSubmissions.map((item) => ({
            id: String(item?._id || Math.random()),
            title: item?.writingId?.title || 'Writing Submission',
            skill: 'Writing' as const,
            score: toNumber(item?.grading?.overallBand),
            createdAt: item?.createdAt || item?.grading?.gradedAt || '',
            link: '/history',
          })),
          ...speakingSubmissions.map((item) => ({
            id: String(item?._id || Math.random()),
            title: item?.testId?.title || 'Speaking Submission',
            skill: 'Speaking' as const,
            score: toNumber(item?.grading?.overallBand),
            createdAt: item?.createdAt || item?.grading?.gradedAt || '',
            link: '/history',
          })),
        ]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 6);

        setDisplayName(profile?.name || 'Học viên');
        setPlanName(normalizePlanName(String(subscriptionPlanName)));
        setTotalTests(
          readingAttempts.length +
            listeningAttempts.length +
            writingSubmissions.length +
            speakingSubmissions.length
        );
        setAvgScore(averageOverall == null ? null : Number(averageOverall.toFixed(2)));
        setChartData(skillAverages);
        setRecentHistory(history);
      } catch {
        if (cancelled) return;
        setDisplayName('Học viên');
        setPlanName('N/A');
        setTotalTests(0);
        setAvgScore(null);
        setChartData(defaultChartData);
        setRecentHistory([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(
    () => [
      {
        label: 'Gói hiện tại',
        value: planName,
        icon: Crown,
        color: 'text-indigo-600',
        bg: 'bg-indigo-100',
      },
      {
        label: 'Số bài đã làm',
        value: String(totalTests),
        icon: BookOpen,
        color: 'text-red-600',
        bg: 'bg-red-100',
      },
      {
        label: 'Điểm trung bình',
        value: formatScore(avgScore),
        icon: Trophy,
        color: 'text-amber-600',
        bg: 'bg-amber-100',
      },
      {
        label: 'Học viên',
        value: displayName,
        icon: UserCircle2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-100',
      },
    ],
    [planName, totalTests, avgScore, displayName]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-white border border-slate-200">
        <p className="text-slate-500 font-medium">Đang tải dữ liệu dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-indigo-950">Tổng quan học tập</h1>
        <p className="text-slate-500 mt-1">Theo dõi tiến độ và lịch sử làm bài của bạn</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 truncate max-w-[180px]">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Phân tích kỹ năng (Band Score)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 9]} tick={{ fill: '#94a3b8' }} />
                <Radar name="Năng lực" dataKey="A" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800">Lịch sử gần đây</h2>
            <Link to="/history" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Xem tất cả</Link>
          </div>

          <div className="space-y-4">
            {recentHistory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
                Chưa có dữ liệu bài làm. Hãy bắt đầu một bài thi để theo dõi tiến độ.
              </div>
            ) : (
              recentHistory.map((item) => (
                <div key={item.id} className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                      <BookOpen className="h-5 w-5 text-slate-500 group-hover:text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 group-hover:text-indigo-900 truncate">{item.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{item.skill}</span>
                        <span>Band: {formatScore(item.score)}</span>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <Link to={item.link} className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 group-hover:border-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
