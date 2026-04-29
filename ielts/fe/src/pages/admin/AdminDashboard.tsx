import { Users, BookOpen, DollarSign, BadgeCheck } from 'lucide-react';
import { useAdminDashboardStats } from '../../hooks/useAdminDashboardStats';

const moneyFormat = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);

export function AdminDashboard() {
  const { stats, isLoading } = useAdminDashboardStats();

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-white border border-slate-200">
        <p className="text-slate-500 font-medium">Đang tải dữ liệu dashboard...</p>
      </div>
    );
  }

  const cards = [
    {
      title: 'Tổng User',
      value: stats.totalUsers,
      icon: <Users className="h-8 w-8" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Số bài test đã làm',
      value: stats.totalTestsTaken,
      icon: <BookOpen className="h-8 w-8" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Doanh thu',
      value: moneyFormat(stats.totalRevenue),
      icon: <DollarSign className="h-8 w-8" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Subscriptions Active',
      value: stats.activeSubscriptions,
      icon: <BadgeCheck className="h-8 w-8" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const serviceRows = [
    { key: 'users', label: 'Auth / Users' },
    { key: 'billing', label: 'Billing' },
    { key: 'reading', label: 'Reading' },
    { key: 'listening', label: 'Listening' },
    { key: 'writing', label: 'Writing' },
    { key: 'speaking', label: 'Speaking' },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Tổng Quan</h2>
        <p className="text-slate-600 mt-2">Xem tổng quan các chỉ số quan trọng của hệ thống</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                {stat.icon}
              </div>
            </div>
            <p className="text-slate-600 text-sm font-medium mb-1">{stat.title}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Hoạt động hệ thống (theo kỹ năng)</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <p className="font-medium text-slate-900">Reading attempts</p>
              <span className="text-blue-600 font-semibold">{stats.bySkill.reading}</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <p className="font-medium text-slate-900">Listening attempts</p>
              <span className="text-emerald-600 font-semibold">{stats.bySkill.listening}</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <p className="font-medium text-slate-900">Writing submissions</p>
              <span className="text-amber-600 font-semibold">{stats.bySkill.writing}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-900">Speaking submissions</p>
              <span className="text-purple-600 font-semibold">{stats.bySkill.speaking}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Trạng thái service</h3>
          <div className="space-y-4">
            {serviceRows.map((service) => {
              const up = !!stats.serviceUp?.[service.key];
              return (
                <div key={service.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${up ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span className="font-medium text-slate-900">{service.label}</span>
                  </div>
                  <span className={`text-sm font-semibold ${up ? 'text-green-600' : 'text-yellow-600'}`}>
                    {up ? 'Hoạt động' : 'Tạm lỗi'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
