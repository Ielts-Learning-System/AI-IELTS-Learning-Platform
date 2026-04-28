import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, Crown, LogOut, User } from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';
import AuthModal from '../AuthModal';
import logo from '../../assets/logo.png';
import CheckoutModal from '../CheckoutModal';
import { apiClient } from '../../lib/api/client';
import { NotificationBellComponent } from './NotificationBell';
import { SubscriptionBadge } from '../SubscriptionBadge';

// role label map (Để hằng số ở ngoài là cực kỳ chuẩn xác)
const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  teacher: 'Giáo viên',
  student: 'Học viên',
};

export function Navbar() {
  // ✅ 1. KÉO STATE VÀO TRONG HÀM (FIX LỖI MÀN HÌNH TRẮNG)
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgradeFromPrice, setUpgradeFromPrice] = useState<number | undefined>(undefined);
  
  const { isAuthenticated, user, logout } = useUserStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [pendingTx, setPendingTx] = useState<{ _id: string; planId: string } | null>(null);
  const [isCheckingPending, setIsCheckingPending] = useState(false);

  useEffect(() => {
    const fetchPendingTransaction = async () => {
      if (!isAuthenticated || !user || user.isVip) {
        setPendingTx(null);
        setIsCheckingPending(false);
        return;
      }

      setIsCheckingPending(true);
      try {
        const response = await apiClient.get('/payment/transactions/my-pending');
        setPendingTx(response.data?.data || null);
      } catch (error) {
        setPendingTx(null);
      } finally {
        setIsCheckingPending(false);
      }
    };

    fetchPendingTransaction();
  }, [isAuthenticated, user]);

  const getPendingBadgeText = (planId?: string) => {
    const normalizedPlan = (planId || '').toUpperCase();
    if (normalizedPlan.includes('PLUS')) return 'Chờ duyệt tài khoản Plus';
    if (normalizedPlan.includes('PRO')) return 'Chờ duyệt tài khoản Pro';
    if (normalizedPlan.includes('VIP')) return 'Chờ duyệt tài khoản VIP';
    return 'Chờ duyệt giao dịch nâng cấp';
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout(); // clears storage and redirects via window.location.replace
  };

  const handleSubscriptionUpgrade = (currentPlanPrice: number) => {
    setUpgradeFromPrice(currentPlanPrice);
    setIsUpgradeOpen(true);
  };

  const handleSubscriptionManage = () => {
    // Navigate to subscription management page if needed
    console.log('Navigate to subscription management');
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <img src={logo} alt="IELTS Logo" className="h-10 w-auto" />
        <span className="text-xl font-bold text-slate-900">IELTS Master</span>
      </div>

      <div className="flex items-center gap-4">
        {!isAuthenticated ? (
          // Not Authenticated - Show Login Button
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Đăng nhập / Đăng ký
          </button>
        ) : (
          // Authenticated - Show User Menu
          <>
            {/* Subscription Badge Component */}
            <SubscriptionBadge
              onUpgradeClick={handleSubscriptionUpgrade}
              onManageClick={handleSubscriptionManage}
            />

            <NotificationBellComponent />

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 pl-4 pr-2 border-l border-slate-200 hover:bg-slate-50 rounded-lg transition-colors py-1"
              >
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-slate-700">
                    {user?.name || user?.email || 'Người dùng'}
                  </span>
                  {/* role badge */}
                  {(() => {
                    const userRole = user?.role?.toLowerCase() || 'student';
                    const label = ROLE_LABELS[userRole] || 'Học viên';
                    let badgeClasses = '';
                    if (userRole === 'admin') badgeClasses = 'bg-red-600 text-white';
                    else if (userRole === 'teacher') badgeClasses = 'bg-blue-600 text-white';
                    else badgeClasses = 'bg-gray-200 text-gray-700';
                    return (
                      <span
                        className={`${badgeClasses} text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block`}
                      >
                        {label}
                      </span>
                    );
                  })()}
                </div>
                <img
                  src={user?.avatar || 'https://via.placeholder.com/40'}
                  alt="Avatar"
                  className="h-9 w-9 rounded-full border-2 border-red-200 object-cover"
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border border-slate-200 overflow-hidden z-40">
                  <Link
                    to="/dashboard/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100"
                  >
                    <User className="h-4 w-4" />
                    <span>Quản lý tài khoản</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>

    <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    
    <CheckoutModal
      isOpen={isUpgradeOpen}
      onClose={() => setIsUpgradeOpen(false)}
      currentPlanPrice={upgradeFromPrice}
    />
    </>
  );
}