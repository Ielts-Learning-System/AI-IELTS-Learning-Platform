import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  ClipboardCheck,
  Eye,
  LoaderCircle,
  Mic,
  RefreshCcw,
  Star,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { useUserStore } from '../../store/useUserStore';

interface SpeakingSubmissionSummary {
  _id: string;
  studentId: string;
  testId?: { _id: string; title: string; part1?: string[]; part2?: string; part3?: string[] };
  answers: { questionKey: string; audioUrl: string }[];
  status: 'Pending' | 'Graded';
  createdAt: string;
  grading?: {
    FC: number; LR: number; GRA: number; PR: number;
    overallBand: number;
    teacherFeedback: string;
    gradedAt: string;
  };
}

const API_BASE = 'http://localhost:3000';

const getToken = (fallbackToken: string | null) =>
  fallbackToken || localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

const getStudentLabel = (submission: SpeakingSubmissionSummary) => {
  const studentId = String(submission.studentId || '');
  if (!studentId) return 'Học viên chưa xác định';
  return `Học viên ${studentId.slice(-6).toUpperCase()}`;
};

export default function SpeakingGrading() {
  const { token } = useUserStore();
  const navigate = useNavigate();
  const [pendingSubmissions, setPendingSubmissions] = useState<SpeakingSubmissionSummary[]>([]);
  const [gradedSubmissions, setGradedSubmissions] = useState<SpeakingSubmissionSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'graded'>('pending');
  const [selectedGraded, setSelectedGraded] = useState<SpeakingSubmissionSummary | null>(null);

  const fetchSubmissions = async () => {
    if (!getToken(token)) {
      setIsLoadingList(false);
      return;
    }

    try {
      setIsLoadingList(true);
      const headers = { Authorization: `Bearer ${getToken(token)}` };
      const [pendingRes, gradedRes] = await Promise.all([
        axios.get(`${API_BASE}/api/speaking/pending`, { headers }),
        axios.get(`${API_BASE}/api/speaking/graded`, { headers }),
      ]);
      const pendingPayload = pendingRes.data?.data ?? pendingRes.data;
      const gradedPayload = gradedRes.data?.data ?? gradedRes.data;
      setPendingSubmissions(Array.isArray(pendingPayload) ? pendingPayload : []);
      setGradedSubmissions(Array.isArray(gradedPayload) ? gradedPayload : []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể tải danh sách Speaking.');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [token]);

  const handleNavigateDetail = (id: string) => {
    navigate(`/teacher/speaking/${id}`);
  };

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#fef2f2_0%,#ffffff_38%,#f8fafc_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
        {/* Header */}
        <div className="border-b border-red-100 bg-white/85 px-6 py-6 backdrop-blur sm:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-red-600">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Teacher Workspace
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">Chấm IELTS Speaking</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Danh sách bài nói chờ chấm. Bấm vào mỗi bài để nghe audio, chấm theo 4 tiêu chí IELTS và gửi nhận xét.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Pending</p>
                <p className="mt-1 text-2xl font-black text-amber-900">{pendingSubmissions.length}</p>
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-500">Graded</p>
                <p className="mt-1 text-2xl font-black text-red-700">{gradedSubmissions.length}</p>
              </div>
              <button
                type="button"
                onClick={fetchSubmissions}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <RefreshCcw className="h-4 w-4" />
                Làm mới danh sách
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[calc(100vh-13rem)] rounded-[0_0_30px_30px] bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_100%)] p-6 sm:p-8">
          <div className="mx-auto max-w-7xl">
            {/* Tab switcher */}
            <div className="mb-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('pending')}
                className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
                  activeTab === 'pending'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700'
                }`}
              >
                Chờ chấm
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === 'pending' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700'}`}>
                  {pendingSubmissions.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('graded')}
                className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
                  activeTab === 'graded'
                    ? 'bg-[#E31837] text-white shadow-md shadow-red-200'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-[#E31837]'
                }`}
              >
                Đã chấm
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === 'graded' ? 'bg-white/30 text-white' : 'bg-red-50 text-[#E31837]'}`}>
                  {gradedSubmissions.length}
                </span>
              </button>
            </div>

            {activeTab === 'pending' ? (
              isLoadingList ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-red-50 bg-white">
                  <div className="flex items-center gap-3 text-red-600">
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    <span className="font-semibold">Đang tải...</span>
                  </div>
                </div>
              ) : pendingSubmissions.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-red-200 bg-white px-5 py-10 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
                  <p className="font-bold text-slate-900">Không còn bài Speaking chờ chấm</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Mọi bài nộp hiện tại đã được xử lý hoặc chưa có bài mới trong hàng đợi.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {pendingSubmissions.map((submission) => (
                    <div
                      key={submission._id}
                      onClick={() => handleNavigateDetail(submission._id)}
                      className="cursor-pointer rounded-[24px] border border-red-100 bg-white px-4 py-4 transition hover:border-red-200 hover:bg-red-50/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-red-50 p-3 text-red-500">
                          <CircleUserRound className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div>
                            <p className="truncate font-bold text-slate-900">{getStudentLabel(submission)}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                              {submission.testId?.title ?? 'Speaking Test'}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 ring-1 ring-red-100">
                              <Mic className="h-3 w-3 text-red-400" />
                              {submission.answers?.length ?? 0} câu
                            </span>
                          </div>
                          <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {format(new Date(submission.createdAt), 'dd/MM/yyyy HH:mm')}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateDetail(submission._id);
                          }}
                          className="ml-1 shrink-0 rounded-full border border-red-100 bg-white p-2 text-red-500 shadow-sm transition hover:bg-red-50 hover:text-red-600"
                          title="Xem chi tiết / Chấm bài"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              isLoadingList ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-red-50 bg-white">
                  <div className="flex items-center gap-3 text-red-600">
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    <span className="font-semibold">Đang tải...</span>
                  </div>
                </div>
              ) : gradedSubmissions.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-emerald-200 bg-white px-5 py-10 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="font-bold text-slate-900">Chưa có bài Speaking nào được chấm</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {gradedSubmissions.map((submission) => (
                    <div
                      key={submission._id}
                      onClick={() => setSelectedGraded(submission)}
                      className="cursor-pointer rounded-[24px] border border-red-100 bg-white px-4 py-4 transition hover:border-[#E31837]/30 hover:bg-red-50/40 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-red-50 p-3 text-red-400">
                          <CircleUserRound className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div>
                            <p className="truncate font-bold text-slate-900">{getStudentLabel(submission)}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                              {submission.testId?.title ?? 'Speaking Test'}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 ring-1 ring-red-100 text-slate-500">
                              <Mic className="h-3 w-3 text-red-400" />
                              {submission.answers?.length ?? 0} câu
                            </span>
                            {submission.grading && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#E31837]/8 px-2.5 py-1 font-semibold text-[#E31837] ring-1 ring-[#E31837]/20">
                                <Star className="h-3 w-3" />
                                Band {submission.grading.overallBand.toFixed(1)}
                              </span>
                            )}
                          </div>
                          {submission.grading?.gradedAt && (
                            <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {format(new Date(submission.grading.gradedAt), 'dd/MM/yyyy HH:mm')}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedGraded(submission); }}
                          className="ml-1 shrink-0 rounded-full border border-red-100 bg-white p-2 text-red-400 shadow-sm transition hover:bg-red-50 hover:text-[#E31837]"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
      {renderSpeakingGradedModal()}
    </section>
  );

  function renderSpeakingGradedModal() {
    if (!selectedGraded) return null;
    const s = selectedGraded;
    const g = s.grading!;
    const criteriaList: Array<{ key: 'FC' | 'LR' | 'GRA' | 'PR'; label: string }> = [
      { key: 'FC', label: 'Fluency & Coherence' },
      { key: 'LR', label: 'Lexical Resource' },
      { key: 'GRA', label: 'Grammar Range & Accuracy' },
      { key: 'PR', label: 'Pronunciation' },
    ];
    return (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
        onClick={() => setSelectedGraded(null)}
      >
        <div
          className="relative my-8 w-full max-w-3xl overflow-hidden rounded-[30px] border border-red-100 bg-white shadow-[0_40px_120px_rgba(15,23,42,0.20)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-red-100 bg-[linear-gradient(135deg,#fef2f2_0%,#ffffff_100%)] px-6 py-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#E31837]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Bài đã chấm
              </div>
              <h3 className="mt-2 text-xl font-black text-slate-900">{getStudentLabel(s)}</h3>
              <p className="mt-0.5 text-sm text-slate-500">{s.testId?.title ?? 'Speaking Test'}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedGraded(null)}
              className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm hover:border-red-200 hover:bg-red-50 hover:text-[#E31837]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-5 p-6">
            {/* Criteria + overall band */}
            <div className="grid gap-4 sm:grid-cols-[1fr_148px]">
              <div className="rounded-[22px] border border-red-100 bg-[linear-gradient(180deg,#fffafa_0%,#ffffff_100%)] p-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Điểm số</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {criteriaList.map(({ key, label }) => (
                    <div key={key} className="rounded-[18px] border border-red-50 bg-white p-3 text-center shadow-sm">
                      <p className="text-xs font-bold text-slate-400">{key}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400 leading-tight">{label.split(' ')[0]}</p>
                      <p className="mt-1 text-2xl font-black text-[#E31837]">{(g[key] ?? 0).toFixed(1)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-[22px] border border-red-100 bg-[linear-gradient(180deg,#fff5f5_0%,#ffffff_100%)] p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-500">Overall Band</p>
                <div className="mt-3 flex h-24 w-24 items-center justify-center rounded-full border-[8px] border-red-100 bg-white shadow-inner">
                  <span className="text-3xl font-black text-[#E31837]">{g.overallBand.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Teacher feedback */}
            {g.teacherFeedback && (
              <div className="rounded-[22px] border border-red-100 bg-white p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Nhận xét của giáo viên</p>
                <p className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">{g.teacherFeedback}</p>
              </div>
            )}

            {/* Per-part audio */}
            {s.testId?.part1 ? (
              [{
                label: 'Part 1 — Interview', questions: s.testId.part1, prefix: 'p1', isCueCard: false,
              }, {
                label: 'Part 2 — Cue Card', questions: s.testId.part2 ? [s.testId.part2] : [], prefix: 'p2', isCueCard: true,
              }, {
                label: 'Part 3 — Discussion', questions: s.testId.part3 ?? [], prefix: 'p3', isCueCard: false,
              }].map(({ label, questions, prefix, isCueCard }) => questions.length === 0 ? null : (
                <div key={prefix} className="rounded-[22px] border border-red-100 bg-white p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">{label}</p>
                  <div className="space-y-3">
                    {questions.map((q: string, idx: number) => {
                      const qKey = isCueCard ? 'p2' : `${prefix}_${idx}`;
                      const answer = s.answers?.find((a) => a.questionKey === qKey);
                      return (
                        <div key={qKey} className="rounded-[18px] border border-slate-100 bg-slate-50 px-4 py-3">
                          {!isCueCard && <p className="mb-1 text-xs font-bold text-slate-400">Câu {idx + 1}</p>}
                          <p className="text-sm leading-6 text-slate-700">{q}</p>
                          {answer
                            ? <audio controls src={answer.audioUrl} className="mt-2 w-full" />
                            : <p className="mt-2 text-xs text-slate-400 italic">Không có ghi âm</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : s.answers?.length > 0 && (
              <div className="rounded-[22px] border border-red-100 bg-white p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Audio Recording</p>
                <div className="space-y-2">
                  {s.answers.map((a) => (
                    <audio key={a.questionKey} controls src={a.audioUrl} className="w-full" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}