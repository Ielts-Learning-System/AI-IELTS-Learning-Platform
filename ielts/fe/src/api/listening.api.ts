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
  /** Included in the list-endpoint aggregation response (no full question data) */
  questionCount?: number;
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

/** A test flattened to a single part — used by the student list page */
export interface FlattenedPart {
  key: string; // `${testId}-${partNumber}`
  testId: string;
  testTitle: string;
  testCreatedAt?: string;
  partNumber: number;
  partTitle?: string;
  questionCount: number;
}

/** Shape of a record returned by GET /listening/my-attempts */
export interface PartAttemptSummary {
  _id: string;
  testId: string | { _id: string; title?: string };
  partNumber: number | null;
  rawScore: number;
  bandScore: number;
  createdAt: string;
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

interface MyAttemptsResponse {
  success: boolean;
  data: PartAttemptSummary[];
}

export async function fetchListeningTests(
  signal?: AbortSignal,
): Promise<ListeningTest[]> {
  const { data: res } = await apiClient.get<ListeningListResponse>(
    '/listening?limit=100',
    { signal },
  );

  if (!res.success) {
    throw new Error(res.message ?? 'Không thể tải danh sách đề thi Listening.');
  }

  return (res.data ?? []).filter((t): t is ListeningTest => t != null);
}

/** Fetch the current user's listening attempts. Returns [] if not authenticated. */
export async function fetchMyListeningAttempts(
  signal?: AbortSignal,
): Promise<PartAttemptSummary[]> {
  try {
    const { data: res } = await apiClient.get<MyAttemptsResponse>(
      '/listening/my-attempts',
      { signal },
    );
    return res.data ?? [];
  } catch {
    // Not logged in or network error — treat as no history
    return [];
  }
}

/** Submit answers for a single part. */
export async function submitPartTest(
  testId: string,
  partNumber: number,
  studentAnswers: string[],
  timeSpent: number,
): Promise<{ success: boolean; data: unknown }> {
  const { data } = await apiClient.post(`/listening/${testId}/submit-part`, {
    studentAnswers,
    timeSpent,
    partNumber,
  });
  return data;
}
