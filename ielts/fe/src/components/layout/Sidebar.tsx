import {
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  LayoutDashboard,
  History,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useEffect, useState, type ComponentType } from 'react';

interface NavItem {
  name: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
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

  useEffect(() => {
    if (location.pathname.startsWith('/listening')) {
      setExpandedItem('Listening');
    } else {
      setExpandedItem(null);
    }
  }, [location.pathname]);

  const isSubItemActive = (subPath: string): boolean => location.pathname === subPath;

  return (
    <aside className="flex h-[calc(100vh-4rem)] w-64 flex-col border-r border-red-100 bg-white">
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="space-y-1">
          <p className="mb-4 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Luyện tập
          </p>

          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const isItemExpanded = expandedItem === item.name;
            const hasSubItems = Boolean(item.subItems?.length);

            const baseClasses = cn(
              'w-full rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300',
              'flex items-center gap-3',
              'hover:translate-x-1 hover:shadow-sm',
              isActive
                ? 'bg-[#E31837] text-white shadow-md shadow-red-200/70'
                : 'text-slate-700 hover:bg-red-50 hover:text-[#E31837]'
            );

            const navContent = (
              <>
                <item.icon
                  className={cn(
                    'h-5 w-5 transition-colors duration-300',
                    isActive ? 'text-white' : 'text-slate-400'
                  )}
                />
                <span className="flex-1 text-left">{item.name}</span>
                {hasSubItems && (
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform duration-300',
                      isItemExpanded ? 'rotate-180' : 'rotate-0'
                    )}
                  />
                )}
              </>
            );

            return (
              <div key={item.name} className="space-y-2">
                {hasSubItems ? (
                  <button
                    type="button"
                    onClick={() => setExpandedItem(isItemExpanded ? null : item.name)}
                    className={baseClasses}
                    aria-expanded={isItemExpanded}
                    aria-controls={`submenu-${item.name}`}
                  >
                    {navContent}
                  </button>
                ) : (
                  <Link to={item.path} className={baseClasses}>
                    {navContent}
                  </Link>
                )}

                {hasSubItems && (
                  <div
                    id={`submenu-${item.name}`}
                    className={cn(
                      'ml-4 overflow-hidden border-l-2 border-red-100 pl-3 transition-all duration-300 ease-out',
                      isItemExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                    )}
                  >
                    <div className="space-y-1 pb-1 pt-1">
                      {item.subItems?.map((subItem) => {
                        const isSubActive = isSubItemActive(subItem.path);

                        return (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            className={cn(
                              'block rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300',
                              'hover:translate-x-1',
                              isSubActive
                                ? 'bg-red-50 text-[#E31837] shadow-sm'
                                : 'text-slate-600 hover:bg-red-50 hover:text-[#E31837]'
                            )}
                          >
                            {subItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-red-100 p-4">
        <div className="space-y-1">
          {bottomItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-300 hover:translate-x-1 hover:bg-red-50 hover:text-[#E31837]"
            >
              <item.icon className="h-5 w-5 text-slate-400 transition-colors duration-300" />
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
