/**
 * AIPdfParseModal
 * ---------------
 * Teacher uploads a Cambridge IELTS PDF (Reading or Listening).
 * Sends it to the FastAPI ai-service → Gemini extracts structured JSON.
 * Teacher reviews the result, optionally edits raw JSON, then clicks
 * "Áp dụng vào form" — which calls onApply(testType, parsed).
 */

import { useRef, useState } from 'react';
import { Check, FileText, Loader2, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PdfParsedQuestion {
  questionNumber?: number;
  questionText: string;
  type: string;
  options: string[];
  imageUrl?: string;
  correctAnswer: string;
}

interface PdfParsedPart {
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

interface AIPdfParseModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when teacher clicks "Áp dụng vào form". */
  onApply: (testType: 'reading' | 'listening', parsed: PdfParsedTest) => void;
  defaultTestType?: 'reading' | 'listening';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIPdfParseModal({
  isOpen,
  onClose,
  onApply,
  defaultTestType = 'reading',
}: AIPdfParseModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [testType, setTestType] = useState<'reading' | 'listening'>(defaultTestType);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<PdfParsedTest | null>(null);
  const [rawJson, setRawJson] = useState('');

  if (!isOpen) return null;

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      toast.error('Vui lòng chọn file PDF.');
      return;
    }
    setSelectedFile(file);
    setParsedResult(null);
    setRawJson('');
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      toast.error('Vui lòng chọn file PDF.');
      return;
    }
    setSelectedFile(file);
    setParsedResult(null);
    setRawJson('');
  }

  async function handleParse() {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file PDF trước.');
      return;
    }
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('testType', testType);

      const token = localStorage.getItem('accessToken');
      const response = await axios.post(`${API_BASE}/ai/parse-pdf-test`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 180_000,
      });

      const parsed = response.data as PdfParsedTest;
      setParsedResult(parsed);
      setRawJson(JSON.stringify(parsed, null, 2));

      const totalQ = parsed.parts?.reduce((s, p) => s + (p.questions?.length ?? 0), 0) ?? 0;
      toast.success(`Đã trích xuất ${parsed.parts?.length ?? 0} part(s) · ${totalQ} câu hỏi`);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Lỗi khi phân tích PDF. Vui lòng thử lại.';
      toast.error(msg);
    } finally {
      setParsing(false);
    }
  }

  function handleApply() {
    let toApply: PdfParsedTest | null = parsedResult;
    try {
      toApply = JSON.parse(rawJson) as PdfParsedTest;
    } catch {
      // keep original if JSON edit is invalid
    }
    if (!toApply) {
      toast.error('Chưa có dữ liệu để áp dụng.');
      return;
    }
    onApply(testType, toApply);
    onClose();
  }

  const totalQuestions = parsedResult?.parts?.reduce((s, p) => s + (p.questions?.length ?? 0), 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="relative flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Tạo đề từ PDF (AI)</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Tải lên file PDF Cambridge IELTS để Gemini tự động trích xuất câu hỏi
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          {/* Test type selector */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Loại đề</p>
            <div className="flex gap-3">
              {(['reading', 'listening'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTestType(t)}
                  className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
                    testType === t
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t === 'reading' ? 'Reading' : 'Listening'}
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-indigo-400 hover:bg-indigo-50"
          >
            <FileText className="mb-3 h-10 w-10 text-slate-400" />
            {selectedFile ? (
              <p className="font-semibold text-slate-700">
                {selectedFile.name}{' '}
                <span className="font-normal text-slate-500">
                  ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </p>
            ) : (
              <>
                <p className="font-semibold text-slate-700">Kéo thả hoặc click để chọn PDF</p>
                <p className="mt-1 text-sm text-slate-500">
                  Cambridge IELTS Academic Reading &amp; Listening · tối đa 50 MB
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Parse button */}
          <button
            type="button"
            onClick={handleParse}
            disabled={!selectedFile || parsing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {parsing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {parsing ? 'Đang phân tích… (1–3 phút)' : 'Phân tích với Gemini AI'}
          </button>

          {/* Result JSON editor */}
          {parsedResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-green-700">
                  ✓ {parsedResult.parts?.length ?? 0} part(s) · {totalQuestions} câu hỏi
                </p>
                <p className="text-xs text-slate-500">Có thể chỉnh sửa JSON trước khi áp dụng</p>
              </div>
              <textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                rows={16}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-800 outline-none focus:border-indigo-500"
                spellCheck={false}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!parsedResult}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Áp dụng vào form
          </button>
        </div>
      </div>
    </div>
  );
}
