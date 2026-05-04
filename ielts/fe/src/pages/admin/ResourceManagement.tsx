import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Music, Image, Trash2, Eye, Search, Tag, Bot,
  FolderOpen, Upload, HardDrive, Plus, Pencil, Copy,
} from 'lucide-react';
import { apiClient } from '../../lib/api/client';

// ─── Types ───────────────────────────────────────────────────────────

interface FileRecord {
  id: string;
  name: string;
  type: 'MP3' | 'PDF' | 'PNG' | 'JPG' | 'WEBP' | 'WAV';
  size: number; // MB
  uploadedBy: string;
  date: string;
  secureUrl: string | null;
}

interface TagRecord {
  id: string;
  name: string;
  category: string;
  count: number;
  color: string; // stored in DB; frontend falls back to CATEGORY_COLORS
}

// ─── Static config ────────────────────────────────────────────────────

/** AI prompts remain static (no CRUD endpoint required yet). */
const AI_PROMPTS = [
  { id: '1', name: 'Writing Task 2 — Band 8.0 Evaluator', skill: 'Writing', model: 'gemini-2.5-flash', tokens: '~4,200', lastEdited: '2026-04-30', description: 'Evaluates Task 2 essays against official IELTS band descriptors (TA, CC, LR, GRA). Provides per-criterion scores and actionable feedback targeting Band 8.0 improvements.' },
  { id: '2', name: 'Writing Task 1 — Academic Report Scorer', skill: 'Writing', model: 'gemini-2.5-flash', tokens: '~3,800', lastEdited: '2026-04-29', description: 'Scores Task 1 academic reports (bar charts, line graphs, maps, processes). Checks data accuracy, overview quality, and cohesive device usage.' },
  { id: '3', name: 'Speaking Part 2 — Cue Card Extractor', skill: 'Speaking', model: 'gemini-2.5-pro', tokens: '~1,500', lastEdited: '2026-04-28', description: 'Extracts structured Part 2 cue card prompts from PDF exam papers. Outputs topic, bullet points, and follow-up questions in JSON.' },
  { id: '4', name: 'Reading — Triple Passage Analyzer', skill: 'Reading', model: 'gemini-2.5-flash', tokens: '~5,100', lastEdited: '2026-04-27', description: 'Parses 3-passage reading tests from PDFs. Identifies question types (TFNG, MCQ, Matching), extracts answer keys, and maps question numbers to passages.' },
  { id: '5', name: 'Listening — Audio Transcript Aligner', skill: 'Listening', model: 'gemini-2.5-pro', tokens: '~2,800', lastEdited: '2026-04-25', description: 'Aligns audio transcripts with question numbers across 4 sections. Tags answer locations and distractor segments for review.' },
  { id: '6', name: 'Speaking Part 3 — Discussion Evaluator', skill: 'Speaking', model: 'gemini-2.5-flash', tokens: '~3,200', lastEdited: '2026-04-24', description: 'Grades Part 3 discussion responses on Fluency, Lexical Resource, Grammar, and Pronunciation. Provides comparative band scoring.' },
  { id: '7', name: 'PDF → Full Exam Orchestrator', skill: 'All Skills', model: 'gemini-2.5-pro', tokens: '~6,500', lastEdited: '2026-05-01', description: 'Master prompt for the PDF orchestration pipeline. Coordinates extraction of Reading, Listening, Writing, and Speaking components from a single exam PDF into structured JSON payloads.' },
];

const typeConfig: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
  PDF: { icon: FileText, color: 'text-red-600',    bg: 'bg-red-50'    },
  MP3: { icon: Music,    color: 'text-purple-600', bg: 'bg-purple-50' },
  WAV: { icon: Music,    color: 'text-purple-600', bg: 'bg-purple-50' },
  PNG: { icon: Image,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  JPG: { icon: Image,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  WEBP:{ icon: Image,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

const skillColors: Record<string, string> = {
  Writing:    'bg-amber-100 text-amber-700',
  Speaking:   'bg-purple-100 text-purple-700',
  Reading:    'bg-blue-100 text-blue-700',
  Listening:  'bg-emerald-100 text-emerald-700',
  'All Skills': 'bg-red-100 text-red-700',
};

/** Fallback Tailwind colour classes by tag category (used when tag.color is empty). */
const CATEGORY_COLORS: Record<string, string> = {
  'Source':        'bg-blue-100 text-blue-700 border-blue-200',
  'Question Type': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Difficulty':    'bg-red-100 text-red-700 border-red-200',
  'Level':         'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Skill':         'bg-purple-100 text-purple-700 border-purple-200',
  'Other':         'bg-slate-100 text-slate-700 border-slate-200',
};

type TabKey = 'files' | 'tags' | 'prompts';

const TABS: { key: TabKey; label: string; icon: typeof FolderOpen }[] = [
  { key: 'files',   label: 'File Manager',        icon: FolderOpen },
  { key: 'tags',    label: 'Categories & Tags',    icon: Tag        },
  { key: 'prompts', label: 'AI System Prompts',    icon: Bot        },
];

// ─── Skeleton helpers ────────────────────────────────────────────────

function TableRowSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className="h-4 animate-pulse rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Component ───────────────────────────────────────────────────────

export function ResourceManagement() {
  const [activeTab, setActiveTab] = useState<TabKey>('files');
  const [fileSearch, setFileSearch] = useState('');
  const [tagSearch,  setTagSearch]  = useState('');

  // ── Files state ──────────────────────────────────────────────────
  const [files,         setFiles]         = useState<FileRecord[]>([]);
  const [filesLoading,  setFilesLoading]  = useState(false);
  const [filesError,    setFilesError]    = useState<string | null>(null);
  const [filesTotalSize,setFilesTotalSize] = useState(0);

  // ── Tags state ────────────────────────────────────────────────────
  const [tags,        setTags]        = useState<TagRecord[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError,   setTagsError]   = useState<string | null>(null);

  // ── Data fetchers ────────────────────────────────────────────────

  const fetchFiles = useCallback(async () => {
    setFilesLoading(true);
    setFilesError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: FileRecord[] }>(
        '/resources/files',
        { params: { limit: 100 } }
      );
      const data = res.data.data;
      setFiles(data);
      setFilesTotalSize(data.reduce((s, f) => s + f.size, 0));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Không thể tải danh sách file';
      setFilesError(msg);
    } finally {
      setFilesLoading(false);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    setTagsLoading(true);
    setTagsError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: TagRecord[] }>(
        '/resources/tags'
      );
      setTags(res.data.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Không thể tải danh sách tags';
      setTagsError(msg);
    } finally {
      setTagsLoading(false);
    }
  }, []);

  // Lazy-load per tab: only fetch when the tab is first activated
  useEffect(() => {
    if (activeTab === 'files' && files.length === 0 && !filesLoading) fetchFiles();
  }, [activeTab, files.length, filesLoading, fetchFiles]);

  useEffect(() => {
    if (activeTab === 'tags' && tags.length === 0 && !tagsLoading) fetchTags();
  }, [activeTab, tags.length, tagsLoading, fetchTags]);

  // ── Derived data ─────────────────────────────────────────────────

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(fileSearch.toLowerCase())
  );

  const groupedTags = tags
    .filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
    .reduce<Record<string, TagRecord[]>>((acc, tag) => {
      (acc[tag.category] ??= []).push(tag);
      return acc;
    }, {});

  // ── Delete handlers ──────────────────────────────────────────────

  const handleDeleteFile = async (id: string) => {
    if (!confirm('Xóa metadata của file này?')) return;
    try {
      await apiClient.delete(`/resources/files/${id}`);
      setFiles((prev) => {
        const next = prev.filter((f) => String(f.id) !== id);
        setFilesTotalSize(next.reduce((s, f) => s + f.size, 0));
        return next;
      });
    } catch {
      alert('Xóa thất bại. Vui lòng thử lại.');
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Xóa tag này?')) return;
    try {
      await apiClient.delete(`/resources/tags/${id}`);
      setTags((prev) => prev.filter((t) => String(t.id) !== id));
    } catch {
      alert('Xóa thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Quản lý tài nguyên</h2>
            <div className="mt-2 flex items-center gap-4">
              <span className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700">
                <HardDrive className="h-4 w-4" />
                {files.length} files · {filesTotalSize.toFixed(1)} MB
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                <Tag className="h-4 w-4" />
                {tags.length} tags
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-700">
                <Bot className="h-4 w-4" />
                {AI_PROMPTS.length} prompts
              </span>
            </div>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-[#E31837] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c91530]">
            <Upload className="h-4 w-4" /> Upload File
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-[#E31837] text-[#E31837] bg-red-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* ── Tab 1: File Manager ─────────────────────────────── */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  placeholder="Tìm file theo tên..."
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                />
              </div>

              {filesError && (
                <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {filesError}
                  <button onClick={fetchFiles} className="ml-4 font-semibold underline">Thử lại</button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-3.5 px-4 font-semibold">File</th>
                      <th className="py-3.5 px-4 font-semibold">Type</th>
                      <th className="py-3.5 px-4 font-semibold">Size</th>
                      <th className="py-3.5 px-4 font-semibold">Uploaded By</th>
                      <th className="py-3.5 px-4 font-semibold">Date</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filesLoading ? (
                      <TableRowSkeleton cols={6} />
                    ) : filteredFiles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                          {fileSearch ? 'Không tìm thấy file phù hợp.' : 'Chưa có file nào được upload.'}
                        </td>
                      </tr>
                    ) : (
                      filteredFiles.map((file) => {
                        const cfg = typeConfig[file.type] ?? typeConfig['PNG'];
                        const Icon = cfg.icon;
                        return (
                          <tr key={String(file.id)} className="border-b border-slate-100 align-middle transition hover:bg-slate-50/70">
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                                  <Icon className={`h-5 w-5 ${cfg.color}`} />
                                </div>
                                <span className="font-medium text-slate-900 text-sm">{file.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                                {file.type}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-sm text-slate-600">{file.size} MB</td>
                            <td className="px-4 py-3.5 text-sm text-slate-600">{file.uploadedBy}</td>
                            <td className="px-4 py-3.5 text-sm text-slate-500">{file.date}</td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {file.secureUrl && (
                                  <a
                                    href={file.secureUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Xem"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </a>
                                )}
                                <button
                                  onClick={() => handleDeleteFile(String(file.id))}
                                  title="Xóa"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab 2: Categories & Tags ──────────────────────── */}
          {activeTab === 'tags' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-md w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Tìm tag..."
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
                <button className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#E31837] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c91530]">
                  <Plus className="h-4 w-4" /> Thêm Tag
                </button>
              </div>

              {tagsError && (
                <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {tagsError}
                  <button onClick={fetchTags} className="ml-4 font-semibold underline">Thử lại</button>
                </div>
              )}

              {tagsLoading ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <tbody><TableRowSkeleton cols={3} /></tbody>
                  </table>
                </div>
              ) : Object.entries(groupedTags).length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-500">
                  {tagSearch ? 'Không tìm thấy tag phù hợp.' : 'Chưa có tag nào. Nhấn "Thêm Tag" để tạo mới.'}
                </p>
              ) : (
                Object.entries(groupedTags).map(([category, categoryTags]) => (
                  <div key={category}>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">{category}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-500">
                            <th className="py-3 px-4 font-semibold">Tag</th>
                            <th className="py-3 px-4 font-semibold">Số lượng sử dụng</th>
                            <th className="py-3 px-4 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryTags.map((tag) => {
                            const colorClass = tag.color || CATEGORY_COLORS[tag.category] || CATEGORY_COLORS['Other'];
                            return (
                              <tr key={String(tag.id)} className="border-b border-slate-100 transition hover:bg-slate-50/70">
                                <td className="px-4 py-3">
                                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${colorClass}`}>
                                    {tag.name}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">{tag.count} resources</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button title="Sửa" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-blue-50 hover:text-blue-600">
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTag(String(tag.id))}
                                      title="Xóa"
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Tab 3: AI Prompts ─────────────────────────────── */}
          {activeTab === 'prompts' && (
            <div className="space-y-4">
              {AI_PROMPTS.map((prompt) => (
                <div key={prompt.id} className="rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-md">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{prompt.name}</h3>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${skillColors[prompt.skill]}`}>
                          {prompt.skill}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-600">{prompt.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Bot className="h-3 w-3" /> {prompt.model}
                        </span>
                        <span>~{prompt.tokens} tokens</span>
                        <span>Cập nhật: {prompt.lastEdited}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button title="Sửa" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-blue-50 hover:text-blue-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button title="Sao chép" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button title="Xóa" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
