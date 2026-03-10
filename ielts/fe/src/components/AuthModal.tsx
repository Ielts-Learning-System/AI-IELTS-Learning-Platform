import { useState } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import { useUserStore } from '../store/useUserStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { setAuth } = useUserStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    resetForm();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email,
        password,
      });

      // Extract user data and token from API response
      const { _id, email: userEmail, name, avatar, plan, role } = response.data.data;
      const token = response.data.data.token;

      // Map API response to User interface
      const user = {
        id: _id,
        name,
        email: userEmail,
        avatar,
        role,
        isVip: plan === 'premium',
      };

      // Update global state
      setAuth(user, token);

      setSuccessMessage('Đăng nhập thành công!');
      resetForm();
      
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Login error:', err.response?.data || err.message);
      setErrorMessage(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Validate
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu và xác nhận mật khẩu không trùng khớp');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setIsLoading(true);

    try {
      await axios.post('http://localhost:3000/api/auth/register', {
        name,
        email,
        password,
      });

      setSuccessMessage('Đăng ký thành công! Vui lòng đăng nhập.');
      resetForm();
      
      setTimeout(() => {
        switchMode('login');
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = mode === 'login' ? handleLogin : handleRegister;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close modal"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-red-600 mb-2">
            {mode === 'login' ? 'Đăng nhập hệ thống IELTS' : 'Đăng ký tài khoản mới'}
          </h2>
          <p className="text-gray-600 text-sm">
            {mode === 'login'
              ? 'Đăng nhập để tiếp tục hành trình luyện thi'
              : 'Tạo tài khoản mới để bắt đầu luyện thi'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field (Register only) */}
          {mode === 'register' && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Họ Tên
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                placeholder="Nguyễn Văn A"
              />
            </div>
          )}

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
              placeholder="your@email.com"
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mật Khẩu
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          {/* Confirm Password Field (Register only) */}
          {mode === 'register' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Xác Nhận Mật Khẩu
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {successMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang xử lý...
              </>
            ) : mode === 'login' ? (
              'Đăng Nhập'
            ) : (
              'Đăng Ký Tài Khoản'
            )}
          </button>
        </form>

        {/* Mode Switch */}
        <div className="mt-6 text-center text-gray-600 text-sm">
          {mode === 'login' ? (
            <>
              Chưa có tài khoản?{' '}
              <button
                onClick={() => switchMode('register')}
                className="text-red-600 font-semibold hover:underline"
              >
                Đăng ký ngay
              </button>
            </>
          ) : (
            <>
              Đã có tài khoản?{' '}
              <button
                onClick={() => switchMode('login')}
                className="text-red-600 font-semibold hover:underline"
              >
                Đăng nhập
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
