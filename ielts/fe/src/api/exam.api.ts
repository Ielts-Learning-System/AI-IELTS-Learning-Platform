import { apiClient } from '../lib/api/client';

export type SkillType = 'reading' | 'listening' | 'writing' | 'speaking';

export interface ExamItem {
  _id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  globalLimitHours: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  skillRefs: {
    readingId: string;
    listeningId: string;
    writingId: string;
    speakingId: string;
  };
  latestAttempt?: {
    _id: string;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'GRADED';
    globalStartTime: string;
    globalEndTime: string;
  } | null;
  progress?: {
    doneCount: number;
    totalSkills: number;
    percent: number;
  };
}

export interface SkillAttempt {
  _id: string;
  skillType: SkillType;
  skillRefId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'GRADED';
  deadlineAt?: string;
  timeRemainingSeconds: number;
  unansweredCount?: number;
  answerSnapshot?: Record<string, unknown>;
}

export interface ExamAttemptDetail {
  _id: string;
  examId: string;
  userId: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'GRADED';
  overallBand?: number;
  overallBandScores?: {
    reading?: number;
    listening?: number;
    writing?: number;
    speaking?: number;
    overall?: number;
  };
  globalStartTime: string;
  globalEndTime: string;
  globalTimeRemainingSeconds: number;
  currentSkillInProgress: SkillType | null;
  exam: ExamItem;
  skills: SkillAttempt[];
}

export interface MonitoringAttempt {
  _id: string;
  examId: string;
  userId: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'GRADED';
  activeSkill: {
    skillType: SkillType;
    timeRemainingSeconds: number;
  } | null;
  doneCount: number;
  totalSkills: number;
  skillSummaries: Array<{
    skillType: SkillType;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'GRADED';
    band?: number;
    unansweredCount?: number;
    externalSubmissionId?: string;
    externalResult?: Record<string, unknown>;
  }>;
}

export interface TeacherAttemptDetail {
  _id: string;
  examId: string;
  userId: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'GRADED';
  submittedAt?: string;
  overallBand?: number;
  overallBandScores?: {
    reading?: number;
    listening?: number;
    writing?: number;
    speaking?: number;
    overall?: number;
  };
  exam?: ExamItem;
  skills: Array<{
    _id: string;
    skillType: SkillType;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'GRADED';
    gradedBand?: number;
    unansweredCount?: number;
    gradingMetadata?: {
      externalSubmissionId?: string;
      externalResult?: Record<string, unknown>;
    };
  }>;
  gradingLinks?: {
    writing?: string | null;
    speaking?: string | null;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export async function fetchStudentMockExams(signal?: AbortSignal): Promise<ExamItem[]> {
  const { data } = await apiClient.get<ApiResponse<ExamItem[]>>('/exams/exams', { signal });
  return data.data || [];
}

export async function startExam(examId: string): Promise<ExamAttemptDetail> {
  const { data } = await apiClient.post<ApiResponse<ExamAttemptDetail>>(`/exams/exams/${examId}/start`);
  return data.data;
}

export async function getExamAttempt(attemptId: string): Promise<ExamAttemptDetail> {
  const { data } = await apiClient.get<ApiResponse<ExamAttemptDetail>>(`/exams/attempts/${attemptId}`);
  return data.data;
}

export async function startSkillAttempt(attemptId: string, skillType: SkillType): Promise<ExamAttemptDetail> {
  const { data } = await apiClient.post<ApiResponse<ExamAttemptDetail>>(
    `/exams/attempts/${attemptId}/skills/${skillType}/start`
  );
  return data.data;
}

export async function saveSkillSnapshot(
  attemptId: string,
  skillType: SkillType,
  payload: { answerSnapshot: Record<string, unknown>; unansweredCount?: number }
): Promise<ExamAttemptDetail> {
  const { data } = await apiClient.put<ApiResponse<ExamAttemptDetail>>(
    `/exams/attempts/${attemptId}/skills/${skillType}/snapshot`,
    payload
  );
  return data.data;
}

export async function submitSkillAttempt(
  attemptId: string,
  skillType: SkillType,
  payload: { answerSnapshot?: Record<string, unknown>; unansweredCount?: number; autoSubmitted?: boolean } = {}
): Promise<ExamAttemptDetail> {
  const { data } = await apiClient.post<ApiResponse<ExamAttemptDetail>>(
    `/exams/attempts/${attemptId}/skills/${skillType}/submit`,
    payload
  );
  return data.data;
}

export async function submitExamAttempt(
  attemptId: string,
  payload: { autoSubmitted?: boolean } = {}
): Promise<ExamAttemptDetail> {
  const { data } = await apiClient.post<ApiResponse<ExamAttemptDetail>>(`/exams/attempts/${attemptId}/submit`, payload);
  return data.data;
}

export async function fetchTeacherExams(signal?: AbortSignal): Promise<ExamItem[]> {
  const { data } = await apiClient.get<ApiResponse<ExamItem[]>>('/exams/teacher/exams', { signal });
  return data.data || [];
}

export async function createTeacherExam(payload: {
  title: string;
  description?: string;
  durationMinutes?: number;
  globalLimitHours?: number;
  publish?: boolean;
  skillDurations?: Partial<Record<SkillType, number>>;
  skillRefs: {
    readingId: string;
    listeningId: string;
    writingId: string;
    speakingId: string;
  };
}): Promise<ExamItem> {
  const { data } = await apiClient.post<ApiResponse<ExamItem>>('/exams/teacher/exams', payload);
  return data.data;
}

export async function publishTeacherExam(examId: string): Promise<ExamItem> {
  const { data } = await apiClient.post<ApiResponse<ExamItem>>(`/exams/teacher/exams/${examId}/publish`);
  return data.data;
}

export async function deleteTeacherExam(examId: string): Promise<void> {
  await apiClient.delete(`/exams/teacher/exams/${examId}`);
}

export async function fetchMonitoringAttempts(signal?: AbortSignal): Promise<MonitoringAttempt[]> {
  const { data } = await apiClient.get<ApiResponse<MonitoringAttempt[]>>('/exams/teacher/monitoring/attempts', { signal });
  return data.data || [];
}

export async function fetchTeacherAttemptDetail(attemptId: string): Promise<TeacherAttemptDetail> {
  const { data } = await apiClient.get<ApiResponse<TeacherAttemptDetail>>(`/exams/teacher/attempts/${attemptId}`);
  return data.data;
}

export async function gradeTeacherAttempt(
  attemptId: string,
  payload: { writingBand?: number; speakingBand?: number; readingBand?: number; listeningBand?: number }
) {
  const { data } = await apiClient.post(`/exams/teacher/attempts/${attemptId}/grade`, payload);
  return data.data;
}

export async function orchestrateExamFromPdf(payload: {
  fullExamPdf: File;
  answerKeyPdf: File;
  title?: string;
  description?: string;
  durationMinutes?: number;
  globalLimitHours?: number;
  publish?: boolean;
}) {
  const formData = new FormData();
  formData.append('fullExamPdf', payload.fullExamPdf);
  formData.append('answerKeyPdf', payload.answerKeyPdf);
  if (payload.title) formData.append('title', payload.title);
  if (payload.description) formData.append('description', payload.description);
  if (payload.durationMinutes) formData.append('durationMinutes', String(payload.durationMinutes));
  if (payload.globalLimitHours) formData.append('globalLimitHours', String(payload.globalLimitHours));
  if (payload.publish) formData.append('publish', 'true');

  const { data } = await apiClient.post('/exams/teacher/exams/orchestrate-pdf', formData, {
    timeout: 5 * 60 * 1000,
  });

  return data.data;
}
