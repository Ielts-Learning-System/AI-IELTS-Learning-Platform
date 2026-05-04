/**
 * MockExamBuilderPage
 * ─────────────────────────────────────────────────────────────────────────────
 * Teacher tool for creating and managing Mock IELTS Exams.
 *
 * Layout:
 *  ┌─────────────────────────────────────────────────┐
 *  │ Header: "Quản lý Thi thử"  [+ Tạo đề thi thử]  │
 *  │─────────────────────────────────────────────────│
 *  │ Data Table: existing exams (title/date/duration) │
 *  │─────────────────────────────────────────────────│
 *  │ Monitoring Dashboard (collapsible)               │
 *  └─────────────────────────────────────────────────┘
 *
 * Wizard (full-screen triggered by [+ Tạo]):
 *  Step 1 – Upload:  exam PDF + answer key PDF + metadata
 *  Step 2 – Preview: Multi-tab split-screen (Reading | Listening | Writing | Speaking)
 *  Final action:     [Lưu Đề Thi Thử] → publish or keep as draft
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Clock,
  Edit3,
  FileText,
  Globe,
  Headphones,
  Loader2,
  Mic,
  PencilLine,
  PlusCircle,
  Rocket,
  Save,
  Trash2,
  UploadCloud,
  X,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import {
  deleteTeacherExam,
  fetchMonitoringAttempts,
  fetchTeacherAttemptDetail,
  fetchTeacherExams,
  publishTeacherExam,
  type ExamItem,
  type MonitoringAttempt,
  type SkillType,
  type TeacherAttemptDetail,
} from '../../api/exam.api';
import { MockExamGradingModal } from './MockExamGradingModal';

// Wrapper to avoid lazy-import issues — renders into a React Portal-like pattern
function MockExamGradingModalWrapper({
  attempt,
  onClose,
  onGraded,
}: {
  attempt: TeacherAttemptDetail;
  onClose: () => void;
  onGraded: () => void;
}) {
  return <MockExamGradingModal attempt={attempt} onClose={onClose} onGraded={onGraded} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain types
// ─────────────────────────────────────────────────────────────────────────────

interface SkillQuestion {
  questionNumber?: number;
  questionText: string;
  type: string;
  options: string[];
  correctAnswer: string;
  imageUrl?: string;
}

interface SkillPart {
  partNumber: number;
  title: string;
  description: string;
  audioUrl?: string;
  questions: SkillQuestion[];
}

interface RLSkillData {
  _id: string;
  title: string;
  description?: string;
  parts: SkillPart[];
}

interface WritingTask {
  taskNumber: number;
  title: string;
  type: string;
  category: string;
  contentHtml: string;
  minWords: number;
}

interface WritingSkillData {
  _id: string;
  title: string;
  tasks: WritingTask[];
}

interface SpeakingPart {
  partNumber: number;
  title: string;
  instructions?: string;
  cueCardHtml?: string;
  questions?: string[];
}

interface SpeakingSkillData {
  _id: string;
  title: string;
  parts?: SpeakingPart[];
}

interface MockExamPreviewState {
  exam: ExamItem;
  refs: {
    readingId: string;
    listeningId: string;
    writingId: string;
    speakingId: string;
  };
  reading: RLSkillData | null;
  listening: RLSkillData | null;
  writing: WritingSkillData | null;
  speaking: SpeakingSkillData | null;
}

interface WizardForm {
  title: string;
  description: string;
  durationMinutes: number;
  globalLimitHours: number;
  publish: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDuration(mins?: number): string {
  if (!mins) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} phút`;
  return m === 0 ? `${h}h` : `${h}h ${m}p`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny UI atoms
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ExamItem['status'] }) {
  const cls: Record<string, string> = {
    DRAFT: 'bg-amber-100 text-amber-700 border-amber-200',
    PUBLISHED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    ARCHIVED: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  const label: Record<string, string> = {
    DRAFT: 'Nháp',
    PUBLISHED: 'Đã công bố',
    ARCHIVED: 'Lưu trữ',
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls[status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {label[status] ?? status}
    </span>
  );
}

function EmptySkillPanel({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
      <AlertCircle className="h-10 w-10 opacity-40" />
      <p className="text-sm">Dữ liệu {label} chưa trích xuất được.</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PdfUploadZone
// ─────────────────────────────────────────────────────────────────────────────

function PdfUploadZone({
  label,
  sublabel,
  file,
  onFile,
  borderColor,
  bgColor,
  iconColor,
}: {
  label: string;
  sublabel: string;
  file: File | null;
  onFile: (f: File | null) => void;
  borderColor: string;
  bgColor: string;
  iconColor: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = e.dataTransfer.files[0];
      if (dropped?.type === 'application/pdf' || dropped?.name.endsWith('.pdf')) {
        onFile(dropped);
      } else {
        toast.error('Chỉ chấp nhận file PDF.');
      }
    },
    [onFile],
  );

  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 mb-1.5">{label}</p>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed ${borderColor} ${bgColor} p-6 text-center transition hover:opacity-80`}
      >
        <FileText className={`h-8 w-8 ${iconColor}`} />
        {file ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700 max-w-xs truncate">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFile(null);
              }}
              className="rounded-full p-0.5 text-slate-400 hover:text-red-500 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-slate-600">Kéo thả hoặc nhấn để chọn PDF</p>
            <p className="text-xs text-slate-400">{sublabel}</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MockExamTable
// ─────────────────────────────────────────────────────────────────────────────

function MockExamTable({
  exams,
  loading,
  onPublish,
  onDelete,
}: {
  exams: ExamItem[];
  loading: boolean;
  onPublish: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [publishing, setPublishing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-44 text-slate-400 gap-2">
        <FileText className="h-10 w-10 opacity-40" />
        <p className="text-sm">Chưa có đề thi thử nào. Hãy dùng nút [Tạo thủ công] để bắt đầu.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 text-left">Tên đề thi</th>
            <th className="px-4 py-3 text-left">Ngày tạo</th>
            <th className="px-4 py-3 text-left">Thời gian</th>
            <th className="px-4 py-3 text-left">Trạng thái</th>
            <th className="px-4 py-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {exams.map((exam) => (
            <tr key={exam._id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">{exam.title}</td>
              <td className="px-4 py-3 text-slate-500">{fmtDate((exam as any).createdAt)}</td>
              <td className="px-4 py-3 text-slate-600">{fmtDuration(exam.durationMinutes)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={exam.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="inline-flex items-center gap-2">
                  {exam.status !== 'PUBLISHED' && (
                    <button
                      disabled={publishing === exam._id}
                      onClick={async () => {
                        setPublishing(exam._id);
                        await onPublish(exam._id);
                        setPublishing(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 transition"
                    >
                      {publishing === exam._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Globe className="h-3.5 w-3.5" />
                      )}
                      Công bố
                    </button>
                  )}
                  <button
                    disabled={deleting === exam._id}
                    onClick={async () => {
                      if (!confirm(`Xóa đề thi "${exam.title}"?`)) return;
                      setDeleting(exam._id);
                      await onDelete(exam._id);
                      setDeleting(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 transition"
                  >
                    {deleting === exam._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Xóa
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RLPreviewPanel – Reading or Listening split-screen
// ─────────────────────────────────────────────────────────────────────────────

function RLPreviewPanel({
  data,
  skill,
  onChange,
}: {
  data: RLSkillData;
  skill: 'reading' | 'listening';
  onChange: (updated: RLSkillData) => void;
}) {
  const [activePart, setActivePart] = useState(0);
  const [editingQIdx, setEditingQIdx] = useState<number | null>(null);

  const parts = data.parts ?? [];
  const currentPart = parts[activePart] ?? null;

  const updateQuestion = (qIdx: number, patch: Partial<SkillQuestion>) => {
    onChange({
      ...data,
      parts: parts.map((p, pi) =>
        pi === activePart
          ? { ...p, questions: p.questions.map((q, qi) => (qi === qIdx ? { ...q, ...patch } : q)) }
          : p,
      ),
    });
  };

  return (
    <div className="flex flex-col h-full">
      {parts.length > 1 && (
        <div className="flex gap-1.5 px-4 pt-3 pb-2 border-b border-slate-100 shrink-0 overflow-x-auto">
          {parts.map((p, i) => (
            <button
              key={i}
              onClick={() => { setActivePart(i); setEditingQIdx(null); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activePart === i ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.title || `Part ${p.partNumber}`}
            </button>
          ))}
        </div>
      )}
      {currentPart ? (
        <div className="flex flex-1 min-h-0">
          <div className="w-1/2 overflow-y-auto border-r border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              {skill === 'reading' ? 'Bài đọc' : 'Nội dung nghe'}
            </p>
            {currentPart.audioUrl && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-violet-100 bg-violet-50 p-2.5">
                <Headphones className="h-4 w-4 shrink-0 text-violet-500" />
                <span className="text-xs text-violet-700 break-all">{currentPart.audioUrl}</span>
              </div>
            )}
            <div
              className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: currentPart.description || '<p class="text-slate-400 italic text-sm">Nội dung chưa được trích xuất.</p>',
              }}
            />
          </div>
          <div className="w-1/2 overflow-y-auto p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Câu hỏi ({currentPart.questions?.length ?? 0})
            </p>
            <div className="space-y-3">
              {(currentPart.questions ?? []).map((q, qIdx) => (
                <div key={qIdx} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-slate-400">#{q.questionNumber ?? qIdx + 1}</span>
                    <button
                      onClick={() => setEditingQIdx(editingQIdx === qIdx ? null : qIdx)}
                      className="rounded p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                      {editingQIdx === qIdx ? <X className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {editingQIdx === qIdx ? (
                    <div className="space-y-2.5">
                      <textarea
                        value={q.questionText}
                        onChange={(e) => updateQuestion(qIdx, { questionText: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                      {(q.options ?? []).length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold uppercase text-slate-400">Options</p>
                          {q.options.map((opt, oi) => (
                            <input
                              key={oi}
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...q.options];
                                newOpts[oi] = e.target.value;
                                updateQuestion(qIdx, { options: newOpts });
                              }}
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                            />
                          ))}
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-slate-400 mb-0.5">Đáp án đúng</p>
                        <input
                          value={q.correctAnswer}
                          onChange={(e) => updateQuestion(qIdx, { correctAnswer: e.target.value })}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-700 leading-relaxed">{q.questionText}</p>
                      {(q.options ?? []).length > 0 && (
                        <div className="pl-2 space-y-0.5">
                          {q.options.map((opt, oi) => (
                            <p key={oi} className={`text-xs ${opt === q.correctAnswer ? 'font-semibold text-emerald-700' : 'text-slate-500'}`}>
                              {opt === q.correctAnswer ? '✓ ' : ''}{opt}
                            </p>
                          ))}
                        </div>
                      )}
                      {q.correctAnswer && (q.options ?? []).length === 0 && (
                        <p className="text-xs font-semibold text-emerald-700">✓ {q.correctAnswer}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {(currentPart.questions ?? []).length === 0 && (
                <p className="text-xs italic text-slate-400">Không có câu hỏi cho phần này.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <EmptySkillPanel label={skill === 'reading' ? 'Reading' : 'Listening'} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WritingPreviewPanel
// ─────────────────────────────────────────────────────────────────────────────

function WritingPreviewPanel({
  data,
  onChange,
}: {
  data: WritingSkillData;
  onChange: (updated: WritingSkillData) => void;
}) {
  const [activeTask, setActiveTask] = useState(0);
  const tasks = data.tasks ?? [];
  const task = tasks[activeTask] ?? null;

  const updateTask = (patch: Partial<WritingTask>) =>
    onChange({ ...data, tasks: tasks.map((t, i) => (i === activeTask ? { ...t, ...patch } : t)) });

  return (
    <div className="flex flex-col h-full">
      {tasks.length > 1 && (
        <div className="flex gap-1.5 px-4 pt-3 pb-2 border-b border-slate-100 shrink-0">
          {tasks.map((t, i) => (
            <button
              key={i}
              onClick={() => setActiveTask(i)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTask === i ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Task {t.taskNumber}
            </button>
          ))}
        </div>
      )}
      {task ? (
        <div className="flex flex-1 min-h-0">
          <div className="w-1/2 overflow-y-auto border-r border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Đề bài</p>
            <div
              className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: task.contentHtml || '<p class="text-slate-400 italic text-sm">Nội dung chưa trích xuất.</p>' }}
            />
          </div>
          <div className="w-1/2 overflow-y-auto p-4 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Thông tin Task</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Tiêu đề</label>
                <input
                  value={task.title}
                  onChange={(e) => updateTask({ title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Loại</label>
                  <input value={task.type} readOnly className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Category</label>
                  <input value={task.category} readOnly className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Số từ tối thiểu</label>
                <input
                  type="number"
                  value={task.minWords}
                  onChange={(e) => updateTask({ minWords: Number(e.target.value) })}
                  min={50}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptySkillPanel label="Writing" />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SpeakingPreviewPanel
// ─────────────────────────────────────────────────────────────────────────────

function SpeakingPreviewPanel({ data }: { data: SpeakingSkillData }) {
  const [activePart, setActivePart] = useState(0);
  const parts = data.parts ?? [];
  const part = parts[activePart] ?? null;

  return (
    <div className="flex flex-col h-full">
      {parts.length > 1 && (
        <div className="flex gap-1.5 px-4 pt-3 pb-2 border-b border-slate-100 shrink-0">
          {parts.map((p, i) => (
            <button
              key={i}
              onClick={() => setActivePart(i)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activePart === i ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              Part {p.partNumber}
            </button>
          ))}
        </div>
      )}
      {part ? (
        <div className="flex flex-1 min-h-0">
          <div className="w-1/2 overflow-y-auto border-r border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Cue Card</p>
            <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
              <p className="mb-2 font-semibold text-purple-800 text-sm">{part.title}</p>
              {part.cueCardHtml ? (
                <div className="prose prose-sm max-w-none text-purple-900" dangerouslySetInnerHTML={{ __html: part.cueCardHtml }} />
              ) : (
                <p className="text-sm text-purple-700 leading-relaxed">{part.instructions ?? 'Không có hướng dẫn.'}</p>
              )}
            </div>
          </div>
          <div className="w-1/2 overflow-y-auto p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Câu hỏi gợi ý ({(part.questions ?? []).length})
            </p>
            <div className="space-y-2">
              {(part.questions ?? []).map((q, qi) => (
                <div key={qi} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs text-slate-700">{q}</p>
                </div>
              ))}
              {(part.questions ?? []).length === 0 && (
                <p className="text-xs italic text-slate-400">Không có câu hỏi gợi ý.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <EmptySkillPanel label="Speaking" />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skill tab config
// ─────────────────────────────────────────────────────────────────────────────

const SKILL_TABS: { id: SkillType; label: string; icon: React.ReactNode; activeClass: string }[] = [
  { id: 'reading',   label: 'Reading',   icon: <BookOpen   className="h-4 w-4" />, activeClass: 'border-blue-600 text-blue-700'   },
  { id: 'listening', label: 'Listening', icon: <Headphones className="h-4 w-4" />, activeClass: 'border-violet-600 text-violet-700' },
  { id: 'writing',   label: 'Writing',   icon: <PencilLine className="h-4 w-4" />, activeClass: 'border-amber-600 text-amber-700'  },
  { id: 'speaking',  label: 'Speaking',  icon: <Mic        className="h-4 w-4" />, activeClass: 'border-purple-600 text-purple-700' },
];

// ─────────────────────────────────────────────────────────────────────────────
// MockExamWizard – full-screen slide-over modal
// ─────────────────────────────────────────────────────────────────────────────

function MockExamWizard({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'upload' | 'extracting' | 'preview'>('upload');
  const [form, setForm] = useState<WizardForm>({
    title: '',
    description: '',
    durationMinutes: 165,
    globalLimitHours: 24,
    publish: false,
  });
  const [fullExamPdf, setFullExamPdf] = useState<File | null>(null);
  const [answerKeyPdf, setAnswerKeyPdf] = useState<File | null>(null);
  const [extractProgress, setExtractProgress] = useState('Đang upload và gửi đến AI...');
  const [extractPercent, setExtractPercent] = useState<number>(0);
  const [preview, setPreview] = useState<MockExamPreviewState | null>(null);
  const [activeSkillTab, setActiveSkillTab] = useState<SkillType>('reading');
  const [publishing, setPublishing] = useState(false);

  const resetWizard = useCallback(() => {
    setStep('upload');
    setForm({ title: '', description: '', durationMinutes: 165, globalLimitHours: 24, publish: false });
    setFullExamPdf(null);
    setAnswerKeyPdf(null);
    setPreview(null);
    setActiveSkillTab('reading');
    setExtractProgress('Đang upload và gửi đến AI...');
    setExtractPercent(0);
  }, []);

  const handleExtract = async () => {
    if (!fullExamPdf || !answerKeyPdf) {
      toast.error('Vui lòng upload đủ 2 file PDF.');
      return;
    }
    setStep('extracting');
    setExtractProgress('Đang upload và gửi đến AI...');
    try {
      const fd = new FormData();
      fd.append('fullExamPdf', fullExamPdf);
      fd.append('answerKeyPdf', answerKeyPdf);
      if (form.title)       fd.append('title', form.title);
      if (form.description) fd.append('description', form.description);
      fd.append('durationMinutes', String(form.durationMinutes));
      fd.append('globalLimitHours', String(form.globalLimitHours));

      const jobId = crypto.randomUUID();
      fd.append('jobId', jobId);

      setExtractPercent(5);
      setExtractProgress('AI đang khởi tạo...');

      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token') || '';
      const baseURL = apiClient.defaults.baseURL || 'http://localhost:3000/api';
      const eventSource = new EventSource(`${baseURL}/exams/teacher/exams/orchestrate-progress/${jobId}?token=${token}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.progress) setExtractPercent(data.progress);
          if (data.message) setExtractProgress(data.message);
        } catch (e) {}
      };

      const { data: raw } = await apiClient.post('/exams/teacher/exams/orchestrate-pdf', fd, {
        timeout: 6 * 60 * 1000, // 6 mins
      });

      eventSource.close();
      setExtractPercent(100);

      const result = raw.data ?? raw;
      const exam: ExamItem = result.exam ?? result;
      const refs = result.refs ?? exam.skillRefs ?? {};

      setExtractProgress('Đang tải chi tiết các kỹ năng...');
      const skillFetch = async (url: string) => {
        try {
          const res = await apiClient.get(url);
          return res.data?.data ?? res.data ?? null;
        } catch {
          return null;
        }
      };

      const [reading, listening, writing, speaking] = await Promise.all([
        refs.readingId   ? skillFetch(`/reading/${refs.readingId}`)         : Promise.resolve(null),
        refs.listeningId ? skillFetch(`/listening/${refs.listeningId}`)     : Promise.resolve(null),
        refs.writingId   ? skillFetch(`/writing/${refs.writingId}`)         : Promise.resolve(null),
        refs.speakingId  ? skillFetch(`/speaking/tests/${refs.speakingId}`) : Promise.resolve(null),
      ]);

      setPreview({
        exam,
        refs: {
          readingId:   refs.readingId   ?? '',
          listeningId: refs.listeningId ?? '',
          writingId:   refs.writingId   ?? '',
          speakingId:  refs.speakingId  ?? '',
        },
        reading,
        listening,
        writing,
        speaking,
      });
      setStep('preview');
      toast.success('AI đã trích xuất xong! Kiểm tra và lưu đề thi.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? 'Orchestration thất bại. Vui lòng thử lại.');
      setStep('upload');
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setPublishing(true);
    try {
      if (form.publish && preview.exam.status !== 'PUBLISHED') {
        await publishTeacherExam(preview.exam._id);
        toast.success('Đề thi thử đã được công bố!');
      } else {
        toast.success('Đề thi thử đã lưu (trạng thái: Nháp).');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không thể lưu đề thi.');
    } finally {
      setPublishing(false);
    }
  };

  if (!open) return null;

  const stepLabel =
    step === 'upload' ? 'Bước 1: Upload PDF' :
    step === 'extracting' ? 'Đang xử lý...' : 'Bước 2: Kiểm tra';

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40">
      <div className="flex w-full flex-col bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <Rocket className="h-5 w-5 text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900">Tạo Đề Thi Thử Mới</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">{stepLabel}</span>
          </div>
          <button onClick={() => { resetWizard(); onClose(); }} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Step 1: Upload ── */}
        {step === 'upload' && (
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="mx-auto max-w-2xl space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Tên đề thi</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="VD: Cambridge IELTS 17 Test 1"
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Mô tả (tuỳ chọn)</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="Mô tả ngắn về đề thi..."
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    <Clock className="mr-1 inline h-3.5 w-3.5" />Thời gian thi (phút)
                  </label>
                  <input
                    type="number"
                    value={form.durationMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
                    min={1}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    <Calendar className="mr-1 inline h-3.5 w-3.5" />Deadline (giờ)
                  </label>
                  <input
                    type="number"
                    value={form.globalLimitHours}
                    onChange={(e) => setForm((f) => ({ ...f, globalLimitHours: Number(e.target.value) }))}
                    min={1}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <PdfUploadZone
                  label="Đề Thi Gốc (Full IELTS PDF)"
                  sublabel="Toàn bộ 4 kỹ năng: Reading, Listening, Writing, Speaking"
                  file={fullExamPdf}
                  onFile={setFullExamPdf}
                  borderColor="border-blue-300"
                  bgColor="bg-blue-50"
                  iconColor="text-blue-400"
                />
                <PdfUploadZone
                  label="Đáp Án (Answer Key PDF)"
                  sublabel="Đáp án cho Reading & Listening — dùng để lập câu hỏi tự chấm"
                  file={answerKeyPdf}
                  onFile={setAnswerKeyPdf}
                  borderColor="border-emerald-300"
                  bgColor="bg-emerald-50"
                  iconColor="text-emerald-400"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.publish} onChange={(e) => setForm((f) => ({ ...f, publish: e.target.checked }))} className="rounded" />
                Tự động công bố sau khi lưu
              </label>

              <button
                onClick={handleExtract}
                disabled={!fullExamPdf || !answerKeyPdf}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UploadCloud className="h-5 w-5" />
                Upload &amp; Trích Xuất bằng AI
              </button>
              <p className="text-center text-xs text-slate-400">Quá trình AI phân tích mất khoảng 2–5 phút. Đề thi được lưu tạm trong hệ thống.</p>
            </div>
          </div>
        )}

        {/* ── Extracting ── */}
        {step === 'extracting' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-8 p-12">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
              <div className="absolute inset-0 rounded-full border-4 border-t-slate-800 animate-spin" />
              <Zap className="absolute inset-0 m-auto h-8 w-8 text-slate-700" />
            </div>
            <div className="text-center w-full max-w-md">
              <p className="text-xl font-bold text-slate-900">AI đang phân tích đề thi…</p>
              
              {/* Progress Bar */}
              <div className="mt-6 mb-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div 
                  className="h-full rounded-full bg-slate-800 transition-all duration-500 ease-out" 
                  style={{ width: `${extractPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>{extractPercent}%</span>
                <span>{extractProgress}</span>
              </div>

              <p className="mt-4 text-xs text-slate-400">Vui lòng không đóng trang. Quá trình có thể mất 2–5 phút.</p>
            </div>
            <div className="flex gap-4">
              {SKILL_TABS.map((tab) => (
                <div key={tab.id} className="flex flex-col items-center gap-1.5">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl border bg-white ${tab.activeClass}`}>{tab.icon}</div>
                  <span className="text-xs text-slate-500">{tab.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Preview ── */}
        {step === 'preview' && preview && (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Meta bar */}
            <div className="flex shrink-0 flex-wrap items-center gap-5 border-b border-slate-200 bg-slate-50 px-6 py-3">
              <div>
                <p className="text-xs text-slate-400">Tên đề thi</p>
                <p className="text-sm font-semibold text-slate-900">{preview.exam.title}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Thời gian</p>
                <p className="text-sm font-semibold text-slate-700">{fmtDuration(preview.exam.durationMinutes)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Trạng thái</p>
                <StatusBadge status={preview.exam.status} />
              </div>
              <div className="ml-auto text-xs text-slate-400">ID: {preview.exam._id.slice(-8)}</div>
            </div>

            {/* Skill tabs */}
            <div className="flex shrink-0 overflow-x-auto border-b border-slate-200">
              {SKILL_TABS.map((tab) => {
                const hasData = Boolean(
                  tab.id === 'reading' ? preview.reading :
                  tab.id === 'listening' ? preview.listening :
                  tab.id === 'writing' ? preview.writing : preview.speaking
                );
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSkillTab(tab.id)}
                    className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition ${
                      activeSkillTab === tab.id
                        ? `${tab.activeClass} bg-white`
                        : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {!hasData && <span className="ml-1 h-2 w-2 rounded-full bg-amber-400" title="Chưa có dữ liệu" />}
                  </button>
                );
              })}
            </div>

            {/* Split-screen content */}
            <div className="min-h-0 flex-1 overflow-hidden">
              {activeSkillTab === 'reading' && (
                preview.reading
                  ? <RLPreviewPanel data={preview.reading}   skill="reading"   onChange={(r) => setPreview((p) => p ? { ...p, reading: r }   : p)} />
                  : <EmptySkillPanel label="Reading" />
              )}
              {activeSkillTab === 'listening' && (
                preview.listening
                  ? <RLPreviewPanel data={preview.listening} skill="listening" onChange={(l) => setPreview((p) => p ? { ...p, listening: l } : p)} />
                  : <EmptySkillPanel label="Listening" />
              )}
              {activeSkillTab === 'writing' && (
                preview.writing
                  ? <WritingPreviewPanel  data={preview.writing}  onChange={(w) => setPreview((p) => p ? { ...p, writing: w }   : p)} />
                  : <EmptySkillPanel label="Writing" />
              )}
              {activeSkillTab === 'speaking' && (
                preview.speaking
                  ? <SpeakingPreviewPanel data={preview.speaking} />
                  : <EmptySkillPanel label="Speaking" />
              )}
            </div>

            {/* Footer */}
            <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-white px-6 py-4">
              <button
                onClick={() => setStep('upload')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <ChevronLeft className="h-4 w-4" />
                Quay lại Upload
              </button>
              <div className="flex items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.publish} onChange={(e) => setForm((f) => ({ ...f, publish: e.target.checked }))} className="rounded" />
                  Công bố ngay
                </label>
                <button
                  onClick={handleSave}
                  disabled={publishing}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Lưu Đề Thi Thử
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MonitoringSection – collapsible attempt monitoring
// ─────────────────────────────────────────────────────────────────────────────

function MonitoringSection() {
  const [open, setOpen] = useState(false);
  const [attempts, setAttempts] = useState<MonitoringAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TeacherAttemptDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchMonitoringAttempts()
      .then(setAttempts)
      .catch(() => toast.error('Không tải được danh sách bài thi.'))
      .finally(() => setLoading(false));
  }, [open]);

  const loadDetail = async (attemptId: string) => {
    try {
      setDetailLoading(true);
      const detail = await fetchTeacherAttemptDetail(attemptId);
      setSelected(detail);
    } catch {
      toast.error('Không tải được chi tiết bài thi.');
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshList = () => {
    fetchMonitoringAttempts()
      .then(setAttempts)
      .catch(() => {});
  };

  const STATUS_LABEL: Record<string, string> = {
    IN_PROGRESS: 'Đang thi',
    SUBMITTED: 'Đã nộp',
    EXPIRED: 'Hết giờ',
    GRADED: 'Đã chấm',
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition"
        >
          <span className="font-semibold text-slate-800">Giám sát bài thi (Monitoring)</span>
          {open ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
        </button>

        {open && (
          <div className="border-t border-slate-100 px-6 pb-6 pt-4">
            {loading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : attempts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Không có bài thi nào.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase font-semibold tracking-wide text-slate-500">
                      <th className="px-4 py-2.5 text-left">Học viên</th>
                      <th className="px-4 py-2.5 text-left">Exam ID</th>
                      <th className="px-4 py-2.5 text-left">Tiến độ</th>
                      <th className="px-4 py-2.5 text-left">Trạng thái</th>
                      <th className="px-4 py-2.5 text-left">Band tổng</th>
                      <th className="px-4 py-2.5 text-right">Xem / Chấm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {attempts.map((a) => (
                      <tr key={a._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 text-slate-700 font-mono text-xs">{a.userId.slice(-8)}</td>
                        <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{a.examId.slice(-8)}</td>
                        <td className="px-4 py-2.5 text-slate-600">{a.doneCount}/{a.totalSkills} kỹ năng</td>
                        <td className="px-4 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            a.status === 'GRADED' ? 'bg-emerald-100 text-emerald-700'
                            : a.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                          }`}>
                            {STATUS_LABEL[a.status] ?? a.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">
                          {a.activeSkill ? `${a.activeSkill.skillType} đang làm` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => void loadDetail(a._id)}
                            disabled={detailLoading}
                            className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                          >
                            {detailLoading ? 'Đang tải...' : 'Chi tiết / Chấm'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-screen grading modal */}
      {selected && (
        <MockExamGradingModalWrapper
          attempt={selected}
          onClose={() => setSelected(null)}
          onGraded={refreshList}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ManualExamWizard – pick existing skill tests and assemble a new mock exam
// ─────────────────────────────────────────────────────────────────────────────

interface SkillListItem {
  _id: string;
  title: string;
}

const SKILL_API_URLS: Record<SkillType, string> = {
  reading:   '/reading',
  listening: '/listening',
  writing:   '/writing/items',
  speaking:  '/speaking/tests',
};

function ManualExamWizard({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const skillOrder: SkillType[] = ['reading', 'listening', 'writing', 'speaking'];

  const [form, setForm] = useState<WizardForm>({
    title: '',
    description: '',
    durationMinutes: 165,
    globalLimitHours: 24,
    publish: false,
  });
  const [activeTab, setActiveTab] = useState<SkillType>('reading');
  const [skillLists, setSkillLists] = useState<Record<SkillType, SkillListItem[]>>({
    reading: [], listening: [], writing: [], speaking: [],
  });
  const [skillListLoading, setSkillListLoading] = useState<Record<SkillType, boolean>>({
    reading: false, listening: false, writing: false, speaking: false,
  });
  const [selected, setSelected] = useState<Record<SkillType, string>>({
    reading: '', listening: '', writing: '', speaking: '',
  });
  const [selectedWritingIds, setSelectedWritingIds] = useState<string[]>([]);
  const [writingDetailCache, setWritingDetailCache] = useState<Record<string, WritingSkillData>>({});
  const [search, setSearch] = useState<Record<SkillType, string>>({
    reading: '', listening: '', writing: '', speaking: '',
  });
  const [selectedDetails, setSelectedDetails] = useState<{
    reading: RLSkillData | null;
    listening: RLSkillData | null;
    writing: WritingSkillData | null;
    speaking: SpeakingSkillData | null;
  }>({
    reading: null,
    listening: null,
    writing: null,
    speaking: null,
  });
  const [detailLoading, setDetailLoading] = useState<Record<SkillType, boolean>>({
    reading: false,
    listening: false,
    writing: false,
    speaking: false,
  });
  const [structureErrors, setStructureErrors] = useState<Record<SkillType, string | null>>({
    reading: null,
    listening: null,
    writing: null,
    speaking: null,
  });
  const [saving, setSaving] = useState(false);

  const detailEndpoints: Record<SkillType, (id: string) => string> = {
    reading: (id) => `/reading/${id}`,
    listening: (id) => `/listening/${id}`,
    writing: (id) => `/writing/items/${id}`,
    speaking: (id) => `/speaking/tests/${id}`,
  };

  const normalizeSkillDetail = useCallback((skill: SkillType, raw: any) => {
    const source = raw?.data ?? raw;

    if (skill === 'reading') {
      const passages = Array.isArray(source?.passages)
        ? source.passages
        : Array.isArray(source?.parts)
          ? source.parts
          : [];

      const normalized: RLSkillData = {
        _id: source?._id ?? '',
        title: source?.title ?? 'Reading Test',
        description: source?.description ?? '',
        parts: passages.map((p: any, idx: number) => ({
          partNumber: Number(p?.partNumber ?? p?.passageNumber ?? idx + 1),
          title: p?.title ?? `Passage ${idx + 1}`,
          description: p?.description ?? p?.content ?? '',
          questions: Array.isArray(p?.questions)
            ? p.questions.map((q: any, qIdx: number) => ({
                questionNumber: Number(q?.questionNumber ?? qIdx + 1),
                questionText: q?.questionText ?? q?.text ?? '',
                type: String(q?.type ?? '').toLowerCase(),
                options: Array.isArray(q?.options) ? q.options : [],
                correctAnswer: q?.correctAnswer ?? '',
                imageUrl: q?.imageUrl,
              }))
            : [],
        })),
      };

      return normalized;
    }

    if (skill === 'listening') {
      const parts = Array.isArray(source?.parts) ? source.parts : [];
      const normalized: RLSkillData = {
        _id: source?._id ?? '',
        title: source?.title ?? 'Listening Test',
        description: source?.description ?? '',
        parts: parts.map((p: any, idx: number) => ({
          partNumber: Number(p?.partNumber ?? idx + 1),
          title: p?.title ?? `Part ${idx + 1}`,
          description: p?.description ?? '',
          audioUrl: p?.audioUrl,
          questions: Array.isArray(p?.questions)
            ? p.questions.map((q: any, qIdx: number) => ({
                questionNumber: Number(q?.questionNumber ?? qIdx + 1),
                questionText: q?.questionText ?? q?.text ?? '',
                type: String(q?.type ?? '').toLowerCase(),
                options: Array.isArray(q?.options) ? q.options : [],
                correctAnswer: q?.correctAnswer ?? '',
                imageUrl: q?.imageUrl,
              }))
            : [],
        })),
      };

      return normalized;
    }

    if (skill === 'writing') {
      const tasks = Array.isArray(source?.tasks)
        ? source.tasks
        : source
          ? [{
              taskNumber: source?.type === 'Task 2' ? 2 : 1,
              title: source?.title ?? `Writing ${source?.type ?? 'Task'}`,
              type: source?.type ?? 'Task 1',
              category: source?.category ?? 'Mixed',
              contentHtml: source?.contentHtml ?? '',
              minWords: source?.type === 'Task 2' ? 250 : 150,
            }]
          : [];

      const normalized: WritingSkillData = {
        _id: source?._id ?? '',
        title: source?.title ?? 'Writing Test',
        tasks,
      };

      return normalized;
    }

    const parts = Array.isArray(source?.parts)
      ? source.parts
      : [
          {
            partNumber: 1,
            title: 'Part 1 - Introduction & Interview',
            questions: Array.isArray(source?.part1) ? source.part1 : [],
          },
          {
            partNumber: 2,
            title: 'Part 2 - Long Turn',
            instructions: source?.part2 ?? '',
            cueCardHtml: source?.part2 ? `<p>${String(source.part2).replace(/\n/g, '<br/>')}</p>` : '',
            questions: [],
          },
          {
            partNumber: 3,
            title: 'Part 3 - Discussion',
            questions: Array.isArray(source?.part3) ? source.part3 : [],
          },
        ];

    const normalized: SpeakingSkillData = {
      _id: source?._id ?? '',
      title: source?.title ?? 'Speaking Test',
      parts,
    };

    return normalized;
  }, []);

  const validateStructure = useCallback((skill: SkillType, data: any): string | null => {
    if (!data) return `Không tải được dữ liệu ${skill}.`;
    if (skill === 'reading') {
      const count = Array.isArray(data.parts) ? data.parts.length : 0;
      return count === 3 ? null : `Reading phải có đúng 3 passage (hiện có ${count}).`;
    }
    if (skill === 'listening') {
      const count = Array.isArray(data.parts) ? data.parts.length : 0;
      return count === 4 ? null : `Listening phải có đúng 4 parts (hiện có ${count}).`;
    }
    if (skill === 'writing') {
      const tasks = Array.isArray(data.tasks) ? data.tasks : [];
      const hasTask1 = tasks.some((t: any) => String(t?.type || '').toLowerCase().includes('1'));
      const hasTask2 = tasks.some((t: any) => String(t?.type || '').toLowerCase().includes('2'));
      if (!hasTask1 || !hasTask2) {
        return `Writing cần gộp đủ Task 1 và Task 2 (hiện có ${tasks.length} task).`;
      }
      return null;
    }
    const count = Array.isArray(data.parts) ? data.parts.length : 0;
    return count === 3 ? null : `Speaking phải có đúng 3 parts (hiện có ${count}).`;
  }, []);

  const mergeWritingDetails = useCallback((ids: string[], cache: Record<string, WritingSkillData>) => {
    const taskSeed = ids.flatMap((id) => cache[id]?.tasks ?? []);
    if (taskSeed.length === 0) return null;

    const tasks = taskSeed.map((task, idx) => {
      const taskType = String(task.type || '').includes('2') ? 'Task 2' : 'Task 1';
      return {
        ...task,
        type: taskType,
        taskNumber: taskType === 'Task 2' ? 2 : 1,
        title: task.title || `${taskType} - Prompt ${idx + 1}`,
      };
    });

    return {
      _id: ids.join(','),
      title: `Writing tổng hợp (${ids.length} mục)`,
      tasks,
    } as WritingSkillData;
  }, []);

  const loadSkillList = useCallback(async (skill: SkillType) => {
    if (skillLists[skill].length > 0) return; // cached
    setSkillListLoading((prev) => ({ ...prev, [skill]: true }));
    try {
      const res = await apiClient.get(SKILL_API_URLS[skill]);
      const raw = res.data?.data ?? res.data ?? [];
      const items: SkillListItem[] = Array.isArray(raw)
        ? raw.map((item: any) => ({ _id: item._id, title: item.title || item.testTitle || `ID: ${item._id}` }))
        : [];
      setSkillLists((prev) => ({ ...prev, [skill]: items }));
    } catch {
      toast.error(`Không tải được danh sách ${skill}.`);
    } finally {
      setSkillListLoading((prev) => ({ ...prev, [skill]: false }));
    }
  }, [skillLists]);

  // Load first tab when wizard opens
  useEffect(() => {
    if (open) loadSkillList('reading');
  }, [open]); // eslint-disable-line

  const handleTabChange = (skill: SkillType) => {
    setActiveTab(skill);
    loadSkillList(skill);
  };

  const loadSkillDetail = useCallback(async (skill: SkillType, id: string) => {
    if (skill === 'writing') {
      if (writingDetailCache[id]) {
        return writingDetailCache[id];
      }
      const res = await apiClient.get(detailEndpoints.writing(id));
      const detail = normalizeSkillDetail('writing', res.data ?? null) as WritingSkillData;
      setWritingDetailCache((prev) => ({ ...prev, [id]: detail }));
      return detail;
    }

    setDetailLoading((prev) => ({ ...prev, [skill]: true }));
    try {
      const res = await apiClient.get(detailEndpoints[skill](id));
      const detail = normalizeSkillDetail(skill, res.data ?? null);
      const error = validateStructure(skill, detail);
      setStructureErrors((prev) => ({ ...prev, [skill]: error }));
      setSelectedDetails((prev) => ({ ...prev, [skill]: detail }));
      if (error) {
        toast.error(error);
      }
    } catch {
      setStructureErrors((prev) => ({ ...prev, [skill]: `Không tải được preview ${skill}.` }));
      setSelectedDetails((prev) => ({ ...prev, [skill]: null }));
      toast.error(`Không tải được preview ${skill}.`);
    } finally {
      setDetailLoading((prev) => ({ ...prev, [skill]: false }));
    }
  }, [detailEndpoints, normalizeSkillDetail, validateStructure, writingDetailCache]);

  useEffect(() => {
    if (selectedWritingIds.length === 0) {
      setSelected((prev) => ({ ...prev, writing: '' }));
      setSelectedDetails((prev) => ({ ...prev, writing: null }));
      setStructureErrors((prev) => ({ ...prev, writing: 'Writing cần gộp đủ Task 1 và Task 2.' }));
      return;
    }

    const merged = mergeWritingDetails(selectedWritingIds, writingDetailCache);
    if (!merged) {
      setSelectedDetails((prev) => ({ ...prev, writing: null }));
      setStructureErrors((prev) => ({ ...prev, writing: 'Không tải được dữ liệu Writing đã chọn.' }));
      return;
    }

    setSelected((prev) => ({ ...prev, writing: selectedWritingIds[0] }));
    setSelectedDetails((prev) => ({ ...prev, writing: merged }));
    setStructureErrors((prev) => ({ ...prev, writing: validateStructure('writing', merged) }));
  }, [mergeWritingDetails, selectedWritingIds, validateStructure, writingDetailCache]);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Vui lòng nhập tên đề thi.'); return; }
    const missing = skillOrder.filter((s) => !selected[s]);
    if (missing.length > 0) {
      toast.error(`Chưa chọn: ${missing.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}`);
      return;
    }
    const notLoaded = skillOrder.filter((s) => !selectedDetails[s]);
    if (notLoaded.length > 0) {
      toast.error(`Vui lòng tải preview trước khi lưu: ${notLoaded.join(', ')}.`);
      return;
    }
    const invalid = skillOrder
      .map((s) => structureErrors[s])
      .filter((msg): msg is string => Boolean(msg));
    if (invalid.length > 0) {
      toast.error(invalid[0]);
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/exams/teacher/exams', {
        title: form.title.trim(),
        description: form.description.trim(),
        durationMinutes: form.durationMinutes,
        globalLimitHours: form.globalLimitHours,
        publish: form.publish,
        skillRefs: {
          readingId:   selected.reading,
          listeningId: selected.listening,
          writingId:   selected.writing,
          speakingId:  selected.speaking,
        },
      });
      toast.success('Đã tạo đề thi thủ công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Không thể tạo đề thi.');
    } finally {
      setSaving(false);
    }
  };

  const resetWizard = () => {
    setForm({ title: '', description: '', durationMinutes: 165, globalLimitHours: 24, publish: false });
    setActiveTab('reading');
    setSelected({ reading: '', listening: '', writing: '', speaking: '' });
    setSelectedWritingIds([]);
    setWritingDetailCache({});
    setSearch({ reading: '', listening: '', writing: '', speaking: '' });
    setSkillLists({ reading: [], listening: [], writing: [], speaking: [] });
    setSelectedDetails({ reading: null, listening: null, writing: null, speaking: null });
    setStructureErrors({ reading: null, listening: null, writing: 'Writing cần gộp đủ Task 1 và Task 2.', speaking: null });
  };

  if (!open) return null;

  const allSelected = skillOrder.every((s) => !!selected[s]);
  const allValid = skillOrder.every((s) => !structureErrors[s]);

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40">
      <div className="flex w-full flex-col bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900">Tạo Đề Thi Thủ Công</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
              Ghép đề từ ngân hàng có sẵn
            </span>
          </div>
          <button
            onClick={() => { resetWizard(); onClose(); }}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left panel: metadata */}
          <div className="w-72 shrink-0 border-r border-slate-200 overflow-y-auto px-5 py-6 space-y-4 bg-slate-50">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Thông tin đề thi</p>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Tên đề thi *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="VD: Cambridge IELTS 17 Test 1"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Mô tả</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Mô tả ngắn..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                <Clock className="mr-1 inline h-3 w-3" />Thời gian (phút)
              </label>
              <input
                type="number"
                value={form.durationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
                min={1}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                <Calendar className="mr-1 inline h-3 w-3" />Deadline (giờ)
              </label>
              <input
                type="number"
                value={form.globalLimitHours}
                onChange={(e) => setForm((f) => ({ ...f, globalLimitHours: Number(e.target.value) }))}
                min={1}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={form.publish}
                onChange={(e) => setForm((f) => ({ ...f, publish: e.target.checked }))}
                className="rounded"
              />
              Tự động công bố
            </label>

            {/* Selection summary */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Đã chọn</p>
              {SKILL_TABS.map((tab) => {
                const item = tab.id === 'writing' ? null : skillLists[tab.id].find((i) => i._id === selected[tab.id]);
                const error = structureErrors[tab.id];
                return (
                  <div key={tab.id} className="flex items-center gap-2">
                    <span className={`text-xs font-semibold w-16 ${(tab.id === 'writing' ? selectedWritingIds.length > 0 : selected[tab.id]) ? 'text-slate-700' : 'text-slate-300'}`}>
                      {tab.label}
                    </span>
                    {tab.id === 'writing' && selectedWritingIds.length === 0 && <span className="flex-1 text-xs text-slate-300 italic">Chưa chọn</span>}
                    {tab.id === 'writing' && selectedWritingIds.length > 0 && !error && (
                      <span className="flex-1 truncate text-xs text-emerald-700 font-medium">✓ Đã gộp {selectedWritingIds.length} mục</span>
                    )}
                    {tab.id === 'writing' && selectedWritingIds.length > 0 && error && (
                      <span className="flex-1 truncate text-xs text-rose-600 font-medium">✕ {error}</span>
                    )}
                    {tab.id !== 'writing' && !item && <span className="flex-1 text-xs text-slate-300 italic">Chưa chọn</span>}
                    {item && !error && <span className="flex-1 truncate text-xs text-emerald-700 font-medium">✓ {item.title}</span>}
                    {item && error && <span className="flex-1 truncate text-xs text-rose-600 font-medium">✕ {error}</span>}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim() || !allSelected || !allValid}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Tạo đề thi
            </button>
          </div>

          {/* Right panel: skill selectors */}
          <div className="flex flex-1 min-w-0 flex-col">
            {/* Skill tabs */}
            <div className="flex shrink-0 border-b border-slate-200">
              {SKILL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? `${tab.activeClass} bg-white`
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {(tab.id === 'writing' ? selectedWritingIds.length > 0 : selected[tab.id]) && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Skill list + preview split view */}
            <div className="flex-1 min-h-0 overflow-hidden p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <input
                  value={search[activeTab]}
                  onChange={(e) => setSearch((s) => ({ ...s, [activeTab]: e.target.value }))}
                  placeholder={`Tìm kiếm ${activeTab}...`}
                  className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                {detailLoading[activeTab] ? (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Đang tải preview</span>
                ) : structureErrors[activeTab] ? (
                  <span className="text-xs font-semibold text-rose-600">{structureErrors[activeTab]}</span>
                ) : (activeTab === 'writing' ? selectedWritingIds.length > 0 : selected[activeTab]) ? (
                  <span className="text-xs font-semibold text-emerald-600">Đề {activeTab} đạt chuẩn cấu trúc</span>
                ) : (
                  <span className="text-xs text-slate-400">Chọn đề để xem preview + đáp án</span>
                )}
              </div>

              <div className="grid h-[calc(100%-2.25rem)] min-h-0 grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
                  {skillListLoading[activeTab] ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                  ) : skillLists[activeTab].length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">Chưa có đề {activeTab} nào trong hệ thống.</p>
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {skillLists[activeTab]
                        .filter((item) =>
                          !search[activeTab] || item.title.toLowerCase().includes(search[activeTab].toLowerCase())
                        )
                        .map((item) => {
                          const isSelected = activeTab === 'writing'
                            ? selectedWritingIds.includes(item._id)
                            : selected[activeTab] === item._id;
                          return (
                            <button
                              key={item._id}
                              onClick={async () => {
                                if (activeTab === 'writing') {
                                  const alreadySelected = selectedWritingIds.includes(item._id);
                                  const nextIds = alreadySelected
                                    ? selectedWritingIds.filter((id) => id !== item._id)
                                    : [...selectedWritingIds, item._id];
                                  setSelectedWritingIds(nextIds);
                                  if (!alreadySelected) {
                                    setDetailLoading((prev) => ({ ...prev, writing: true }));
                                    try {
                                      await loadSkillDetail('writing', item._id);
                                    } catch {
                                      toast.error('Không tải được dữ liệu Writing để gộp.');
                                    } finally {
                                      setDetailLoading((prev) => ({ ...prev, writing: false }));
                                    }
                                  }
                                  return;
                                }

                                setSelected((s) => ({ ...s, [activeTab]: item._id }));
                                loadSkillDetail(activeTab, item._id);
                              }}
                              className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm transition ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                                  {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                                </span>
                                <span className="flex-1 font-medium leading-snug line-clamp-2">{item.title}</span>
                              </div>
                              <p className="mt-1.5 pl-6 text-xs text-slate-400 font-mono truncate">{item._id}</p>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div className="min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {!selectedDetails[activeTab] ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                      <AlertCircle className="h-8 w-8 opacity-40" />
                      <p className="text-sm">Chọn một đề để xem preview dạng split-view.</p>
                    </div>
                  ) : activeTab === 'reading' || activeTab === 'listening' ? (
                    <RLPreviewPanel
                      skill={activeTab}
                      data={selectedDetails[activeTab] as RLSkillData}
                      onChange={(updated) => setSelectedDetails((prev) => ({ ...prev, [activeTab]: updated }))}
                    />
                  ) : activeTab === 'writing' ? (
                    <WritingPreviewPanel
                      data={selectedDetails.writing as WritingSkillData}
                      onChange={(updated) => setSelectedDetails((prev) => ({ ...prev, writing: updated }))}
                    />
                  ) : (
                    <SpeakingPreviewPanel data={selectedDetails.speaking as SpeakingSkillData} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MockExamBuilderPage – main export
// ─────────────────────────────────────────────────────────────────────────────

export default function MockExamBuilderPage() {
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);

  const loadExams = useCallback(async () => {
    setLoadingExams(true);
    try {
      const data = await fetchTeacherExams();
      setExams(data);
    } catch {
      toast.error('Không tải được danh sách đề thi.');
    } finally {
      setLoadingExams(false);
    }
  }, []);

  useEffect(() => { loadExams(); }, [loadExams]);

  const handlePublish = async (id: string) => {
    try {
      await publishTeacherExam(id);
      toast.success('Đã công bố đề thi!');
      setExams((prev) => prev.map((e) => (e._id === id ? { ...e, status: 'PUBLISHED' as const } : e)));
    } catch {
      toast.error('Không thể công bố đề thi.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTeacherExam(id);
      setExams((prev) => prev.filter((e) => e._id !== id));
      toast.success('Đã xóa đề thi.');
    } catch {
      toast.error('Không thể xóa đề thi.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Quản lý Thi thử</h1>
            <p className="mt-0.5 text-sm text-slate-500">Tạo và quản lý đề thi IELTS Mock Test cho học viên</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setManualOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Edit3 className="h-4 w-4" />
              Tạo thủ công
            </button>
            <button
              onClick={() => toast('Tính năng tạo full đề bằng PDF hiện đang phát triển.')}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-400"
            >
              <PlusCircle className="h-4 w-4" />
              Tạo đề thi thử
            </button>
          </div>
        </div>

        {/* Exams table */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Danh sách đề thi</h2>
            <button onClick={loadExams} className="text-xs text-slate-500 hover:text-slate-700 hover:underline transition">Làm mới</button>
          </div>
          <MockExamTable exams={exams} loading={loadingExams} onPublish={handlePublish} onDelete={handleDelete} />
        </div>

        {/* Monitoring */}
        <MonitoringSection />
      </div>

      {/* Creation wizard */}
      <ManualExamWizard open={manualOpen} onClose={() => setManualOpen(false)} onSuccess={loadExams} />
    </div>
  );
}
