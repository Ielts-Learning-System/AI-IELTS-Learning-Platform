import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { mockDashboardStats } from '../mockData/exams';
import { BookOpen, Trophy, Target, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-indigo-950">Tổng quan năng lực</h1>
        <p className="text-slate-500 mt-1">Theo dõi tiến độ và phân tích kỹ năng của bạn</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Bài thi đã làm', value: '24', icon: BookOpen, color: 'text-red-600', bg: 'bg-red-100' },
          { label: 'Điểm trung bình', value: '7.0', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-100' },
          { label: 'Mục tiêu', value: '7.5', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Giờ học', value: '128h', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Phân tích kỹ năng (Band Score)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={mockDashboardStats}>
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
            <h2 className="text-lg font-bold text-slate-800">Đề xuất luyện tập</h2>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Xem tất cả</button>
          </div>
          
          <div className="space-y-4">
            {[
              { title: 'Cambridge IELTS 18 - Test 1', type: 'Full Test', time: '180 phút', link: '/exam/reading/read-001' },
              { title: 'Writing Task 2: Technology', type: 'Writing', time: '60 phút', link: '/exam/writing/write-001' },
              { title: 'Listening Section 3: Education', type: 'Listening', time: '40 phút', link: '/exam/listening/list-001' },
            ].map((item, i) => (
              <div key={i} className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                    <BookOpen className="h-5 w-5 text-slate-500 group-hover:text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 group-hover:text-indigo-900">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{item.type}</span>
                      <span className="text-xs text-slate-500">{item.time}</span>
                    </div>
                  </div>
                </div>
                <Link to={item.link} className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 group-hover:border-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
