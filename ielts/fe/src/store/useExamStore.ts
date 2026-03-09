import { create } from 'zustand';

interface ExamState {
  examId: string | null;
  timeLeft: number; // in seconds
  answers: Record<string, string>;
  isSubmitted: boolean;
  
  // Actions
  startExam: (examId: string, durationMinutes: number) => void;
  setAnswer: (questionId: string, value: string) => void;
  tickTime: () => void;
  submitExam: () => void;
  resetExam: () => void;
}

export const useExamStore = create<ExamState>((set) => ({
  examId: null,
  timeLeft: 0,
  answers: {},
  isSubmitted: false,

  startExam: (examId, durationMinutes) => set({
    examId,
    timeLeft: durationMinutes * 60,
    answers: {},
    isSubmitted: false,
  }),

  setAnswer: (questionId, value) => set((state) => ({
    answers: {
      ...state.answers,
      [questionId]: value,
    }
  })),

  tickTime: () => set((state) => ({
    timeLeft: Math.max(0, state.timeLeft - 1)
  })),

  submitExam: () => set({ isSubmitted: true }),

  resetExam: () => set({
    examId: null,
    timeLeft: 0,
    answers: {},
    isSubmitted: false,
  }),
}));
