'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, AlertCircle, Inbox } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '../../lib/api/client';

// Types
interface Notification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string;
}

// Utility: Format relative time (e.g., "5 mins ago", "2 days ago")
const formatRelativeTime = (isoDate: string): string => {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  } catch {
    return 'Vừa xong';
  }
};

export function NotificationBellComponent() {
  // State Management with SAFE DEFAULTS
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]); // ✅ Safe empty array
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.get('/notification', {
        params: { limit: 50, page: 1 },
      });

      // ✅ Safe data extraction with fallback to empty array
      const notificationList =
        response?.data?.notifications || response?.data?.data || response?.data || [];
      setNotifications(Array.isArray(notificationList) ? notificationList : []);
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError('Không thể tải thông báo');
      setNotifications([]); // ✅ Fallback to empty array on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await apiClient.get('/notification/unread-count');
      // ✅ Safe unread count extraction with multiple fallback paths
      const count = response?.data?.data?.unreadCount || response?.data?.unreadCount || 0;
      setUnreadCount(Math.max(0, count));
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
      setUnreadCount(0); // ✅ Fallback to 0 on error
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await apiClient.patch(`/notification/${notificationId}/read`);

      // ✅ Update local state safely
      setNotifications((prev) =>
        Array.isArray(prev)
          ? prev.map((notif) =>
              notif._id === notificationId ? { ...notif, read: true } : notif
            )
          : []
      );

      // ✅ Safely decrease unread count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Socket.io initialization and event listeners
  useEffect(() => {
    // Initial data fetch
    fetchNotifications();
    fetchUnreadCount();

    // Initialize socket with safe config
    const token = localStorage.getItem('accessToken');
    const socketInstance = io('http://localhost:3000', {
      path: '/socket.io-notification',
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected for notifications');
    });

    // ✅ Handle new_notification event safely
    socketInstance.on('new_notification', (data: Notification) => {
      setNotifications((prev) => {
        const updated = Array.isArray(prev) ? [data, ...prev] : [data];
        return updated.slice(0, 50); // Keep last 50
      });
      setUnreadCount((prev) => prev + 1);
    });

    // ✅ Handle notification updates safely
    socketInstance.on('notification_updated', (data: Notification) => {
      setNotifications((prev) =>
        Array.isArray(prev)
          ? prev.map((notif) => (notif._id === data._id ? data : notif))
          : []
      );
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(socketInstance);

    // ✅ Cleanup socket on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [fetchNotifications, fetchUnreadCount]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        bellButtonRef.current &&
        !bellButtonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleNotificationClick = (notificationId: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead(notificationId);
    }
  };

  return (
    <div className="relative">
      {/* Bell Button with Badge */}
      <button
        ref={bellButtonRef}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200"
        title="Thông báo"
      >
        <Bell className="h-5 w-5 text-slate-700" strokeWidth={2} />

        {/* ✅ Unread Badge (only show if > 0) */}
        {unreadCount > 0 && (
          <div className="absolute top-0 right-0 h-5 w-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown Menu - Modern UI */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-3 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-slate-700" />
              <h3 className="text-lg font-semibold text-slate-900">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-6 w-6 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsDropdownOpen(false)}
              className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
              title="Đóng"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              // ✅ Loading State
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <div className="animate-spin h-6 w-6 border-2 border-slate-300 border-t-red-600 rounded-full" />
                <p className="text-sm text-slate-500 mt-2">Đang tải thông báo...</p>
              </div>
            ) : error ? (
              // ✅ Error State
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                <p className="text-sm text-red-600 font-medium">{error}</p>
                <button
                  onClick={() => fetchNotifications()}
                  className="mt-3 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors"
                >
                  Thử lại
                </button>
              </div>
            ) : (notifications && notifications.length > 0) ? (
              // ✅ Notifications List
              <ul className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <li
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification._id, notification.read)}
                    className={`px-4 py-3 cursor-pointer transition-colors duration-150 ${
                      notification.read
                        ? 'hover:bg-slate-50 bg-white'
                        : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Unread Indicator */}
                      {!notification.read && (
                        <div className="mt-1.5 h-2 w-2 rounded-full bg-red-600 flex-shrink-0" />
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-semibold text-slate-900 leading-tight ${
                          notification.read ? 'opacity-75' : 'opacity-100'
                        }`}>
                          {notification.title}
                        </h4>
                        <p className={`text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed ${
                          notification.read ? 'opacity-60' : 'opacity-80'
                        }`}>
                          {notification.message}
                        </p>
                        <span className={`text-xs mt-2 inline-block ${
                          notification.read ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>

                      {/* Visual indicator for unread */}
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notification._id, false);
                          }}
                          className="mt-0.5 h-2.5 w-2.5 rounded-full bg-red-600 hover:bg-red-700 flex-shrink-0 transition-colors"
                          title="Đánh dấu đã đọc"
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              // ✅ Empty State
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                  <Inbox className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700">Không có thông báo</p>
                <p className="text-xs text-slate-500 mt-1">
                  Bạn sẽ nhận thông báo khi có cập nhật mới
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications && notifications.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-2">
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  // Navigate to full notifications page if needed
                  // e.g., router.push('/dashboard/notifications');
                }}
                className="w-full text-center text-sm font-medium text-slate-600 hover:text-slate-900 py-1 transition-colors"
              >
                Xem tất cả thông báo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Export as default for backwards compatibility if needed
export default NotificationBellComponent;
