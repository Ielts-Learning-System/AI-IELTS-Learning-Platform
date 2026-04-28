import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Split from 'react-split';
import toast, { Toaster } from 'react-hot-toast';
import {
  ArrowLeft,
  ClipboardCheck,
  LoaderCircle,
  MessageSquareText,
  Send,
  Sparkles,
} from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';

type CriteriaKey = 'FC' | 'LR' | 'GRA' | 'PR';

interface AnswerItem {
  questionKey: string;
  audioUrl: string;
}

interface SpeakingSubmissionDetail {
  _id: string;
  studentId: string;
  testId?: {
    _id: string;
    title: string;
    part1: string[];
    part2: string;
    part3: string[];
  };
  questions: string[];
  answers: AnswerItem[];
  /** Legacy single-audio field — present on older submissions. */
  audioUrl?: string;
  status: 'Pending' | 'Graded';
  createdAt: string;
}

interface GradeFormState {
  FC: number;
  LR: number;
  GRA: number;
  PR: number;
  teacherFeedback: string;
}

const API_BASE = 'http://localhost:3000';

const defaultGradeForm: GradeFormState = {
  FC: 6,
  LR: 6,
  GRA: 6,
  PR: 6,
  teacherFeedback: '',
};

const criteriaConfig: Array<{ key: CriteriaKey; label: string; hint: string }> = [
  { key: 'FC', label: 'Fluency & Coherence', hint: 'Độ trôi chảy, mạch lạc và khả năng phát triển ý.' },
  { key: 'LR', label: 'Lexical Resource', hint: 'Độ đa dạng và chính xác của từ vựng sử dụng.' },
  { key: 'GRA', label: 'Grammar Range & Accuracy', hint: 'Phạm vi cấu trúc câu và độ chính xác ngữ pháp.' },
  { key: 'PR', label: 'Pronunciation', hint: 'Phát âm, ngữ điệu và khả năng dễ hiểu khi nói.' },
];

const getToken = (fallbackToken: string | null) =>
  fallbackToken || localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

const roundToNearestHalfBand = (value: number) => Math.round(value * 2) / 2;

const getOverallBand = (form: GradeFormState) => {
  const average = (form.FC + form.LR + form.GRA + form.PR) / 4;
  return roundToNearestHalfBand(average);
};

const getRangeBackground = (value: number) => {
  const percentage = (value / 9) * 100;
  return {
    background: `linear-gradient(90deg, rgba(227,24,55,0.18) 0%, rgba(227,24,55,0.18) ${percentage}%, rgba(226,232,240,0.45) ${percentage}%, rgba(226,232,240,0.45) 100%)`,
  };
};

const getStudentLabel = (submission: SpeakingSubmissionDetail) => {
  const studentId = String(submission.studentId || '');
  if (!studentId) return 'Học viên chưa xác định';
  return `Học viên ${studentId.slice(-6).toUpperCase()}`;
};

export default function SpeakingGradingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useUserStore();

  const [submission, setSubmission] = useState<SpeakingSubmissionDetail | null>(null);
  const [isLoadingSubmission, setIsLoadingSubmission] = useState(true);
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [gradeForm, setGradeForm] = useState<GradeFormState>(defaultGradeForm);

  const overallBand = useMemo(() => getOverallBand(gradeForm), [gradeForm]);

  // Fetch this specific submission from the pending list
  useEffect(() => {
    const fetchSubmission = async () => {
      if (!getToken(token)) {
        setIsLoadingSubmission(false);
        return;
      }
      try {
        setIsLoadingSubmission(true);
        const response = await axios.get(`${API_BASE}/api/speaking/pending`, {
          headers: { Authorization: `Bearer ${getToken(token)}` },
        });
        const payload = response.data?.data ?? response.data;
        const list: SpeakingSubmissionDetail[] = Array.isArray(payload) ? payload : [];
        const found = list.find((s) => s._id === id);
        if (found) {
          setSubmission(found);
        } else {
          toast.error('Không tìm thấy bài nói hoặc bài đã được chấm.');
          navigate('/teacher/speaking');
        }
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Không thể tải chi tiết bài nói.');
        navigate('/teacher/speaking');
      } finally {
        setIsLoadingSubmission(false);
      }
    };

    fetchSubmission();
  }, [id, token]);

  const handleCriteriaChange = (key: CriteriaKey, value: number) => {
    setGradeForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmitGrade = async () => {
    if (!submission) return;

    if (!gradeForm.teacherFeedback.trim()) {
      toast.error('Vui lòng nhập nhận xét chi tiết trước khi gửi điểm.');
      return;
    }

    try {
      setIsSubmittingGrade(true);
      await axios.put(
        `${API_BASE}/api/speaking/${submission._id}/grade`,
        {
          criteria: {
            FC: gradeForm.FC,
            LR: gradeForm.LR,
            GRA: gradeForm.GRA,
            PR: gradeForm.PR,
          },
          teacherFeedback: gradeForm.teacherFeedback.trim(),
        },
        { headers: { Authorization: `Bearer ${getToken(token)}` } },
      );
      toast.success('Đã hoàn tất chấm bài Speaking!');
      navigate('/teacher/speaking');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể gửi điểm Speaking.');
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  if (isLoadingSubmission) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-red-600">
          <LoaderCircle className="h-6 w-6 animate-spin" />
          <span className="font-semibold text-lg">Đang tải bài nói...</span>
        </div>
      </div>
    );
  }

  if (!submission) return null;

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#fef2f2_0%,#ffffff_42%,#f8fafc_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
        {/* Header */}
        <div className="border-b border-red-100 bg-white/85 px-6 py-5 backdrop-blur sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/teacher/speaking')}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </button>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Speaking Grading
                </div>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                  {getStudentLabel(submission)}
                  {submission.testId?.title && (
                    <span className="ml-3 text-base font-semibold text-slate-400">
                      — {submission.testId.title}
                    </span>
                  )}
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* Split pane */}
        <Split
          className="flex min-h-[calc(100vh-10rem)] w-full overflow-hidden"
          sizes={[52, 48]}
          minSize={360}
          gutterSize={10}
          gutterAlign="center"
          snapOffset={30}
          dragInterval={1}
          direction="horizontal"
          cursor="col-resize"
        >
          {/* Left: student audio per question */}
          <div className="overflow-y-auto border-r border-red-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff8f8_100%)] p-6">
            <div className="space-y-6">
              {submission.testId ? (
                ([
                  { label: 'Part 1 — Interview', questions: submission.testId.part1, keyPrefix: 'p1', isCueCard: false },
                  { label: 'Part 2 — Cue Card', questions: [submission.testId.part2], keyPrefix: 'p2', isCueCard: true },
                  { label: 'Part 3 — Discussion', questions: submission.testId.part3, keyPrefix: 'p3', isCueCard: false },
                ] as const).map(({ label, questions, keyPrefix, isCueCard }) => (
                  <div key={keyPrefix} className="rounded-[26px] border border-red-100 bg-white p-5 shadow-sm">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">{label}</p>
                    <div className="space-y-4">
                      {questions.map((q, idx) => {
                        const qKey = isCueCard ? 'p2' : `${keyPrefix}_${idx}`;
                        const answer = submission.answers?.find((a) => a.questionKey === qKey);
                        return (
                          <div key={qKey} className="rounded-[20px] border border-slate-100 bg-slate-50 px-4 py-3">
                            {!isCueCard && (
                              <p className="mb-1 text-xs font-bold text-slate-400">Câu {idx + 1}</p>
                            )}
                            <p className="text-sm leading-7 text-slate-700">{q}</p>
                            {answer ? (
                              <audio controls src={answer.audioUrl} className="mt-3 w-full" />
                            ) : (
                              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                                Học viên không ghi âm câu này
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                // Legacy fallback
                <>
                  <div className="rounded-[26px] border border-red-100 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Assigned Questions</p>
                    <ol className="mt-4 space-y-3 pl-4 text-sm leading-7 text-slate-700 marker:font-semibold marker:text-red-500">
                      {submission.questions.map((question, index) => (
                        <li key={`q-${index}`}>{question}</li>
                      ))}
                    </ol>
                  </div>
                  {submission.audioUrl && (
                    <div className="rounded-[26px] border border-red-100 bg-white p-5 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Student Audio</p>
                      <div className="mt-4 rounded-[20px] border border-red-50 bg-red-50/40 p-4">
                        <audio controls src={submission.audioUrl} className="w-full" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right: grading form */}
          <div className="overflow-y-auto bg-[linear-gradient(180deg,#fffdfd_0%,#ffffff_100%)] p-6">
            <div className="flex h-full flex-col gap-5">
              {/* Criteria sliders + overall band */}
              <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                <div className="rounded-[26px] border border-red-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                    <ClipboardCheck className="h-4 w-4" />
                    Grading Form
                  </div>
                  <div className="space-y-4">
                    {criteriaConfig.map((criterion) => (
                      <div
                        key={criterion.key}
                        className="rounded-[22px] border border-red-50 bg-[linear-gradient(180deg,#fffafa_0%,#ffffff_100%)] p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-4">
                          <div>
                            <p className="font-bold text-slate-900">
                              {criterion.key} · {criterion.label}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-500">{criterion.hint}</p>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-2 text-center shadow-sm ring-1 ring-red-100">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Band</p>
                            <p className="mt-1 text-xl font-black text-[#E31837]">
                              {gradeForm[criterion.key].toFixed(1)}
                            </p>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={9}
                          step={0.5}
                          value={gradeForm[criterion.key]}
                          onChange={(e) => handleCriteriaChange(criterion.key, Number(e.target.value))}
                          className="h-3 w-full cursor-pointer appearance-none rounded-full"
                          style={getRangeBackground(gradeForm[criterion.key])}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[26px] border border-red-100 bg-[linear-gradient(180deg,#fff5f5_0%,#ffffff_100%)] p-5 text-center shadow-sm">
                  <div className="inline-flex rounded-full bg-white p-2 text-red-500 shadow-sm ring-1 ring-red-100">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-red-500">Overall Band</p>
                  <div className="mx-auto mt-4 flex h-32 w-32 items-center justify-center rounded-full border-[10px] border-red-100 bg-white shadow-inner">
                    <span className="text-4xl font-black text-[#E31837]">{overallBand.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Feedback textarea + submit */}
              <div className="flex flex-1 flex-col rounded-[26px] border border-red-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                  <MessageSquareText className="h-4 w-4" />
                  Nhận xét chi tiết
                </div>
                <textarea
                  value={gradeForm.teacherFeedback}
                  onChange={(e) =>
                    setGradeForm((prev) => ({ ...prev, teacherFeedback: e.target.value }))
                  }
                  placeholder="Nhận xét chi tiết về điểm mạnh, điểm cần cải thiện, lỗi phát âm/ngữ pháp nổi bật và gợi ý luyện tập cho học viên..."
                  className="min-h-[200px] flex-1 resize-none rounded-[22px] border border-red-50 bg-[linear-gradient(180deg,#fffafa_0%,#ffffff_100%)] px-5 py-4 text-[15px] leading-7 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-red-200 focus:ring-4 focus:ring-red-100"
                />
                <button
                  type="button"
                  onClick={handleSubmitGrade}
                  disabled={isSubmittingGrade}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E31837] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#c9142f] disabled:cursor-not-allowed disabled:bg-red-300"
                >
                  {isSubmittingGrade ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Hoàn tất chấm bài
                </button>
              </div>
            </div>
          </div>
        </Split>
      </div>
    </section>
  );
}
