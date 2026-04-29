import { useEffect, useState } from 'react';
import {
  Bot,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RotateCcw,
  Save,
  BarChart3,
  FileText,
  Mic,
  BookOpen,
  Headphones,
  PenLine,
  Zap,
  DollarSign,
  TrendingUp,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AIConfig {
  geminiApiKeySet: boolean;
  readingPromptTemplate: string;
  listeningPromptTemplate: string;
  writingExtractPrompt: string;
  speakingExtractPrompt: string;
  writingGradingPrompt: string;
  speakingGradingPrompt: string;
  monthlyTokenQuota: number;
  monthlyTokensUsed: number;
  quotaResetMonth: string;
  updatedAt?: string;
}

interface FormState {
  geminiApiKey: string;
  readingPromptTemplate: string;
  listeningPromptTemplate: string;
  writingExtractPrompt: string;
  speakingExtractPrompt: string;
  writingGradingPrompt: string;
  speakingGradingPrompt: string;
  monthlyTokenQuota: number;
}

interface AILog {
  _id: string;
  service: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  createdAt: string;
}

type TabId =
  | 'quota'
  | 'reading'
  | 'listening'
  | 'writingExtract'
  | 'speakingExtract'
  | 'writingGrade'
  | 'speakingGrade'
  | 'logs';

// ─────────────────────────────────────────────────────────────────────────────
// Default prompts (used when DB has nothing)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_LISTENING_PROMPT = `You are an expert IELTS test digitizer. Analyze the provided image of an IELTS Listening test page carefully.

Convert its ENTIRE content into a single, valid JSON object that matches the schema below EXACTLY.

CRITICAL RULES:
1. Return ONLY raw JSON. Do NOT wrap it in markdown code blocks (no \`\`\`json fences).
2. For each Part's "description" field, generate rich inline HTML that visually replicates the layout seen in the image.
3. Map each visible question to the correct type: "fill_blank", "multiple_choice", "matching", or "map_labeling".
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
        { "questionText": "Exact question text", "type": "fill_blank", "options": [], "imageUrl": "", "correctAnswer": "" }
      ]
    }
  ]
}`;

const DEFAULT_READING_PROMPT = `You are an expert IELTS test digitizer. Analyze the provided image of an IELTS Reading test page carefully.

Convert its ENTIRE content into a single, valid JSON object that matches the schema below EXACTLY.

CRITICAL RULES:
1. Return ONLY raw JSON. Do NOT use markdown code fences.
2. For each Passage's "content" field, reproduce the full passage text with basic inline HTML.
3. Map each question to the correct type: "MULTIPLE_CHOICE", "FILL_IN_BLANK", "MATCHING", "TFNG", or "YNNG".
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
        { "questionNumber": 1, "type": "MULTIPLE_CHOICE", "text": "Question text", "options": ["A.", "B.", "C.", "D."], "correctAnswer": "", "explanation": "" }
      ]
    }
  ]
}`;

const DEFAULT_WRITING_EXTRACT_PROMPT = `[PDF Writing extraction — system prompt managed by Gemini hardcoded defaults. Override here to customize.]`;
const DEFAULT_SPEAKING_EXTRACT_PROMPT = `[PDF Speaking extraction — system prompt managed by Gemini hardcoded defaults. Override here to customize.]`;
const DEFAULT_WRITING_GRADING_PROMPT = `You are an expert IELTS examiner grading a Writing response. Provide detailed feedback covering:
- Task Achievement / Task Response
- Coherence and Cohesion
- Lexical Resource
- Grammatical Range and Accuracy

Return a JSON object: { "bandScore": 7.0, "taskAchievement": "...", "coherenceCohesion": "...", "lexicalResource": "...", "grammaticalRange": "...", "overallFeedback": "..." }`;
const DEFAULT_SPEAKING_GRADING_PROMPT = `You are an expert IELTS examiner grading a Speaking response transcript. Provide detailed feedback covering:
- Fluency and Coherence
- Lexical Resource
- Grammatical Range and Accuracy
- Pronunciation

Return a JSON object: { "bandScore": 7.0, "fluencyCoherence": "...", "lexicalResource": "...", "grammaticalRange": "...", "pronunciation": "...", "overallFeedback": "..." }`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatCost(usd: number) {
  if (usd < 0.001) return `< $0.001`;
  return `$${usd.toFixed(4)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function serviceColor(service: string) {
  if (service.toLowerCase().includes('reading')) return 'bg-emerald-100 text-emerald-700';
  if (service.toLowerCase().includes('listening')) return 'bg-violet-100 text-violet-700';
  if (service.toLowerCase().includes('writing')) return 'bg-amber-100 text-amber-700';
  if (service.toLowerCase().includes('speaking')) return 'bg-blue-100 text-blue-700';
  if (service.toLowerCase().includes('grade') || service.toLowerCase().includes('grading')) return 'bg-pink-100 text-pink-700';
  return 'bg-slate-100 text-slate-700';
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Prompt textarea section
// ─────────────────────────────────────────────────────────────────────────────

function PromptSection({
  label,
  description,
  value,
  onChange,
  onReset,
  onSave,
  saving,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
  onReset: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{description}</p>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={16}
        className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm font-mono
                   focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
                   resize-y leading-relaxed"
        placeholder={`Nhập system prompt cho ${label}...`}
      />
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60
                     text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Đang lưu...' : 'Lưu prompt này'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function AIManager() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [form, setForm] = useState<FormState>({
    geminiApiKey: '',
    readingPromptTemplate: '',
    listeningPromptTemplate: '',
    writingExtractPrompt: '',
    speakingExtractPrompt: '',
    writingGradingPrompt: '',
    speakingGradingPrompt: '',
    monthlyTokenQuota: 1_000_000,
  });
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('quota');
  const [logs, setLogs] = useState<AILog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // ── Load config ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await apiClient.get<AIConfig>('/admin/system-config');
        setConfig(data);
        setForm({
          geminiApiKey: '',
          readingPromptTemplate: data.readingPromptTemplate || DEFAULT_READING_PROMPT,
          listeningPromptTemplate: data.listeningPromptTemplate || DEFAULT_LISTENING_PROMPT,
          writingExtractPrompt: data.writingExtractPrompt || DEFAULT_WRITING_EXTRACT_PROMPT,
          speakingExtractPrompt: data.speakingExtractPrompt || DEFAULT_SPEAKING_EXTRACT_PROMPT,
          writingGradingPrompt: data.writingGradingPrompt || DEFAULT_WRITING_GRADING_PROMPT,
          speakingGradingPrompt: data.speakingGradingPrompt || DEFAULT_SPEAKING_GRADING_PROMPT,
          monthlyTokenQuota: data.monthlyTokenQuota || 1_000_000,
        });
      } catch {
        toast.error('Không thể tải cấu hình AI');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Load logs when tab changes to 'logs' ─────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'logs') return;
    const loadLogs = async () => {
      setLogsLoading(true);
      try {
        const { data } = await apiClient.get<{ logs: AILog[] }>('/admin/ai-logs?limit=100');
        setLogs(data.logs || []);
      } catch {
        toast.error('Không thể tải logs AI');
      } finally {
        setLogsLoading(false);
      }
    };
    loadLogs();
  }, [activeTab]);

  // ── Save API key + quota ─────────────────────────────────────────────────
  const handleSaveKey = async () => {
    setSavingKey(true);
    try {
      const payload: Record<string, unknown> = {
        monthlyTokenQuota: form.monthlyTokenQuota,
      };
      if (form.geminiApiKey.trim()) {
        payload.geminiApiKey = form.geminiApiKey.trim();
      }
      const { data } = await apiClient.put<AIConfig>('/admin/system-config', payload);
      setConfig(data);
      setForm((f) => ({ ...f, geminiApiKey: '' }));
      toast.success('Đã lưu cấu hình API key!');
    } catch {
      toast.error('Lưu thất bại. Vui lòng thử lại.');
    } finally {
      setSavingKey(false);
    }
  };

  // ── Save single prompt ───────────────────────────────────────────────────
  const handleSavePrompt = async (field: keyof FormState) => {
    setSavingPrompt(field as string);
    try {
      const { data } = await apiClient.put<AIConfig>('/admin/system-config', {
        [field]: form[field],
      });
      setConfig(data);
      toast.success('Prompt đã được lưu!');
    } catch {
      toast.error('Lưu thất bại. Vui lòng thử lại.');
    } finally {
      setSavingPrompt(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  const usedPct = config
    ? Math.min(100, Math.round(((config.monthlyTokensUsed ?? 0) / (config.monthlyTokenQuota || 1_000_000)) * 100))
    : 0;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'quota', label: 'Quota & API Key', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'reading', label: 'Reading (Image)', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'listening', label: 'Listening (Image)', icon: <Headphones className="h-4 w-4" /> },
    { id: 'writingExtract', label: 'Writing Extract', icon: <PenLine className="h-4 w-4" /> },
    { id: 'speakingExtract', label: 'Speaking Extract', icon: <Mic className="h-4 w-4" /> },
    { id: 'writingGrade', label: 'Writing Grading', icon: <FileText className="h-4 w-4" /> },
    { id: 'speakingGrade', label: 'Speaking Grading', icon: <Zap className="h-4 w-4" /> },
    { id: 'logs', label: 'Cost Logs', icon: <DollarSign className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Bot className="h-7 w-7 text-red-600" />
          <h2 className="text-3xl font-bold text-slate-900">AI Manager</h2>
        </div>
        <p className="text-slate-500">
          Quản lý Gemini API key, System Prompts, Quota và lịch sử sử dụng AI.
        </p>
        {config?.updatedAt && (
          <p className="text-xs text-slate-400 mt-1">
            Cập nhật lần cuối: {new Date(config.updatedAt).toLocaleString('vi-VN')}
          </p>
        )}
      </div>

      {/* ── Quick stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tokens dùng tháng này</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{(config?.monthlyTokensUsed ?? 0).toLocaleString()}</p>
          <p className="text-xs text-slate-400">/ {(config?.monthlyTokenQuota ?? 0).toLocaleString()} quota</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quota còn lại</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{usedPct}%</p>
          <p className="text-xs text-slate-400">đã sử dụng</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">API Key</span>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${config?.geminiApiKeySet ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${config?.geminiApiKeySet ? 'bg-green-500' : 'bg-yellow-500'}`} />
            {config?.geminiApiKeySet ? 'Đã cấu hình' : 'Chưa có'}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tháng</span>
          </div>
          <p className="text-xl font-bold text-slate-800">{config?.quotaResetMonth || new Date().toISOString().slice(0, 7)}</p>
          <p className="text-xs text-slate-400">reset mỗi tháng</p>
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">

        {/* ─ Quota & API Key ─ */}
        {activeTab === 'quota' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-red-600" /> Quota sử dụng hàng tháng
              </h3>
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>{(config?.monthlyTokensUsed ?? 0).toLocaleString()} tokens đã dùng</span>
                  <span>{usedPct}%</span>
                </div>
                <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usedPct >= 90 ? 'bg-red-500' : usedPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Quota: {(config?.monthlyTokenQuota ?? 0).toLocaleString()} tokens / tháng.
                  Reset tự động đầu mỗi tháng.
                </p>
              </div>

              {/* Monthly quota setting */}
              <div className="mt-5">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Monthly Token Quota
                </label>
                <input
                  type="number"
                  value={form.monthlyTokenQuota}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyTokenQuota: Number(e.target.value) }))}
                  min={100_000}
                  step={100_000}
                  className="w-48 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-xs text-slate-400 mt-1">Ví dụ: 1000000 = 1 triệu tokens/tháng</p>
              </div>
            </div>

            {/* API Key section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <KeyRound className="h-5 w-5 text-red-600" /> Gemini API Key
              </h3>

              <div className="relative mb-3">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="AIza… (để trống nếu không đổi)"
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
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Lấy API key tại{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  Google AI Studio
                </a>.
              </p>

              <button
                onClick={handleSaveKey}
                disabled={savingKey}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60
                           text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
              >
                {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingKey ? 'Đang lưu...' : 'Lưu API Key & Quota'}
              </button>
            </div>
          </div>
        )}

        {/* ─ Reading Prompt ─ */}
        {activeTab === 'reading' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-emerald-600" /> System Prompt — Reading (Image)
            </h3>
            <PromptSection
              label="Reading Image"
              description="Dùng khi giáo viên tải ảnh bài thi Reading lên để Gemini phân tích."
              value={form.readingPromptTemplate}
              onChange={(v) => setForm((f) => ({ ...f, readingPromptTemplate: v }))}
              onReset={() => setForm((f) => ({ ...f, readingPromptTemplate: DEFAULT_READING_PROMPT }))}
              onSave={() => handleSavePrompt('readingPromptTemplate')}
              saving={savingPrompt === 'readingPromptTemplate'}
            />
          </div>
        )}

        {/* ─ Listening Prompt ─ */}
        {activeTab === 'listening' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Headphones className="h-5 w-5 text-violet-600" /> System Prompt — Listening (Image)
            </h3>
            <PromptSection
              label="Listening Image"
              description="Dùng khi giáo viên tải ảnh trang câu hỏi Listening lên để Gemini phân tích."
              value={form.listeningPromptTemplate}
              onChange={(v) => setForm((f) => ({ ...f, listeningPromptTemplate: v }))}
              onReset={() => setForm((f) => ({ ...f, listeningPromptTemplate: DEFAULT_LISTENING_PROMPT }))}
              onSave={() => handleSavePrompt('listeningPromptTemplate')}
              saving={savingPrompt === 'listeningPromptTemplate'}
            />
          </div>
        )}

        {/* ─ Writing Extract Prompt ─ */}
        {activeTab === 'writingExtract' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <PenLine className="h-5 w-5 text-amber-600" /> System Prompt — Writing PDF Extraction
            </h3>
            <PromptSection
              label="Writing Extract"
              description="Prompt cho tính năng trích xuất Task 1 & Task 2 từ PDF bài thi Writing. Để trống = dùng hardcoded prompt tối ưu sẵn."
              value={form.writingExtractPrompt}
              onChange={(v) => setForm((f) => ({ ...f, writingExtractPrompt: v }))}
              onReset={() => setForm((f) => ({ ...f, writingExtractPrompt: DEFAULT_WRITING_EXTRACT_PROMPT }))}
              onSave={() => handleSavePrompt('writingExtractPrompt')}
              saving={savingPrompt === 'writingExtractPrompt'}
            />
          </div>
        )}

        {/* ─ Speaking Extract Prompt ─ */}
        {activeTab === 'speakingExtract' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Mic className="h-5 w-5 text-blue-600" /> System Prompt — Speaking PDF Extraction
            </h3>
            <PromptSection
              label="Speaking Extract"
              description="Prompt cho tính năng trích xuất Part 1/2/3 từ PDF bài thi Speaking. Để trống = dùng hardcoded prompt tối ưu sẵn."
              value={form.speakingExtractPrompt}
              onChange={(v) => setForm((f) => ({ ...f, speakingExtractPrompt: v }))}
              onReset={() => setForm((f) => ({ ...f, speakingExtractPrompt: DEFAULT_SPEAKING_EXTRACT_PROMPT }))}
              onSave={() => handleSavePrompt('speakingExtractPrompt')}
              saving={savingPrompt === 'speakingExtractPrompt'}
            />
          </div>
        )}

        {/* ─ Writing Grading Prompt ─ */}
        {activeTab === 'writingGrade' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-pink-600" /> System Prompt — Writing Grading
            </h3>
            <PromptSection
              label="Writing Grading"
              description="Prompt để Gemini chấm điểm và nhận xét bài Writing của học sinh."
              value={form.writingGradingPrompt}
              onChange={(v) => setForm((f) => ({ ...f, writingGradingPrompt: v }))}
              onReset={() => setForm((f) => ({ ...f, writingGradingPrompt: DEFAULT_WRITING_GRADING_PROMPT }))}
              onSave={() => handleSavePrompt('writingGradingPrompt')}
              saving={savingPrompt === 'writingGradingPrompt'}
            />
          </div>
        )}

        {/* ─ Speaking Grading Prompt ─ */}
        {activeTab === 'speakingGrade' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-pink-600" /> System Prompt — Speaking Grading
            </h3>
            <PromptSection
              label="Speaking Grading"
              description="Prompt để Gemini chấm điểm và nhận xét bài nói của học sinh (từ transcript)."
              value={form.speakingGradingPrompt}
              onChange={(v) => setForm((f) => ({ ...f, speakingGradingPrompt: v }))}
              onReset={() => setForm((f) => ({ ...f, speakingGradingPrompt: DEFAULT_SPEAKING_GRADING_PROMPT }))}
              onSave={() => handleSavePrompt('speakingGradingPrompt')}
              saving={savingPrompt === 'speakingGradingPrompt'}
            />
          </div>
        )}

        {/* ─ Cost Logs ─ */}
        {activeTab === 'logs' && (
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-red-600" /> AI Usage &amp; Cost History
            </h3>

            {logsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                Chưa có dữ liệu. Logs sẽ xuất hiện sau khi sử dụng các tính năng AI.
              </div>
            ) : (
              <>
                {/* Summary row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">Tổng calls</p>
                    <p className="text-xl font-bold text-slate-800">{logs.length}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">Tổng tokens</p>
                    <p className="text-xl font-bold text-slate-800">
                      {logs.reduce((s, l) => s + l.totalTokens, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
                    <p className="text-xs text-slate-500 mb-1">Tổng chi phí (ước tính)</p>
                    <p className="text-xl font-bold text-slate-800">
                      {formatCost(logs.reduce((s, l) => s + l.estimatedCost, 0))}
                    </p>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left">
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Thời gian</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Dịch vụ</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Input Tokens</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Output Tokens</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Tổng</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Chi phí</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {logs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">{formatDate(log.createdAt)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${serviceColor(log.service)}`}>
                              {log.service}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 font-mono text-xs">{log.inputTokens.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-slate-700 font-mono text-xs">{log.outputTokens.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800 font-mono text-xs">{log.totalTokens.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-emerald-700 font-mono text-xs font-semibold">{formatCost(log.estimatedCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Chi phí ước tính dựa trên Gemini 2.5 Flash pricing (~$0.075/1M input, ~$0.30/1M output). Giá thực tế có thể thay đổi.
                </p>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
