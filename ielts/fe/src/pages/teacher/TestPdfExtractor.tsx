/**
 * TestPdfExtractor
 * ─────────────────────────────────────────────────────────────────────────────
 * Split-screen page for teachers / admins to:
 *   1. Upload a Cambridge IELTS PDF (Reading or Listening)
 *   2. Have Gemini extract all passages/parts and questions
 *   3. Review the HTML context on the left and fill in correct answers on the right
 *   4. Save the final reviewed JSON directly to the database
 */

import { useCallback, useRef, useState } from 'react';
import {
  BookOpen,
  Headphones,
  Upload,
  Loader2,
  Sparkles,
  Save,
  Edit3,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TestType = 'reading' | 'listening';
type QuestionType = 'fill_blank' | 'multiple_choice' | 'matching' | 'map_labeling';

interface ExtractedQuestion {
  questionNumber: number;
  questionText: string;
  type: QuestionType;
  options: string[];
  imageUrl: string;
  correctAnswer: string;
}

interface ExtractedPart {
  partNumber: number;
  title: string;
  audioUrl?: string;
  description: string; // HTML
  questions: ExtractedQuestion[];
}

interface ExtractedTest {
  title: string;
  description: string;
  parts: ExtractedPart[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api';

function authHeaders() {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function answeredCount(parts: ExtractedPart[]): number {
  return parts.flatMap((p) => p.questions).filter((q) => q.correctAnswer.trim() !== '').length;
}

function totalCount(parts: ExtractedPart[]): number {
  return parts.flatMap((p) => p.questions).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Dropzone + test-type picker before extraction */
function UploadPanel({
  testType,
  onTestTypeChange,
  file,
  onFileChange,
  onExtract,
  loading,
}: {
  testType: TestType;
  onTestTypeChange: (t: TestType) => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  onExtract: () => void;
  loading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = e.dataTransfer.files[0];
      if (dropped?.type === 'application/pdf' || dropped?.name.endsWith('.pdf')) {
        onFileChange(dropped);
      } else {
        toast.error('Chỉ chấp nhận file PDF.');
      }
    },
    [onFileChange]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Test type selector */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-2">Loại bài thi</p>
        <div className="flex gap-3">
          {(['reading', 'listening'] as TestType[]).map((t) => (
            <button
              key={t}
              onClick={() => onTestTypeChange(t)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${
                testType === t
                  ? t === 'reading'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-violet-500 bg-violet-50 text-violet-700'
                  : 'border-slate-200 text-slate-500 hover:border-slate-400'
              }`}
            >
              {t === 'reading' ? (
                <BookOpen className="h-4 w-4" />
              ) : (
                <Headphones className="h-4 w-4" />
              )}
              {t === 'reading' ? 'Reading' : 'Listening'}
            </button>
          ))}
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center transition hover:border-blue-400 hover:bg-blue-50"
      >
        <FileText className="h-12 w-12 text-slate-400" />
        <div>
          <p className="font-semibold text-slate-700">Kéo thả hoặc nhấn để chọn PDF</p>
          <p className="text-xs text-slate-400 mt-1">Cambridge IELTS PDF — tối đa 50 MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f) onFileChange(f);
          }}
        />
      </div>

      {/* Selected file info */}
      {file && (
        <div className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-5 w-5 shrink-0 text-red-500" />
            <span className="truncate text-sm font-medium text-slate-700">{file.name}</span>
            <span className="shrink-0 text-xs text-slate-400">
              ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFileChange(null);
            }}
            className="ml-2 shrink-0 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Extract button */}
      <button
        onClick={onExtract}
        disabled={!file || loading}
        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang phân tích PDF… (có thể mất 30–90 giây)
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            Phân tích với Gemini AI
          </>
        )}
      </button>
    </div>
  );
}

/** Left panel — HTML context with optional edit mode */
function ContextPanel({
  html,
  onHtmlChange,
}: {
  html: string;
  onHtmlChange: (v: string) => void;
}) {
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Panel header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <span className="font-semibold text-slate-800 text-sm">Nội dung / Bài đọc</span>
        <button
          onClick={() => setEditMode((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
        >
          {editMode ? (
            <>
              <Eye className="h-3.5 w-3.5" /> Xem trước
            </>
          ) : (
            <>
              <Edit3 className="h-3.5 w-3.5" /> Sửa HTML
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {editMode ? (
          <textarea
            value={html}
            onChange={(e) => onHtmlChange(e.target.value)}
            className="h-full min-h-[500px] w-full resize-none rounded-lg border border-slate-200 p-3 font-mono text-xs leading-relaxed text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            spellCheck={false}
          />
        ) : (
          <div
            className="prose prose-slate max-w-none text-sm leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:p-2"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  );
}

/** Single question card in the right panel */
function QuestionCard({
  question,
  onChange,
}: {
  question: ExtractedQuestion;
  onChange: (q: ExtractedQuestion) => void;
}) {
  const typeBadge: Record<QuestionType, string> = {
    fill_blank: 'bg-blue-100 text-blue-700',
    multiple_choice: 'bg-green-100 text-green-700',
    matching: 'bg-amber-100 text-amber-700',
    map_labeling: 'bg-purple-100 text-purple-700',
  };
  const typeLabel: Record<QuestionType, string> = {
    fill_blank: 'Điền vào chỗ trống',
    multiple_choice: 'Trắc nghiệm',
    matching: 'Nối / TFNG',
    map_labeling: 'Sơ đồ',
  };

  const answered = question.correctAnswer.trim() !== '';

  return (
    <div
      className={`rounded-xl border p-3.5 transition ${
        answered ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
      }`}
    >
      {/* Question header */}
      <div className="mb-2 flex items-start gap-2">
        <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-bold text-white">
          Q{question.questionNumber}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${typeBadge[question.type] ?? 'bg-slate-100 text-slate-600'}`}
        >
          {typeLabel[question.type] ?? question.type}
        </span>
        {answered && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />}
      </div>

      {/* Question text */}
      <p className="mb-2.5 text-sm text-slate-700 leading-snug">{question.questionText}</p>

      {/* Options (multiple choice / matching) */}
      {question.options.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {question.options.map((opt) => (
            <button
              key={opt}
              onClick={() => onChange({ ...question, correctAnswer: opt })}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                question.correctAnswer === opt
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Correct answer input */}
      <input
        type="text"
        placeholder="Đáp án đúng…"
        value={question.correctAnswer}
        onChange={(e) => onChange({ ...question, correctAnswer: e.target.value })}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </div>
  );
}

/** Right panel — questions list */
function QuestionsPanel({
  part,
  onQuestionChange,
}: {
  part: ExtractedPart;
  onQuestionChange: (qIdx: number, q: ExtractedQuestion) => void;
}) {
  const done = part.questions.filter((q) => q.correctAnswer.trim() !== '').length;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-800 text-sm">Câu hỏi</span>
          <span className="text-xs text-slate-500">
            {done}/{part.questions.length} đã có đáp án
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${part.questions.length ? (done / part.questions.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
        {part.questions.map((q, idx) => (
          <QuestionCard
            key={`${part.partNumber}-${q.questionNumber}`}
            question={q}
            onChange={(updated) => onQuestionChange(idx, updated)}
          />
        ))}
        {part.questions.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">Không có câu hỏi nào được trích xuất.</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function TestPdfExtractor() {
  const [testType, setTestType] = useState<TestType>('reading');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [extracted, setExtracted] = useState<ExtractedTest | null>(null);
  const [activePartIdx, setActivePartIdx] = useState(0);

  // ── Extract ──────────────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setExtracted(null);
    setActivePartIdx(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('testType', testType);

      const { data } = await axios.post<ExtractedTest>(
        `${API_BASE}/ai/parse-pdf-test`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data', ...authHeaders() },
          timeout: 180_000, // 3 min
        }
      );

      setExtracted(data);
      toast.success(`Đã trích xuất ${data.parts?.length ?? 0} phần — kiểm tra và thêm đáp án!`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg =
        typeof detail === 'string'
          ? detail
          : (detail as any)?.message ?? err?.message ?? 'Lỗi không xác định';
      toast.error(`Trích xuất thất bại: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Update a question's correctAnswer ────────────────────────────────────
  const handleQuestionChange = (
    partIdx: number,
    qIdx: number,
    updated: ExtractedQuestion
  ) => {
    if (!extracted) return;
    const newParts = extracted.parts.map((p, pi) => {
      if (pi !== partIdx) return p;
      const newQuestions = p.questions.map((q, qi) => (qi === qIdx ? updated : q));
      return { ...p, questions: newQuestions };
    });
    setExtracted({ ...extracted, parts: newParts });
  };

  // ── Update description HTML for a part ───────────────────────────────────
  const handleHtmlChange = (partIdx: number, html: string) => {
    if (!extracted) return;
    const newParts = extracted.parts.map((p, pi) =>
      pi === partIdx ? { ...p, description: html } : p
    );
    setExtracted({ ...extracted, parts: newParts });
  };

  // ── Save to DB ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!extracted) return;
    setSaving(true);

    const endpoint =
      testType === 'reading'
        ? `${API_BASE}/reading`
        : `${API_BASE}/listening`;

    try {
      await axios.post(endpoint, extracted, {
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        timeout: 30_000,
      });
      toast.success('Đã lưu bài thi vào database!');
    } catch (err: any) {
      const detail = err?.response?.data?.message ?? err?.message ?? 'Lỗi server';
      toast.error(`Lưu thất bại: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const activePart = extracted?.parts[activePartIdx];
  const done = extracted ? answeredCount(extracted.parts) : 0;
  const total = extracted ? totalCount(extracted.parts) : 0;

  return (
    <div className="flex h-full flex-col bg-slate-100">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">PDF Extractor — Tạo đề từ Cambridge PDF</h1>
              <p className="text-xs text-slate-500">Tải lên PDF → AI trích xuất → Điền đáp án → Lưu</p>
            </div>
          </div>

          {extracted && (
            <div className="flex items-center gap-4">
              {/* Global progress */}
              <div className="flex items-center gap-2 text-sm">
                {done < total ? (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                <span className="text-slate-600">
                  <span className={done === total ? 'font-bold text-emerald-600' : 'font-bold text-amber-600'}>
                    {done}/{total}
                  </span>{' '}
                  câu có đáp án
                </span>
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Lưu vào Database
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {!extracted ? (
          /* Upload state */
          <div className="flex h-full items-start justify-center overflow-y-auto p-8">
            <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-md">
              <div className="mb-6 flex items-center gap-3">
                <Upload className="h-6 w-6 text-blue-600" />
                <h2 className="text-base font-bold text-slate-800">Tải lên PDF để bắt đầu</h2>
              </div>
              <UploadPanel
                testType={testType}
                onTestTypeChange={(t) => { setTestType(t); setFile(null); }}
                file={file}
                onFileChange={setFile}
                onExtract={handleExtract}
                loading={loading}
              />
            </div>
          </div>
        ) : (
          /* Split-screen state */
          <div className="flex h-full flex-col overflow-hidden">
            {/* Part navigation tabs */}
            <div className="shrink-0 flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2">
              <button
                disabled={activePartIdx === 0}
                onClick={() => setActivePartIdx((i) => i - 1)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {extracted.parts.map((p, idx) => {
                const partDone = p.questions.filter((q) => q.correctAnswer.trim() !== '').length;
                const partTotal = p.questions.length;
                const complete = partDone === partTotal && partTotal > 0;
                return (
                  <button
                    key={p.partNumber}
                    onClick={() => setActivePartIdx(idx)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      idx === activePartIdx
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {complete && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                    {testType === 'reading' ? `Passage ${p.partNumber}` : `Part ${p.partNumber}`}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${idx === activePartIdx ? 'bg-blue-500' : 'bg-slate-200 text-slate-600'}`}>
                      {partDone}/{partTotal}
                    </span>
                  </button>
                );
              })}

              <button
                disabled={activePartIdx === extracted.parts.length - 1}
                onClick={() => setActivePartIdx((i) => i + 1)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Part title */}
              <span className="ml-3 truncate text-xs text-slate-500 hidden sm:block">
                {activePart?.title}
              </span>

              {/* Reset button */}
              <button
                onClick={() => { setExtracted(null); setFile(null); setActivePartIdx(0); }}
                className="ml-auto shrink-0 flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
              >
                <Upload className="h-3.5 w-3.5" /> Upload khác
              </button>
            </div>

            {/* Split panels */}
            {activePart && (
              <div className="min-h-0 flex-1 grid grid-cols-2 gap-3 overflow-hidden p-3">
                <ContextPanel
                  html={activePart.description}
                  onHtmlChange={(html) => handleHtmlChange(activePartIdx, html)}
                />
                <QuestionsPanel
                  part={activePart}
                  onQuestionChange={(qIdx, q) => handleQuestionChange(activePartIdx, qIdx, q)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
