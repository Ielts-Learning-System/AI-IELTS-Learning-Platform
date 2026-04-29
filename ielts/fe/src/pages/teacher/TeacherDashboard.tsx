import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Bell, FileCheck2 } from 'lucide-react';
import { apiClient } from '../../lib/api/client';

type NotificationItem = {
  _id: string;
  title?: string;
  message?: string;
  createdAt?: string;
  isRead?: boolean;
};

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('vi-VN');
};

export function TeacherDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [pendingWriting, setPendingWriting] = useState(0);
  const [pendingSpeaking, setPendingSpeaking] = useState(0);
  const [totalGraded, setTotalGraded] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard = async () => {
      setIsLoading(true);

      const [writingStatsRes, speakingStatsRes, notificationRes] = await Promise.allSettled([
        apiClient.get('/writing/submissions/stats'),
        apiClient.get('/speaking/stats'),
        apiClient.get('/notification', { params: { page: 1, limit: 6 } }),
      ]);

      if (cancelled) return;

      const writingStats = writingStatsRes.status === 'fulfilled' ? writingStatsRes.value.data?.data : null;
      const speakingStats = speakingStatsRes.status === 'fulfilled' ? speakingStatsRes.value.data?.data : null;
      const notificationItems =
        notificationRes.status === 'fulfilled'
          ? (Array.isArray(notificationRes.value.data?.notifications)
              ? notificationRes.value.data.notifications
              : [])
          : [];

      const pendingW = toNumber(writingStats?.pendingCount);
      const pendingS = toNumber(speakingStats?.pendingCount);
      const gradedW = toNumber(writingStats?.gradedCount);
      const gradedS = toNumber(speakingStats?.gradedCount);

      setPendingWriting(pendingW);
      setPendingSpeaking(pendingS);
      setTotalGraded(gradedW + gradedS);
      setNotifications(notificationItems);
      setIsLoading(false);
    };

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl bg-white border border-slate-200">
        <p className="text-slate-500 font-medium">Đang tải dữ liệu dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900">Bảng điều khiển Giáo viên</h2>
        <p className="text-slate-600 mt-2">Theo dõi hàng đợi chấm bài và thông báo mới nhất</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Writing chờ chấm</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{pendingWriting}</p>
            </div>
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Speaking chờ chấm</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{pendingSpeaking}</p>
            </div>
            <FileCheck2 className="h-10 w-10 text-amber-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm font-medium">Tổng bài đã chấm</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{totalGraded}</p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Thông báo gần đây</h3>

        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div
                key={item._id}
                className={`rounded-lg p-4 border ${item.isRead ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}
              >
                <p className="font-semibold text-slate-900">{item.title || 'Thông báo hệ thống'}</p>
                <p className="text-sm text-slate-600 mt-1">{item.message || 'Không có nội dung'}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                  <Bell className="h-3.5 w-3.5" />
                  {formatDate(item.createdAt)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-slate-600">Hiện chưa có thông báo mới</p>
          </div>
        )}
      </div>
    </div>
  );
}
