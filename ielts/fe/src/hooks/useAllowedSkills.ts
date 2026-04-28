/**
 * @file useAllowedSkills.ts
 * @description Custom hook lấy danh sách kỹ năng được phép của user.
 *
 * Luồng (Single Source of Truth):
 *   user.plan (stored on User) → GET /billing/my-skills → plan.benefits.skills
 *
 * Cơ chế:
 *   - Fetch ngay khi mount
 *   - Poll tự động mỗi 5 phút để đồng bộ khi Admin cập nhật plan trong DB
 */

import { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '../store/useUserStore';

/** Các kỹ năng hỗ trợ trong hệ thống */
export type Skill = 'reading' | 'listening' | 'writing' | 'speaking';

/** Khoảng thời gian poll (ms) */
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 phút

interface AllowedSkillsState {
  /** Danh sách skill được phép — null khi đang load lần đầu */
  allowedSkills: Skill[] | null;
  /** Có phải user PRO (toàn quyền) không */
  isPro: boolean;
  /** Tên plan đang dùng (e.g., "Gói PLUS 1 Tháng") */
  planName: string | null;
  /** Code plan (e.g., 'FREE', 'PLUS', 'PRO') */
  planCode: string | null;
  /** Đang fetch dữ liệu */
  isLoading: boolean;
  /** Lỗi nếu có */
  error: string | null;
}

export function useAllowedSkills(): AllowedSkillsState {
  const { token, isAuthenticated } = useUserStore();

  const [state, setState] = useState<AllowedSkillsState>({
    allowedSkills: null,
    isPro: false,
    planName: null,
    planCode: null,
    isLoading: true,
    error: null,
  });

  const fetchSkills = useCallback(async () => {
    // Không fetch nếu chưa đăng nhập
    if (!isAuthenticated || !token) {
      console.log('[useAllowedSkills] Bỏ qua fetch vì user chưa đăng nhập hoặc thiếu token');
      setState({
        allowedSkills: [],
        isPro: false,
        planName: null,
        planCode: 'FREE',
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      const envBase =
        (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL ||
        'http://localhost:3000';

      const apiUrl = `${envBase.replace(/\/$/, '')}/billing/my-skills`;
      console.log(`[useAllowedSkills] Đang gọi API: ${apiUrl}`); // LOG URL API

      // Gọi endpoint /my-skills
      const response = await fetch(apiUrl, { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      
      // LOG RAW DATA TỪ BACKEND
      console.log('[useAllowedSkills] Dữ liệu RAW từ backend:', json); 

      const data = json?.data;
      
      // LOG CHI TIẾT CÁC TRƯỜNG DỮ LIỆU
      console.log('[useAllowedSkills] Trường data trích xuất được:', data);
      console.log('[useAllowedSkills] Giá trị allowedSkills nhận được:', data?.allowedSkills);

      setState({
        // Nếu data?.allowedSkills undefined/null thì sẽ fallback về []
        allowedSkills: (data?.allowedSkills as Skill[]) ?? [],
        isPro: data?.isPro === true,
        planName: data?.planName ?? null,
        planCode: data?.plan ?? 'FREE',
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useAllowedSkills] fetch error:', message);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [token, isAuthenticated]);
  
  useEffect(() => {
    // Fetch ngay khi mount hoặc token thay đổi
    fetchSkills();

    // Poll định kỳ để sync quyền khi Admin cập nhật plan trong DB
    const intervalId = setInterval(fetchSkills, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchSkills]);

  return state;
}
