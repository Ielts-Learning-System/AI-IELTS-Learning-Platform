import { useState, useEffect } from 'react';
import { X, Check, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserStore } from '../store/useUserStore';
import { apiClient } from '../lib/api/client';

interface UpgradeModalProps {
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

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { token } = useUserStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const resp = await apiClient.get('/billing/plans');
      setPlans(resp.data.data);
    } catch (err: any) {
      console.error('Fetch plans error', err.response || err.message);
      toast.error('Không thể tải danh sách gói cước');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async (planId: string, price: number) => {
    if (planId === 'FREE') return;
    if (!token) {
      toast.error('Bạn cần đăng nhập để nâng cấp');
      return;
    }
    // Chống click đúp — nếu đang xử lý 1 gói thì block toàn bộ
    if (processingPlanId) return;

    setProcessingPlanId(planId);
    try {
      const resp = await apiClient.post('/payment/create', {
        planId,
        amount: price,
      });

      if (resp.data.success && resp.data.payUrl) {
        // Redirect sang trang thanh toán MoMo
        window.location.href = resp.data.payUrl;
        return; // Không reset state — trang sẽ navigate đi
      }

      toast.error('Không nhận được link thanh toán từ MoMo.');
      setProcessingPlanId(null);
    } catch (err: any) {
      console.error('Payment error', err.response || err.message);
      toast.error(
        err.response?.data?.message || 'Không thể khởi tạo thanh toán. Vui lòng thử lại sau.'
      );
      setProcessingPlanId(null);
    }
  };

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-8 overflow-auto animate-in fade-in zoom-in duration-200">
        {/* close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <h2 className="text-3xl font-bold text-gray-800 mb-6">
          Nâng cấp tài khoản IELTS Master
        </h2>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan._id}
                className={`relative rounded-2xl border-2 p-8 bg-white shadow-sm flex flex-col ${plan.ui.borderColor}`}
              >
                {plan.ui.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    {plan.ui.badge}
                  </div>
                )}
                <h3 className="text-xl font-semibold text-gray-700 mb-2">{plan.name}</h3>
                <p className="text-4xl font-bold text-gray-800 mb-4">
                  {plan.price === 0 ? 'Miễn phí' : `${plan.price.toLocaleString('vi-VN')}đ`}
                </p>
                <ul className="space-y-1 mb-6 text-sm text-gray-600 flex-grow">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePayment(plan.code, plan.price)}
                  disabled={plan.code === 'FREE' || processingPlanId !== null}
                  className={`mt-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition ${plan.ui.buttonColor} ${
                    plan.code === 'FREE' || processingPlanId !== null ? 'cursor-not-allowed opacity-60' : ''
                  }`}
                >
                  {processingPlanId === plan.code ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Đang chuyển hướng...
                    </>
                  ) : (
                    plan.ui.buttonText
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}