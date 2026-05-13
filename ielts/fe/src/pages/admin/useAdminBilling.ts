import { useCallback } from 'react';
import axios from 'axios';

export type PlanSkill = 'reading' | 'listening' | 'writing' | 'speaking';

export interface BillingPlan {
  _id: string;
  code: string;
  name: string;
  price: number;
  durationMonths: number;
  isActive: boolean;
  features?: string[];
  benefits?: {
    skills?: PlanSkill[];
  };
  ui?: {
    borderColor?: string;
    buttonText?: string;
    buttonColor?: string;
    badge?: string;
  };
}

export interface BillingSubscription {
  _id: string;
  userId: string | { _id?: string; id?: string; name?: string; email?: string };
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'FREE';
  validUntil: string;
  daysRemaining?: number;
  planId?: {
    _id?: string;
    name?: string;
    durationMonths?: number;
  };
}

const getGatewayBillingBaseUrl = () => {
  const envBase =
    (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_URL : undefined) ||
    (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL ||
    'http://localhost:3000';

  return `${envBase.replace(/\/$/, '')}/billing`;
};

const getAuthHeaders = (token?: string | null) => {
  const resolvedToken =
    token || localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
  return resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {};
};

export const useAdminBilling = (token?: string | null) => {
  const baseUrl = getGatewayBillingBaseUrl();

  const fetchPlans = useCallback(async (): Promise<BillingPlan[]> => {
    const { data } = await axios.get(`${baseUrl}/admin/plans`, {
      headers: getAuthHeaders(token),
    });
    return data?.data || [];
  }, [baseUrl, token]);

  const createPlan = useCallback(
    async (payload: Omit<BillingPlan, '_id'>) => {
      const { data } = await axios.post(`${baseUrl}/admin/plans`, payload, {
        headers: getAuthHeaders(token),
      });
      return data?.data as BillingPlan;
    },
    [baseUrl, token]
  );

  const updatePlan = useCallback(
    async (planId: string, payload: Partial<Omit<BillingPlan, '_id'>>) => {
      const { data } = await axios.put(`${baseUrl}/admin/plans/${planId}`, payload, {
        headers: getAuthHeaders(token),
      });
      return data?.data as BillingPlan;
    },
    [baseUrl, token]
  );

  const togglePlanActive = useCallback(
    async (planId: string) => {
      const { data } = await axios.patch(
        `${baseUrl}/admin/plans/${planId}/toggle-active`,
        {},
        { headers: getAuthHeaders(token) }
      );
      return data?.data as BillingPlan;
    },
    [baseUrl, token]
  );

  const fetchSubscriptions = useCallback(async (): Promise<BillingSubscription[]> => {
    const { data } = await axios.get(`${baseUrl}/admin/subscriptions`, {
      headers: getAuthHeaders(token),
    });
    return data?.data || [];
  }, [baseUrl, token]);

  const sendReminder = useCallback(
    async (userId: string) => {
      const { data } = await axios.post(
        `${baseUrl}/admin/remind/${userId}`,
        {},
        { headers: getAuthHeaders(token) }
      );
      return data;
    },
    [baseUrl, token]
  );

  const cancelSubscription = useCallback(
    async (
      subscriptionId: string,
      reason: 'POLICY_VIOLATION' | 'SYSTEM_ERROR' | 'USER_REQUEST_REFUND',
      editedTitle: string,
      editedMessage: string
    ) => {
      const { data } = await axios.post(
        `${baseUrl}/admin/subscriptions/${subscriptionId}/cancel`,
        { reason, editedTitle, editedMessage },
        { headers: getAuthHeaders(token) }
      );
      return data?.data as BillingSubscription;
    },
    [baseUrl, token]
  );

  const restoreSubscription = useCallback(
    async (subscriptionId: string) => {
      const { data } = await axios.post(
        `${baseUrl}/admin/subscriptions/${subscriptionId}/restore`,
        {},
        { headers: getAuthHeaders(token) }
      );
      return data?.data as BillingSubscription;
    },
    [baseUrl, token]
  );

  return {
    fetchPlans,
    createPlan,
    updatePlan,
    togglePlanActive,
    fetchSubscriptions,
    sendReminder,
    cancelSubscription,
    restoreSubscription,
  };
};
