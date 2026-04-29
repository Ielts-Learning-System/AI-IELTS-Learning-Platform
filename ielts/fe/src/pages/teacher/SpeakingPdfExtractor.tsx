/**
 * SpeakingPdfExtractor
 * ─────────────────────────────────────────────────────────────────────────────
 * Split-screen tool for teachers to:
 *   1. Upload a Cambridge IELTS Speaking test PDF
 *   2. Have Gemini extract Part 1 questions, Part 2 cue card, and Part 3 questions
 *   3. Review / edit on the right panel
 *   4. Save the test to the DB as a SpeakingTest
 */

import { useCallback, useRef, useState } from 'react';
import {
  FileText,
  Loader2,
  Sparkles,
  Save,
  X,
  CheckCircle2,
  Mic,
  Plus,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SpeakingTestDraft {
  title: string;
  part1: string[];
  part2: string;
  part3: string[];
}

interface ExtractionResult extends SpeakingTestDraft {
  _usage?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3000/api';
// AI extraction goes through the API gateway (which proxies /api/ai/* to the ai-service)
const AI_SERVICE_URL = (import.meta as any).env?.VITE_AI_SERVICE_URL ?? API_BASE.replace(/\/api$/, '');

function authHeaders() {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function logUsage(usage: ExtractionResult['_usage'], service: string) {
  if (!usage?.totalTokenCount) return;
  axios
    .post(
      `${API_BASE}/admin/ai-logs`,
      {
        service,
        model: 'gemini-2.5-flash',
        inputTokens: usage.promptTokenCount,
        outputTokens: usage.candidatesTokenCount,
        totalTokens: usage.totalTokenCount,
      },
      { headers: authHeaders() }
    )
    .catch(() => {/* best-effort */});
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function UploadPanel({
  file,
  onFileChange,
  onExtract,
  loading,
}: {
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
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Mic className="h-5 w-5 text-violet-600" />
        <h3 className="font-semibold text-slate-800">Speaking PDF Extractor</h3>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50 p-10 text-center transition hover:border-violet-400 hover:bg-violet-100"
      >
        <FileText className="h-12 w-12 text-violet-400" />
        <div>
          <p className="font-semibold text-slate-700">Kéo thả hoặc nhấn để chọn PDF</p>
          <p className="text-xs text-slate-400 mt-1">Cambridge IELTS Speaking PDF — tối đa 50 MB</p>
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
            onClick={(e) => { e.stopPropagation(); onFileChange(null); }}
            className="ml-2 shrink-0 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <button
        onClick={onExtract}
        disabled={!file || loading}
        className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang phân tích PDF Speaking… (30–90 giây)
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

/** Editable list of question strings */
function QuestionList({
  label,
  color,
  values,
  onChange,
}: {
  label: string;
  color: 'violet' | 'indigo' | 'purple';
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const colorMap = {
    violet: 'bg-violet-100 text-violet-700 border-violet-200',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
  };
  const ringMap = {
    violet: 'focus:ring-violet-400',
    indigo: 'focus:ring-indigo-400',
    purple: 'focus:ring-purple-400',
  };
  const btnMap = {
    violet: 'bg-violet-600 hover:bg-violet-700',
    indigo: 'bg-indigo-600 hover:bg-indigo-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
  };

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${colorMap[color]}`}>
        {label}
        <span className="font-normal">({values.length} câu hỏi)</span>
      </div>
      {values.map((q, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <span className="mt-2.5 shrink-0 rounded-full bg-slate-800 px-1.5 py-0.5 text-xs font-bold text-white">
            {idx + 1}
          </span>
          <textarea
            value={q}
            rows={2}
            onChange={(e) => {
              const next = [...values];
              next[idx] = e.target.value;
              onChange(next);
            }}
            className={`flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${ringMap[color]}`}
          />
          <button
            onClick={() => onChange(values.filter((_, i) => i !== idx))}
            className="mt-2 shrink-0 text-slate-400 hover:text-red-500 transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...values, ''])}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition ${btnMap[color]}`}
      >
        <Plus className="h-3.5 w-3.5" />
        Thêm câu hỏi
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function SpeakingPdfExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [draft, setDraft] = useState<SpeakingTestDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Extract ─────────────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setDraft(null);
    setSaved(false);
    try {
      const form = new FormData();
      form.append('testFile', file);
      form.append('testType', 'speaking');
      form.append('partSelection', 'All');

      const { data } = await axios.post<ExtractionResult>(
        `${AI_SERVICE_URL}/api/ai/extract-test`,
        form,
        { headers: authHeaders(), timeout: 120_000 }
      );

      setResult(data);
      setDraft({
        title: data.title || '',
        part1: Array.isArray(data.part1) ? data.part1 : [],
        part2: typeof data.part2 === 'string' ? data.part2 : '',
        part3: Array.isArray(data.part3) ? data.part3 : [],
      });

      if (data._usage) {
        logUsage(data._usage, 'Extract Speaking');
      }

      toast.success('Trích xuất Speaking test thành công!');
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string'
        ? detail
        : detail?.message ?? 'Trích xuất thất bại. Vui lòng thử lại.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!draft) return;
    if (!draft.title.trim()) { toast.error('Vui lòng nhập tiêu đề bài thi.'); return; }
    if (draft.part1.filter(q => q.trim()).length === 0) { toast.error('Part 1 cần ít nhất 1 câu hỏi.'); return; }
    if (!draft.part2.trim()) { toast.error('Part 2 cue card không được để trống.'); return; }
    if (draft.part3.filter(q => q.trim()).length === 0) { toast.error('Part 3 cần ít nhất 1 câu hỏi.'); return; }

    setSaving(true);
    try {
      await axios.post(
        `${API_BASE}/speaking/tests`,
        {
          title: draft.title.trim(),
          part1: draft.part1.map(q => q.trim()).filter(Boolean),
          part2: draft.part2.trim(),
          part3: draft.part3.map(q => q.trim()).filter(Boolean),
        },
        { headers: authHeaders() }
      );
      setSaved(true);
      toast.success('Speaking test đã được lưu vào DB!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lưu thất bại. Thử lại.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Mic className="h-7 w-7 text-violet-600" />
          <h2 className="text-2xl font-bold text-slate-900">Speaking PDF Extractor</h2>
        </div>
        <p className="text-slate-500 text-sm">
          Tải lên PDF bài thi IELTS Speaking để Gemini tự động trích xuất Part 1, Part 2 (Cue Card), và Part 3.
        </p>
      </div>

      {/* Two-column layout when result is present, single column otherwise */}
      {!result ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <UploadPanel
            file={file}
            onFileChange={setFile}
            onExtract={handleExtract}
            loading={loading}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: raw extracted data summary */}
          <div className="space-y-4">
            {/* Reset button */}
            <div className="flex items-center justify-between rounded-xl bg-violet-50 border border-violet-200 px-5 py-3">
              <div>
                <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Đề thi Speaking</p>
                <p className="font-bold text-slate-800 text-sm">{result.title || '(chưa xác định)'}</p>
              </div>
              <div className="flex items-center gap-3">
                {result._usage && (
                  <span className="text-xs text-slate-500">
                    {(result._usage.totalTokenCount ?? 0).toLocaleString()} tokens
                  </span>
                )}
                <button
                  onClick={() => { setResult(null); setDraft(null); setFile(null); setSaved(false); }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100 transition"
                >
                  <X className="h-4 w-4" /> Tải PDF khác
                </button>
              </div>
            </div>

            {/* Raw preview */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-5 overflow-y-auto max-h-[70vh]">
              <div>
                <h4 className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-2">Part 1 — {result.part1?.length ?? 0} câu</h4>
                <ol className="list-decimal list-inside space-y-1">
                  {(result.part1 || []).map((q, i) => (
                    <li key={i} className="text-sm text-slate-700">{q}</li>
                  ))}
                </ol>
              </div>
              <div>
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-2">Part 2 — Cue Card</h4>
                <p className="text-sm text-slate-700 whitespace-pre-line bg-indigo-50 rounded-lg p-3">{result.part2 || '(trống)'}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2">Part 3 — {result.part3?.length ?? 0} câu</h4>
                <ol className="list-decimal list-inside space-y-1">
                  {(result.part3 || []).map((q, i) => (
                    <li key={i} className="text-sm text-slate-700">{q}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* RIGHT: editable review panel */}
          {draft && (
            <div className="space-y-4">
              <div className={`rounded-2xl border ${saved ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'} shadow-sm p-5 space-y-5 overflow-y-auto max-h-[70vh]`}>
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tiêu đề bài thi</label>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    placeholder="VD: IELTS Speaking — Daily Routines"
                  />
                </div>

                {/* Part 1 */}
                <QuestionList
                  label="Part 1 — Câu hỏi ngắn"
                  color="violet"
                  values={draft.part1}
                  onChange={(v) => setDraft({ ...draft, part1: v })}
                />

                {/* Part 2 */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border bg-indigo-100 text-indigo-700 border-indigo-200">
                    Part 2 — Cue Card
                  </div>
                  <textarea
                    value={draft.part2}
                    rows={6}
                    onChange={(e) => setDraft({ ...draft, part2: e.target.value })}
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Describe a time when..."
                  />
                </div>

                {/* Part 3 */}
                <QuestionList
                  label="Part 3 — Thảo luận"
                  color="purple"
                  values={draft.part3}
                  onChange={(v) => setDraft({ ...draft, part3: v })}
                />
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className={`w-full flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  saved ? 'bg-emerald-500' : 'bg-violet-600 hover:bg-violet-700'
                }`}
              >
                {saving ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Đang lưu…</>
                ) : saved ? (
                  <><CheckCircle2 className="h-5 w-5" /> Đã lưu vào DB</>
                ) : (
                  <><Save className="h-5 w-5" /> Lưu Speaking Test vào DB</>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
