import { useEffect, useState } from 'react';
import { X, CheckCircle2, Loader2, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api/client';
import { useUserStore } from '../store/useUserStore';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const navigate = useNavigate();
  const { token } = useUserStore();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [qrData, setQrData] = useState<VietQRData | null>(null);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-5xl rounded-2xl bg-white p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
        <button
          onClick={() => {
            onClose();
            setQrData(null);
          }}
          className="absolute right-4 top-4 rounded-lg p-2 transition-colors hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-6 w-6 text-gray-600" />
        </button>

        {!qrData ? (
          <>
            <h2 className="mb-2 text-3xl font-bold text-gray-800">Thanh toan bang VietQR</h2>
            <p className="mb-6 text-sm text-gray-500">
              Chon goi VIP ben duoi. He thong se tao ma VietQR voi so tien va noi dung chuyen khoan.
            </p>

            {isLoadingPlans ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-red-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {plans.map((plan) => (
                  <div
                    key={plan._id}
                    className={`relative flex flex-col rounded-2xl border-2 bg-white p-6 shadow-sm ${plan.ui.borderColor}`}
                  >
                    {plan.ui.badge ? (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                        {plan.ui.badge}
                      </div>
                    ) : null}

                    <h3 className="mb-2 text-xl font-semibold text-gray-700">{plan.name}</h3>
                    <p className="mb-4 text-3xl font-bold text-gray-900">
                      {plan.price === 0 ? 'Mien phi' : `${plan.price.toLocaleString('vi-VN')}d`}
                    </p>

                    <ul className="mb-6 flex-grow space-y-1 text-sm text-gray-600">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center">
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleCreateVietQR(plan)}
                      disabled={plan.code === 'FREE' || processingPlanId !== null}
                      className={`mt-auto flex items-center justify-center gap-2 rounded-lg px-4 py-2 transition ${plan.ui.buttonColor} ${
                        plan.code === 'FREE' || processingPlanId !== null
                          ? 'cursor-not-allowed opacity-60'
                          : ''
                      }`}
                    >
                      {processingPlanId === plan.code ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Dang tao ma QR...
                        </>
                      ) : (
                        <>
                          <QrCode className="h-4 w-4" />
                          Thanh toan ngay
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="mx-auto max-w-md text-center">
            <h2 className="mb-2 text-3xl font-bold text-gray-800">Quet ma de thanh toan</h2>
            <p className="mb-6 text-gray-600">Quet ma QR bang ung dung ngan hang cua ban.</p>

            <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <img
                src={qrData.qrUrl}
                alt="VietQR thanh toan"
                className="mx-auto h-72 w-72 rounded-lg object-contain"
              />
            </div>

            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
              <p className="mb-2 text-sm text-gray-700">
                <span className="font-semibold">Goi:</span> {qrData.planName}
              </p>
              <p className="mb-2 text-sm text-gray-700">
                <span className="font-semibold">So tien:</span> {qrData.amount.toLocaleString('vi-VN')}d
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Noi dung CK:</span> {qrData.orderId}
              </p>
            </div>

            <button
              onClick={handlePaidClick}
              className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-emerald-700"
            >
              Tôi đã thanh toán
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
