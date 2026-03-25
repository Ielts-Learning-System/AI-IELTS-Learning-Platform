import { apiClient } from '../lib/api/client';

export interface Notification {
  _id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  channel: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  readAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export const notificationApi = {
  /** Fetch paginated in-app notifications */
  list: (page = 1, limit = 20) =>
    apiClient.get<NotificationListResponse>('/notification', {
      params: { page, limit },
    }),

  /** Get unread notification count */
  unreadCount: () =>
    apiClient.get<UnreadCountResponse>('/notification/unread-count'),

  /** Mark a single notification as read */
  markAsRead: (id: string) =>
    apiClient.patch<{ notification: Notification }>(`/notification/${id}/read`),

  /** Mark all notifications as read */
  markAllAsRead: () =>
    apiClient.patch<{ modifiedCount: number }>('/notification/read-all'),
};
