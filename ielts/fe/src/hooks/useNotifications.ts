import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUserStore } from '../store/useUserStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { notificationApi, type Notification } from '../api/notification.api';

const GATEWAY_URL = 'http://localhost:3000';

export function useNotifications() {
  const socketRef = useRef<Socket | null>(null);
  const user = useUserStore((s) => s.user);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  const {
    notifications,
    unreadCount,
    isLoading,
    setNotifications,
    setUnreadCount,
    setLoading,
    addNotification,
    markRead,
    markAllRead,
  } = useNotificationStore();

  // Fetch initial data + open Socket.io connection
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    let cancelled = false;

    const fetchInitial = async () => {
      setLoading(true);
      try {
        const [listRes, countRes] = await Promise.all([
          notificationApi.list(1, 30),
          notificationApi.unreadCount(),
        ]);
        if (!cancelled) {
          setNotifications(listRes.data.notifications);
          setUnreadCount(countRes.data.unreadCount);
        }
      } catch {
        // silently ignore – notifications are non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchInitial();

    // Socket.io — connect through the gateway WS proxy
    const socket = io(GATEWAY_URL, {
      path: '/socket.io-notification',
      query: { userId: user.id },
      transports: ['websocket', 'polling'],
    });

    socket.on('notification', (payload: Notification) => {
      addNotification(payload);
    });

    socketRef.current = socket;

    return () => {
      cancelled = true;
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  const handleMarkAsRead = async (id: string) => {
    markRead(id);
    try {
      await notificationApi.markAsRead(id);
    } catch {
      // optimistic update – ignore API errors
    }
  };

  const handleMarkAllAsRead = async () => {
    markAllRead();
    try {
      await notificationApi.markAllAsRead();
    } catch {
      // optimistic update
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
  };
}
