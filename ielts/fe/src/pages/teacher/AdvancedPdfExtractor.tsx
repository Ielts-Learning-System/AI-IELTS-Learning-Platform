/**
 * AdvancedPdfExtractor
 * --------------------
 * Full-screen overlay for verbatim IELTS test extraction via Gemini.
 *
 * Phase 1 — Form
 *   • Test type toggle (Reading / Listening)
 *   • Part selection dropdown (All / Part 1–4)
 *   • Test PDF upload (required)
 *   • Answer Key PDF or image upload (optional → Gemini auto-fills correctAnswer)
 *
 * Phase 2 — Split-screen review
 *   • Left panel : HTML passage/task layout with Edit/Preview toggle
 *   • Right panel: Questions with inline editable correctAnswer inputs
 *   • Per-part tab bar
 *
 * Exports PdfParsedTest (same schema as AIPdfParseModal for drop-in compatibility).
 */

import { useRef, useState } from 'react';
import { ArrowLeft, Check, Eye, FileText, Loader2, Pencil, Sparkles, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Types  (re-exported so consumers can drop AIPdfParseModal import)
// ---------------------------------------------------------------------------

export interface PdfParsedQuestion {
  questionNumber?: number;
  questionText: string;
  type: string;
  options: string[];
  imageUrl?: string;
  correctAnswer: string;
}

export interface PdfParsedPart {
  partNumber: number;
  title: string;
  audioUrl?: string;
  description: string;
  questions: PdfParsedQuestion[];
}

export interface PdfParsedTest {
  title: string;
  description: string;
  parts: PdfParsedPart[];
}

type TestType = 'reading' | 'listening';

const PART_OPTIONS = ['All', 'Part 1', 'Part 2', 'Part 3', 'Part 4'] as const;

interface AdvancedPdfExtractorProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when the teacher clicks "Áp dụng vào form". */
  onApply: (testType: TestType, parsed: PdfParsedTest) => void;
  defaultTestType?: TestType;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AdvancedPdfExtractor({
  isOpen,
  onClose,
  onApply,
  defaultTestType = 'reading',
}: AdvancedPdfExtractorProps) {
  const testFileRef = useRef<HTMLInputElement>(null);
  const keyFileRef  = useRef<HTMLInputElement>(null);

  // ── form state ────────────────────────────────────────────────────────
  const [testType, setTestType]           = useState<TestType>(defaultTestType);
  const [partSelection, setPartSelection] = useState<string>('All');
  const [testFile, setTestFile]           = useState<File | null>(null);
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);

  // ── extraction state ──────────────────────────────────────────────────
  const [extracting, setExtracting] = useState(false);
  const [result, setResult]         = useState<PdfParsedTest | null>(null);

  // ── post-extraction UI ────────────────────────────────────────────────
  const [activePartIdx, setActivePartIdx] = useState(0);
  const [editingHtml, setEditingHtml]     = useState(false);

  if (!isOpen) return null;

  const API_BASE    = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const isFormPhase = result === null;
  const activePart  = result?.parts?.[activePartIdx];

  // ── helpers ───────────────────────────────────────────────────────────

  function resetForm() {
    setTestFile(null);
    setAnswerKeyFile(null);
    setResult(null);
    setActivePartIdx(0);
    setEditingHtml(false);
  }

  function updatePartDescription(idx: number, html: string) {
    if (!result) return;
    setResult({
      ...result,
      parts: result.parts.map((p, i) => (i === idx ? { ...p, description: html } : p)),
    });
  }

  function updateAnswer(partIdx: number, qIdx: number, value: string) {
    if (!result) return;
    setResult({
      ...result,
      parts: result.parts.map((p, i) => {
        if (i !== partIdx) return p;
        return {
          ...p,
          questions: p.questions.map((q, j) =>
            j !== qIdx ? q : { ...q, correctAnswer: value }
          ),
        };
      }),
    });
  }

  function handleTestFileDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
      toast.error('Chỉ chấp nhận file PDF cho đề thi.');
      return;
    }
    setTestFile(f);
  }

  function handleKeyFileDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) setAnswerKeyFile(f);
  }

  async function handleExtract() {
    if (!testFile) {
      toast.error('Vui lòng chọn file PDF đề thi.');
      return;
    }
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append('testFile', testFile);
      fd.append('testType', testType);
      fd.append('partSelection', partSelection);
      if (answerKeyFile) fd.append('answerKeyFile', answerKeyFile);

      const token = localStorage.getItem('accessToken');
      const res = await axios.post(`${API_BASE}/ai/extract-test`, fd, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 240_000, // 4 min — gemini-1.5-pro can be slow on dense PDFs
      });

      const parsed = res.data as PdfParsedTest;
      setResult(parsed);
      setActivePartIdx(0);
      setEditingHtml(false);

      const totalQ    = parsed.parts?.reduce((s, p) => s + (p.questions?.length ?? 0), 0) ?? 0;
      const answeredQ = parsed.parts?.reduce(
        (s, p) => s + p.questions.filter((q) => q.correctAnswer).length,
        0
      ) ?? 0;
      toast.success(
        `✓ ${parsed.parts?.length ?? 0} part(s) · ${totalQ} câu · ${answeredQ} đáp án`
      );
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })
        ?.response?.data?.detail;
      const msg =
        typeof detail === 'string'
          ? detail
          : typeof detail === 'object' && detail !== null && 'message' in detail
          ? String((detail as { message: unknown }).message)
          : 'Lỗi trích xuất. Vui lòng thử lại.';
      toast.error(msg.slice(0, 220));
    } finally {
      setExtracting(false);
    }
  }

  function handleApply() {
    if (!result) return;
    onApply(testType, result);
    onClose();
  }

  const totalQ = result?.parts?.reduce((s, p) => s + p.questions.length, 0) ?? 0;
  const answeredQ = result?.parts?.reduce(
    (s, p) => s + p.questions.filter((q) => q.correctAnswer).length,
    0
  ) ?? 0;

  // ── render ────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* ══ TOP BAR ══════════════════════════════════════════════════════ */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
        {result ? (
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Trích xuất lại
          </button>
        ) : (
          <div className="flex gap-0.5 rounded-xl border border-slate-200 bg-slate-100 p-0.5">
            {(['reading', 'listening'] as TestType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTestType(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  testType === t
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'reading' ? 'Reading' : 'Listening'}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-slate-700">
            {result
              ? `${result.title || 'Kết quả trích xuất'} · ${answeredQ}/${totalQ} đáp án`
              : 'Trích xuất đề thi IELTS nâng cao'}
          </span>
        </div>

        {result && (
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <Check className="h-4 w-4" />
            Áp dụng vào form
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ══ PHASE 1: FORM ════════════════════════════════════════════════ */}
      {isFormPhase && (
        <div className="flex flex-1 items-start justify-center overflow-y-auto bg-slate-50 p-8">
          <div className="w-full max-w-xl space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Cấu hình trích xuất</h2>
              <p className="mt-1 text-sm text-slate-500">
                Chọn phần trích xuất, tải lên đề thi và (tùy chọn) file đáp án
              </p>
            </div>

            {/* Part selection */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Phần trích xuất</label>
              <select
                value={partSelection}
                onChange={(e) => setPartSelection(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                {PART_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'All' ? 'Tất cả các phần' : opt}
                  </option>
                ))}
              </select>
              {partSelection === 'All' && (
                <p className="text-xs text-amber-600">
                  ⚠ Trích xuất tất cả có thể mất nhiều thời gian hơn. Chọn từng Part để nhanh hơn.
                </p>
              )}
            </div>

            {/* Test PDF */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                File đề thi <span className="text-red-500">*</span>
              </label>
              <div
                onClick={() => testFileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleTestFileDrop}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed py-6 text-center transition ${
                  testFile
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50'
                }`}
              >
                <FileText
                  className={`h-8 w-8 ${testFile ? 'text-indigo-500' : 'text-slate-400'}`}
                />
                {testFile ? (
                  <p className="text-sm font-semibold text-slate-700">
                    {testFile.name}{' '}
                    <span className="font-normal text-slate-500">
                      ({(testFile.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">Kéo thả hoặc click để chọn PDF đề thi</p>
                )}
                <input
                  ref={testFileRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setTestFile(f);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {/* Answer key (optional) */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                File đáp án{' '}
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                  Tùy chọn
                </span>
              </label>
              <div
                onClick={() => keyFileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleKeyFileDrop}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 transition ${
                  answerKeyFile
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50'
                }`}
              >
                <Upload
                  className={`h-5 w-5 shrink-0 ${
                    answerKeyFile ? 'text-emerald-500' : 'text-slate-400'
                  }`}
                />
                {answerKeyFile ? (
                  <div className="flex flex-1 items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      {answerKeyFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAnswerKeyFile(null);
                      }}
                      className="rounded p-0.5 text-slate-400 transition hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    PDF hoặc ảnh đáp án — Gemini tự động điền correctAnswer
                  </p>
                )}
                <input
                  ref={keyFileRef}
                  type="file"
                  accept=".pdf,application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setAnswerKeyFile(f);
                    e.target.value = '';
                  }}
                />
              </div>
              {answerKeyFile && (
                <p className="text-xs text-emerald-600">
                  ✓ Gemini sẽ ánh xạ đáp án từ file này vào từng câu hỏi theo số thứ tự
                </p>
              )}
            </div>

            {/* Extract button */}
            <button
              type="button"
              onClick={handleExtract}
              disabled={!testFile || extracting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {extracting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang trích xuất với Gemini… (có thể mất 2–4 phút)
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Trích xuất với Gemini AI
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ══ PHASE 2: SPLIT-SCREEN ════════════════════════════════════════ */}
      {!isFormPhase && result && (
        <>
          {/* Part tab bar */}
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 py-2">
            {result.parts.map((part, idx) => {
              const answered = part.questions.filter((q) => q.correctAnswer).length;
              const total    = part.questions.length;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActivePartIdx(idx);
                    setEditingHtml(false);
                  }}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    activePartIdx === idx
                      ? 'border border-slate-300 bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  {part.title
                    ? `${part.title.slice(0, 24)}${part.title.length > 24 ? '…' : ''}`
                    : `Part ${part.partNumber ?? idx + 1}`}
                  <span className="ml-1.5 rounded-md bg-slate-200 px-1 py-0.5 text-xs font-normal text-slate-600">
                    {answered}/{total}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Split view */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* LEFT — HTML context */}
            <div className="flex w-[52%] shrink-0 flex-col border-r border-slate-200">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <span className="max-w-xs truncate text-sm font-semibold text-slate-700">
                  {activePart?.title || `Part ${activePartIdx + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingHtml((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  {editingHtml ? (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Xem trước
                    </>
                  ) : (
                    <>
                      <Pencil className="h-3.5 w-3.5" />
                      Sửa HTML
                    </>
                  )}
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {editingHtml ? (
                  <textarea
                    value={activePart?.description ?? ''}
                    onChange={(e) => updatePartDescription(activePartIdx, e.target.value)}
                    className="h-full min-h-[500px] w-full resize-none rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-800 outline-none focus:border-indigo-400"
                    spellCheck={false}
                  />
                ) : activePart?.description ? (
                  <div
                    className="prose prose-sm max-w-none text-slate-800"
                    dangerouslySetInnerHTML={{ __html: activePart.description }}
                  />
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    Không có nội dung HTML cho part này.
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT — questions & answers */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                <span className="text-sm font-semibold text-slate-700">
                  Câu hỏi &amp; Đáp án{' '}
                  <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-xs">
                    {activePart?.questions.length ?? 0}
                  </span>
                </span>
                <span className="text-xs text-slate-500">
                  {activePart?.questions.filter((q) => q.correctAnswer).length ?? 0} đáp án đã điền
                </span>
              </div>

              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
                {(activePart?.questions ?? []).map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className={`rounded-xl border bg-white p-3 shadow-sm transition ${
                      q.correctAnswer ? 'border-emerald-200' : 'border-slate-200'
                    }`}
                  >
                    {/* Question header row */}
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                          testType === 'reading'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {q.questionNumber ?? qIdx + 1}
                      </span>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                        {q.type}
                      </span>
                      {/* Inline answer input */}
                      <div className="flex flex-1 items-center gap-1.5">
                        <span className="shrink-0 text-xs text-slate-400">Đáp án:</span>
                        <input
                          value={q.correctAnswer}
                          onChange={(e) => updateAnswer(activePartIdx, qIdx, e.target.value)}
                          className={`flex-1 rounded-lg border px-2 py-1 text-xs font-semibold outline-none transition ${
                            q.correctAnswer
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:border-emerald-400'
                              : 'border-slate-300 bg-white text-slate-700 focus:border-indigo-400'
                          }`}
                          placeholder="nhập hoặc sửa đáp án…"
                        />
                      </div>
                    </div>

                    {/* Question text */}
                    <p className="text-sm leading-relaxed text-slate-700">{q.questionText}</p>

                    {/* Options list */}
                    {q.options.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {q.options.map((opt, oi) => (
                          <li
                            key={oi}
                            className={`text-xs ${
                              q.correctAnswer &&
                              opt.toUpperCase().startsWith(q.correctAnswer.toUpperCase())
                                ? 'font-semibold text-emerald-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
