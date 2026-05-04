import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Users, TrendingDown, Cpu, Download,
  BarChart3, PieChart as PieIcon, Activity, Zap,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { apiClient } from '../../lib/api/client';

// ─── Types ──────────────────────────────────────────────────────────

interface DailyDataPoint {
  date: string;
  mrr: number;
  newUsers: number;
}

interface TopTest {
  name: string;
  attempts: number;
}

interface SubDistributionItem {
  name: string;
  value: number;
}

interface ApiHealthRow {
  skill: string;
  tokensUsed: string;
  cost: string;
  errorRate: string;
  errors429: number;
  status: 'healthy' | 'warning';
}

interface DashboardData {
  quickStats: {
    monthlyRevenue: number;
    activeSubscriptions: number;
    churnRate: number;
    apiCostUSD: number;
  };
  dailyData: DailyDataPoint[];
  topTests: TopTest[];
  subDistribution: SubDistributionItem[];
  apiHealth: ApiHealthRow[];
  totalApiTokens: string;
  totalApiCost: string;
}

// ─── Static config ───────────────────────────────────────────────────

/** Per-plan accent colours for the Pie chart. */
const SUB_COLORS: Record<string, string> = {
  Free: '#94a3b8',
  Plus: '#3b82f6',
  Pro: '#E31837',
};

const formatVND = (value: number) =>
  new Intl.NumberFormat('vi-VN').format(value) + ' ₫';

// ─── Skeleton loader ─────────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <section className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex justify-between mb-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-5 w-14" />
            </div>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-8 w-36" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <Skeleton className="h-6 w-64 mb-5" />
        <Skeleton className="h-[340px] w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <Skeleton className="h-6 w-48 mb-5" />
            <Skeleton className="h-[280px] w-full" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <Skeleton className="h-6 w-72 mb-5" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full mb-2" />
        ))}
      </div>
    </section>
  );
}

// ─── Component ───────────────────────────────────────────────────────

export function AnalyticsReport() {
  const [data, setData]         = useState<DashboardData | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: DashboardData }>(
        '/reports/dashboard'
      );
      setData(res.data.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Không thể tải dữ liệu báo cáo';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleExportCSV = () => {
    if (!data) return;
    setExporting(true);
    const headers = 'Date,MRR (VND),New Users\n';
    const rows = data.dailyData.map((d) => `${d.date},${d.mrr},${d.newUsers}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ielts_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 1200);
  };

  // ── Render states ────────────────────────────────────────────────
  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <section className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-lg font-semibold text-slate-700">{error}</p>
        <button
          onClick={fetchDashboard}
          className="rounded-xl bg-[#E31837] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#c91530] transition"
        >
          Thử lại
        </button>
      </section>
    );
  }

  if (!data) return null;

  const { quickStats, dailyData, topTests, subDistribution, apiHealth, totalApiTokens, totalApiCost } = data;

  // Build quick-stat cards from live API response
  const QUICK_STATS = [
    {
      title: 'Doanh thu tháng',
      value: formatVND(quickStats.monthlyRevenue),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Subscriptions Active',
      value: quickStats.activeSubscriptions.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Churn Rate',
      value: `${quickStats.churnRate}%`,
      icon: TrendingDown,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'API Costs (tháng)',
      value: `$${quickStats.apiCostUSD.toFixed(2)}`,
      icon: Cpu,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Báo cáo phân tích</h2>
            <p className="mt-1 text-sm text-slate-500">Dữ liệu 30 ngày gần nhất · Cập nhật tự động mỗi 6 giờ</p>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={exporting || !data}
            className="inline-flex items-center gap-2 rounded-xl bg-[#E31837] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c91530] disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Đang xuất...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Section 1: Quick Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {QUICK_STATS.map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`${stat.bg} ${stat.color} flex h-10 w-10 items-center justify-center rounded-lg`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.title}</p>
            <p className="mt-0.5 text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Section 2: MRR + New Users Line Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Activity className="h-5 w-5 text-[#E31837]" />
          <h3 className="text-lg font-bold text-slate-900">MRR & Người dùng mới — 30 ngày</h3>
        </div>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval={4} />
              <YAxis yAxisId="mrr" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(0)}M`} />
              <YAxis yAxisId="users" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                formatter={(value: number, name: string) => [
                  name === 'mrr' ? formatVND(value) : value,
                  name === 'mrr' ? 'MRR' : 'Người dùng mới',
                ]}
              />
              <Legend verticalAlign="top" height={36} formatter={(v: string) => (v === 'mrr' ? 'MRR (₫)' : 'Người dùng mới')} />
              <Line yAxisId="mrr" type="monotone" dataKey="mrr" stroke="#E31837" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Line yAxisId="users" type="monotone" dataKey="newUsers" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Section 3: Bar + Pie */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar: Top 5 Tests */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900">Top 5 đề thi được luyện nhiều nhất</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTests} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} width={160} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} formatter={(v: number) => [`${v.toLocaleString()} lượt`, 'Lượt luyện']} />
                <Bar dataKey="attempts" fill="#E31837" radius={[0, 6, 6, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie: Subscription Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <PieIcon className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-bold text-slate-900">Phân bố gói đăng ký</h3>
          </div>
          <div className="h-[280px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {subDistribution.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={SUB_COLORS[entry.name] ?? '#94a3b8'}
                      stroke="white"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                  formatter={(v: number) => [`${v.toLocaleString()} users`, 'Subscribers']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-center gap-5">
            {subDistribution.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: SUB_COLORS[s.name] ?? '#94a3b8' }}
                />
                <span className="text-xs font-medium text-slate-600">
                  {s.name}: {s.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 4: AI & System Health */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-900">Google Gemini API — Sức khỏe hệ thống</h3>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span>Tổng tokens: <strong className="text-slate-900">{totalApiTokens}</strong></span>
            <span>Tổng cost: <strong className="text-slate-900">{totalApiCost}</strong></span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-3 px-4 font-semibold">Skill</th>
                <th className="py-3 px-4 font-semibold">Tokens Used</th>
                <th className="py-3 px-4 font-semibold">Cost</th>
                <th className="py-3 px-4 font-semibold">Error Rate</th>
                <th className="py-3 px-4 font-semibold">429 Errors</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {apiHealth.map((row) => (
                <tr key={row.skill} className="border-b border-slate-100 transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.skill}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.tokensUsed}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.cost}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.errorRate}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      row.errors429 > 10 ? 'bg-red-100 text-red-700'
                        : row.errors429 > 5 ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {row.errors429}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      row.status === 'healthy'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        row.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} />
                      {row.status === 'healthy' ? 'Healthy' : 'Warning'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
