import { useEffect, useState } from 'react';
import { X, CheckCircle2, Loader2, QrCode, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api/client';
import { useUserStore } from '../store/useUserStore';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Giá gói hiện tại của user — chỉ hiển thị những gói có giá cao hơn. Nếu undefined, hiển thị tất cả. */
  currentPlanPrice?: number;
}

interface Plan {
  _id: string;
  code: string;
  name: string;
  price: number;
  features: string[];
  ui: {
    borderColor: string;
    buttonText: string;
    buttonColor: string;
    badge: string;
  };
}

interface VietQRData {
  qrUrl: string;
  orderId: string;
  amount: number;
  planName: string;
}

export default function CheckoutModal({ isOpen, onClose, currentPlanPrice }: CheckoutModalProps) {
  const navigate = useNavigate();
  const { token } = useUserStore();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [qrData, setQrData] = useState<VietQRData | null>(null);

  // Không filter — luôn hiển thị tất cả gói, chỉ đánh dấu unavailable
  const displayPlans = plans;
  const isUnavailable = (plan: Plan) =>
    currentPlanPrice !== undefined && plan.price <= currentPlanPrice;

  useEffect(() => {
    if (!isOpen) return;
    fetchPlans();
  }, [isOpen]);

  const fetchPlans = async () => {
    setIsLoadingPlans(true);
    try {
      const resp = await apiClient.get('/billing/plans');
      setPlans(resp.data.data || []);
    } catch (err: any) {
      console.error('Fetch plans error:', err.response || err.message);
      toast.error('Khong the tai danh sach goi cuoc.');
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handleCreateVietQR = async (plan: Plan) => {
    if (plan.code === 'FREE') return;

    if (!token) {
      toast.error('Ban can dang nhap de mua goi VIP.');
      return;
    }

    if (processingPlanId) return;

    setProcessingPlanId(plan.code);

    try {
      const resp = await apiClient.post('/payment/create-vietqr', {
        planId: plan.code,
        amount: plan.price,
      });

      if (resp.data?.success && resp.data?.qrUrl && resp.data?.orderId) {
        setQrData({
          qrUrl: resp.data.qrUrl,
          orderId: resp.data.orderId,
          amount: resp.data.amount || plan.price,
          planName: plan.name,
        });
        return;
      }

      toast.error('Khong tao duoc ma VietQR. Vui long thu lai.');
    } catch (err: any) {
      console.error('Create VietQR error:', err.response || err.message);
      toast.error(err.response?.data?.message || 'Khong the khoi tao thanh toan VietQR.');
    } finally {
      setProcessingPlanId(null);
    }
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
      setQrData(null);
    }
  };

  const handlePaidClick = () => {
    onClose();
    setQrData(null);
    navigate('/payment-pending');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Gradient (Đồng bộ với Sidebar) */}
        <div className="relative shrink-0 bg-gradient-to-br from-[#E31837] to-[#ff6b35] p-4 pb-6 text-center">
          <button
            onClick={() => {
              onClose();
              setQrData(null);
            }}
            className="absolute right-4 top-4 rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex justify-center mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shadow-inner">
              <Crown className="h-6 w-6 text-yellow-300 drop-shadow-md" />
            </div>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide uppercase drop-shadow-sm">
            {!qrData ? 'Nâng cấp tài khoản VIP' : 'Thanh toán bằng VietQR'}
          </h2>
          <p className="mt-1 text-xs md:text-sm text-red-50 font-medium max-w-2xl mx-auto">
            {!qrData 
              ? 'Mở khóa toàn bộ tính năng cao cấp (Writing, Speaking, Video bài giảng) để tăng tốc luyện thi IELTS.' 
              : 'Quét mã QR bằng ứng dụng ngân hàng để hoàn tất việc nâng cấp.'}
          </p>
        </div>

        {/* Badge giao thoa (Đồng bộ với Sidebar) */}
        <div className="relative -mt-4 flex justify-center shrink-0 z-10">
          <span className="rounded-full bg-amber-100 px-4 py-1 text-xs font-bold text-amber-700 shadow-sm ring-2 ring-white flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5" />
            {!qrData ? 'Chọn gói cước' : 'Quét mã QR'}
          </span>
        </div>

        {/* Body content */}
        <div className="p-4 bg-slate-50 flex-1 overflow-y-auto">
          {!qrData ? (
            <>
              {isLoadingPlans ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#E31837]" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 max-w-4xl mx-auto">
                  {displayPlans.map((plan) => {
                    const unavailable = isUnavailable(plan);
                    return (
                    <div
                      key={plan._id}
                      className={`relative flex flex-col rounded-2xl border-2 bg-white p-4 shadow-sm transition-all duration-300 ${
                        unavailable
                          ? 'opacity-60 grayscale'
                          : 'hover:shadow-md hover:-translate-y-1'
                      } ${plan.ui.borderColor || 'border-slate-200'}`}
                    >
                      {/* Badge góc trên */}
                      {unavailable ? (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-400 px-3 py-1 text-xs font-bold text-white shadow-sm whitespace-nowrap">
                          Không khả dụng
                        </div>
                      ) : plan.ui.badge ? (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#E31837] to-[#ff4e1a] px-3 py-1 text-xs font-bold text-white shadow-sm whitespace-nowrap">
                          {plan.ui.badge}
                        </div>
                      ) : null}

                      <h3 className="mb-1 text-lg font-bold text-slate-800 text-center">{plan.name}</h3>
                      <div className="mb-4 text-center">
                        <span className="text-2xl font-extrabold text-slate-900">
                          {plan.price === 0 ? 'Miễn phí' : `${plan.price.toLocaleString('vi-VN')}đ`}
                        </span>
                        {plan.price > 0 && <span className="text-xs text-slate-500 font-medium ml-1">/ gói</span>}
                      </div>

                      <ul className="mb-4 flex-grow space-y-2 text-xs text-slate-600">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 leading-relaxed">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <span className="font-medium">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => !unavailable && handleCreateVietQR(plan)}
                        disabled={unavailable || processingPlanId !== null}
                        className={`mt-auto flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-white shadow-sm transition-all duration-200 ${
                          unavailable
                            ? 'cursor-not-allowed bg-slate-300'
                            : plan.ui.buttonColor
                            ? `bg-gradient-to-r ${plan.ui.buttonColor} hover:shadow-md hover:-translate-y-0.5`
                            : 'bg-gradient-to-r from-slate-400 to-slate-500'
                        } ${processingPlanId !== null && !unavailable ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {processingPlanId === plan.code ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Đang xử lý...
                          </>
                        ) : unavailable ? (
                          plan.price === 0 ? 'Đang sử dụng' : 'Không khả dụng'
                        ) : (
                          <>
                            <QrCode className="h-5 w-5" />
                            Nâng cấp ngay
                          </>
                        )}
                      </button>
                    </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="mx-auto max-w-3xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Left column - QR Code */}
                <div className="flex flex-col items-center justify-center">
                  <div className="w-full max-w-[300px] overflow-hidden rounded-2xl border-2 border-[#E31837]/20 bg-white p-2 shadow-lg">
                    <img
                      src={qrData.qrUrl}
                      alt="VietQR thanh toán"
                      className="mx-auto w-full aspect-square rounded-xl object-contain"
                    />
                  </div>
                </div>

                {/* Right column - Info & Action */}
                <div className="flex flex-col justify-center">
                  <h3 className="text-lg font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">
                    Thông tin chuyển khoản
                  </h3>
                  
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-left shadow-inner">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-amber-200/50 pb-2">
                        <span className="text-xs font-medium text-amber-700">Gói nâng cấp:</span>
                        <span className="font-bold text-slate-800 text-sm">{qrData.planName}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-amber-200/50 pb-2">
                        <span className="text-xs font-medium text-amber-700">Số tiền:</span>
                        <span className="text-lg font-extrabold text-[#E31837]">
                          {qrData.amount.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5 pt-1">
                        <span className="text-xs font-medium text-amber-700">Nội dung chuyển khoản (Bắt buộc):</span>
                        <span className="font-mono text-base tracking-wider font-bold text-center text-slate-800 bg-white px-3 py-2 rounded-lg border border-amber-200 shadow-sm select-all">
                          {qrData.orderId}
                        </span>
                        <p className="text-[10px] text-center text-amber-600 mt-0.5 italic">
                          *Vui lòng nhập chính xác nội dung để hệ thống duyệt tự động
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePaidClick}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-300 hover:-translate-y-0.5 flex justify-center items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Tôi đã chuyển khoản thành công
                  </button>
                  
                  <p className="mt-3 text-xs text-center text-slate-500 bg-slate-100 p-2 rounded-lg">
                    Hệ thống sẽ cập nhật gói trong <span className="font-bold text-slate-700">1-3 phút</span>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
