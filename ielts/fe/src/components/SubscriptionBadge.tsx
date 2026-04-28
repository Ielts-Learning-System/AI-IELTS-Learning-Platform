import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Calendar,
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  Crown,
} from 'lucide-react';
import { apiClient } from '../lib/api/client';
import { useUserStore } from '../store/useUserStore';

// ============ TYPES ============

interface PlanInfo {
  plan: string;       // plan code: 'FREE' | 'PLUS' | 'PRO'
  planName: string;   // tên hiển thị từ DB
  allowedSkills: string[];
  isPro: boolean;
}

interface Subscription {
  _id: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  validUntil: string;
  daysRemaining?: number;
  planId?: {
    _id: string;
    name: string;
    code: string;
    features?: string[];
    benefits?: { skills?: string[] };
  };
}

interface SubscriptionBadgeProps {
  onUpgradeClick?: () => void;
  onManageClick?: () => void;
}

// ============ UTILITIES ============

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const getPlanBadgeColor = (code?: string) => {
  switch (code?.toUpperCase()) {
    case 'PRO':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'PLUS':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300';
  }
};

const getPlanEmoji = (code?: string) => {
  switch (code?.toUpperCase()) {
    case 'PRO':  return '🌟';
    case 'PLUS': return '✨';
    default:     return '📚';
  }
};

const getPlanBadgeButtonColor = (code?: string) => {
  switch (code?.toUpperCase()) {
    case 'PRO':
      return 'from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700';
    case 'PLUS':
      return 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700';
    default:
      return 'from-[#E31837] to-rose-600 hover:from-rose-600 hover:to-rose-700';
  }
};

const getStatusBadge = (status: string | undefined) => {
  if (status === 'ACTIVE') {
    return {
      text: 'Đang hoạt động',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      icon: <Zap className="h-3 w-3" />,
    };
  }
  if (status === 'EXPIRED') {
    return {
      text: 'Đã hết hạn',
      color: 'bg-rose-100 text-rose-700 border-rose-300',
      icon: <Clock className="h-3 w-3" />,
    };
  }
  if (status === 'CANCELLED') {
    return {
      text: 'Đã hủy',
      color: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: <ArrowRight className="h-3 w-3" />,
    };
  }
  // FREE — không có subscription
  return {
    text: 'Gói miễn phí',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: <Crown className="h-3 w-3" />,
  };
};

// ============ MAIN COMPONENT ============

export function SubscriptionBadge({
  onUpgradeClick,
  onManageClick,
}: SubscriptionBadgeProps) {
  const { token } = useUserStore();

  // Thông tin plan từ /my-skills (luôn trả 200)
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  // Thông tin subscription chi tiết (có thể null nếu FREE)
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);

  // ── Fetch dữ liệu ─────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const abortController = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      try {
        // --- Bước 1: Gọi /my-skills để lấy allowedSkills (luôn trả 200) ---
        const skillsResp = await apiClient.get('/billing/my-skills', {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
        });
        const skillsData = skillsResp.data?.data;

        setPlanInfo({
          plan: skillsData?.plan || 'FREE',
          planName: skillsData?.planName || 'Gói Miễn Phí',
          allowedSkills: skillsData?.allowedSkills || [],
          isPro: skillsData?.isPro === true,
        });

        // --- Bước 2: Gọi /my-subscription để lấy thông tin chi tiết ---
        // Luôn trả 200: data = subscription object (nếu có) hoặc null (user FREE)
        const subResp = await apiClient.get('/billing/my-subscription', {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
        });
        const subData = subResp.data?.data;

        // data: null + planFallback = user FREE, không có subscription record
        if (subData && subData.status === 'ACTIVE') {
          setSubscription(subData);
        } else {
          setSubscription(null);
        }
      } catch (error: any) {
        if (error.name === 'CanceledError' || error.message === 'canceled') {
          return; // Bỏ qua lỗi hủy request
        }
        console.error('[SubscriptionBadge] Failed to fetch plan info:', error);
        setPlanInfo({ plan: 'FREE', planName: 'Gói Miễn Phí', allowedSkills: [], isPro: false });
        setSubscription(null);
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [token]);

  // ── Đóng dropdown khi click ngoài ────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        badgeRef.current &&
        !badgeRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Dữ liệu hiển thị — ưu tiên subscription.planId nếu có, fallback về planInfo
  const planCode = subscription?.planId?.code || planInfo?.plan || 'FREE';
  const planName = subscription?.planId?.name || planInfo?.planName || 'Gói Miễn Phí';
  const displaySkills =
    subscription?.planId?.benefits?.skills ||
    subscription?.planId?.features ||
    planInfo?.allowedSkills ||
    [];
  const statusBadge = getStatusBadge(subscription?.status);
  const isFreeOrInactive = !subscription || subscription.status !== 'ACTIVE';

  // ── Loading skeleton ──────────────────────────────────────────
  if (loading) {
    return <div className="h-9 w-24 bg-slate-200 rounded-full animate-pulse" />;
  }

  return (
    <div className="relative">
      {/* BADGE TRIGGER */}
      <button
        ref={badgeRef}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-current
          transition-all duration-200 text-sm font-semibold hover:shadow-md
          ${getPlanBadgeColor(planCode)}`}
      >
        <span>{getPlanEmoji(planCode)}</span>
        <span>{planName}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            isDropdownOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* DROPDOWN POPOVER */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in duration-150"
        >
          {/* Header */}
          <div className={`p-4 bg-gradient-to-r ${getPlanBadgeButtonColor(planCode)}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{getPlanEmoji(planCode)}</span>
                {planName}
              </h3>
              <div
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-semibold ${statusBadge.color}`}
              >
                {statusBadge.icon}
                {statusBadge.text}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* Dates Section — chỉ hiện khi có subscription ACTIVE */}
            {subscription?.status === 'ACTIVE' && (
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Ngày bắt đầu</p>
                    <p className="text-slate-900 font-medium">{formatDate(subscription.createdAt)}</p>
                  </div>
                </div>

                {subscription.validUntil ? (
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Hết hạn</p>
                      <div className="flex items-center justify-between">
                        <p className="text-slate-900 font-medium">{formatDate(subscription.validUntil)}</p>
                        {subscription.daysRemaining !== undefined && (
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {subscription.daysRemaining} ngày
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Thời hạn</p>
                      <p className="text-slate-900 font-medium">Vĩnh viễn</p>
                    </div>
                  </div>
                )}

                <div className="h-px bg-slate-100" />
              </div>
            )}

            {/* Skills / Benefits */}
            {displaySkills.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">
                  Kỹ năng được mở khóa
                </p>
                <ul className="space-y-2">
                  {displaySkills.map((skill, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span className="capitalize">{skill}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              /* FREE — không có skill nào */
              <div className="text-center py-2">
                <p className="text-sm text-slate-500">
                  Nâng cấp để mở khóa các kỹ năng luyện thi IELTS.
                </p>
              </div>
            )}

            {displaySkills.length > 0 && <div className="h-px bg-slate-100" />}

            {/* Action Button */}
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                if (isFreeOrInactive && onUpgradeClick) {
                  onUpgradeClick();
                } else if (!isFreeOrInactive && onManageClick) {
                  onManageClick();
                }
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                font-semibold text-white transition-all duration-200 bg-gradient-to-r
                ${getPlanBadgeButtonColor(planCode)}`}
            >
              <Zap className="h-4 w-4" />
              {isFreeOrInactive ? 'Nâng cấp gói 🚀' : 'Quản lý gói'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionBadge;
