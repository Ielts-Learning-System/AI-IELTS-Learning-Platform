import { useEffect, useState } from 'react';
import { apiClient } from '../lib/api/client';

type AdminDashboardStats = {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  totalTestsTaken: number;
  bySkill: {
    reading: number;
    listening: number;
    writing: number;
    speaking: number;
  };
  serviceUp: {
    users: boolean;
    billing: boolean;
    reading: boolean;
    listening: boolean;
    writing: boolean;
    speaking: boolean;
  };
};

const initialStats: AdminDashboardStats = {
  totalUsers: 0,
  activeSubscriptions: 0,
  totalRevenue: 0,
  totalTestsTaken: 0,
  bySkill: {
    reading: 0,
    listening: 0,
    writing: 0,
    speaking: 0,
  },
  serviceUp: {
    users: false,
    billing: false,
    reading: false,
    listening: false,
    writing: false,
    speaking: false,
  },
};

const asNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function useAdminDashboardStats() {
  const [stats, setStats] = useState<AdminDashboardStats>(initialStats);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      setIsLoading(true);
      const results = await Promise.allSettled([
        apiClient.get('/users/stats'),
        apiClient.get('/billing/admin/stats'),
        apiClient.get('/reading/stats'),
        apiClient.get('/listening/stats'),
        apiClient.get('/writing/submissions/stats'),
        apiClient.get('/speaking/stats'),
      ]);

      if (cancelled) return;

      const users = results[0].status === 'fulfilled' ? results[0].value.data?.data : null;
      const billing = results[1].status === 'fulfilled' ? results[1].value.data?.data : null;
      const reading = results[2].status === 'fulfilled' ? results[2].value.data?.data : null;
      const listening = results[3].status === 'fulfilled' ? results[3].value.data?.data : null;
      const writing = results[4].status === 'fulfilled' ? results[4].value.data?.data : null;
      const speaking = results[5].status === 'fulfilled' ? results[5].value.data?.data : null;

      const bySkill = {
        reading: asNumber(reading?.totalAttempts),
        listening: asNumber(listening?.totalAttempts),
        writing: asNumber(writing?.totalSubmissions),
        speaking: asNumber(speaking?.totalSubmissions),
      };

      setStats({
        totalUsers: asNumber(users?.totalUsers),
        activeSubscriptions: asNumber(billing?.activeSubscriptions),
        totalRevenue: asNumber(billing?.totalRevenue),
        totalTestsTaken: bySkill.reading + bySkill.listening + bySkill.writing + bySkill.speaking,
        bySkill,
        serviceUp: {
          users: results[0].status === 'fulfilled',
          billing: results[1].status === 'fulfilled',
          reading: results[2].status === 'fulfilled',
          listening: results[3].status === 'fulfilled',
          writing: results[4].status === 'fulfilled',
          speaking: results[5].status === 'fulfilled',
        },
      });

      setIsLoading(false);
    };

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, isLoading };
}
