import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { Toaster, toast } from 'react-hot-toast';
import {
  ArrowLeft,
  BookOpenText,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  LoaderCircle,
  MessageSquareQuote,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useUserStore } from '../store/useUserStore';

/* ─── types ─────────────────────────────────────────────────────────────────── */

type CriteriaKey = 'TR' | 'CC' | 'LR' | 'GRA';

interface TeacherFeedback {
  content?: string;
  overall_feedback?: string;
}

interface GradingCriteria {
  TR: number;
  CC: number;
  LR: number;
  GRA: number;
}

interface GradingInfo {
  criteria: GradingCriteria;
  overallBand: number;
  teacherFeedback?: TeacherFeedback | string;
  aiFeedback?: AiFeedback;
  gradedAt: string;
}

interface AiCriteriaScore {
  band: number;
  comment: string;
  evidence?: string;
  limitation?: string;
  improvement?: string;
}

interface AiVocabItem {
  original_phrase: string;
  evaluation: string;
  suggestion: string;
  reason: string;
}

interface AiGrammarItem {
  original_sentence: string;
  issue: string;
  correction: string;
  explanation: string;
}

interface AiFeedback {
  overall_band?: number;
  overall_comment?: string;
  criteria_scores?: {
    task_response: AiCriteriaScore;
    coherence_cohesion: AiCriteriaScore;
    lexical_resource: AiCriteriaScore;
    grammatical_range: AiCriteriaScore;
  };
  vocabulary_analysis?: AiVocabItem[];
  grammar_analysis?: AiGrammarItem[];
  quick_boost_tips?: string[];
  improved_rewrite?: string;
}

interface WritingRef {
  _id?: string;
  title?: string;
  type?: 'Task 1' | 'Task 2';
  contentHtml?: string;
}

interface WritingSubmission {
  _id: string;
  writingId: string | WritingRef;
  taskType: 'Task 1' | 'Task 2';
  content: string;
  wordCount: number;
  status: 'Pending' | 'Graded';
  createdAt: string;
  grading?: GradingInfo;
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const API_BASE = 'http://localhost:3000/api';
const WRITING_API = `${API_BASE}/writing`;

const getToken = (t: string | null) =>
  t || localStorage.getItem('token') || localStorage.getItem('accessToken') || '';

const criteriaConfig: Array<{ key: CriteriaKey; label: string; hint: string }> = [
  { key: 'TR', label: 'Task Response', hint: 'Mức độ trả lời đúng trọng tâm đề bài.' },
  { key: 'CC', label: 'Coherence & Cohesion', hint: 'Tổ chức ý và liên kết đoạn văn.' },
  { key: 'LR', label: 'Lexical Resource', hint: 'Độ đa dạng và chính xác của từ vựng.' },
  { key: 'GRA', label: 'Grammar Range & Accuracy', hint: 'Phạm vi cấu trúc và độ chính xác ngữ pháp.' },
];

function normalizeFeedback(raw?: TeacherFeedback | string): { content: string; overall_feedback: string } {
  if (!raw) return { content: '', overall_feedback: '' };
  if (typeof raw === 'string') return { content: '', overall_feedback: raw };
  return { content: raw.content ?? '', overall_feedback: raw.overall_feedback ?? '' };
}

/* ─── component ──────────────────────────────────────────────────────────── */

export default function DetailHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useUserStore();

  const [submission, setSubmission] = useState<WritingSubmission | null>(null);
  const [promptHtml, setPromptHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAiFeedback, setShowAiFeedback] = useState(false);
  const [aiSection, setAiSection] = useState<string | null>('tips');

  useEffect(() => {
    const fetchData = async () => {
      if (!getToken(token)) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const headers = { Authorization: `Bearer ${getToken(token)}` };

        const res = await axios.get(`${WRITING_API}/submissions/my-submissions`, { headers });
        const list: WritingSubmission[] = res.data?.data ?? res.data ?? [];
        const found = list.find((s) => s._id === id);

        if (!found) {
          toast.error('Không tìm thấy bài làm.');
          navigate('/history');
          return;
        }

        setSubmission(found);

        // Fetch prompt HTML
        const promptId =
          typeof found.writingId === 'string' ? found.writingId : found.writingId?._id;
        if (promptId) {
          try {
            const promptRes = await axios.get(`${WRITING_API}/items/${promptId}`, { headers });
            const data = promptRes.data?.data ?? promptRes.data;
            setPromptHtml(data?.contentHtml ?? '');
          } catch {
            // non-critical
          }
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err.response?.data?.message || 'Không thể tải dữ liệu bài làm.');
        navigate('/history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, token, navigate]);

  if (isLoading) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="h-9 w-9 animate-spin text-red-500" />
      </section>
    );
  }

  if (!submission) return null;

  const grading = submission.grading;
  const promptTitle =
    typeof submission.writingId === 'string'
      ? 'Writing Prompt'
      : submission.writingId?.title || 'Writing Prompt';

  const feedback = normalizeFeedback(grading?.teacherFeedback);
  const correctedContent = feedback.content || submission.content;

  return (
    <section className="space-y-6">
      <Toaster position="top-right" />

      <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(135deg,#f8f9fa_0%,#ffffff_45%,#f5f7fb_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.06)]">

        {/* Header bar */}
        <div className="border-b border-slate-200 bg-white/90 px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-red-600">
                <FileText className="h-3.5 w-3.5" />
                Writing · Nhận xét của giáo viên
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">{promptTitle}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {format(new Date(submission.createdAt), 'dd/MM/yyyy HH:mm')}
                </span>
                <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">
                  {submission.taskType}
                </span>
                <span className="text-slate-400">{submission.wordCount} từ</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/history')}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại lịch sử
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-6 p-5 sm:p-7">

          {/* Row 1: Band scores */}
          {grading ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">

              {/* Overall Band */}
              <div className="flex flex-col items-center gap-3 rounded-[26px] border border-red-100 bg-[linear-gradient(180deg,#fff5f5_0%,#ffffff_100%)] p-5 shadow-sm">
                <div className="inline-flex rounded-full bg-white p-2 text-red-500 shadow-sm ring-1 ring-red-100">
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">Overall</p>
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-[8px] border-red-100 bg-white shadow-inner">
                  <span className="text-3xl font-black text-[#E31837]">
                    {grading.overallBand.toFixed(1)}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Đã chấm
                </div>
              </div>

              {/* 4 Criteria with SVG arc */}
              {criteriaConfig.map((c) => {
                const score = grading.criteria[c.key];
                const pct = (score / 9) * 100;
                const r = 32;
                const circ = 2 * Math.PI * r;
                return (
                  <div key={c.key} className="flex flex-col items-center gap-2.5 rounded-[26px] border border-red-50 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">{c.key}</p>
                    <div className="relative flex h-20 w-20 items-center justify-center">
                      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r={r} fill="none" stroke="#fee2e2" strokeWidth="8" />
                        <circle
                          cx="40" cy="40" r={r}
                          fill="none"
                          stroke="#E31837"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${circ}`}
                          strokeDashoffset={`${circ * (1 - pct / 100)}`}
                          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                        />
                      </svg>
                      <span className="relative text-2xl font-black text-[#E31837]">{score.toFixed(1)}</span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-800">{c.key}</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{c.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[26px] border border-amber-100 bg-amber-50 px-5 py-6 text-center">
              <p className="font-bold text-amber-800">Bài làm của bạn đang chờ giáo viên chấm.</p>
              <p className="mt-1 text-sm text-amber-600">Kết quả sẽ xuất hiện tại đây sau khi được đánh giá.</p>
            </div>
          )}

          {/* Row 2: Prompt | Corrected essay */}
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Prompt */}
            <div className="rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-red-50 p-2.5 text-red-600">
                  <BookOpenText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Đề bài</p>
                  <h3 className="font-bold text-slate-900">{promptTitle}</h3>
                </div>
              </div>

              {promptHtml ? (
                <div
                  className="prose prose-sm prose-slate max-w-none rounded-[18px] border border-red-50 bg-[linear-gradient(180deg,#fffafa_0%,#ffffff_100%)] p-4 prose-headings:text-slate-900"
                  dangerouslySetInnerHTML={{ __html: promptHtml }}
                />
              ) : (
                <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                  Không tải được nội dung đề bài.
                </div>
              )}
            </div>

            {/* Corrected essay */}
            <div className="flex flex-col rounded-[26px] border border-red-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-red-50 p-2.5 text-red-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                      {feedback.content ? 'Bài đã chỉnh sửa bởi giáo viên' : 'Bài làm của bạn'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {feedback.content
                        ? 'Chữ đỏ = giáo viên thêm/sửa · Gạch ngang = cần thay thế'
                        : 'Bản gốc bạn đã nộp'}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-600">
                  {submission.wordCount} từ
                </span>
              </div>

              <div
                className="flex-1 rounded-[18px] border border-red-50 bg-[linear-gradient(180deg,#fffafa_0%,#ffffff_100%)] p-4 text-[14.5px] leading-8 text-slate-800"
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: correctedContent }}
              />
            </div>
          </div>

          {/* Row 3: Overall feedback */}
          {grading && (
            <div className="rounded-[26px] border border-red-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
                <MessageSquareQuote className="h-4 w-4" />
                Nhận xét tổng quát của giáo viên
              </div>
              {feedback.overall_feedback ? (
                <p className="whitespace-pre-wrap text-[15px] leading-8 text-slate-700">
                  {feedback.overall_feedback}
                </p>
              ) : (
                <p className="text-sm italic text-slate-400">
                  Giáo viên chưa để lại nhận xét tổng quát.
                </p>
              )}
            </div>
          )}

          {/* Row 4: AI Feedback toggle block */}
          {grading && (() => {
            const ai = grading.aiFeedback;
            const hasAi = !!ai;
            const toggle = (key: string) => setAiSection(prev => prev === key ? null : key);
            return (
              <div className="overflow-hidden rounded-[26px] border border-indigo-100 bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 shadow-sm">

                {/* Clickable header – always visible */}
                <button
                  type="button"
                  onClick={() => setShowAiFeedback(prev => !prev)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 transition hover:bg-indigo-50/40"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl p-2 ${hasAi ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-900">Feedback chi tiết từ AI</p>
                      <p className="text-xs text-slate-400">
                        {hasAi
                          ? 'Phân tích theo IELTS Band Descriptors – nhấn để xem'
                          : 'Bài này chưa có phân tích AI'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasAi && (
                      <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                        AI
                      </span>
                    )}
                    {showAiFeedback
                      ? <ChevronUp className="h-5 w-5 text-indigo-400" />
                      : <ChevronDown className="h-5 w-5 text-indigo-400" />}
                  </div>
                </button>

                {/* Expanded content */}
                {showAiFeedback && (
                  <div className="border-t border-indigo-100">
                    {!hasAi ? (
                      /* ── No AI feedback ── */
                      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                        <div className="rounded-2xl bg-slate-100 p-4 text-slate-300">
                          <Bot className="h-8 w-8" />
                        </div>
                        <p className="font-bold text-slate-600">Không có chi tiết feedback AI</p>
                        <p className="max-w-sm text-sm text-slate-400">
                          Giáo viên chấm bài này chưa sử dụng tính năng AI phân tích.
                          Chỉ có nhận xét thủ công ở phần trên.
                        </p>
                      </div>
                    ) : (
                      /* ── Has AI feedback ── */
                      <div className="space-y-1 p-4">

                        {/* Criteria detail comments */}
                        {ai!.criteria_scores && (
                          <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-indigo-50">
                            <button type="button" onClick={() => toggle('criteria')} className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-indigo-50/50">
                              <span className="text-sm font-bold text-slate-800">Nhận xét từng tiêu chí</span>
                              {aiSection === 'criteria' ? <ChevronUp className="h-4 w-4 text-indigo-400" /> : <ChevronDown className="h-4 w-4 text-indigo-400" />}
                            </button>
                            {aiSection === 'criteria' && (
                              <div className="grid grid-cols-1 gap-3 border-t border-indigo-50 p-4 sm:grid-cols-2">
                                {([
                                  { key: 'task_response' as const, label: 'Task Response', short: 'TR' },
                                  { key: 'coherence_cohesion' as const, label: 'Coherence & Cohesion', short: 'CC' },
                                  { key: 'lexical_resource' as const, label: 'Lexical Resource', short: 'LR' },
                                  { key: 'grammatical_range' as const, label: 'Grammatical Range', short: 'GRA' },
                                ]).map(({ key, label, short }) => {
                                  const c = ai!.criteria_scores![key];
                                  if (!c) return null;
                                  return (
                                    <div key={key} className="rounded-[16px] border border-indigo-50 bg-indigo-50/30 p-4">
                                      <div className="flex items-center justify-between">
                                        <p className="font-bold text-slate-800">{short} · {label}</p>
                                        <span className="rounded-lg bg-indigo-600 px-2.5 py-0.5 text-sm font-black text-white">{c.band.toFixed(1)}</span>
                                      </div>
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
                        )}

                        {/* Quick boost tips */}
                        {(ai!.quick_boost_tips?.length ?? 0) > 0 && (
                          <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-indigo-50">
                            <button type="button" onClick={() => toggle('tips')} className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-indigo-50/50">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                <span className="text-sm font-bold text-slate-800">Quick Boost Tips – Nâng band nhanh</span>
                              </div>
                              {aiSection === 'tips' ? <ChevronUp className="h-4 w-4 text-indigo-400" /> : <ChevronDown className="h-4 w-4 text-indigo-400" />}
                            </button>
                            {aiSection === 'tips' && (
                              <ul className="space-y-2 border-t border-indigo-50 p-4">
                                {ai!.quick_boost_tips!.map((tip, i) => (
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
                        {(ai!.grammar_analysis?.length ?? 0) > 0 && (
                          <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-indigo-50">
                            <button type="button" onClick={() => toggle('grammar')} className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-indigo-50/50">
                              <span className="text-sm font-bold text-slate-800">Phân tích lỗi ngữ pháp</span>
                              {aiSection === 'grammar' ? <ChevronUp className="h-4 w-4 text-indigo-400" /> : <ChevronDown className="h-4 w-4 text-indigo-400" />}
                            </button>
                            {aiSection === 'grammar' && (
                              <div className="space-y-3 border-t border-indigo-50 p-4">
                                {ai!.grammar_analysis!.map((item, i) => (
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
                        {(ai!.vocabulary_analysis?.length ?? 0) > 0 && (
                          <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-indigo-50">
                            <button type="button" onClick={() => toggle('vocab')} className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-indigo-50/50">
                              <span className="text-sm font-bold text-slate-800">Cải thiện từ vựng</span>
                              {aiSection === 'vocab' ? <ChevronUp className="h-4 w-4 text-indigo-400" /> : <ChevronDown className="h-4 w-4 text-indigo-400" />}
                            </button>
                            {aiSection === 'vocab' && (
                              <div className="overflow-x-auto border-t border-indigo-50 p-4">
                                <table className="min-w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-slate-400">
                                      <th className="pb-2 pr-4 font-semibold">Từ gốc</th>
                                      <th className="pb-2 pr-4 font-semibold">Đánh giá</th>
                                      <th className="pb-2 pr-4 font-semibold">Gợi ý band 7+</th>
                                      <th className="pb-2 font-semibold">Lý do</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {ai!.vocabulary_analysis!.map((item, i) => (
                                      <tr key={i}>
                                        <td className="py-2 pr-4 italic text-slate-600">"{item.original_phrase}"</td>
                                        <td className="py-2 pr-4">
                                          <span className={`rounded-full px-2 py-0.5 font-semibold ${
                                            item.evaluation.toLowerCase().includes('tốt')
                                              ? 'bg-emerald-50 text-emerald-700'
                                              : 'bg-amber-50 text-amber-700'
                                          }`}>
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
                        {ai!.improved_rewrite && (
                          <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-indigo-50">
                            <button type="button" onClick={() => toggle('rewrite')} className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-indigo-50/50">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-violet-500" />
                                <span className="text-sm font-bold text-slate-800">Bài viết nâng cấp (Band 7.0)</span>
                              </div>
                              {aiSection === 'rewrite' ? <ChevronUp className="h-4 w-4 text-indigo-400" /> : <ChevronDown className="h-4 w-4 text-indigo-400" />}
                            </button>
                            {aiSection === 'rewrite' && (
                              <div className="border-t border-indigo-50 p-5">
                                <p className="whitespace-pre-wrap text-sm leading-8 text-slate-700">{ai!.improved_rewrite}</p>
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </section>
  );
}
