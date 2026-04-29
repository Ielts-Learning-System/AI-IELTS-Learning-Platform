/**
 * WritingPdfExtractor
 * ─────────────────────────────────────────────────────────────────────────────
 * Split-screen tool for teachers to:
 *   1. Upload a Cambridge IELTS Writing PDF
 *   2. Have Gemini extract Task 1 & Task 2 prompts
 *   3. Review / edit each task on the right panel
 *   4. Save individual tasks to the DB as Writing items
 */

import { useCallback, useRef, useState } from 'react';
import {
  FileText,
  Loader2,
  Sparkles,
  Save,
  Edit3,
  Eye,
  X,
  CheckCircle2,
  AlertCircle,
  PenLine,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type WritingCategory =
  | 'Chart/Graph'
  | 'Map/Diagram'
  | 'Process'
  | 'Letter'
  | 'Opinion'
  | 'Discussion'
  | 'Problem-Solution'
  | 'Advantage-Disadvantage'
  | 'Mixed';

interface ExtractedTask {
  taskNumber: 1 | 2;
  title: string;
  type: 'Task 1' | 'Task 2';
  category: WritingCategory;
  contentHtml: string;
  minWords: number;
  saved?: boolean;
}

interface ExtractionResult {
  testTitle: string;
  tasks: ExtractedTask[];
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

const CATEGORIES_TASK1: WritingCategory[] = ['Chart/Graph', 'Map/Diagram', 'Process', 'Letter', 'Mixed'];
const CATEGORIES_TASK2: WritingCategory[] = ['Opinion', 'Discussion', 'Problem-Solution', 'Advantage-Disadvantage', 'Mixed'];

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
      {/* Header */}
      <div className="flex items-center gap-2">
        <PenLine className="h-5 w-5 text-amber-600" />
        <h3 className="font-semibold text-slate-800">Writing PDF Extractor</h3>
      </div>

      {/* Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-10 text-center transition hover:border-amber-400 hover:bg-amber-100"
      >
        <FileText className="h-12 w-12 text-amber-400" />
        <div>
          <p className="font-semibold text-slate-700">Kéo thả hoặc nhấn để chọn PDF</p>
          <p className="text-xs text-slate-400 mt-1">Cambridge IELTS Writing PDF — tối đa 50 MB</p>
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
        className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang phân tích PDF Writing… (30–90 giây)
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

function TaskContentPanel({
  html,
  onHtmlChange,
}: {
  html: string;
  onHtmlChange: (v: string) => void;
}) {
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <span className="font-semibold text-slate-800 text-sm">Nội dung đề bài (HTML)</span>
        <button
          onClick={() => setEditMode((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
        >
          {editMode ? (
            <><Eye className="h-3.5 w-3.5" /> Xem trước</>
          ) : (
            <><Edit3 className="h-3.5 w-3.5" /> Sửa HTML</>
          )}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {editMode ? (
          <textarea
            value={html}
            onChange={(e) => onHtmlChange(e.target.value)}
            className="h-full min-h-[300px] w-full resize-none rounded-lg border border-slate-200 p-3 font-mono text-xs leading-relaxed text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
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

function TaskCard({
  task,
  onChange,
  onSave,
  saving,
}: {
  task: ExtractedTask;
  onChange: (t: ExtractedTask) => void;
  onSave: (t: ExtractedTask) => void;
  saving: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const categories = task.type === 'Task 1' ? CATEGORIES_TASK1 : CATEGORIES_TASK2;

  return (
    <div className={`rounded-xl border ${task.saved ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'} shadow-sm`}>
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${task.type === 'Task 1' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
            {task.type}
          </span>
          {task.saved ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-slate-300" />
          )}
          <span className="text-sm font-medium text-slate-700 truncate max-w-xs">{task.title || '(chưa có tiêu đề)'}</span>
        </div>
        <span className="text-xs text-slate-400">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tiêu đề</label>
            <input
              type="text"
              value={task.title}
              onChange={(e) => onChange({ ...task, title: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Danh mục</label>
            <select
              value={task.category}
              onChange={(e) => onChange({ ...task, category: e.target.value as WritingCategory })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Min words */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Số từ tối thiểu</label>
            <input
              type="number"
              value={task.minWords}
              onChange={(e) => onChange({ ...task, minWords: Number(e.target.value) })}
              min={50}
              max={500}
              className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Content HTML inline preview */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nội dung đề bài</label>
            <TaskContentPanel
              html={task.contentHtml}
              onHtmlChange={(v) => onChange({ ...task, contentHtml: v })}
            />
          </div>

          {/* Save button */}
          <button
            onClick={() => onSave(task)}
            disabled={saving || task.saved}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-sm text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              task.saved ? 'bg-emerald-500' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu…</>
            ) : task.saved ? (
              <><CheckCircle2 className="h-4 w-4" /> Đã lưu</>
            ) : (
              <><Save className="h-4 w-4" /> Lưu {task.type} vào DB</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function WritingPdfExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  // ── Extract ─────────────────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setTasks([]);
    try {
      const form = new FormData();
      form.append('testFile', file);
      form.append('testType', 'writing');
      form.append('partSelection', 'All');

      const { data } = await axios.post<ExtractionResult>(
        `${AI_SERVICE_URL}/api/ai/extract-test`,
        form,
        { headers: authHeaders(), timeout: 120_000 }
      );

      const extracted = (data.tasks || []).map((t) => ({ ...t, saved: false }));
      setResult(data);
      setTasks(extracted);

      if (data._usage) {
        logUsage(data._usage, 'Extract Writing');
      }

      if (extracted.length === 0) {
        toast.error('Không tìm thấy task nào trong PDF. Kiểm tra lại file.');
      } else {
        toast.success(`Trích xuất thành công ${extracted.length} task!`);
      }
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

  // ── Save single task ─────────────────────────────────────────────────────
  const handleSaveTask = async (task: ExtractedTask) => {
    const idx = tasks.findIndex((t) => t.taskNumber === task.taskNumber);
    if (idx === -1) return;
    setSavingIndex(idx);
    try {
      await axios.post(
        `${API_BASE}/writing`,
        {
          title: task.title,
          type: task.type,
          category: task.category,
          contentHtml: task.contentHtml,
        },
        { headers: authHeaders() }
      );
      setTasks((prev) =>
        prev.map((t, i) => (i === idx ? { ...t, saved: true } : t))
      );
      toast.success(`${task.type} đã được lưu vào DB!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Lưu thất bại. Thử lại.');
    } finally {
      setSavingIndex(null);
    }
  };

  const handleTaskChange = (idx: number, updated: ExtractedTask) => {
    setTasks((prev) => prev.map((t, i) => (i === idx ? updated : t)));
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <PenLine className="h-7 w-7 text-amber-600" />
          <h2 className="text-2xl font-bold text-slate-900">Writing PDF Extractor</h2>
        </div>
        <p className="text-slate-500 text-sm">
          Tải lên PDF bài thi IELTS Writing để Gemini tự động trích xuất Task 1 &amp; Task 2.
          Xem lại và lưu từng task vào database.
        </p>
      </div>

      {/* Upload panel */}
      {!result && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <UploadPanel
            file={file}
            onFileChange={setFile}
            onExtract={handleExtract}
            loading={loading}
          />
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Test title + reset */}
          <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-5 py-3">
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Đề thi được nhận diện</p>
              <p className="font-bold text-slate-800">{result.testTitle || '(Không xác định được tên đề thi)'}</p>
            </div>
            <div className="flex items-center gap-3">
              {result._usage && (
                <span className="text-xs text-slate-500">
                  {(result._usage.totalTokenCount ?? 0).toLocaleString()} tokens
                </span>
              )}
              <button
                onClick={() => { setResult(null); setTasks([]); setFile(null); }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 transition"
              >
                <X className="h-4 w-4" /> Tải PDF khác
              </button>
            </div>
          </div>

          {/* Task cards */}
          {tasks.length === 0 ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
              Không tìm thấy task nào. Kiểm tra lại file PDF hoặc thử với file khác.
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task, idx) => (
                <TaskCard
                  key={task.taskNumber}
                  task={task}
                  onChange={(updated) => handleTaskChange(idx, updated)}
                  onSave={handleSaveTask}
                  saving={savingIndex === idx}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
