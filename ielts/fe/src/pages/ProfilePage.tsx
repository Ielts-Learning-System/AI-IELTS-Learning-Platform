import { useState, useEffect } from 'react';
import { useUserStore } from '../store/useUserStore';
import axios from 'axios';
import { Upload, Lock, Check, X } from 'lucide-react';

export default function ProfilePage() {
  const { user, setAuth } = useUserStore();
  
  // Basic Info Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  
  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Loading & Messages
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setAvatar(user.avatar);
    }
  }, [user]);

  const handleAvatarChange = () => {
    if (avatarInput.trim()) {
      setAvatar(avatarInput);
      setAvatarInput('');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setIsLoadingProfile(true);

    try {
      const response = await axios.put('http://localhost:3000/api/auth/profile', {
        name,
        avatar,
      });

      setAuth(response.data.user, response.data.token);
      setProfileMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
    } catch (err: any) {
      setProfileMessage({
        type: 'error',
        text: err.response?.data?.message || 'Cập nhật thất bại. Vui lòng thử lại.',
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    // Validate
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'Mật khẩu mới và xác nhận mật khẩu không trùng khớp',
      });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({
        type: 'error',
        text: 'Mật khẩu mới phải có ít nhất 6 ký tự',
      });
      return;
    }

    setIsLoadingPassword(true);

    try {
      await axios.put('http://localhost:3000/api/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
    } catch (err: any) {
      setPasswordMessage({
        type: 'error',
        text: err.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.',
      });
    } finally {
      setIsLoadingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8 lg:px-12">
      <div className="w-full max-w-full">
        {/* Page Header */}
        <div className="mb-8 text-left">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Quản lý tài khoản</h1>
          <p className="text-slate-600">Cập nhật thông tin cá nhân và bảo mật tài khoản của bạn</p>
        </div>

        {/* Cards Container - Grid Layout */}
        <div className="w-full grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Basic Info Card */}
          <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-red-600" />
              Thông tin cơ bản
            </h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="p-6 space-y-6">
            {/* Profile Message */}
            {profileMessage && (
              <div
                className={`p-4 rounded-lg flex items-center gap-3 ${
                  profileMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {profileMessage.type === 'success' ? (
                  <Check className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <X className="w-5 h-5 flex-shrink-0" />
                )}
                <span>{profileMessage.text}</span>
              </div>
            )}

            {/* Avatar Section */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-4">
                Ảnh đại diện
              </label>
              <div className="flex gap-6 items-start">
                {/* Avatar Display */}
                <div className="flex-shrink-0">
                  <img
                    src={avatar || 'https://via.placeholder.com/120'}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full border-4 border-red-200 object-cover"
                  />
                </div>

                {/* Avatar Input */}
                <div className="flex-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={avatarInput}
                      onChange={(e) => setAvatarInput(e.target.value)}
                      placeholder="Dán URL ảnh vào đây"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={handleAvatarChange}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
                    >
                      Xác nhận
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Nhập URL của ảnh mới. Ảnh sẽ được cập nhật ngay khi bạn lưu.
                  </p>
                </div>
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                Họ và tên
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                placeholder="Nhập họ và tên"
              />
            </div>

            {/* Email Field (Disabled) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-slate-600 cursor-not-allowed"
              />
              <p className="text-xs text-slate-500 mt-1">Email không thể thay đổi</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoadingProfile}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoadingProfile ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                'Lưu thay đổi'
              )}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-600" />
              Bảo mật
            </h2>
          </div>

          <form onSubmit={handleChangePassword} className="p-6 space-y-6">
            {/* Password Message */}
            {passwordMessage && (
              <div
                className={`p-4 rounded-lg flex items-center gap-3 ${
                  passwordMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {passwordMessage.type === 'success' ? (
                  <Check className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <X className="w-5 h-5 flex-shrink-0" />
                )}
                <span>{passwordMessage.text}</span>
              </div>
            )}

            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-2">
                Mật khẩu hiện tại
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-2">
                Mật khẩu mới
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                placeholder="••••••••"
              />
              <p className="text-xs text-slate-500 mt-1">Mật khẩu phải có ít nhất 6 ký tự</p>
            </div>

            {/* Confirm New Password */}
            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-slate-700 mb-2">
                Xác nhận mật khẩu mới
              </label>
              <input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoadingPassword}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoadingPassword ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Đang xử lý...
                </>
              ) : (
                'Đổi mật khẩu'
              )}
            </button>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
}
