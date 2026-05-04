import { apiClient } from '../lib/api/client';

export interface ReadingQuestion {
  _id?: string;
}

export interface ReadingPassage {
  _id?: string;
  passageNumber?: number;
  title?: string;
  questions?: ReadingQuestion[];
  /** Included in the list-endpoint aggregation response (no content / correctAnswers) */
  questionCount?: number;
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
  passageCount?: number;
  totalQuestionCount?: number;
  questionCount?: number;
  totalQuestions?: number;
}

/** A test flattened to a single passage — used by the student list page */
export interface FlattenedPassage {
  key: string; // `${testId}-${passageNumber}`
  testId: string;
  testTitle: string;
  testCreatedAt?: string;
  passageNumber: number;
  passageTitle?: string;
  questionCount: number;
}

/** Shape of a record returned by GET /reading/my-attempts */
export interface PassageAttemptSummary {
  _id: string;
  testId: string | { _id: string; title?: string };
  passageNumber: number | null;
  rawScore: number;
  bandScore: number;
  createdAt: string;
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

interface MyAttemptsResponse {
  success: boolean;
  data: PassageAttemptSummary[];
}

export async function fetchReadingTests(
  signal?: AbortSignal,
): Promise<ReadingTest[]> {
  const { data: res } = await apiClient.get<ReadingListResponse>('/reading?limit=100', {
    signal,
  });

  if (!res.success) {
    throw new Error(res.message ?? 'Không thể tải danh sách đề thi.');
  }

  return (res.data ?? []).filter((t) => t.isPublished !== false);
}

/** Fetch the current user's reading attempts. Returns [] if not authenticated. */
export async function fetchMyReadingAttempts(
  signal?: AbortSignal,
): Promise<PassageAttemptSummary[]> {
  try {
    const { data: res } = await apiClient.get<MyAttemptsResponse>(
      '/reading/my-attempts',
      { signal },
    );
    return res.data ?? [];
  } catch {
    return [];
  }
}

/** Submit answers for a single passage. */
export async function submitPassageTest(
  testId: string,
  passageNumber: number,
  studentAnswers: string[],
  timeSpent: number,
): Promise<{ success: boolean; data: unknown }> {
  const { data } = await apiClient.post(`/reading/${testId}/submit-passage`, {
    studentAnswers,
    timeSpent,
    passageNumber,
  });
  return data;
}
