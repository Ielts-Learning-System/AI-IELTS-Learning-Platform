import { apiClient } from '../lib/api/client';

export interface ReadingQuestion {
  _id?: string;
}

export interface ReadingPassage {
  _id?: string;
  questions?: ReadingQuestion[];
}

export interface ReadingTest {
  _id: string;
  title?: string;
  name?: string;
  description?: string;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
  difficulty?: string;
  bandScore?: number | string;
  passages?: ReadingPassage[];
  questionCount?: number;
  totalQuestions?: number;
}

interface ReadingListResponse {
  success: boolean;
  message?: string;
  data: ReadingTest[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export async function fetchReadingTests(
  signal?: AbortSignal,
): Promise<ReadingTest[]> {
  const { data: res } = await apiClient.get<ReadingListResponse>('/reading', {
    signal,
  });

  if (!res.success) {
    throw new Error(res.message ?? 'Không thể tải danh sách đề thi.');
  }

  return (res.data ?? []).filter((t) => t.isPublished !== false);
}
