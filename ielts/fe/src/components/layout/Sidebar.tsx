import { Headphones, BookOpen, PenTool, Mic, LayoutDashboard, History, Settings, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useState, useMemo } from 'react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: SubItem[];
}

interface SubItem {
  name: string;
  path: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Listening',
    path: '/listening',
    icon: Headphones,
    subItems: [
      { name: 'Bài tập IELTS', path: '/listening/ielts' },
      { name: 'Nghe chép chính tả', path: '/listening/dictation' },
    ],
  },
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
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Auto-expand Listening if pathname matches
  useMemo(() => {
    if (location.pathname.startsWith('/listening')) {
      setExpandedItem('Listening');
    } else {
      setExpandedItem(null);
    }
  }, [location.pathname]);

  const isSubItemActive = (subPath: string): boolean => {
    return location.pathname === subPath;
  };

  return (
    <aside className="flex w-64 flex-col border-r border-indigo-100 bg-slate-50/50 h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="space-y-1">
          <p className="px-4 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Luyện tập
          </p>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const isItemExpanded = expandedItem === item.name;
            const hasSubItems = item.subItems && item.subItems.length > 0;

            return (
              <div key={item.name}>
                <button
                  onClick={() => {
                    if (hasSubItems) {
                      setExpandedItem(isItemExpanded ? null : item.name);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-900'
                  )}
                >
                  <item.icon
                    className={cn('h-5 w-5', isActive ? 'text-indigo-100' : 'text-slate-400')}
                  />
                  <span className="flex-1 text-left">{item.name}</span>
                  {hasSubItems && (
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform',
                        isItemExpanded ? 'rotate-180' : ''
                      )}
                    />
                  )}
                </button>

                {/* Sub-menu items */}
                {hasSubItems && isItemExpanded && (
                  <div className="mt-2 ml-4 space-y-1 pl-3 border-l-2 border-indigo-200">
                    {item.subItems.map((subItem) => {
                      const isSubActive = isSubItemActive(subItem.path);
                      return (
                        <Link
                          key={subItem.path}
                          to={subItem.path}
                          className={cn(
                            'block rounded-lg px-3 py-2 text-sm font-medium transition-all',
                            isSubActive
                              ? 'bg-indigo-100 text-indigo-700 font-semibold'
                              : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-900'
                          )}
                        >
                          {subItem.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
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
