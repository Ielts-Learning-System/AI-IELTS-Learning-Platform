import { apiClient } from '../lib/api/client';

// ── Types ──────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DictationWord {
  _id: string;
  transcript: string;
  difficulty: Difficulty;
  speaker: string;
  audioUrl: string;
  source: 'local' | 'cloudinary';
  createdAt?: string;
  updatedAt?: string;
}

export interface DictationListResponse {
  success: boolean;
  data: DictationWord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface DictationWordPayload {
  transcript: string;
  difficulty: Difficulty;
  speaker?: string;
  audio?: File | null;
}

// ── API calls ──────────────────────────────────────────────────────

export const dictationApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    difficulty?: string;
    search?: string;
  }) => apiClient.get<DictationListResponse>('/dictation', { params }),

  create: (payload: DictationWordPayload) => {
    const form = new FormData();
    form.append('transcript', payload.transcript);
    form.append('difficulty', payload.difficulty);
    if (payload.speaker) form.append('speaker', payload.speaker);
    if (payload.audio) form.append('audio', payload.audio);
    return apiClient.post<{ success: boolean; data: DictationWord }>(
      '/dictation',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  update: (id: string, payload: Partial<DictationWordPayload>) => {
    const form = new FormData();
    if (payload.transcript !== undefined)
      form.append('transcript', payload.transcript);
    if (payload.difficulty !== undefined)
      form.append('difficulty', payload.difficulty);
    if (payload.speaker !== undefined) form.append('speaker', payload.speaker);
    if (payload.audio) form.append('audio', payload.audio);
    return apiClient.put<{ success: boolean; data: DictationWord }>(
      `/dictation/${id}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  remove: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(
      `/dictation/${id}`
    ),
};
