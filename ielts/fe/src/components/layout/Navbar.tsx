import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Crown, LogOut, User } from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';
import AuthModal from '../AuthModal';
import logo from '../../assets/logo.png';
import UpgradeModal from '../UpgradeModal';

// role label map (Để hằng số ở ngoài là cực kỳ chuẩn xác)
const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị viên',
  teacher: 'Giáo viên',
  student: 'Học viên',
};

export function Navbar() {
  // ✅ 1. KÉO STATE VÀO TRONG HÀM (FIX LỖI MÀN HÌNH TRẮNG)
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  
  const { isAuthenticated, user, logout } = useUserStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    navigate('/dashboard');
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
            <button className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-200" onClick={() => setIsUpgradeOpen(true)}>
              <Crown className="h-4 w-4" />
              Nâng cấp VIP
            </button>

            <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"></span>
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 pl-4 pr-2 border-l border-slate-200 hover:bg-slate-50 rounded-lg transition-colors py-1"
              >
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-slate-700">{user?.name}</span>
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
                    to="/profile"
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
    
    {/* ✅ 2. GỌI UPGRADE MODAL RA GIAO DIỆN (Nằm cạnh AuthModal) */}
    <UpgradeModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} />
    </>
  );
}