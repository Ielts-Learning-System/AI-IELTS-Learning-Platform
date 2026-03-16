import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useUserStore } from '../store/useUserStore';

export default function ProtectedRoute() {
  const { isAuthenticated, token } = useUserStore();
  const isAuthed = isAuthenticated && !!token;

  // Auto-trigger the Navbar login modal when unauthenticated
  // useEffect(() => {
  //   if (!isAuthed) {
  //     useUserStore.getState().openLoginModal();
  //   }
  // }, [isAuthed]);

  if (!isAuthed) {
    return (
      <div className="relative">
        {/* Blurred page content behind the overlay */}
        <div className="filter blur-md pointer-events-none select-none opacity-40 transition-all duration-300">
          <Outlet />
        </div>

        {/* Glassmorphism lock overlay */}
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
          <div className="rounded-2xl border border-white/30 bg-white/70 p-10 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <Lock className="h-10 w-10 text-red-600" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-slate-800">
              Vui lòng đăng nhập
            </h2>
            <p className="mb-4 text-base text-slate-600">
              Vui lòng đăng nhập để xem phân tích năng lực.
            </p>
            <p className="text-sm text-slate-400">
              Nhấn nút{' '}
              <span className="font-semibold text-red-600">Đăng nhập / Đăng ký</span>{' '}
              trên thanh điều hướng phía trên.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
