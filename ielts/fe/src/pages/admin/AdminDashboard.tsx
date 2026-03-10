import { Users, BookOpen, DollarSign, UserCheck } from 'lucide-react';

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export function AdminDashboard() {
  const stats: StatCard[] = [
    {
      title: 'Tổng User',
      value: 1234,
      icon: <Users className="h-8 w-8" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Số bài test đã làm',
      value: 5678,
      icon: <BookOpen className="h-8 w-8" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Doanh thu',
      value: '$45,890',
      icon: <DollarSign className="h-8 w-8" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Giáo viên đang hoạt động',
      value: 42,
      icon: <UserCheck className="h-8 w-8" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Tổng Quan</h2>
        <p className="text-slate-600 mt-2">Xem tổng quan các chỉ số quan trọng của hệ thống</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
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

      {/* Additional Info Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Hoạt động gần đây</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-900">Người dùng mới</p>
                <p className="text-sm text-slate-600">3 đăng ký mới hôm nay</p>
              </div>
              <span className="text-blue-600 font-semibold">+3</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-900">Bài test hoàn thành</p>
                <p className="text-sm text-slate-600">45 bài test trong 24h qua</p>
              </div>
              <span className="text-green-600 font-semibold">+45</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Giao viên mới</p>
                <p className="text-sm text-slate-600">1 giáo viên tham gia</p>
              </div>
              <span className="text-purple-600 font-semibold">+1</span>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Trạng thái hệ thống</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-slate-900">API Gateway</span>
              </div>
              <span className="text-green-600 text-sm font-semibold">Hoạt động</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-slate-900">Database</span>
              </div>
              <span className="text-green-600 text-sm font-semibold">Hoạt động</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-slate-900">Auth Service</span>
              </div>
              <span className="text-green-600 text-sm font-semibold">Hoạt động</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="font-medium text-slate-900">Billing Service</span>
              </div>
              <span className="text-yellow-600 text-sm font-semibold">Cảnh báo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
