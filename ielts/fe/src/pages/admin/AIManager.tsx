import { useEffect, useState } from 'react';
import { Bot, Eye, EyeOff, KeyRound, Loader2, RotateCcw, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AIConfig {
  geminiApiKeySet: boolean;
  readingPromptTemplate: string;
  listeningPromptTemplate: string;
  updatedAt?: string;
}

interface FormState {
  geminiApiKey: string;       // empty = "don't change"
  readingPromptTemplate: string;
  listeningPromptTemplate: string;
}

// ---------------------------------------------------------------------------
// Default prompt templates (pre-loaded when DB is empty)
// ---------------------------------------------------------------------------

const DEFAULT_LISTENING_PROMPT = `You are an expert IELTS test digitizer. Analyze the provided image of an IELTS Listening test page carefully.

Convert its ENTIRE content into a single, valid JSON object that matches the schema below EXACTLY.

CRITICAL RULES:
1. Return ONLY raw JSON. Do NOT wrap it in markdown code blocks (no \`\`\`json fences).
2. For each Part's "description" field, generate rich inline HTML that visually replicates
   the layout seen in the image:
   - Use <table border="1" cellpadding="4" style="border-collapse:collapse;width:100%"> for tables.
   - Use <ul><li> for bullet lists.
   - Use <div style="border:1px solid #888;padding:8px;margin:4px 0;"> for boxed/framed sections.
   - Use <strong> for bold labels, <br/> for line breaks.
3. Map each visible question to the correct type:
   - "fill_blank"       – a blank to fill in (e.g. "The flight number is ___.")
   - "multiple_choice"  – options A / B / C / D (or similar)
   - "matching"         – match items from two lists
   - "map_labeling"     – label a map, diagram, or floor plan
4. If the correct answer is visible in the image, populate "correctAnswer"; otherwise use "".
5. Copy all question text EXACTLY as it appears in the image.
6. "audioUrl" and "imageUrl" must always be empty strings "".

JSON Schema:
{
  "title": "IELTS Listening Test – [infer from image]",
  "description": "Full test description",
  "parts": [
    {
      "partNumber": 1,
      "title": "Part 1: [infer from image]",
      "audioUrl": "",
      "description": "<p>HTML-formatted instructions and context from the image</p>",
      "questions": [
        {
          "questionText": "Exact question text from image",
          "type": "fill_blank",
          "options": [],
          "imageUrl": "",
          "correctAnswer": ""
        },
        {
          "questionText": "Exact question text from image",
          "type": "multiple_choice",
          "options": ["A. Option one", "B. Option two", "C. Option three"],
          "imageUrl": "",
          "correctAnswer": ""
        }
      ]
    }
  ]
}`;

const DEFAULT_READING_PROMPT = `You are an expert IELTS test digitizer. Analyze the provided image of an IELTS Reading test page carefully.

Convert its ENTIRE content into a single, valid JSON object that matches the schema below EXACTLY.

CRITICAL RULES:
1. Return ONLY raw JSON. Do NOT use markdown code fences.
2. For each Passage's "content" field, reproduce the full passage text with basic inline HTML
   (<p>, <strong>, <em>, <ul><li>, headings) to preserve formatting.
3. Map each question to the correct type:
   - "MULTIPLE_CHOICE"  – one correct answer from A / B / C / D
   - "FILL_IN_BLANK"    – write one or a few words in a blank
   - "MATCHING"         – match headings, features, or sentence endings
   - "TFNG"             – True / False / Not Given
   - "YNNG"             – Yes / No / Not Given
4. Populate "correctAnswer" when visible; otherwise use "".
5. Copy all question text EXACTLY as written in the image.

JSON Schema:
{
  "title": "IELTS Reading Test – [infer from image]",
  "description": "Test description",
  "passages": [
    {
      "passageNumber": 1,
      "title": "Passage 1 title",
      "content": "<p>Full passage HTML content</p>",
      "image": "",
      "questions": [
        {
          "questionNumber": 1,
          "type": "MULTIPLE_CHOICE",
          "text": "Exact question text",
          "options": ["A. option", "B. option", "C. option", "D. option"],
          "correctAnswer": "",
          "explanation": ""
        }
      ]
    }
  ]
}`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIManager() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [form, setForm] = useState<FormState>({
    geminiApiKey: '',
    readingPromptTemplate: '',
    listeningPromptTemplate: '',
  });
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ---- Load current config -----------------------------------------------
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await apiClient.get<AIConfig>('/admin/system-config');
        setConfig(data);
        setForm({
          geminiApiKey: '',                                       // never pre-fill key
          readingPromptTemplate:
            data.readingPromptTemplate || DEFAULT_READING_PROMPT,
          listeningPromptTemplate:
            data.listeningPromptTemplate || DEFAULT_LISTENING_PROMPT,
        });
      } catch {
        toast.error('Không thể tải cấu hình AI');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ---- Save ---------------------------------------------------------------
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Partial<FormState> = {
        readingPromptTemplate: form.readingPromptTemplate,
        listeningPromptTemplate: form.listeningPromptTemplate,
      };
      // Only include API key if the field was actually filled in
      if (form.geminiApiKey.trim()) {
        payload.geminiApiKey = form.geminiApiKey.trim();
      }

      const { data } = await apiClient.put<AIConfig>('/admin/system-config', payload);
      setConfig(data);
      setForm((prev) => ({ ...prev, geminiApiKey: '' }));
      toast.success('Cấu hình AI đã được lưu!');
    } catch {
      toast.error('Lưu thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  // ---- Reset to defaults --------------------------------------------------
  const handleResetListening = () =>
    setForm((f) => ({ ...f, listeningPromptTemplate: DEFAULT_LISTENING_PROMPT }));
  const handleResetReading = () =>
    setForm((f) => ({ ...f, readingPromptTemplate: DEFAULT_READING_PROMPT }));

  // ---- Render -------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Bot className="h-7 w-7 text-red-600" />
          <h2 className="text-3xl font-bold text-slate-900">AI Manager</h2>
        </div>
        <p className="text-slate-500">
          Quản lý Gemini API key và System Prompts cho tính năng tạo đề thi bằng AI.
        </p>
        {config?.updatedAt && (
          <p className="text-xs text-slate-400 mt-1">
            Cập nhật lần cuối: {new Date(config.updatedAt).toLocaleString('vi-VN')}
          </p>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* ── API Key ───────────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-slate-800">Gemini API Key</h3>
          </div>

          {config?.geminiApiKeySet !== undefined && (
            <div
              className={`inline-flex items-center gap-2 text-sm px-3 py-1 rounded-full ${
                config.geminiApiKeySet
                  ? 'bg-green-50 text-green-700'
                  : 'bg-yellow-50 text-yellow-700'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  config.geminiApiKeySet ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              />
              {config.geminiApiKeySet ? 'API Key đang được cấu hình' : 'Chưa có API Key'}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              API Key mới{' '}
              <span className="text-slate-400 font-normal">(để trống nếu không đổi)</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="AIza..."
                value={form.geminiApiKey}
                onChange={(e) => setForm((f) => ({ ...f, geminiApiKey: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 pr-12 text-sm
                           focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
                           font-mono"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Lấy API key tại{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Google AI Studio
              </a>
              .
            </p>
          </div>
        </section>

        {/* ── Listening Prompt ──────────────────────────────────────────── */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">System Prompt — Listening</h3>
            <button
              type="button"
              onClick={handleResetListening}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset về mặc định
            </button>
          </div>
          <textarea
            value={form.listeningPromptTemplate}
            onChange={(e) =>
              setForm((f) => ({ ...f, listeningPromptTemplate: e.target.value }))
            }
            rows={18}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm font-mono
                       focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
                       resize-y leading-relaxed"
            placeholder="Nhập system prompt cho Listening image parsing..."
          />
          <p className="text-xs text-slate-400">
            Prompt này được gửi kèm hình ảnh đến Gemini khi giáo viên dùng tính năng
            <strong> Tạo đề Listening từ ảnh</strong>.
          </p>
        </section>

        {/* ── Reading Prompt ────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">System Prompt — Reading</h3>
            <button
              type="button"
              onClick={handleResetReading}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset về mặc định
            </button>
          </div>
          <textarea
            value={form.readingPromptTemplate}
            onChange={(e) =>
              setForm((f) => ({ ...f, readingPromptTemplate: e.target.value }))
            }
            rows={18}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm font-mono
                       focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
                       resize-y leading-relaxed"
            placeholder="Nhập system prompt cho Reading image parsing..."
          />
          <p className="text-xs text-slate-400">
            Prompt này được dùng khi giáo viên dùng tính năng
            <strong> Tạo đề Reading từ ảnh</strong>.
          </p>
        </section>

        {/* ── Save Button ───────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60
                       text-white font-semibold px-8 py-3 rounded-lg transition-colors shadow-md"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </form>
    </div>
  );
}
