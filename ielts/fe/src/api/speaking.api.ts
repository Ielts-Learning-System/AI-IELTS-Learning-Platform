import { apiClient } from '../lib/api/client';

export interface SpeakingTestListItem {
  _id: string;
  title: string;
  createdAt?: string;
}

export interface SpeakingTestDetail extends SpeakingTestListItem {
  part1: string[];
  part2: string;
  part3: string[];
  updatedAt?: string;
}

interface SpeakingListResponse {
  success: boolean;
  message?: string;
  data: SpeakingTestListItem[];
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
}

interface SpeakingDetailResponse {
  success: boolean;
  message?: string;
  data: SpeakingTestDetail;
}

export interface SpeakingPagedResult {
  data: SpeakingTestListItem[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export async function fetchSpeakingTests(
  signal?: AbortSignal,
  page = 1,
  limit = 6,
): Promise<SpeakingPagedResult> {
  const { data: res } = await apiClient.get<SpeakingListResponse>(
    `/speaking?page=${page}&limit=${limit}`,
    { signal },
  );

  if (!res.success) {
    throw new Error(res.message ?? 'Khong the tai danh sach de Speaking.');
  }

  return {
    data: res.data ?? [],
    currentPage: res.currentPage ?? page,
    totalPages: res.totalPages ?? 1,
    totalItems: res.totalItems ?? (res.data?.length ?? 0),
  };
}

export async function fetchSpeakingTestById(
  id: string,
  signal?: AbortSignal,
): Promise<SpeakingTestDetail> {
  const { data: res } = await apiClient.get<SpeakingDetailResponse>(
    `/speaking/tests/${id}`,
    { signal },
  );

  if (!res.success || !res.data) {
    throw new Error(res.message ?? 'Khong the tai de Speaking.');
  }

  return res.data;
}
