import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Split from 'react-split';
import toast, { Toaster } from 'react-hot-toast';
import {
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  ClipboardCheck,
  FilePenLine,
  LoaderCircle,
  MessageSquareText,
  PenSquare,
  RefreshCcw,
  Send,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { useUserStore } from '../../store/useUserStore';

type CriteriaKey = 'TR' | 'CC' | 'LR' | 'GRA';

interface WritingPromptSummary {
  _id: string;
  title: string;
  type: 'Task 1' | 'Task 2';
}

interface WritingPromptDetail extends WritingPromptSummary {
  category?: string;
  timeLimit?: number;
  contentHtml: string;
}

interface PendingSubmission {
  _id: string;
  studentId: string;
  writingId: string | WritingPromptSummary;
  taskType: 'Task 1' | 'Task 2';
  content: string;
  wordCount: number;
  status: 'Pending';
  createdAt: string;
}

interface GradeFormState {
  TR: number;
  CC: number;
  LR: number;
  GRA: number;
  teacherFeedback: string;
}

const WRITING_API_BASE = 'http://localhost:3000/api/writing';

const defaultGradeForm: GradeFormState = {
  TR: 6,
  CC: 6,
  LR: 6,
  GRA: 6,
  teacherFeedback: '',
};

const criteriaConfig: Array<{ key: CriteriaKey; label: string; shortLabel: string; hint: string }> = [
  {
    key: 'TR',
    label: 'Task Response',
    shortLabel: 'TR',
    hint: 'Đánh giá mức độ bám sát đề, phát triển luận điểm và trả lời đúng yêu cầu.',
  },
  {
    key: 'CC',
    label: 'Coherence & Cohesion',
    shortLabel: 'CC',
    hint: 'Đánh giá bố cục bài viết, liên kết ý và độ mạch lạc toàn bài.',
  },
  {
    key: 'LR',
    label: 'Lexical Resource',
    shortLabel: 'LR',
    hint: 'Đánh giá vốn từ, cách dùng từ linh hoạt và độ chính xác ngữ nghĩa.',
  },
  {
    key: 'GRA',
    label: 'Grammatical Range & Accuracy',
    shortLabel: 'GRA',
    hint: 'Đánh giá phạm vi cấu trúc câu, lỗi ngữ pháp và mức độ kiểm soát.',
  },
];

const getToken = (fallbackToken: string | null) =>
  fallbackToken || localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

const getPromptId = (writing: PendingSubmission['writingId']) =>
  typeof writing === 'string' ? writing : writing?._id;

const getPromptTitle = (writing: PendingSubmission['writingId']) =>
  typeof writing === 'string' ? 'Writing Prompt' : writing?.title || 'Writing Prompt';

const getStudentLabel = (submission: PendingSubmission) => {
  const studentId = String(submission.studentId || '');
  if (!studentId) return 'Học viên chưa xác định';
  return `Học viên ${studentId.slice(-6).toUpperCase()}`;
};

const roundToNearestHalfBand = (value: number) => Math.round(value * 2) / 2;

const getOverallBand = (form: GradeFormState) => {
  const average = (form.TR + form.CC + form.LR + form.GRA) / 4;
  return roundToNearestHalfBand(average);
};

const getRangeBackground = (value: number) => {
  const percentage = (value / 9) * 100;
  return {
    background: `linear-gradient(90deg, rgba(227,24,55,0.18) 0%, rgba(227,24,55,0.18) ${percentage}%, rgba(226,232,240,0.45) ${percentage}%, rgba(226,232,240,0.45) 100%)`,
  };
};

export default function GradingDashboard() {
  const { token } = useUserStore();
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<WritingPromptDetail | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [gradeForm, setGradeForm] = useState<GradeFormState>(defaultGradeForm);

  const selectedSubmission = useMemo(
    () => pendingSubmissions.find((submission) => submission._id === selectedSubmissionId) || null,
    [pendingSubmissions, selectedSubmissionId],
  );

  const overallBand = useMemo(() => getOverallBand(gradeForm), [gradeForm]);

  const fetchPendingSubmissions = async () => {
    if (!getToken(token)) {
      setIsLoadingList(false);
      return;
    }

    try {
      setIsLoadingList(true);

      const response = await axios.get(`${WRITING_API_BASE}/submissions/pending`, {
        headers: {
          Authorization: `Bearer ${getToken(token)}`,
        },
      });

      const payload = response.data?.data ?? response.data;
      const nextList = Array.isArray(payload) ? payload : [];

      setPendingSubmissions(nextList);
      setSelectedSubmissionId((current) => current || nextList[0]?._id || null);
    } catch (error: any) {
      console.error('Failed to fetch pending writing submissions:', error);
      toast.error(error.response?.data?.message || 'Không thể tải danh sách bài chờ chấm.');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchPendingSubmissions();
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchPrompt = async () => {
      if (!selectedSubmission) {
        setSelectedPrompt(null);
        return;
      }

      const promptId = getPromptId(selectedSubmission.writingId);
      if (!promptId) {
        setSelectedPrompt(null);
        return;
      }

      try {
        setIsLoadingPrompt(true);
        const response = await axios.get(`${WRITING_API_BASE}/items/${promptId}`, {
          signal: controller.signal,
        });
        setSelectedPrompt(response.data?.data ?? response.data);
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error('Failed to fetch writing prompt detail:', error);
          toast.error('Không thể tải nội dung đề bài.');
        }
      } finally {
        setIsLoadingPrompt(false);
      }
    };

    setGradeForm(defaultGradeForm);
    fetchPrompt();

    return () => controller.abort();
  }, [selectedSubmissionId]);

  const handleCriteriaChange = (key: CriteriaKey, value: number) => {
    setGradeForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmitGrade = async () => {
    if (!selectedSubmission) {
      toast.error('Vui lòng chọn một bài viết để chấm.');
      return;
    }

    if (!gradeForm.teacherFeedback.trim()) {
      toast.error('Vui lòng nhập nhận xét chi tiết trước khi hoàn tất chấm bài.');
      return;
    }

    try {
      setIsSubmittingGrade(true);

      await axios.put(
        `${WRITING_API_BASE}/submissions/${selectedSubmission._id}/grade`,
        {
          criteria: {
            TR: gradeForm.TR,
            CC: gradeForm.CC,
            LR: gradeForm.LR,
            GRA: gradeForm.GRA,
          },
          teacherFeedback: gradeForm.teacherFeedback.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${getToken(token)}`,
          },
        },
      );

      toast.success('Đã hoàn tất chấm bài Writing.');

      const gradedId = selectedSubmission._id;
      const nextList = pendingSubmissions.filter((submission) => submission._id !== gradedId);
      setPendingSubmissions(nextList);
      setSelectedSubmissionId(nextList[0]?._id || null);
      setGradeForm(defaultGradeForm);
    } catch (error: any) {
      console.error('Failed to submit grade:', error);
      toast.error(error.response?.data?.message || 'Không thể gửi kết quả chấm bài.');
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#fef2f2_0%,#ffffff_38%,#f8fafc_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
        <div className="border-b border-red-100 bg-white/85 px-6 py-6 backdrop-blur sm:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-red-600">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Teacher Workspace
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight text-slate-900">Chấm IELTS Writing</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                  Không gian làm việc tập trung để xem bài viết, đánh giá theo 4 tiêu chí IELTS và hoàn tất nhận xét trong một màn hình chia đôi.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">Pending</p>
                <p className="mt-1 text-2xl font-black text-amber-900">{pendingSubmissions.length}</p>
              </div>
              <button
                type="button"
                onClick={fetchPendingSubmissions}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <RefreshCcw className="h-4 w-4" />
                Làm mới danh sách
              </button>
            </div>
          </div>
        </div>

        <Split
          className="flex min-h-[calc(100vh-13rem)] w-full overflow-hidden"
          sizes={[24, 76]}
          minSize={280}
          gutterSize={10}
          gutterAlign="center"
          snapOffset={30}
          dragInterval={1}
          direction="horizontal"
          cursor="col-resize"
        >
          <aside className="border-r border-red-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff7f7_100%)] p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Pending List</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">Bài chờ chấm</h3>
              </div>
            </div>

            <div className="space-y-3">
              {isLoadingList ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-red-50 bg-white">
                  <div className="flex items-center gap-3 text-red-600">
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                    <span className="font-semibold">Đang tải...</span>
                  </div>
                </div>
              ) : pendingSubmissions.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-red-200 bg-white px-5 py-10 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
                  <p className="font-bold text-slate-900">Không còn bài Writing chờ chấm</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Mọi bài nộp hiện tại đã được xử lý hoặc chưa có bài mới xuất hiện trong hàng đợi.
                  </p>
                </div>
              ) : (
                pendingSubmissions.map((submission) => {
                  const isActive = submission._id === selectedSubmissionId;

                  return (
                    <button
                      key={submission._id}
                      type="button"
                      onClick={() => setSelectedSubmissionId(submission._id)}
                      className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                        isActive
                          ? 'border-[#E31837] bg-red-50 shadow-md shadow-red-100'
                          : 'border-red-100 bg-white hover:border-red-200 hover:bg-red-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-2xl p-3 ${isActive ? 'bg-white text-red-600' : 'bg-red-50 text-red-500'}`}>
                          <CircleUserRound className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div>
                            <p className="truncate font-bold text-slate-900">{getStudentLabel(submission)}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{getPromptTitle(submission.writingId)}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-red-100">{submission.taskType}</span>
                            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-red-100">{submission.wordCount} từ</span>
                          </div>

                          <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {format(new Date(submission.createdAt), 'dd/MM/yyyy HH:mm')}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <div className="bg-[linear-gradient(180deg,#fffdfd_0%,#f8fafc_100%)] p-4 sm:p-5 lg:p-6">
            {!selectedSubmission ? (
              <div className="flex min-h-[640px] items-center justify-center rounded-[30px] border border-dashed border-red-200 bg-white text-center">
                <div className="max-w-md px-6">
                  <BookOpenText className="mx-auto mb-4 h-12 w-12 text-red-400" />
                  <p className="text-xl font-bold text-slate-900">Chọn một bài viết để bắt đầu chấm</p>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Danh sách bên trái sẽ đưa bạn vào không gian làm việc chia đôi với đề bài, bài làm và biểu mẫu chấm điểm đầy đủ.
                  </p>
                </div>
              </div>
            ) : (
              <Split
                className="flex min-h-[640px] w-full overflow-hidden rounded-[30px] border border-red-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
                sizes={[52, 48]}
                minSize={360}
                gutterSize={10}
                gutterAlign="center"
                snapOffset={30}
                dragInterval={1}
                direction="horizontal"
                cursor="col-resize"
              >
                <div className="border-r border-red-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff8f8_100%)] p-6">
                  <div className="space-y-6">
                    <div className="rounded-[26px] border border-red-100 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                          <BookOpenText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Test Prompt</p>
                          <h3 className="mt-1 text-xl font-black text-slate-900">
                            {selectedPrompt?.title || getPromptTitle(selectedSubmission.writingId)}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {selectedPrompt?.type || selectedSubmission.taskType}
                            {selectedPrompt?.category ? ` · ${selectedPrompt.category}` : ''}
                            {selectedPrompt?.timeLimit ? ` · ${selectedPrompt.timeLimit} phút` : ''}
                          </p>
                        </div>
                      </div>

                      {isLoadingPrompt ? (
                        <div className="flex min-h-[180px] items-center justify-center rounded-[22px] border border-red-50 bg-red-50/40">
                          <div className="flex items-center gap-3 text-red-600">
                            <LoaderCircle className="h-5 w-5 animate-spin" />
                            <span className="font-semibold">Đang tải đề bài...</span>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="prose prose-slate max-w-none rounded-[22px] border border-red-50 bg-[linear-gradient(180deg,#fffafa_0%,#ffffff_100%)] p-5 prose-headings:text-slate-900 prose-strong:text-slate-900 prose-a:text-red-600"
                          dangerouslySetInnerHTML={{ __html: selectedPrompt?.contentHtml || '<p>Không có dữ liệu đề bài.</p>' }}
                        />
                      )}
                    </div>

                    <div className="rounded-[26px] border border-red-100 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Student Essay</p>
                          <h4 className="mt-1 text-lg font-bold text-slate-900">{getStudentLabel(selectedSubmission)}</h4>
                        </div>
                        <div className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-600">
                          {selectedSubmission.wordCount} từ
                        </div>
                      </div>

                      <div className="max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-[22px] border border-red-50 bg-[linear-gradient(180deg,#ffffff_0%,#fffafa_100%)] p-5 text-[15px] leading-8 text-slate-700">
                        {selectedSubmission.content}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[linear-gradient(180deg,#fffdfd_0%,#ffffff_100%)] p-6">
                  <div className="flex h-full flex-col gap-5">
                    <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                      <div className="rounded-[26px] border border-red-100 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                          <PenSquare className="h-4 w-4" />
                          Grading Form
                        </div>
                        <div className="space-y-4">
                          {criteriaConfig.map((criterion) => (
                            <div key={criterion.key} className="rounded-[22px] border border-red-50 bg-[linear-gradient(180deg,#fffafa_0%,#ffffff_100%)] p-4">
                              <div className="mb-3 flex items-start justify-between gap-4">
                                <div>
                                  <p className="font-bold text-slate-900">{criterion.shortLabel} · {criterion.label}</p>
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
                                onChange={(event) =>
                                  handleCriteriaChange(criterion.key, Number(event.target.value))
                                }
                                className="h-3 w-full cursor-pointer appearance-none rounded-full"
                                style={getRangeBackground(gradeForm[criterion.key])}
                              />

                              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                                <span>0.0</span>
                                <span>4.5</span>
                                <span>9.0</span>
                              </div>
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
                        <p className="mt-4 text-sm leading-6 text-slate-500">
                          Tính tự động từ trung bình 4 tiêu chí và làm tròn theo thang band 0.5.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col rounded-[26px] border border-red-100 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                        <MessageSquareText className="h-4 w-4" />
                        Nhận xét chi tiết
                      </div>

                      <textarea
                        value={gradeForm.teacherFeedback}
                        onChange={(event) =>
                          setGradeForm((current) => ({
                            ...current,
                            teacherFeedback: event.target.value,
                          }))
                        }
                        placeholder="Nhập nhận xét chi tiết cho học viên: điểm mạnh, điểm cần cải thiện, gợi ý nâng band và lỗi nổi bật cần sửa..."
                        className="min-h-[260px] flex-1 resize-none rounded-[22px] border border-red-50 bg-[linear-gradient(180deg,#fffafa_0%,#ffffff_100%)] px-5 py-4 text-[15px] leading-7 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-red-200 focus:ring-4 focus:ring-red-100"
                      />

                      <div className="mt-5 flex flex-col gap-4 rounded-[22px] border border-red-50 bg-red-50/40 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-bold text-slate-900">Sẵn sàng hoàn tất chấm bài</p>
                          <p className="mt-1 text-sm text-slate-500">
                            Hệ thống sẽ lưu điểm từng tiêu chí, overall band và nhận xét cho học viên ngay khi bạn xác nhận.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleSubmitGrade}
                          disabled={isSubmittingGrade}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E31837] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#c9142f] disabled:cursor-not-allowed disabled:bg-red-300"
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
                </div>
              </Split>
            )}
          </div>
        </Split>
      </div>
    </section>
  );
}