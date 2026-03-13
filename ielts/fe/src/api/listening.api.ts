import { apiClient } from '../lib/api/client';

export interface ListeningQuestion {
  _id?: string;
}

export interface ListeningPart {
  _id?: string;
  partNumber?: number;
  title?: string;
  audioUrl?: string;
  questions?: ListeningQuestion[];
}

export interface ListeningTest {
  _id: string;
  title?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  parts?: ListeningPart[];
  partCount?: number;
  totalQuestionCount?: number;
}

interface ListeningListResponse {
  success: boolean;
  message?: string;
  data: ListeningTest[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export async function fetchListeningTests(
  signal?: AbortSignal,
): Promise<ListeningTest[]> {
  const { data: res } = await apiClient.get<ListeningListResponse>(
    '/listening',
    { signal },
  );

  if (!res.success) {
    throw new Error(res.message ?? 'Không thể tải danh sách đề thi Listening.');
  }

  return res.data ?? [];
}
