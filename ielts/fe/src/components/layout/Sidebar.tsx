/**
 * @file Sidebar.tsx
 * @description Sidebar điều hướng với kiểm soát quyền truy cập theo gói cước.
 *
 * Logic điều hướng:
 *   - User có gói PRO hoặc skill của menu item nằm trong allowedSkills → router.push()
 *   - User KHÔNG có quyền → mở UpgradeModal (không chuyển trang)
 *
 * Nguồn quyền (Single Source of Truth): hook useAllowedSkills → API billing-service
 */

import { useEffect, useState, type ComponentType } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  Film,
  LayoutDashboard,
  History,
  Settings,
  ChevronDown,
  Lock,
  Crown,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUserStore } from '../../store/useUserStore';
import { useAllowedSkills, type Skill } from '../../hooks/useAllowedSkills';
import CheckoutModal from '../CheckoutModal';

// ─────────────────────────────────────────────────────────────────
// Kiểu dữ liệu
// ─────────────────────────────────────────────────────────────────

interface NavItem {
  name: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  /** Skill tương ứng — undefined = không cần kiểm tra quyền (Dashboard, History...) */
  skill?: Skill;
  subItems?: SubItem[];
}

interface SubItem {
  name: string;
  path: string;
  /** Kế thừa skill từ parent nếu không khai báo */
  skill?: Skill;
}

// ─────────────────────────────────────────────────────────────────
// Cấu hình menu — khai báo skill tương ứng với từng item
// ─────────────────────────────────────────────────────────────────

const navItems: NavItem[] = [
  // Dashboard — không cần quyền đặc biệt
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Listening',
    path: '/listening',
    icon: Headphones,
    skill: 'listening',
    subItems: [
      { name: 'Bài tập IELTS', path: '/listening/ielts' },
      { name: 'Nghe chép chính tả', path: '/listening/dictation' },
    ],
  },
  { name: 'Reading', path: '/reading', icon: BookOpen, skill: 'reading' },
  { name: 'Writing', path: '/writing', icon: PenTool, skill: 'writing' },
  { name: 'Speaking', path: '/speaking', icon: Mic, skill: 'speaking' },
  // Lessons — chỉ PRO (không có skill riêng, dùng isPro)
  { name: 'Lessons', path: '/lessons', icon: Film },
];

const bottomItems = [
  { name: 'Lịch sử thi', path: '/history', icon: History },
  { name: 'Cài đặt', path: '/settings', icon: Settings },
];

// ─────────────────────────────────────────────────────────────────
// Component UpgradeModal
// ─────────────────────────────────────────────────────────────────

interface UpgradeModalProps {
  isOpen: boolean;
  featureName: string;
  onClose: () => void;
  onUpgrade: () => void;
}

function UpgradeModal({ isOpen, featureName, onClose, onUpgrade }: UpgradeModalProps) {
  // Đóng modal khi nhấn Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    /* Backdrop — click outside để đóng */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Overlay tối mờ */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal card */}
      <div
        className={cn(
          'relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200',
          'overflow-hidden'
        )}
        onClick={(e) => e.stopPropagation()} // Ngăn đóng khi click vào card
      >
        {/* Header với gradient */}
        <div className="relative bg-gradient-to-br from-[#E31837] to-[#ff6b35] p-6 pb-8">
          {/* Nút đóng */}
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="absolute right-4 top-4 rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Icon */}
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Crown className="h-8 w-8 text-yellow-300" />
            </div>
          </div>
        </div>

        {/* Badge giao thoa header/body */}
        <div className="relative -mt-4 flex justify-center">
          <span className="rounded-full bg-amber-100 px-4 py-1 text-xs font-semibold text-amber-700 shadow-sm ring-2 ring-white">
            Tính năng cao cấp
          </span>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-4 text-center">
          <h2
            id="upgrade-modal-title"
            className="mt-2 text-xl font-bold text-slate-800"
          >
            Mở khóa{' '}
            <span className="text-[#E31837]">{featureName}</span>
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Tính năng này yêu cầu nâng cấp gói cước. Hãy nâng cấp để
            trải nghiệm toàn bộ nội dung luyện thi IELTS chất lượng cao.
          </p>

          {/* Lợi ích nhanh */}
          <ul className="mt-4 space-y-1.5 text-left">
            {[
              'Truy cập không giới hạn Writing & Speaking',
              'Video bài giảng độc quyền',
              'Chấm bài AI tức thì',
            ].map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm text-slate-600">
                <Zap className="h-4 w-4 flex-shrink-0 text-amber-500" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer — actions */}
        <div className="flex gap-3 border-t border-slate-100 p-4">
          <button
            id="upgrade-modal-cancel-btn"
            onClick={onClose}
            className={cn(
              'flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium',
              'text-slate-600 transition-all duration-200 hover:bg-slate-50'
            )}
          >
            Để sau
          </button>
          <button
            id="upgrade-modal-confirm-btn"
            onClick={onUpgrade}
            className={cn(
              'flex-1 rounded-xl py-2.5 text-sm font-bold text-white',
              'bg-gradient-to-r from-[#E31837] to-[#ff4e1a]',
              'shadow-md shadow-red-200 transition-all duration-200',
              'hover:shadow-lg hover:shadow-red-300 hover:-translate-y-0.5'
            )}
          >
            Nâng cấp ngay 🚀
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Component Sidebar chính
// ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useUserStore();

  // State cho accordion sub-items
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // State cho Modal nâng cấp
  const [modal, setModal] = useState<{ open: boolean; featureName: string }>({
    open: false,
    featureName: '',
  });

  // State cho Checkout Modal
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Hook lấy quyền truy cập từ billing-service
  const { allowedSkills, isPro, isLoading } = useAllowedSkills();

  // Tự động mở accordion Listening khi đang ở trang Listening
  useEffect(() => {
    if (location.pathname.startsWith('/listening')) {
      setExpandedItem('Listening');
    } else {
      setExpandedItem(null);
    }
  }, [location.pathname]);

  // ── Kiểm tra quyền truy cập một nav item ──────────────────────
  const isItemAllowed = (item: NavItem): boolean => {
    // PRO có toàn quyền
    if (isPro) return true;
    // Item không có skill (Dashboard, History...) → luôn cho phép
    if (!item.skill) return true;
    // Còn lại kiểm tra trong allowedSkills
    return allowedSkills?.includes(item.skill) ?? false;
  };

  // ── Hàm xử lý điều hướng với kiểm tra quyền ──────────────────
  const handleNavigation = (item: NavItem, subItem?: SubItem) => {
    const targetPath = subItem?.path ?? item.path;
    const featureName = subItem?.name ?? item.name;

    // Nếu item không có skill → cho phép tự do (Dashboard, History...)
    if (!item.skill) {
      navigate(targetPath);
      return;
    }

    // Kiểm tra quyền
    if (isItemAllowed(item)) {
      navigate(targetPath);
    } else {
      // Chặn và hiển thị modal yêu cầu nâng cấp
      setModal({ open: true, featureName });
    }
  };

  const isSubItemActive = (subPath: string): boolean => location.pathname === subPath;

  // ── Render icon khoá cho item bị giới hạn ─────────────────────
  const renderLockBadge = (item: NavItem) => {
    if (isLoading || !item.skill) return null;
    if (isItemAllowed(item)) return null;
    return (
      <span
        title="Cần nâng cấp gói cước"
        className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-amber-100"
      >
        <Lock className="h-3 w-3 text-amber-600" />
      </span>
    );
  };

  return (
    <>
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
              const allowed = isItemAllowed(item);

              const baseClasses = cn(
                'w-full rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300',
                'flex items-center gap-3',
                'hover:translate-x-1 hover:shadow-sm',
                isActive
                  ? 'bg-[#E31837] text-white shadow-md shadow-red-200/70'
                  : allowed
                  ? 'text-slate-700 hover:bg-red-50 hover:text-[#E31837]'
                  : 'text-slate-400 hover:bg-amber-50 hover:text-amber-700 cursor-not-allowed'
              );

              const navContent = (
                <>
                  <item.icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-colors duration-300',
                      isActive ? 'text-white' : allowed ? 'text-slate-400' : 'text-amber-400'
                    )}
                  />
                  <span className="flex-1 text-left">{item.name}</span>
                  {/* Hiển thị badge khoá nếu không có quyền */}
                  {renderLockBadge(item)}
                  {/* Chevron cho item có subItems */}
                  {hasSubItems && (
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 flex-shrink-0 transition-transform duration-300',
                        isItemExpanded ? 'rotate-180' : 'rotate-0'
                      )}
                    />
                  )}
                </>
              );

              return (
                <div key={item.name} className="space-y-2">
                  {hasSubItems ? (
                    /* Item có sub-items: nhấn accordion trước, navigate khi chọn sub */
                    <button
                      type="button"
                      onClick={() => {
                        if (allowed) {
                          setExpandedItem(isItemExpanded ? null : item.name);
                        } else {
                          setModal({ open: true, featureName: item.name });
                        }
                      }}
                      className={baseClasses}
                      aria-expanded={isItemExpanded}
                      aria-controls={`submenu-${item.name}`}
                    >
                      {navContent}
                    </button>
                  ) : (
                    /* Item thường: dùng button thay vì Link để xử lý quyền */
                    <button
                      type="button"
                      onClick={() => handleNavigation(item)}
                      className={baseClasses}
                    >
                      {navContent}
                    </button>
                  )}

                  {/* Submenu dropdown */}
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
                            <button
                              key={subItem.path}
                              type="button"
                              onClick={() => handleNavigation(item, subItem)}
                              className={cn(
                                'block w-full rounded-lg px-3 py-2 text-left text-sm font-medium',
                                'transition-all duration-300 hover:translate-x-1',
                                isSubActive
                                  ? 'bg-red-50 text-[#E31837] shadow-sm'
                                  : allowed
                                  ? 'text-slate-600 hover:bg-red-50 hover:text-[#E31837]'
                                  : 'text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                              )}
                            >
                              {subItem.name}
                            </button>
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

        {/* Bottom nav items — không cần kiểm tra quyền */}
        {isAuthenticated && (
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
        )}
      </aside>

      {/* Modal nâng cấp gói cước */}
      <UpgradeModal
        isOpen={modal.open}
        featureName={modal.featureName}
        onClose={() => setModal({ open: false, featureName: '' })}
        onUpgrade={() => {
          setModal({ open: false, featureName: '' });
          setIsCheckoutModalOpen(true);
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
      />
    </>
  );
}
