import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CheckCircle, Search, XCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useUserStore } from '../../store/useUserStore';

type TransactionStatus = 'Pending' | 'Success' | 'Failed' | 'Rejected';

interface TransactionItem {
  _id: string;
  orderId: string;
  userId?: {
    fullName?: string;
    name?: string;
    email?: string;
  };
  planId: string;
  amount: number;
  status: TransactionStatus;
  createdAt: string;
}

const getApiBaseUrl = () => {
  const nextPublicApiUrl =
    typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_URL : undefined;
  const viteApiUrl = (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL;

  return (nextPublicApiUrl || viteApiUrl || '').replace(/\/$/, '');
};

const getTransactionsApiBase = () => {
  const base = getApiBaseUrl();
  if (base.endsWith('/api')) return `${base}/payment/transactions`;
  return `${base}/api/payment/transactions`;
};

const getAuthHeaders = (token: string | null) => ({
  Authorization: `Bearer ${token || localStorage.getItem('accessToken') || ''}`,
});

const statusBadgeClassMap: Record<TransactionStatus, string> = {
  Pending: 'bg-amber-100 text-amber-800 border border-amber-200',
  Success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  Failed: 'bg-rose-100 text-rose-800 border border-rose-200',
  Rejected: 'bg-rose-100 text-rose-800 border border-rose-200',
};

const statusLabelMap: Record<TransactionStatus, string> = {
  Pending: 'Chờ xử lý',
  Success: 'Thành công',
  Failed: 'Thất bại',
  Rejected: 'Từ chối',
};

const formatVND = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`;

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

export function TransactionManagement() {
  const { token } = useUserStore();

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | TransactionStatus>('All');

  const transactionsApiBase = getTransactionsApiBase();

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(transactionsApiBase, {
        headers: getAuthHeaders(token),
      });

      const payload = response.data?.data || response.data?.transactions || response.data;
      setTransactions(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Không thể tải danh sách giao dịch.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTransactions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const customerEmail = (transaction.userId?.email || '').toLowerCase();
      const orderId = (transaction.orderId || '').toLowerCase();

      const matchesSearch =
        query.length === 0 || orderId.includes(query) || customerEmail.includes(query);

      const matchesStatus = statusFilter === 'All' || transaction.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchTerm, statusFilter]);

  const handleApprove = async (transactionId: string) => {
    setIsProcessing((prev) => ({ ...prev, [transactionId]: true }));
    try {
      await axios.put(
        `${transactionsApiBase}/${transactionId}/approve`,
        {},
        { headers: getAuthHeaders(token) }
      );

      setTransactions((prev) =>
        prev.map((transaction) =>
          transaction._id === transactionId
            ? {
                ...transaction,
                status: 'Success',
              }
            : transaction
        )
      );

      toast.success('Duyệt thành công, học viên đã được lên VIP!');
    } catch (error) {
      console.error('Approve transaction failed:', error);
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Không thể duyệt giao dịch.';
      toast.error(message);
    } finally {
      setIsProcessing((prev) => ({ ...prev, [transactionId]: false }));
    }
  };

  const handleReject = async (transactionId: string) => {
    setIsProcessing((prev) => ({ ...prev, [transactionId]: true }));
    try {
      await axios.put(
        `${transactionsApiBase}/${transactionId}/reject`,
        {},
        { headers: getAuthHeaders(token) }
      );

      setTransactions((prev) =>
        prev.map((transaction) =>
          transaction._id === transactionId
            ? {
                ...transaction,
                status: 'Failed',
              }
            : transaction
        )
      );

      toast.success('Đã từ chối giao dịch.');
    } catch (error) {
      console.error('Reject transaction failed:', error);
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Không thể từ chối giao dịch.';
      toast.error(message);
    } finally {
      setIsProcessing((prev) => ({ ...prev, [transactionId]: false }));
    }
  };

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Quản lý Giao dịch</h2>
            <p className="mt-2 text-sm text-slate-500">
              Đối soát chuyển khoản VietQR và duyệt thủ công cho học viên.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm theo mã đơn hoặc email..."
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'All' | TransactionStatus)
              }
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
            >
              <option value="All">Tất cả trạng thái</option>
              <option value="Pending">Pending</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-16 text-center text-slate-500">Đang tải dữ liệu giao dịch...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-4 font-semibold">Mã đơn</th>
                  <th className="px-4 py-4 font-semibold">Khách hàng</th>
                  <th className="px-4 py-4 font-semibold">Gói đăng ký</th>
                  <th className="px-4 py-4 font-semibold">Số tiền</th>
                  <th className="px-4 py-4 font-semibold">Ngày tạo</th>
                  <th className="px-4 py-4 font-semibold">Trạng thái</th>
                  <th className="px-4 py-4 font-semibold">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                      Không tìm thấy giao dịch phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => {
                    const isPending = transaction.status === 'Pending';
                    const loading = !!isProcessing[transaction._id];
                    const customerName =
                      transaction.userId?.fullName || transaction.userId?.name || 'Không rõ';
                    const customerEmail = transaction.userId?.email || '-';

                    return (
                      <tr
                        key={transaction._id}
                        className="border-b border-slate-100 align-middle transition hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-4">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {transaction.orderId}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">{customerName}</p>
                          <p className="text-sm text-slate-500">{customerEmail}</p>
                        </td>

                        <td className="px-4 py-4 text-sm font-medium text-slate-800">{transaction.planId}</td>

                        <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                          {formatVND(Number(transaction.amount || 0))}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {formatDateTime(transaction.createdAt)}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClassMap[transaction.status] || statusBadgeClassMap.Failed}`}
                          >
                            {statusLabelMap[transaction.status] || transaction.status}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {isPending ? (
                            <div className="flex items-center gap-2">
                              <button
                                title="Xác nhận đã nhận tiền"
                                disabled={loading}
                                onClick={() => handleApprove(transaction._id)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>

                              <button
                                title="Từ chối / Hủy"
                                disabled={loading}
                                onClick={() => handleReject(transaction._id)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Đã xử lý</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
