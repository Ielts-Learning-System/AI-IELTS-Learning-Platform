import { Outlet, Link, useLocation } from 'react-router-dom';
import { BookOpenCheck, PenTool, Mic, Users, LayoutDashboard, LogOut, Film, ChartColumnBig, FilePenLine } from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import logo from '../../assets/logo.png';

const teacherMenuItems = [
  { name: 'Lớp học của tôi', path: '/teacher', icon: LayoutDashboard },
  { name: 'Quản lý bài giảng', path: '/teacher/lessons', icon: Film },
  {
    name: 'Quản lý Đề R & L',
    path: '/teacher/tests',
    icon: BookOpenCheck,
    activePaths: ['/teacher/tests', '/teacher/reading', '/teacher/listening'],
  },
  { name: 'Quản lý Prompt Writing', path: '/teacher/writing-management', icon: FilePenLine },
  { name: 'Quản lý Prompt Speaking', path: '/teacher/speaking-management', icon: Mic },
  { name: 'Chấm Writing', path: '/teacher/writing', icon: PenTool },
  { name: 'Chấm Speaking', path: '/teacher/speaking', icon: Mic },
  { name: 'KQ Auto-Graded', path: '/teacher/auto-graded-results', icon: ChartColumnBig },
  { name: 'Quản lý học viên', path: '/teacher/students', icon: Users },
];

export function TeacherLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useUserStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-lg">
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <img src={logo} alt="IELTS Logo" className="h-8 w-auto" />
            <span className="text-lg font-bold">Teacher Panel</span>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {teacherMenuItems.map((item) => {
            const activePaths = item.activePaths || [item.path];
            const isActive = activePaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-700">
          <div className="mb-4 pb-4 border-b border-slate-700">
            <p className="text-sm text-slate-400">Đăng nhập là</p>
            <p className="font-semibold text-white">{user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">IELTS Teacher Dashboard</h1>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
