import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useUserStore } from '../store/useUserStore';

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
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const resp = await axios.get('http://localhost:3000/api/billing/plans');
      setPlans(resp.data.data);
    } catch (err: any) {
      console.error('Fetch plans error', err.response || err.message);
      toast.error('Không thể tải danh sách gói cước');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (planCode: string) => {
    if (planCode === 'FREE') return;
    if (!token) {
      toast.error('Bạn cần đăng nhập để nâng cấp');
      return;
    }
    setLoadingPlan(planCode);
    try {
      await axios.post(
        'http://localhost:3000/api/billing/upgrade',
        { plan: planCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Nâng cấp thành công!');
      onClose();
    } catch (err: any) {
      console.error('Upgrade error', err.response || err.message);
      toast.error(err.response?.data?.message || 'Không thể nâng cấp, thử lại');
    } finally {
      setLoadingPlan(null);
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
                  onClick={() => handleUpgrade(plan.code)}
                  disabled={loadingPlan === plan.code || plan.code === 'FREE'}
                  className={`mt-auto px-4 py-2 rounded-lg transition ${plan.ui.buttonColor} ${
                    plan.code === 'FREE' ? 'cursor-not-allowed' : ''
                  }`}
                >
                  {loadingPlan === plan.code ? 'Đang xử lý...' : plan.ui.buttonText}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}