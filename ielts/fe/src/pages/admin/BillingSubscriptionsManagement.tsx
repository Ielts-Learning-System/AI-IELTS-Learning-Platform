import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarClock, Loader2, RefreshCw, UserRound } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useUserStore } from '../../store/useUserStore';
import type { BillingSubscription } from './useAdminBilling';
import { useAdminBilling } from './useAdminBilling';

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
  return 'bg-slate-200 text-slate-700';
};

export function BillingSubscriptionsManagement() {
  const { token } = useUserStore();
  const { fetchSubscriptions, sendReminder } = useAdminBilling(token);

  const [rows, setRows] = useState<BillingSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminderFor, setSendingReminderFor] = useState<string | null>(null);

  const activeCount = useMemo(
    () => rows.filter((row) => row.status === 'ACTIVE').length,
    [rows]
  );

  const loadSubscriptions = async () => {
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
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

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
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-14 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading subscriptions...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-14 text-center">
            <p className="text-lg font-semibold text-slate-800">No active subscriptions found</p>
            <p className="mt-1 text-sm text-slate-500">
              Subscriptions will appear here after users complete a billing flow.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-4 font-semibold">User Name / Email</th>
                  <th className="px-4 py-4 font-semibold">Current Plan</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Expiry Date</th>
                  <th className="px-4 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const user = normalizeUser(row.userId);
                  const sending = sendingReminderFor === user.id;

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
                      <td className="px-4 py-4 text-sm font-semibold text-slate-800">{row.planId?.name || 'N/A'}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(row.status)}`}>
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
                        <button
                          onClick={() => handleSendReminder(row)}
                          disabled={sending}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-70"
                        >
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                          Send Reminder
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
