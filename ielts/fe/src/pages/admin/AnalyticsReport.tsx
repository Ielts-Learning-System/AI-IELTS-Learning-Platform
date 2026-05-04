import { useState } from 'react';
import {
  DollarSign, Users, TrendingDown, Cpu, Download, ArrowUpRight, ArrowDownRight,
  BarChart3, PieChart as PieIcon, Activity, Zap,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── Realistic Mock Data ────────────────────────────────────────────

/** 30-day MRR + New Users with weekend peaks */
const DAILY_DATA = (() => {
  const base = new Date('2026-04-05');
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const mrrBase = 42_000_000 + i * 380_000;
    const usersBase = 12 + Math.floor(i * 0.8);
    return {
      date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      mrr: mrrBase + (isWeekend ? 2_800_000 : 0) + Math.floor(Math.random() * 1_500_000),
      newUsers: usersBase + (isWeekend ? 8 : 0) + Math.floor(Math.random() * 5),
    };
  });
})();

const TOP_TESTS = [
  { name: 'Cambridge 15 Test 1', attempts: 1247 },
  { name: 'Actual Test 2024 Vol.1', attempts: 983 },
  { name: 'Cambridge 18 Test 3', attempts: 876 },
  { name: 'Cambridge 16 Test 2', attempts: 724 },
  { name: 'Cambridge 17 Test 4', attempts: 651 },
];

const SUB_DISTRIBUTION = [
  { name: 'Free', value: 4820, color: '#94a3b8' },
  { name: 'Plus', value: 1340, color: '#3b82f6' },
  { name: 'Pro', value: 580, color: '#E31837' },
];

const API_HEALTH = [
  { skill: 'Reading', tokensUsed: '2.4M', cost: '$18.20', errorRate: '0.12%', errors429: 3, status: 'healthy' },
  { skill: 'Listening', tokensUsed: '1.8M', cost: '$13.60', errorRate: '0.08%', errors429: 1, status: 'healthy' },
  { skill: 'Writing', tokensUsed: '5.1M', cost: '$38.70', errorRate: '0.31%', errors429: 12, status: 'warning' },
  { skill: 'Speaking', tokensUsed: '3.6M', cost: '$27.40', errorRate: '0.22%', errors429: 7, status: 'healthy' },
];

const QUICK_STATS = [
  {
    title: 'Doanh thu tháng',
    value: '₫53,400,000',
    change: '+12.4%',
    isUp: true,
    icon: DollarSign,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    title: 'Subscriptions Active',
    value: '1,920',
    change: '+8.2%',
    isUp: true,
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    title: 'Churn Rate',
    value: '3.2%',
    change: '-0.5%',
    isUp: false,
    icon: TrendingDown,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    title: 'API Costs (tháng)',
    value: '$97.90',
    change: '+5.1%',
    isUp: true,
    icon: Cpu,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
];

const formatVND = (value: number) =>
  new Intl.NumberFormat('vi-VN').format(value) + ' ₫';

// ─── Component ──────────────────────────────────────────────────────

export function AnalyticsReport() {
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = () => {
    setExporting(true);
    const headers = 'Date,MRR (VND),New Users\n';
    const rows = DAILY_DATA.map((d) => `${d.date},${d.mrr},${d.newUsers}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ielts_analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 1200);
  };

  const totalApiTokens = '12.9M';
  const totalApiCost = '$97.90';

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
            disabled={exporting}
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
              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${stat.isUp ? (stat.title === 'API Costs (tháng)' ? 'text-amber-600' : 'text-emerald-600') : 'text-emerald-600'}`}>
                {stat.isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {stat.change}
              </span>
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
            <LineChart data={DAILY_DATA} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              <BarChart data={TOP_TESTS} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
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
                <Pie data={SUB_DISTRIBUTION} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {SUB_DISTRIBUTION.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} formatter={(v: number) => [`${v.toLocaleString()} users`, 'Subscribers']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex items-center justify-center gap-5">
            {SUB_DISTRIBUTION.map((s) => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs font-medium text-slate-600">{s.name}: {s.value.toLocaleString()}</span>
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
              {API_HEALTH.map((row) => (
                <tr key={row.skill} className="border-b border-slate-100 transition hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.skill}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.tokensUsed}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.cost}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.errorRate}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      row.errors429 > 10 ? 'bg-red-100 text-red-700' : row.errors429 > 5 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {row.errors429}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                      row.status === 'healthy' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${row.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
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
