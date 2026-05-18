import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Split from 'react-split';
import toast, { Toaster } from 'react-hot-toast';
import {
  ArrowLeft,
  BookOpenText,
  Bot,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  MessageSquareText,
  PenSquare,
  Send,
  Sparkles,
  ThumbsUp,
  X,
  Zap,
} from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';
import EssayEditor from '../../components/EssayEditor';

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
  grading?: {
    teacherFeedback?: {
      content?: string;
      overall_feedback?: string;
    };
  };
}

interface GradeFormState {
  TR: number;
  CC: number;
  LR: number;
  GRA: number;
  teacherFeedback: {
    content: string;
    overall_feedback: string;
  };
}

interface AICriteriaScore {
  band: number;
  comment: string;
  evidence: string;
  limitation: string;
  improvement: string;
}

interface AIVocabItem {
  original_phrase: string;
  evaluation: string;
  suggestion: string;
  reason: string;
}

interface AIGrammarItem {
  original_sentence: string;
  issue: string;
  correction: string;
  explanation: string;
}

interface AIGradingResult {
  overall_band: number;
  overall_comment: string;
  criteria_scores: {
    task_response: AICriteriaScore;
    coherence_cohesion: AICriteriaScore;
    lexical_resource: AICriteriaScore;
    grammatical_range: AICriteriaScore;
  };
  vocabulary_analysis: AIVocabItem[];
  grammar_analysis: AIGrammarItem[];
  logic_and_development: {
    task_fulfillment: string;
    idea_clarity: string;
    development: string;
    cohesion_issues: string;
  };
  quick_boost_tips: string[];
  improved_rewrite: string;
}

const WRITING_API_BASE = 'http://localhost:3000/api/writing';
const AI_API_BASE = 'http://localhost:3000/api/ai';

const defaultGradeForm: GradeFormState = {
  TR: 6,
  CC: 6,
  LR: 6,
  GRA: 6,
  teacherFeedback: {
    content: '',
    overall_feedback: '',
  },
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

const stripHtmlTags = (html: string) =>
  html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

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

export default function DetailGradingDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useUserStore();
  
  const [selectedSubmission, setSelectedSubmission] = useState<PendingSubmission | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<WritingPromptDetail | null>(null);
  
  const [isLoadingSubmission, setIsLoadingSubmission] = useState(true);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  
  const [gradeForm, setGradeForm] = useState<GradeFormState>(defaultGradeForm);

  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiResult, setAiResult] = useState<AIGradingResult | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiExpandedSection, setAiExpandedSection] = useState<string | null>('criteria');

  const overallBand = useMemo(() => getOverallBand(gradeForm), [gradeForm]);

  // Fetch the specific submission (by fetching pending and finding it)
  useEffect(() => {
    const fetchSubmission = async () => {
      if (!getToken(token)) {
        setIsLoadingSubmission(false);
        return;
      }

      try {
        setIsLoadingSubmission(true);
        const response = await axios.get(`${WRITING_API_BASE}/submissions/pending`, {
          headers: {
            Authorization: `Bearer ${getToken(token)}`,
          },
        });

        const payload = response.data?.data ?? response.data;
        const list = Array.isArray(payload) ? payload : [];
        const submission = list.find((s: PendingSubmission) => s._id === id);

        if (submission) {
          setSelectedSubmission(submission);
        } else {
          toast.error('Không tìm thấy bài viết hoặc bài viết đã được chấm.');
          navigate('/teacher/writing');
        }
      } catch (error: any) {
        console.error('Failed to fetch pending writing submissions:', error);
        toast.error(error.response?.data?.message || 'Không thể tải chi tiết bài làm.');
        navigate('/teacher/writing');
      } finally {
        setIsLoadingSubmission(false);
      }
    };

    fetchSubmission();
  }, [token, id, navigate]);

  // Fetch prompt details when submission is loaded
  useEffect(() => {
    if (!selectedSubmission) return;

    const controller = new AbortController();

    const fetchPrompt = async () => {
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

    setGradeForm({
      ...defaultGradeForm,
      teacherFeedback: {
        content: selectedSubmission.grading?.teacherFeedback?.content || selectedSubmission.content,
        overall_feedback: selectedSubmission.grading?.teacherFeedback?.overall_feedback || '',
      }
    });
    fetchPrompt();

    return () => controller.abort();
  }, [selectedSubmission]);

  const handleAISuggest = async () => {
    if (!selectedSubmission || !selectedPrompt) {
      toast.error('Chưa tải xong đề bài. Vui lòng thử lại sau vài giây.');
      return;
    }
    try {
      setIsLoadingAI(true);
      setShowAIPanel(true);
      setAiResult(null);
      const promptText = stripHtmlTags(selectedPrompt.contentHtml || '');
      const response = await axios.post(
        `${AI_API_BASE}/grade-writing`,
        {
          task_type: selectedSubmission.taskType,
          prompt_text: promptText,
          student_essay: selectedSubmission.content,
          target_band: 7.0,
        },
        { headers: { Authorization: `Bearer ${getToken(token)}` } },
      );
      setAiResult(response.data);
      setAiExpandedSection('criteria');
    } catch (error: any) {
      console.error('AI grading error:', error);
      toast.error(error.response?.data?.detail?.message || error.response?.data?.message || 'AI chấm bài thất bại. Vui lòng thử lại.');
      setShowAIPanel(false);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleApplyAIScores = () => {
    if (!aiResult) return;
    const { task_response, coherence_cohesion, lexical_resource, grammatical_range } = aiResult.criteria_scores;
    setGradeForm((prev) => ({
      ...prev,
      TR: task_response.band,
      CC: coherence_cohesion.band,
      LR: lexical_resource.band,
      GRA: grammatical_range.band,
      teacherFeedback: {
        ...prev.teacherFeedback,
        overall_feedback: prev.teacherFeedback.overall_feedback || aiResult.overall_comment,
      },
    }));
    toast.success('Đã áp dụng điểm AI gợi ý vào form chấm bài.');
  };

  const handleCriteriaChange = (key: CriteriaKey, value: number) => {
    setGradeForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmitGrade = async () => {
    if (!selectedSubmission) return;

    if (!gradeForm.teacherFeedback.overall_feedback.trim()) {
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
          teacherFeedback: {
            content: gradeForm.teacherFeedback.content.trim(),
            overall_feedback: gradeForm.teacherFeedback.overall_feedback.trim(),
          },
          ...(aiResult && { aiFeedback: aiResult }),
        },
        {
          headers: {
            Authorization: `Bearer ${getToken(token)}`,
          },
        },
      );

      toast.success('Đã hoàn tất chấm bài Writing.');
      navigate('/teacher/writing');
    } catch (error: any) {
      console.error('Failed to submit grade:', error);
      toast.error(error.response?.data?.message || 'Không thể gửi kết quả chấm bài.');
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  if (isLoadingSubmission) {
    return (
      <section className="space-y-6 flex items-center justify-center min-h-[50vh]">
        <LoaderCircle className="h-8 w-8 text-red-500 animate-spin" />
      </section>
    );
  }

  if (!selectedSubmission) return null;

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#fef2f2_0%,#ffffff_38%,#f8fafc_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
        <div className="bg-[linear-gradient(180deg,#fffdfd_0%,#f8fafc_100%)] p-4 sm:p-5 lg:p-6 flex flex-col min-h-[calc(100vh-10rem)]">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-2xl font-black text-slate-900">Chi tiết chấm bài</h3>
              <p className="text-sm text-slate-500 mt-1">
                Đang xem bài viết của {getStudentLabel(selectedSubmission)}
              </p>
            </div>
            <button
              onClick={() => navigate('/teacher/writing')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại danh sách
            </button>
          </div>

          <div className="flex flex-col gap-6 w-full">
            {/* Top: Grading Form & Overall Band */}
            <div className="rounded-[30px] border border-red-100 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] flex flex-col xl:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                    <PenSquare className="h-4 w-4" />
                    Grading Form
                  </div>
                  <button
                    type="button"
                    onClick={handleAISuggest}
                    disabled={isLoadingAI || isLoadingPrompt}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingAI ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                    {isLoadingAI ? 'AI đang chấm...' : 'AI Gợi ý chấm bài'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {criteriaConfig.map((criterion) => (
                    <div key={criterion.key} className="rounded-[22px] border border-red-50 bg-[linear-gradient(180deg,#fffafa_0%,#ffffff_100%)] p-4 flex flex-col justify-between">
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-bold text-slate-900">{criterion.shortLabel}</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-500 line-clamp-2">{criterion.label}</p>
                        </div>
                        <div className="rounded-xl bg-white px-3 py-1.5 text-center shadow-sm ring-1 ring-red-100">
                          <p className="text-xl font-black text-[#E31837]">
                            {gradeForm[criterion.key].toFixed(1)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-auto pt-2">
                        <input
                          type="range"
                          min={0}
                          max={9}
                          step={0.5}
                          value={gradeForm[criterion.key]}
                          onChange={(event) =>
                            handleCriteriaChange(criterion.key, Number(event.target.value))
                          }
                          className="h-2.5 w-full cursor-pointer appearance-none rounded-full"
                          style={getRangeBackground(gradeForm[criterion.key])}
                        />
                        <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-400">
                          <span>0.0</span>
                          <span>4.5</span>
                          <span>9.0</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full xl:w-56 shrink-0 rounded-[26px] border border-red-100 bg-[linear-gradient(180deg,#fff5f5_0%,#ffffff_100%)] p-5 text-center shadow-sm flex flex-col items-center justify-center">
                <div className="inline-flex rounded-full bg-white p-2 text-red-500 shadow-sm ring-1 ring-red-100">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-red-500">Overall Band</p>
                <div className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-full border-[8px] border-red-100 bg-white shadow-inner">
                  <span className="text-3xl font-black text-[#E31837]">{overallBand.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* AI Grading Suggestion Panel */}
            {showAIPanel && (
              <div className="rounded-[30px] border border-indigo-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 shadow-[0_24px_60px_rgba(99,102,241,0.10)]">
                {/* Panel header */}
                <div className="flex items-center justify-between rounded-t-[30px] border-b border-indigo-100 bg-white/70 px-6 py-4 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-indigo-50 p-2 text-indigo-600">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-black text-slate-900">Gợi ý chấm bài từ AI</p>
                      <p className="text-xs text-slate-400">Dựa trên IELTS Band Descriptors – chỉ mang tính tham khảo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {aiResult && (
                      <button
                        type="button"
                        onClick={handleApplyAIScores}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        Áp dụng điểm AI
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAIPanel(false)}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Loading state */}
                {isLoadingAI && (
                  <div className="flex min-h-[180px] items-center justify-center gap-4 text-indigo-600">
                    <LoaderCircle className="h-6 w-6 animate-spin" />
                    <span className="font-semibold">AI đang phân tích bài viết...</span>
                  </div>
                )}

                {/* Result */}
                {!isLoadingAI && aiResult && (
                  <div className="space-y-1 p-4">

                    {/* Overall band + comment */}
                    <div className="flex items-center gap-4 rounded-[20px] bg-white px-5 py-4 shadow-sm ring-1 ring-indigo-50">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-[6px] border-indigo-100 bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md">
                        <span className="text-xl font-black">{aiResult.overall_band.toFixed(1)}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Overall Band (AI)</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-700">{aiResult.overall_comment}</p>
                      </div>
                    </div>

                    {/* Criteria section */}
                    <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-indigo-50">
                      <button
                        type="button"
                        onClick={() => setAiExpandedSection(aiExpandedSection === 'criteria' ? null : 'criteria')}
                        className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-indigo-50/50"
                      >
                        <span className="text-sm font-bold text-slate-800">Điểm từng tiêu chí</span>
                        {aiExpandedSection === 'criteria' ? <ChevronUp className="h-4 w-4 text-indigo-500" /> : <ChevronDown className="h-4 w-4 text-indigo-500" />}
                      </button>
                      {aiExpandedSection === 'criteria' && (
                        <div className="grid grid-cols-1 gap-3 border-t border-indigo-50 p-4 sm:grid-cols-2 xl:grid-cols-4">
                          {(
                            [
                              { key: 'task_response', label: 'Task Response', short: 'TR' },
                              { key: 'coherence_cohesion', label: 'Coherence & Cohesion', short: 'CC' },
                              { key: 'lexical_resource', label: 'Lexical Resource', short: 'LR' },
                              { key: 'grammatical_range', label: 'Grammatical Range', short: 'GRA' },
                            ] as const
                          ).map(({ key, label, short }) => {
                            const c = aiResult.criteria_scores[key];
                            return (
                              <div key={key} className="rounded-[18px] border border-indigo-50 bg-gradient-to-b from-indigo-50/40 to-white p-4">
                                <div className="flex items-center justify-between">
                                  <p className="font-bold text-slate-800">{short}</p>
                                  <span className="rounded-lg bg-indigo-600 px-2.5 py-0.5 text-sm font-black text-white">{c.band.toFixed(1)}</span>
                                </div>
                                <p className="mt-0.5 text-[11px] text-slate-400">{label}</p>
                                <p className="mt-2 text-xs leading-relaxed text-slate-600">{c.comment}</p>
                                {c.improvement && (
                                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-700">
                                    <span className="font-semibold">Cải thiện: </span>{c.improvement}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Quick boost tips */}
                    {aiResult.quick_boost_tips?.length > 0 && (
                      <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-indigo-50">
                        <button
                          type="button"
                          onClick={() => setAiExpandedSection(aiExpandedSection === 'tips' ? null : 'tips')}
                          className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-indigo-50/50"
                        >
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-bold text-slate-800">Quick Boost Tips</span>
                          </div>
                          {aiExpandedSection === 'tips' ? <ChevronUp className="h-4 w-4 text-indigo-500" /> : <ChevronDown className="h-4 w-4 text-indigo-500" />}
                        </button>
                        {aiExpandedSection === 'tips' && (
                          <ul className="space-y-2 border-t border-indigo-50 p-4">
                            {aiResult.quick_boost_tips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700">{i + 1}</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Grammar analysis */}
                    {aiResult.grammar_analysis?.length > 0 && (
                      <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-indigo-50">
                        <button
                          type="button"
                          onClick={() => setAiExpandedSection(aiExpandedSection === 'grammar' ? null : 'grammar')}
                          className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-indigo-50/50"
                        >
                          <span className="text-sm font-bold text-slate-800">Phân tích ngữ pháp</span>
                          {aiExpandedSection === 'grammar' ? <ChevronUp className="h-4 w-4 text-indigo-500" /> : <ChevronDown className="h-4 w-4 text-indigo-500" />}
                        </button>
                        {aiExpandedSection === 'grammar' && (
                          <div className="space-y-3 border-t border-indigo-50 p-4">
                            {aiResult.grammar_analysis.map((item, i) => (
                              <div key={i} className="rounded-[16px] border border-red-50 bg-red-50/30 p-4">
                                <p className="text-xs font-semibold text-red-500">{item.issue}</p>
                                <p className="mt-1 text-sm italic text-slate-500 line-through">"{item.original_sentence}"</p>
                                <p className="mt-1 text-sm font-medium text-emerald-700">✓ {item.correction}</p>
                                <p className="mt-2 text-xs text-slate-500">{item.explanation}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Vocabulary analysis */}
                    {aiResult.vocabulary_analysis?.length > 0 && (
                      <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-indigo-50">
                        <button
                          type="button"
                          onClick={() => setAiExpandedSection(aiExpandedSection === 'vocab' ? null : 'vocab')}
                          className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-indigo-50/50"
                        >
                          <span className="text-sm font-bold text-slate-800">Phân tích từ vựng</span>
                          {aiExpandedSection === 'vocab' ? <ChevronUp className="h-4 w-4 text-indigo-500" /> : <ChevronDown className="h-4 w-4 text-indigo-500" />}
                        </button>
                        {aiExpandedSection === 'vocab' && (
                          <div className="overflow-x-auto border-t border-indigo-50 p-4">
                            <table className="min-w-full text-xs">
                              <thead>
                                <tr className="text-left text-slate-400">
                                  <th className="pb-2 pr-4 font-semibold">Gốc</th>
                                  <th className="pb-2 pr-4 font-semibold">Đánh giá</th>
                                  <th className="pb-2 pr-4 font-semibold">Gợi ý</th>
                                  <th className="pb-2 font-semibold">Lý do</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {aiResult.vocabulary_analysis.map((item, i) => (
                                  <tr key={i}>
                                    <td className="py-2 pr-4 italic text-slate-600">"{item.original_phrase}"</td>
                                    <td className="py-2 pr-4">
                                      <span className={`rounded-full px-2 py-0.5 font-semibold ${item.evaluation.toLowerCase().includes('tốt') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                        {item.evaluation}
                                      </span>
                                    </td>
                                    <td className="py-2 pr-4 font-medium text-indigo-700">{item.suggestion}</td>
                                    <td className="py-2 text-slate-500">{item.reason}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Improved rewrite */}
                    {aiResult.improved_rewrite && (
                      <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-indigo-50">
                        <button
                          type="button"
                          onClick={() => setAiExpandedSection(aiExpandedSection === 'rewrite' ? null : 'rewrite')}
                          className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-indigo-50/50"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-violet-500" />
                            <span className="text-sm font-bold text-slate-800">Bài viết nâng cấp (Band 7.0)</span>
                          </div>
                          {aiExpandedSection === 'rewrite' ? <ChevronUp className="h-4 w-4 text-indigo-500" /> : <ChevronDown className="h-4 w-4 text-indigo-500" />}
                        </button>
                        {aiExpandedSection === 'rewrite' && (
                          <div className="border-t border-indigo-50 p-5">
                            <p className="whitespace-pre-wrap text-sm leading-8 text-slate-700">{aiResult.improved_rewrite}</p>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}

            {/* Middle: Test Prompt & Student Essay */}
            <Split
              className="flex w-full overflow-hidden rounded-[30px] border border-red-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]"
              style={{ minHeight: '600px' }}
              sizes={[50, 50]}
              minSize={300}
              gutterSize={10}
              gutterAlign="center"
              snapOffset={30}
              dragInterval={1}
              direction="horizontal"
              cursor="col-resize"
            >
              {/* Left side: Test Prompt */}
              <div className="border-r border-red-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff8f8_100%)] p-6 overflow-y-auto flex flex-col">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                    <BookOpenText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Test Prompt</p>
                    <h3 className="mt-1 text-xl font-black text-slate-900">
                      {selectedPrompt?.title || getPromptTitle(selectedSubmission.writingId)}
                    </h3>
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
                    className="prose prose-slate max-w-none rounded-[22px] border border-red-50 bg-[linear-gradient(180deg,#fffafa_0%,#ffffff_100%)] p-5 prose-headings:text-slate-900 prose-strong:text-slate-900 prose-a:text-red-600 flex-1"
                    dangerouslySetInnerHTML={{ __html: selectedPrompt?.contentHtml || '<p>Không có dữ liệu đề bài.</p>' }}
                  />
                )}
              </div>

              {/* Right side: Student Essay Editor */}
              <div className="bg-[linear-gradient(180deg,#fffdfd_0%,#ffffff_100%)] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-50 px-6 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Student Essay & Correction</p>
                    <h4 className="mt-1 text-lg font-bold text-slate-900">{getStudentLabel(selectedSubmission)}</h4>
                  </div>
                  <div className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-600">
                    {selectedSubmission.wordCount} từ
                  </div>
                </div>

                {/* Essay Editor — fills remaining height of the right panel */}
                <EssayEditor
                  originalContent={selectedSubmission.content}
                  value={gradeForm.teacherFeedback.content}
                  onChange={(html) =>
                    setGradeForm((current) => ({
                      ...current,
                      teacherFeedback: { ...current.teacherFeedback, content: html },
                    }))
                  }
                  className="flex-1 overflow-hidden rounded-b-[30px] border border-red-50 bg-[linear-gradient(180deg,#ffffff_0%,#fffafa_100%)]"
                />
              </div>
            </Split>

            {/* Bottom: Detailed Feedback & Submission */}
            <div className="flex flex-col rounded-[30px] border border-red-100 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                <MessageSquareText className="h-4 w-4" />
                Nhận xét tổng quát
              </div>

              <textarea
                value={gradeForm.teacherFeedback.overall_feedback}
                onChange={(event) =>
                  setGradeForm((current) => ({
                    ...current,
                    teacherFeedback: { ...current.teacherFeedback, overall_feedback: event.target.value },
                  }))
                }
                placeholder="Nhập nhận xét tổng quát: điểm mạnh, điểm cần cải thiện, gợi ý nâng band..."
                className="min-h-[160px] w-full resize-none rounded-[22px] border border-red-50 bg-[linear-gradient(180deg,#fffafa_0%,#ffffff_100%)] px-5 py-4 text-[15px] leading-7 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-red-200 focus:ring-4 focus:ring-red-100"
              />

              <div className="mt-5 flex flex-col gap-4 rounded-[22px] border border-red-50 bg-red-50/40 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-bold text-slate-900">Sẵn sàng hoàn tất chấm bài</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Hệ thống sẽ lưu điểm từng tiêu chí, bản sửa bài, và nhận xét tổng quát cho học viên ngay khi bạn xác nhận.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitGrade}
                  disabled={isSubmittingGrade}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E31837] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-[#c9142f] disabled:cursor-not-allowed disabled:bg-red-300"
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
      </div>
    </section>
  );
}
