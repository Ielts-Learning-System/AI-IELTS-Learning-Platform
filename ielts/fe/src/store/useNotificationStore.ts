import { create } from 'zustand';
import type { Notification } from '../api/notification.api';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;

  setNotifications: (list: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  /** Prepend a real-time notification and bump the unread counter */
  addNotification: (notification: Notification) => void;
  /** Mark one notification read in local state */
  markRead: (id: string) => void;
  /** Mark all read in local state */
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  setNotifications: (list) => set({ notifications: list }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  setLoading: (loading) => set({ isLoading: loading }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),

  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt || new Date().toISOString(),
      })),
      unreadCount: 0,
    })),
}));
