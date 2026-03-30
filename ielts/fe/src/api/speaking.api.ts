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
}

interface SpeakingDetailResponse {
  success: boolean;
  message?: string;
  data: SpeakingTestDetail;
}

export async function fetchSpeakingTests(
  signal?: AbortSignal,
): Promise<SpeakingTestListItem[]> {
  const { data: res } = await apiClient.get<SpeakingListResponse>('/speaking', {
    signal,
  });

  if (!res.success) {
    throw new Error(res.message ?? 'Khong the tai danh sach de Speaking.');
  }

  return res.data ?? [];
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
