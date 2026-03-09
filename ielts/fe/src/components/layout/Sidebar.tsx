import { Headphones, BookOpen, PenTool, Mic, LayoutDashboard, History, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Listening', path: '/listening', icon: Headphones },
  { name: 'Reading', path: '/reading', icon: BookOpen },
  { name: 'Writing', path: '/writing', icon: PenTool },
  { name: 'Speaking', path: '/speaking', icon: Mic },
];

const bottomItems = [
  { name: 'Lịch sử thi', path: '/history', icon: History },
  { name: 'Cài đặt', path: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="flex w-64 flex-col border-r border-indigo-100 bg-slate-50/50 h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="space-y-1">
          <p className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Luyện tập
          </p>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                  isActive 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
                    : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-900"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-indigo-100" : "text-slate-400")} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-indigo-100">
        <div className="space-y-1">
          {bottomItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <item.icon className="h-5 w-5 text-slate-400" />
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
