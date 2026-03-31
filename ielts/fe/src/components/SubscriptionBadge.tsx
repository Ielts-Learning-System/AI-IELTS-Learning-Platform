import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Calendar,
  CheckCircle2,
  Clock,
  Zap,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../lib/api/client';
import { useUserStore } from '../store/useUserStore';

interface Plan {
  _id: string;
  name: string;
  code: string;
  durationMonths?: number;
  features?: string[];
  benefits?: {
    skills?: string[];
  };
}

interface Subscription {
  _id: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  validUntil: string;
  planId?: Plan;
  daysRemaining?: number;
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
    case 'FREE':
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300';
  }
};

const getPlanEmoji = (code?: string) => {
  switch (code?.toUpperCase()) {
    case 'PRO':
      return '🌟';
    case 'PLUS':
      return '✨';
    case 'FREE':
    default:
      return '📚';
  }
};

const getPlanBadgeButtonColor = (code?: string) => {
  switch (code?.toUpperCase()) {
    case 'PRO':
      return 'from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700';
    case 'PLUS':
      return 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700';
    case 'FREE':
    default:
      return 'from-slate-400 to-slate-600 hover:from-slate-500 hover:to-slate-700';
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
  return {
    text: 'Đã hủy',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: <ArrowRight className="h-3 w-3" />,
  };
};

// ============ MAIN COMPONENT ============
export function SubscriptionBadge({
  onUpgradeClick,
  onManageClick,
}: SubscriptionBadgeProps) {
  const { token } = useUserStore();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);

  // Fetch subscription on mount
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const resp = await apiClient.get('/billing/my-subscription', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = resp.data?.data;

        // Fallback logic: treat as FREE if no data or invalid status
        if (
          !data ||
          data.status === 'CANCELLED' ||
          data.status === 'EXPIRED'
        ) {
          setSubscription(null);
        } else {
          setSubscription(data);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
        // Fallback to FREE on error
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [token]);

  // Close dropdown on outside click
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

  const plan = subscription?.planId;
  const planCode = plan?.code || 'FREE';
  const planName = plan?.name || 'GÓI FREE';
  const statusBadge = getStatusBadge(subscription?.status);
  const isFreeOrInactive =
    !subscription || subscription.status !== 'ACTIVE';

  // ============ LOADING SKELETON ============
  if (loading) {
    return (
      <div className="h-9 w-24 bg-slate-200 rounded-full animate-pulse" />
    );
  }

  return (
    <div className="relative">
      {/* BADGE TRIGGER */}
      <button
        ref={badgeRef}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-current transition-all duration-200 text-sm font-semibold ${getPlanBadgeColor(
          planCode
        )} hover:shadow-md`}
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
            {/* Dates Section */}
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Ngày bắt đầu
                  </p>
                  <p className="text-slate-900 font-medium">
                    {formatDate(subscription?.createdAt)}
                  </p>
                </div>
              </div>

              {subscription?.status === 'ACTIVE' && subscription?.validUntil ? (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase">
                      Hết hạn
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-slate-900 font-medium">
                        {formatDate(subscription.validUntil)}
                      </p>
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
                    <p className="text-xs font-semibold text-slate-500 uppercase">
                      Thời hạn sử dụng
                    </p>
                    <p className="text-slate-900 font-medium">Vĩnh viễn</p>
                  </div>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-100" />

            {/* Benefits Section */}
            {plan?.features && plan.features.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">
                  Quyền lợi
                </p>
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ) : plan?.benefits?.skills && plan.benefits.skills.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">
                  Kỹ năng
                </p>
                <ul className="space-y-2">
                  {plan.benefits.skills.map((skill, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Divider */}
            {(plan?.features?.length || plan?.benefits?.skills?.length) && (
              <div className="h-px bg-slate-100" />
            )}

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
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-white transition-all duration-200 bg-gradient-to-r ${getPlanBadgeButtonColor(
                planCode
              )}`}
            >
              <Zap className="h-4 w-4" />
              {isFreeOrInactive ? 'Nâng cấp gói' : 'Quản lý gói'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionBadge;
