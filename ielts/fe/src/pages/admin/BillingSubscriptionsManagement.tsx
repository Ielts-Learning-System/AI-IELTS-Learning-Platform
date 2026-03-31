import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Bell,
  CalendarClock,
  Loader2,
  RefreshCw,
  UserRound,
  Ban,
  RefreshCcw,
  X,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useUserStore } from '../../store/useUserStore';
import type { BillingSubscription } from './useAdminBilling';
import { useAdminBilling } from './useAdminBilling';

// ============ TEMPLATES ============
interface CancellationTemplate {
  title: string;
  message: string;
  type: 'warning' | 'error' | 'success';
}

type CancellationReason = 'POLICY_VIOLATION' | 'SYSTEM_ERROR' | 'USER_REQUEST_REFUND';

const templates: Record<CancellationReason, CancellationTemplate> = {
  POLICY_VIOLATION: {
    title: '⚠️ Tài khoản bị hạn chế',
    message:
      'Chúng tôi phát hiện tài khoản của bạn có dấu hiệu vi phạm chính sách sử dụng (ví dụ: chia sẻ tài khoản hoặc truy cập bất thường).\nGói ${planName} của bạn đã bị tạm ngưng kể từ ${cancelDate}.\nNếu bạn cho rằng đây là nhầm lẫn, vui lòng liên hệ hỗ trợ.',
    type: 'warning',
  },
  SYSTEM_ERROR: {
    title: '⚠️ Sự cố hệ thống',
    message:
      'Gói ${planName} của bạn đã bị ảnh hưởng do sự cố kỹ thuật từ hệ thống.\nChúng tôi đã tạm thời điều chỉnh trạng thái tài khoản để khắc phục lỗi.\nMọi quyền lợi sẽ được đảm bảo và khôi phục nếu cần thiết.',
    type: 'error',
  },
  USER_REQUEST_REFUND: {
    title: '💸 Hoàn tiền thành công',
    message:
      'Gói ${planName} của bạn đã được hủy theo yêu cầu.\nKhoản thanh toán sẽ được hoàn lại trong vòng 3-5 ngày làm việc.\nCảm ơn bạn đã sử dụng dịch vụ của chúng tôi.',
    type: 'success',
  },
};

// ============ UTILITIES ============
const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const formatDateForInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const normalizeUser = (userId: BillingSubscription['userId']) => {
  if (typeof userId === 'string') {
    return {
      id: userId,
      name: 'Unknown User',
      email: 'N/A',
    };
  }

  return {
    id: userId?._id || userId?.id || '',
    name: userId?.name || 'Unknown User',
    email: userId?.email || 'N/A',
  };
};

const getStatusClasses = (status: BillingSubscription['status']) => {
  if (status === 'ACTIVE') return 'bg-emerald-100 text-emerald-700';
  if (status === 'EXPIRED') return 'bg-rose-100 text-rose-700';
  if (status === 'CANCELLED') return 'bg-slate-200 text-slate-700';
  return 'bg-slate-200 text-slate-700';
};

const isDateInFuture = (dateStr?: string) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date > new Date();
};

// ============ CANCELLATION MODAL COMPONENT ============
interface CancellationModalProps {
  isOpen: boolean;
  subscription: BillingSubscription | null;
  onClose: () => void;
  onConfirm: (reason: CancellationReason, title: string, message: string) => Promise<void>;
  isSubmitting: boolean;
}

function CancellationModal({
  isOpen,
  subscription,
  onClose,
  onConfirm,
  isSubmitting,
}: CancellationModalProps) {
  const [selectedReason, setSelectedReason] = useState<CancellationReason>('USER_REQUEST_REFUND');
  const [editedTitle, setEditedTitle] = useState('');
  const [editedMessage, setEditedMessage] = useState('');

  const currentTemplate = templates[selectedReason];
  const planName = subscription?.planId?.name || 'Unknown Plan';
  const cancelDate = formatDate(new Date().toISOString());

  // Auto-fill template when reason changes
  useEffect(() => {
    if (!isOpen || !subscription) return;
    const tmpl = templates[selectedReason];
    setEditedTitle(tmpl.title);
    setEditedMessage(
      tmpl.message.replace('${planName}', planName).replace('${cancelDate}', cancelDate)
    );
  }, [selectedReason, isOpen, subscription, planName, cancelDate]);

  const handleConfirm = async () => {
    await onConfirm(selectedReason, editedTitle, editedMessage);
  };

  if (!isOpen || !subscription) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Cancel Subscription</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5">
          {/* Subscription Info */}
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Cancelling</p>
            <p className="mt-1 font-semibold text-slate-900">{normalizeUser(subscription.userId).name}</p>
            <p className="text-sm text-slate-600">{subscription.planId?.name || 'Unknown Plan'}</p>
          </div>

          {/* Reason Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Cancellation Reason
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value as CancellationReason)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-50"
            >
              <option value="USER_REQUEST_REFUND">User Request / Refund</option>
              <option value="POLICY_VIOLATION">Policy Violation</option>
              <option value="SYSTEM_ERROR">System Error</option>
            </select>
          </div>

          {/* Message Editor */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Notification Title
            </label>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Notification Message
            </label>
            <textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              disabled={isSubmitting}
              rows={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-50 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============
export function BillingSubscriptionsManagement() {
  const { token } = useUserStore();
  const {
    fetchSubscriptions,
    sendReminder,
    cancelSubscription,
    restoreSubscription,
  } = useAdminBilling(token);

  const [rows, setRows] = useState<BillingSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminderFor, setSendingReminderFor] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Filters
  const [planFilter, setPlanFilter] = useState('all');
  const [expiryDateFilter, setExpiryDateFilter] = useState('');

  // Modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedForCancel, setSelectedForCancel] = useState<BillingSubscription | null>(null);
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Get unique plan names for filter dropdown
  const planOptions = useMemo(() => {
    const plans = Array.from(new Set(rows.map((r) => r.planId?.name).filter(Boolean)));
    return plans.sort() as string[];
  }, [rows]);

  // Sorted and filtered rows
  const processedRows = useMemo(() => {
    let result = [...rows];

    // Sort by validUntil (ascending - closest expiration first)
    result.sort((a, b) => {
      const aDate = new Date(a.validUntil || '9999-12-31').getTime();
      const bDate = new Date(b.validUntil || '9999-12-31').getTime();
      return aDate - bDate;
    });

    // Apply plan filter
    if (planFilter !== 'all') {
      result = result.filter((r) => r.planId?.name === planFilter);
    }

    // Apply expiry date filter
    if (expiryDateFilter) {
      const filterDate = new Date(expiryDateFilter);
      result = result.filter((r) => {
        const subDate = new Date(r.validUntil || '9999-12-31');
        return subDate <= filterDate;
      });
    }

    return result;
  }, [rows, planFilter, expiryDateFilter]);

  const activeCount = useMemo(
    () => rows.filter((row) => row.status === 'ACTIVE').length,
    [rows]
  );

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSubscriptions();
      setRows(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [fetchSubscriptions]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const handleSendReminder = async (subscription: BillingSubscription) => {
    const normalizedUser = normalizeUser(subscription.userId);
    if (!normalizedUser.id) {
      toast.error('Missing userId for this subscription');
      return;
    }

    setSendingReminderFor(normalizedUser.id);
    try {
      await sendReminder(normalizedUser.id);
      toast.success('Reminder sent successfully');
    } catch (error) {
      console.error(error);
      toast.error('Could not send reminder');
    } finally {
      setSendingReminderFor(null);
    }
  };

  const handleCancelClick = (subscription: BillingSubscription) => {
    setSelectedForCancel(subscription);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async (
    reason: CancellationReason,
    title: string,
    message: string
  ) => {
    if (!selectedForCancel) return;

    setSubmittingCancel(true);
    try {
      await cancelSubscription(selectedForCancel._id, reason, title, message);
      toast.success('Subscription cancelled successfully');
      setCancelModalOpen(false);
      setSelectedForCancel(null);
      await loadSubscriptions();
    } catch (error) {
      console.error(error);
      toast.error('Failed to cancel subscription');
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleRestore = async (subscription: BillingSubscription) => {
    setRestoringId(subscription._id);
    try {
      await restoreSubscription(subscription._id);
      toast.success('Subscription restored successfully');
      await loadSubscriptions();
    } catch (error) {
      console.error(error);
      toast.error('Failed to restore subscription');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Subscriptions Management</h1>
            <p className="mt-2 text-sm text-slate-500">
              Track user plans, monitor expiry, and trigger reminder notifications.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              Active: {activeCount}
            </span>
            <button
              onClick={loadSubscriptions}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Filters Section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Filters</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Plan Filter */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Filter by Plan
            </label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Plans</option>
              {planOptions.map((plan) => (
                <option key={plan} value={plan}>
                  {plan}
                </option>
              ))}
            </select>
          </div>

          {/* Expiry Date Filter */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Expiring Before
            </label>
            <input
              type="date"
              value={expiryDateFilter}
              onChange={(e) => setExpiryDateFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {(planFilter !== 'all' || expiryDateFilter) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {planFilter !== 'all' && (
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                Plan: {planFilter}
                <button
                  onClick={() => setPlanFilter('all')}
                  className="text-blue-700 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )}
            {expiryDateFilter && (
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                Before {formatDate(expiryDateFilter)}
                <button
                  onClick={() => setExpiryDateFilter('')}
                  className="text-blue-700 hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Subscriptions Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-14 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading subscriptions...
          </div>
        ) : processedRows.length === 0 ? (
          <div className="p-14 text-center">
            <p className="text-lg font-semibold text-slate-800">No subscriptions found</p>
            <p className="mt-1 text-sm text-slate-500">
              {rows.length === 0
                ? 'Subscriptions will appear here after users complete a billing flow.'
                : 'No subscriptions match your filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-4 font-semibold">User Name / Email</th>
                  <th className="px-4 py-4 font-semibold">Current Plan</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Expiry Date</th>
                  <th className="px-4 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedRows.map((row) => {
                  const user = normalizeUser(row.userId);
                  const sending = sendingReminderFor === user.id;
                  const cancelling = cancellingId === row._id;
                  const restoring = restoringId === row._id;

                  const isActiveStatus = row.status === 'ACTIVE';
                  const isCancelledAndFuture =
                    row.status === 'CANCELLED' && isDateInFuture(row.validUntil);

                  return (
                    <tr key={row._id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            <UserRound className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900">{user.name}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                        {row.planId?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            row.status
                          )}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <CalendarClock className="h-4 w-4 text-slate-400" />
                          {formatDate(row.validUntil)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {/* Send Reminder Button */}
                          <button
                            onClick={() => handleSendReminder(row)}
                            disabled={sending || cancelling || restoring}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                          >
                            {sending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Bell className="h-3.5 w-3.5" />
                            )}
                            <span className="hidden sm:inline">Remind</span>
                          </button>

                          {/* Cancel Button (only for ACTIVE) */}
                          {isActiveStatus && (
                            <button
                              onClick={() => handleCancelClick(row)}
                              disabled={cancelling || sending || restoring}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-2 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              {cancelling ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Ban className="h-3.5 w-3.5" />
                              )}
                              <span className="hidden sm:inline">Cancel</span>
                            </button>
                          )}

                          {/* Restore Button (only for CANCELLED with future validUntil) */}
                          {isCancelledAndFuture && (
                            <button
                              onClick={() => handleRestore(row)}
                              disabled={restoring || sending || cancelling}
                              className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-2 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:opacity-50"
                            >
                              {restoring ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCcw className="h-3.5 w-3.5" />
                              )}
                              <span className="hidden sm:inline">Restore</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      <CancellationModal
        isOpen={cancelModalOpen}
        subscription={selectedForCancel}
        onClose={() => {
          setCancelModalOpen(false);
          setSelectedForCancel(null);
        }}
        onConfirm={handleConfirmCancel}
        isSubmitting={submittingCancel}
      />
    </section>
  );
}
