/**
 * AIImageParseModal
 * ------------------
 * Teacher uploads an image of an IELTS Listening (or Reading) test page.
 * The component calls the FastAPI ai-service, receives the parsed JSON,
 * and lets the teacher review/copy it before filling the create-test form.
 *
 * Usage:
 *   <AIImageParseModal
 *     isOpen={isAIImageModalOpen}
 *     onClose={() => setIsAIImageModalOpen(false)}
 *     onApply={(parsed) => applyParsedListeningTest(parsed)}
 *     module="listening"
 *   />
 */

import { useRef, useState } from 'react';
import { ImageUp, Loader2, Sparkles, X, ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useUserStore } from '../../store/useUserStore';

// ---- Types -----------------------------------------------------------------

interface ListeningQuestion {
  questionText: string;
  type: 'fill_blank' | 'multiple_choice' | 'matching' | 'map_labeling';
  options: string[];
  imageUrl: string;
  correctAnswer: string;
}

interface ListeningPart {
  partNumber: number;
  title: string;
  audioUrl: string;
  description: string;
  questions: ListeningQuestion[];
}

export interface ParsedListeningTest {
  title: string;
  description: string;
  parts: ListeningPart[];
}

interface AIImageParseModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when the teacher clicks "Áp dụng" — passes the parsed JSON. */
  onApply: (parsed: ParsedListeningTest) => void;
  module?: 'listening' | 'reading';
}

// ---- Component -------------------------------------------------------------

export function AIImageParseModal({
  isOpen,
  onClose,
  onApply,
  module = 'listening',
}: AIImageParseModalProps) {
  const { user } = useUserStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedListeningTest | null>(null);
  const [rawJson, setRawJson] = useState('');

  if (!isOpen) return null;

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const endpoint =
    module === 'listening'
      ? `${API_BASE}/ai/parse-listening-image`
      : `${API_BASE}/ai/parse-reading-image`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setParsedResult(null);
    setRawJson('');
  };

  const handleParse = async () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn ảnh trước.');
      return;
    }

    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const token = localStorage.getItem('accessToken');
      const { data } = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 120_000, // 2 min — Gemini can be slow
      });

      setParsedResult(data);
      setRawJson(JSON.stringify(data, null, 2));
      toast.success('Phân tích ảnh thành công!');
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ?? err?.message ?? 'Lỗi không xác định';
      const msg = typeof detail === 'string' ? detail : detail?.message ?? JSON.stringify(detail);
      toast.error(`Lỗi: ${msg}`);
    } finally {
      setParsing(false);
    }
  };

  const handleApply = () => {
    if (!parsedResult) return;
    onApply(parsedResult);
    toast.success('Đã áp dụng dữ liệu AI vào form tạo đề!');
    handleClose();
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setParsedResult(null);
    setRawJson('');
    onClose();
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawJson);
    toast.success('Đã sao chép JSON!');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-violet-600" />
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                Tạo đề {module === 'listening' ? 'Listening' : 'Reading'} từ ảnh (AI)
              </h3>
              <p className="text-sm text-slate-500">
                Tải ảnh trang đề thi lên — Gemini sẽ phân tích và tạo JSON tự động
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
          {/* Left: upload + preview */}
          <div className="flex w-1/2 flex-col gap-4 border-r border-slate-100 p-6 overflow-y-auto">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50 p-8 text-center transition hover:border-violet-500 hover:bg-violet-100"
            >
              <ImageUp className="h-10 w-10 text-violet-500" />
              <p className="font-semibold text-violet-700">Nhấn để chọn ảnh</p>
              <p className="text-xs text-slate-500">PNG, JPG, WEBP — tối đa 20 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {previewUrl && (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full object-contain max-h-[400px]"
                />
                <p className="px-3 py-2 text-xs text-slate-500 bg-slate-50">
                  {selectedFile?.name} ({((selectedFile?.size ?? 0) / 1024).toFixed(0)} KB)
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleParse}
              disabled={!selectedFile || parsing}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {parsing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang phân tích... (có thể mất ~30s)
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Phân tích bằng Gemini AI
                </>
              )}
            </button>
          </div>

          {/* Right: JSON result */}
          <div className="flex w-1/2 flex-col gap-3 p-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-700">Kết quả JSON</h4>
              {parsedResult && (
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 transition-colors"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Sao chép JSON
                </button>
              )}
            </div>

            {!parsedResult && !parsing && (
              <div className="flex flex-1 items-center justify-center text-slate-400 text-sm">
                Kết quả JSON sẽ hiển thị ở đây sau khi phân tích.
              </div>
            )}

            {parsing && (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center text-slate-500">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-500 mb-3" />
                  <p className="font-medium">Gemini đang phân tích ảnh...</p>
                  <p className="text-xs mt-1">Thường mất 15–45 giây</p>
                </div>
              </div>
            )}

            {parsedResult && (
              <>
                {/* Summary */}
                <div className="rounded-xl bg-green-50 border border-green-200 p-4 space-y-1">
                  <p className="font-semibold text-green-800">✓ Phân tích thành công</p>
                  <p className="text-sm text-green-700">
                    <strong>Tiêu đề:</strong> {parsedResult.title}
                  </p>
                  {module === 'listening' && (
                    <p className="text-sm text-green-700">
                      <strong>Parts:</strong> {parsedResult.parts?.length ?? 0} &nbsp;|&nbsp;
                      <strong>Câu hỏi:</strong>{' '}
                      {parsedResult.parts?.reduce((s, p) => s + (p.questions?.length ?? 0), 0) ?? 0}
                    </p>
                  )}
                </div>

                {/* Raw JSON editor */}
                <textarea
                  value={rawJson}
                  onChange={(e) => {
                    setRawJson(e.target.value);
                    try {
                      setParsedResult(JSON.parse(e.target.value));
                    } catch {
                      // invalid JSON — keep old result until fixed
                    }
                  }}
                  rows={18}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-xs font-mono
                             focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y leading-relaxed"
                />

                <button
                  type="button"
                  onClick={handleApply}
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
                >
                  <ClipboardCheck className="h-5 w-5" />
                  Áp dụng vào form tạo đề
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
