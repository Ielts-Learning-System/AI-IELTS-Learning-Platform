/**
 * ExcelImportWizard.tsx
 * 3-step wizard: Upload → Select → Preview/Edit → Submit
 *
 * Supports scopes: reading | listening | writing | speaking | exam
 */

import { useCallback, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  parseExcelFile,
  type ModuleScope,
  type ParsedExcelResult,
  type ParsedReadingTest,
  type ParsedListeningTest,
  type ParsedWritingTest,
  type ParsedSpeakingTest,
  type ParsedReadingPassage,
  type ParsedListeningPart,
  type FieldErrors,
} from '../../lib/parseExcel';
import { apiClient } from '../../lib/api/client';

// ─── Props ────────────────────────────────────────────────────────────────────
export interface ExcelImportWizardProps {
  scope: ModuleScope;
  onClose: () => void;
  onImported: () => void;
}

// ─── Union of all test types used in selection step ──────────────────────────
type AnyParsedTest =
  | ParsedReadingTest
  | ParsedListeningTest
  | ParsedWritingTest
  | ParsedSpeakingTest;

interface SelectableTest {
  testId: string;
  title: string;
  skill: 'reading' | 'listening' | 'writing' | 'speaking';
  data: AnyParsedTest;
  hasErrors: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SCOPE_LABEL: Record<ModuleScope, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
  exam: 'Full Mock Test (Exam)',
};

function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

function countErrors(test: AnyParsedTest): number {
  let count = 0;
  if ('passages' in test) {
    for (const p of (test as ParsedReadingTest).passages) {
      count += Object.keys(p._errors).length;
      for (const q of p.questions) count += Object.keys(q._errors).length;
    }
  }
  if ('parts' in test) {
    for (const p of (test as ParsedListeningTest).parts) {
      count += Object.keys(p._errors).length;
      for (const q of p.questions) count += Object.keys(q._errors).length;
    }
  }
  if ('tasks' in test) {
    for (const t of (test as ParsedWritingTest).tasks)
      count += Object.keys(t._errors).length;
  }
  return count;
}

function buildSelectables(result: ParsedExcelResult): SelectableTest[] {
  const list: SelectableTest[] = [];
  for (const t of result.reading)
    list.push({ testId: t.testId, title: t.title, skill: 'reading', data: t, hasErrors: t.hasErrors });
  for (const t of result.listening)
    list.push({ testId: t.testId, title: t.title, skill: 'listening', data: t, hasErrors: t.hasErrors });
  for (const t of result.writing)
    list.push({ testId: t.testId, title: t.title, skill: 'writing', data: t, hasErrors: t.hasErrors });
  for (const t of result.speaking)
    list.push({ testId: t.testId, title: t.title, skill: 'speaking', data: t, hasErrors: t.hasErrors });
  return list;
}

// ─── Preview editing helpers ──────────────────────────────────────────────────
function InputField({
  label,
  value,
  onChange,
  error,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  multiline?: boolean;
}) {
  const baseClass =
    'w-full rounded-lg border px-3 py-2 text-sm outline-none transition ' +
    (error
      ? 'border-red-500 bg-red-50 focus:border-red-600'
      : 'border-slate-300 bg-white focus:border-emerald-500');

  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}
      </label>
      {multiline ? (
        <textarea
          rows={3}
          className={baseClass + ' resize-y'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input className={baseClass} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ─── Rich Text Editor (Tiptap) ────────────────────────────────────────────────
function RichTextEditor({
  content,
  onChange,
  placeholder = 'Nhập nội dung...',
  error,
}: {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  error?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className={`rounded-lg border overflow-hidden ${error ? 'border-red-500' : 'border-slate-300'}`}>
      {/* Mini toolbar */}
      <div className="flex items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1">
        {[
          { label: 'B', title: 'Bold', cmd: () => editor?.chain().focus().toggleBold().run(), active: () => editor?.isActive('bold') },
          { label: 'I', title: 'Italic', cmd: () => editor?.chain().focus().toggleItalic().run(), active: () => editor?.isActive('italic') },
          { label: 'H2', title: 'Heading 2', cmd: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: () => editor?.isActive('heading', { level: 2 }) },
          { label: '• List', title: 'Bullet list', cmd: () => editor?.chain().focus().toggleBulletList().run(), active: () => editor?.isActive('bulletList') },
          { label: '1. List', title: 'Ordered list', cmd: () => editor?.chain().focus().toggleOrderedList().run(), active: () => editor?.isActive('orderedList') },
        ].map(({ label, title, cmd, active }) => (
          <button
            key={label}
            type="button"
            title={title}
            onMouseDown={(e) => { e.preventDefault(); cmd(); }}
            className={`rounded px-2 py-0.5 text-xs font-medium transition ${active?.() ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2 min-h-[150px] focus-within:outline-none"
      />
      {error && <p className="text-xs text-red-600 px-3 pb-2">{error}</p>}
    </div>
  );
}

// ─── Reading preview ──────────────────────────────────────────────────────────
function ReadingPreview({
  test,
  onChange,
}: {
  test: ParsedReadingTest;
  onChange: (updated: ParsedReadingTest) => void;
}) {
  function updatePassage(pIdx: number, patch: Partial<ParsedReadingPassage>) {
    const passages = test.passages.map((p, i) =>
      i === pIdx ? { ...p, ...patch, _errors: { ...p._errors } } : p
    );
    if (patch.content !== undefined && patch.content.replace(/<[^>]*>/g, '').trim()) {
      passages[pIdx]._errors = { ...passages[pIdx]._errors };
      delete passages[pIdx]._errors['content'];
    }
    onChange({ ...test, passages });
  }

  function updateQuestion(pIdx: number, qIdx: number, field: string, value: string) {
    const passages = test.passages.map((p, i) => {
      if (i !== pIdx) return p;
      const questions = p.questions.map((q, j) => {
        if (j !== qIdx) return q;
        const errors = { ...q._errors };
        if (value.trim()) delete errors[field];
        return { ...q, [field]: value, _errors: errors };
      });
      return { ...p, questions };
    });
    onChange({ ...test, passages });
  }

  return (
    <div className="space-y-6">
      <InputField
        label="Tiêu đề đề thi"
        value={test.title}
        onChange={(v) => onChange({ ...test, title: v })}
      />
      {test.passages.map((passage, pIdx) => (
        <div key={pIdx} className="rounded-xl border border-slate-200 overflow-hidden">
          {/* Passage header */}
          <div className="flex items-center gap-2 bg-slate-100 border-b border-slate-200 px-4 py-2.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {passage.passageNumber}
            </span>
            <p className="text-sm font-semibold text-slate-700">{passage.title || `Passage ${passage.passageNumber}`}</p>
            {hasFieldErrors(passage._errors) && (
              <span className="ml-auto text-xs text-red-600 font-medium">⚠ Có lỗi</span>
            )}
          </div>
          {/* Split-screen body */}
          <div className="flex divide-x divide-slate-200">
            {/* ── LEFT: Passage context editor ── */}
            <div className="w-[55%] p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Passage (Rich Text)</p>
              <InputField
                label="Tiêu đề Passage"
                value={passage.title}
                onChange={(v) => updatePassage(pIdx, { title: v })}
              />
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Nội dung bài đọc *
                </label>
                <RichTextEditor
                  content={passage.content}
                  onChange={(html) => updatePassage(pIdx, { content: html })}
                  placeholder="Nhập hoặc chỉnh sửa nội dung passage..."
                  error={passage._errors['content']}
                />
              </div>
              <InputField
                label="URL ảnh (tuỳ chọn)"
                value={passage.image}
                onChange={(v) => updatePassage(pIdx, { image: v })}
              />
              {passage.image && (
                <img
                  src={passage.image}
                  alt="Passage image preview"
                  className="mt-1 max-h-40 w-full rounded-lg border border-slate-200 object-contain bg-slate-50"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
            </div>
            {/* ── RIGHT: Questions panel ── */}
            <div className="w-[45%] flex flex-col">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {passage.questions.length} Câu hỏi
                </p>
              </div>
              <div className="overflow-y-auto max-h-[480px] p-4 space-y-3">
                {passage.questions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className={`rounded-lg border p-3 space-y-2 text-sm ${hasFieldErrors(q._errors) ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}
                  >
                    <p className="text-xs font-bold text-slate-500">Câu {q.questionNumber}</p>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Nội dung câu hỏi *
                      </label>
                      <RichTextEditor
                        content={q.text}
                        onChange={(html) => updateQuestion(pIdx, qIdx, 'text', html)}
                        placeholder="Nhập nội dung câu hỏi..."
                        error={q._errors['text']}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <InputField
                        label="Đáp án đúng *"
                        value={q.correctAnswer}
                        onChange={(v) => updateQuestion(pIdx, qIdx, 'correctAnswer', v)}
                        error={q._errors['correctAnswer']}
                      />
                      <InputField
                        label="Loại câu hỏi"
                        value={q.type}
                        onChange={(v) => updateQuestion(pIdx, qIdx, 'type', v)}
                      />
                    </div>
                    <InputField
                      label="Options (dấu |)"
                      value={q.options.join(' | ')}
                      onChange={(v) => {
                        const opts = v.split('|').map((s) => s.trim()).filter(Boolean);
                        updateQuestion(pIdx, qIdx, 'options', opts as unknown as string);
                      }}
                    />
                    <InputField
                      label="Giải thích (tuỳ chọn)"
                      value={q.explanation}
                      onChange={(v) => updateQuestion(pIdx, qIdx, 'explanation', v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Listening preview ────────────────────────────────────────────────────────
function ListeningPreview({
  test,
  onChange,
}: {
  test: ParsedListeningTest;
  onChange: (updated: ParsedListeningTest) => void;
}) {
  function updatePart(pIdx: number, patch: Partial<ParsedListeningPart>) {
    const parts = test.parts.map((p, i) => {
      if (i !== pIdx) return p;
      const errors = { ...p._errors };
      if (patch.audioUrl !== undefined && patch.audioUrl.trim()) delete errors['audioUrl'];
      return { ...p, ...patch, _errors: errors };
    });
    onChange({ ...test, parts });
  }

  function updateQuestion(pIdx: number, qIdx: number, field: string, value: string) {
    const parts = test.parts.map((p, i) => {
      if (i !== pIdx) return p;
      const questions = p.questions.map((q, j) => {
        if (j !== qIdx) return q;
        const errors = { ...q._errors };
        if (value.trim()) delete errors[field];
        return { ...q, [field]: value, _errors: errors };
      });
      return { ...p, questions };
    });
    onChange({ ...test, parts });
  }

  return (
    <div className="space-y-6">
      <InputField
        label="Tiêu đề đề thi"
        value={test.title}
        onChange={(v) => onChange({ ...test, title: v })}
      />
      {test.parts.map((part, pIdx) => (
        <div key={pIdx} className="rounded-xl border border-slate-200 overflow-hidden">
          {/* Part header */}
          <div className="flex items-center gap-2 bg-slate-100 border-b border-slate-200 px-4 py-2.5">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {part.partNumber}
            </span>
            <p className="text-sm font-semibold text-slate-700">{part.title || `Part ${part.partNumber}`}</p>
            {hasFieldErrors(part._errors) && (
              <span className="ml-auto text-xs text-red-600 font-medium">⚠ Có lỗi</span>
            )}
          </div>
          {/* Split-screen body */}
          <div className="flex divide-x divide-slate-200">
            {/* ── LEFT: Part context ── */}
            <div className="w-[40%] p-4 space-y-3 bg-slate-50">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thông tin Part</p>
              <InputField
                label="Tiêu đề Part"
                value={part.title}
                onChange={(v) => updatePart(pIdx, { title: v })}
              />
              <InputField
                label="Audio URL *"
                value={part.audioUrl}
                onChange={(v) => updatePart(pIdx, { audioUrl: v })}
                error={part._errors['audioUrl']}
              />
              {part.audioUrl && (
                <audio
                  controls
                  src={part.audioUrl}
                  className="mt-1 w-full rounded-lg"
                />
              )}
              <InputField
                label="Mô tả Part"
                value={part.description}
                onChange={(v) => updatePart(pIdx, { description: v })}
              />
            </div>
            {/* ── RIGHT: Questions panel ── */}
            <div className="w-[60%] flex flex-col">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {part.questions.length} Câu hỏi
                </p>
              </div>
              <div className="overflow-y-auto max-h-[400px] p-4 space-y-3">
                {part.questions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className={`rounded-lg border p-3 space-y-2 text-sm ${hasFieldErrors(q._errors) ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}
                  >
                    <p className="text-xs font-bold text-slate-500">Câu {qIdx + 1}</p>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Nội dung câu hỏi *
                      </label>
                      <RichTextEditor
                        content={q.questionText}
                        onChange={(html) => updateQuestion(pIdx, qIdx, 'questionText', html)}
                        placeholder="Nhập nội dung câu hỏi..."
                        error={q._errors['questionText']}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <InputField
                        label="Đáp án đúng *"
                        value={q.correctAnswer}
                        onChange={(v) => updateQuestion(pIdx, qIdx, 'correctAnswer', v)}
                        error={q._errors['correctAnswer']}
                      />
                      <InputField
                        label="Loại câu hỏi"
                        value={q.type}
                        onChange={(v) => updateQuestion(pIdx, qIdx, 'type', v)}
                      />
                    </div>
                    <InputField
                      label="Options (dấu |)"
                      value={q.options.join(' | ')}
                      onChange={(v) => {
                        const opts = v.split('|').map((s) => s.trim()).filter(Boolean);
                        updateQuestion(pIdx, qIdx, 'options', opts as unknown as string);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Writing preview ──────────────────────────────────────────────────────────
function WritingPreview({
  test,
  onChange,
}: {
  test: ParsedWritingTest;
  onChange: (updated: ParsedWritingTest) => void;
}) {
  return (
    <div className="space-y-6">
      <InputField label="Tiêu đề" value={test.title} onChange={(v) => onChange({ ...test, title: v })} />
      <InputField label="Mô tả" value={test.description} onChange={(v) => onChange({ ...test, description: v })} />
      {test.tasks.map((task, tIdx) => (
        <div key={tIdx} className={`rounded-xl border p-4 space-y-3 ${hasFieldErrors(task._errors) ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
          <p className="text-sm font-bold text-slate-700">Task {task.taskNumber}</p>
          <InputField
            label="Tiêu đề Task *"
            value={task.title}
            onChange={(v) => {
              const tasks = test.tasks.map((t, i) => {
                if (i !== tIdx) return t;
                const errors = { ...t._errors };
                if (v.trim()) delete errors['title'];
                return { ...t, title: v, _errors: errors };
              });
              onChange({ ...test, tasks });
            }}
            error={task._errors['title']}
          />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Nội dung đề bài *
            </label>
            <RichTextEditor
              content={task.content}
              onChange={(html) => {
                const tasks = test.tasks.map((t, i) => {
                  if (i !== tIdx) return t;
                  const errors = { ...t._errors };
                  if (html.replace(/<[^>]*>/g, '').trim()) delete errors['content'];
                  return { ...t, content: html, _errors: errors };
                });
                onChange({ ...test, tasks });
              }}
              placeholder="Nhập đề bài Writing Task..."
              error={task._errors['content']}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <InputField
              label="URL ảnh (tuỳ chọn)"
              value={task.imageUrl}
              onChange={(v) => {
                const tasks = test.tasks.map((t, i) => (i === tIdx ? { ...t, imageUrl: v } : t));
                onChange({ ...test, tasks });
              }}
            />
            <InputField
              label="Số từ tối thiểu"
              value={String(task.minWords)}
              onChange={(v) => {
                const n = parseInt(v, 10);
                const tasks = test.tasks.map((t, i) =>
                  i === tIdx ? { ...t, minWords: Number.isFinite(n) ? n : t.minWords } : t
                );
                onChange({ ...test, tasks });
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Speaking preview ─────────────────────────────────────────────────────────
function SpeakingPreview({
  test,
  onChange,
}: {
  test: ParsedSpeakingTest;
  onChange: (updated: ParsedSpeakingTest) => void;
}) {
  return (
    <div className="space-y-6">
      <InputField label="Tiêu đề" value={test.title} onChange={(v) => onChange({ ...test, title: v })} />

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-sm font-bold text-slate-700">Part 1 — Questions</p>
        {test.part1.map((q, i) => (
          <InputField
            key={i}
            label={`Câu ${i + 1}`}
            value={q}
            onChange={(v) => {
              const part1 = test.part1.map((x, j) => (j === i ? v : x));
              onChange({ ...test, part1 });
            }}
          />
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...test, part1: [...test.part1, ''] })}
          className="text-xs text-emerald-600 hover:underline"
        >
          + Thêm câu Part 1
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-sm font-bold text-slate-700">Part 2 — Cue Card</p>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Nội dung Cue Card *
          </label>
          <RichTextEditor
            content={test.part2}
            onChange={(html) => onChange({ ...test, part2: html })}
            placeholder="Nhập nội dung Cue Card Part 2..."
            error={!test.part2 || test.part2 === '<p></p>' ? 'Thiếu nội dung Part 2 (cue_card)' : undefined}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <p className="text-sm font-bold text-slate-700">Part 3 — Discussion Questions</p>
        {test.part3.map((q, i) => (
          <InputField
            key={i}
            label={`Câu ${i + 1}`}
            value={q}
            onChange={(v) => {
              const part3 = test.part3.map((x, j) => (j === i ? v : x));
              onChange({ ...test, part3 });
            }}
          />
        ))}
        <button
          type="button"
          onClick={() => onChange({ ...test, part3: [...test.part3, ''] })}
          className="text-xs text-emerald-600 hover:underline"
        >
          + Thêm câu Part 3
        </button>
      </div>
    </div>
  );
}

// ─── Payload builders ─────────────────────────────────────────────────────────
function buildReadingPayload(test: ParsedReadingTest) {
  return {
    title: test.title,
    description: test.description,
    passages: test.passages.map((p) => ({
      passageNumber: p.passageNumber,
      title: p.title,
      content: p.content,
      image: p.image,
      questions: p.questions.map((q) => ({
        questionNumber: q.questionNumber,
        type: q.type,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
    })),
  };
}

function buildListeningPayload(test: ParsedListeningTest) {
  return {
    title: test.title,
    description: test.description,
    parts: test.parts.map((p) => ({
      partNumber: p.partNumber,
      title: p.title,
      audioUrl: p.audioUrl,
      description: p.description,
      questions: p.questions.map((q) => ({
        questionText: q.questionText,
        type: q.type,
        options: q.options,
        imageUrl: q.imageUrl,
        correctAnswer: q.correctAnswer,
      })),
    })),
  };
}

function buildWritingPayload(test: ParsedWritingTest) {
  return {
    title: test.title,
    description: test.description,
    tasks: test.tasks.map((t) => ({
      taskNumber: t.taskNumber,
      title: t.title,
      content: t.content,
      minWords: t.minWords,
    })),
  };
}

function buildSpeakingPayload(test: ParsedSpeakingTest) {
  return {
    title: test.title,
    part1: test.part1.filter(Boolean),
    part2: test.part2,
    part3: test.part3.filter(Boolean),
  };
}

async function submitTest(
  skill: 'reading' | 'listening' | 'writing' | 'speaking',
  data: AnyParsedTest
): Promise<void> {
  const endpointMap = {
    reading: '/reading/import-json',
    listening: '/listening/import-json',
    writing: '/writing/import-json',
    speaking: '/speaking/import-json',
  };

  const payloadMap = {
    reading: () => buildReadingPayload(data as ParsedReadingTest),
    listening: () => buildListeningPayload(data as ParsedListeningTest),
    writing: () => buildWritingPayload(data as ParsedWritingTest),
    speaking: () => buildSpeakingPayload(data as ParsedSpeakingTest),
  };

  await apiClient.post(endpointMap[skill], payloadMap[skill]());
}

// ─── Main wizard component ────────────────────────────────────────────────────
export function ExcelImportWizard({ scope, onClose, onImported }: ExcelImportWizardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedExcelResult | null>(null);
  const [selectables, setSelectables] = useState<SelectableTest[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  // editableData mirrors the selected test, but allows in-place edits
  const [editableData, setEditableData] = useState<AnyParsedTest | null>(null);
  const [fileName, setFileName] = useState('');

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      setIsParsing(true);
      try {
        const result = await parseExcelFile(file, scope);
        setParseResult(result);
        const items = buildSelectables(result);
        setSelectables(items);
        if (items.length === 0) {
          toast.error('Không tìm thấy dữ liệu hợp lệ trong file Excel.');
          setIsParsing(false);
          return;
        }
        if (result.missedSheets.length > 0) {
          toast(
            `Không tìm thấy sheet: ${result.missedSheets.join(', ')}`,
            { icon: '⚠️' }
          );
        }
        setStep(1);
      } catch (err) {
        toast.error('Lỗi đọc file Excel. Hãy kiểm tra lại định dạng.');
        console.error(err);
      } finally {
        setIsParsing(false);
        // reset input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [scope]
  );

  function selectTest(idx: number) {
    setSelectedIdx(idx);
    // Deep-clone to allow editing without mutating parse result
    setEditableData(JSON.parse(JSON.stringify(selectables[idx].data)));
  }

  function proceedToPreview() {
    if (selectedIdx === null) {
      toast.error('Hãy chọn một đề thi để import.');
      return;
    }
    setStep(2);
  }

  function recomputeHasErrors(data: AnyParsedTest): boolean {
    let errs = 0;
    if ('passages' in data) {
      for (const p of (data as ParsedReadingTest).passages) {
        errs += Object.keys(p._errors).length;
        for (const q of p.questions) errs += Object.keys(q._errors).length;
      }
    }
    if ('parts' in data) {
      for (const p of (data as ParsedListeningTest).parts) {
        errs += Object.keys(p._errors).length;
        for (const q of p.questions) errs += Object.keys(q._errors).length;
      }
    }
    if ('tasks' in data) {
      for (const t of (data as ParsedWritingTest).tasks)
        errs += Object.keys(t._errors).length;
    }
    if ('part2' in data) {
      const s = data as ParsedSpeakingTest;
      if (!s.part2 || s.part2.replace(/<[^>]*>/g, '').trim() === '') errs++;
    }
    return errs > 0;
  }

  async function handleSubmit() {
    if (!editableData || selectedIdx === null) return;
    const skill = selectables[selectedIdx].skill;
    const stillHasErrors = recomputeHasErrors(editableData);
    if (stillHasErrors) {
      toast.error('Vẫn còn trường bắt buộc bị thiếu. Hãy sửa hết lỗi trước khi submit.');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitTest(skill, editableData);
      toast.success(`Import thành công đề ${skill.toUpperCase()}!`);
      onImported();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Import thất bại. Kiểm tra lại payload.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentErrors =
    editableData && selectedIdx !== null
      ? countErrors(editableData)
      : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-8 pb-8 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Import từ Excel — {SCOPE_LABEL[scope]}
              </h2>
              {fileName && (
                <p className="text-xs text-slate-500 mt-0.5">{fileName}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 border-b border-slate-100 px-6 py-3">
          {(['Tải file', 'Chọn đề', 'Xem & Sửa'] as const).map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  step === i
                    ? 'bg-emerald-600 text-white'
                    : step > i
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > i ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  step === i ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
              {i < 2 && <ChevronRight className="h-3 w-3 text-slate-300" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 max-h-[calc(100vh-260px)]">

          {/* ── Step 0: Upload ── */}
          {step === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              {isParsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                  <p className="text-slate-600 font-medium">Đang đọc file Excel...</p>
                </div>
              ) : (
                <>
                  <label
                    htmlFor="excel-upload"
                    className="flex flex-col items-center gap-3 cursor-pointer rounded-2xl border-2 border-dashed border-emerald-400 bg-emerald-50 px-12 py-10 hover:bg-emerald-100 transition"
                  >
                    <Upload className="h-10 w-10 text-emerald-500" />
                    <div className="text-center">
                      <p className="font-semibold text-slate-800">Kéo thả hoặc bấm để chọn file</p>
                      <p className="text-sm text-slate-500 mt-1">Chấp nhận file .xlsx · Sheet cần có: <strong>{scope === 'exam' ? 'Reading, Listening, Writing, Speaking' : scope.charAt(0).toUpperCase() + scope.slice(1)}</strong></p>
                    </div>
                    <span className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                      Chọn file Excel
                    </span>
                  </label>
                  <input
                    id="excel-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <div className="text-xs text-slate-400 text-center max-w-sm">
                    <strong>Cấu trúc cột yêu cầu:</strong>
                    {scope === 'reading' || scope === 'exam' ? (
                      <p className="mt-1">Reading: test_id · passage_id · order · question_type · passage_text · question_text · options_json · answer</p>
                    ) : null}
                    {scope === 'listening' || scope === 'exam' ? (
                      <p className="mt-1">Listening: test_id · section_id · order · question_type · audio_url · image_url · question_text · options_json · answer</p>
                    ) : null}
                    {scope === 'writing' || scope === 'exam' ? (
                      <p className="mt-1">Writing: test_id · task · order · question_type · image_url · question_text · rubric · answer</p>
                    ) : null}
                    {scope === 'speaking' || scope === 'exam' ? (
                      <p className="mt-1">Speaking: test_id · part · order · question_type · cue_card · question_text · answer</p>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 1: Test Selection ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Tìm thấy <strong>{selectables.length}</strong> đề thi trong file. Chọn đề thi cần import:
              </p>
              {parseResult?.hasErrors && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Một số đề thi có trường dữ liệu bị thiếu (đánh dấu màu đỏ). Bạn có thể sửa ở bước tiếp theo.</span>
                </div>
              )}
              <div className="space-y-2">
                {selectables.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectTest(idx)}
                    className={`w-full flex items-start justify-between rounded-xl border px-4 py-3 text-left transition ${
                      selectedIdx === idx
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{item.title || item.testId}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ID: {item.testId} · Skill:{' '}
                        <span className="font-medium uppercase">{item.skill}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {item.hasErrors ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          <AlertTriangle className="h-3 w-3" />
                          Có lỗi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Hợp lệ
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Preview / Edit ── */}
          {step === 2 && editableData && selectedIdx !== null && (
            <div className="space-y-4">
              {currentErrors > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    <strong>Cảnh báo:</strong> Còn <strong>{currentErrors}</strong> trường bắt buộc bị thiếu. Các ô đang được đánh dấu đỏ bên dưới. Vui lòng điền đầy đủ trước khi import.
                  </span>
                </div>
              )}

              {selectables[selectedIdx].skill === 'reading' && (
                <ReadingPreview
                  test={editableData as ParsedReadingTest}
                  onChange={(updated) => setEditableData(updated)}
                />
              )}
              {selectables[selectedIdx].skill === 'listening' && (
                <ListeningPreview
                  test={editableData as ParsedListeningTest}
                  onChange={(updated) => setEditableData(updated)}
                />
              )}
              {selectables[selectedIdx].skill === 'writing' && (
                <WritingPreview
                  test={editableData as ParsedWritingTest}
                  onChange={(updated) => setEditableData(updated)}
                />
              )}
              {selectables[selectedIdx].skill === 'speaking' && (
                <SpeakingPreview
                  test={editableData as ParsedSpeakingTest}
                  onChange={(updated) => setEditableData(updated)}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <div>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((step - 1) as 0 | 1 | 2)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Quay lại
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Huỷ
            </button>

            {step === 0 && (
              <label
                htmlFor="excel-upload-footer"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Upload className="h-4 w-4" />
                Chọn file
                <input
                  id="excel-upload-footer"
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}

            {step === 1 && (
              <button
                type="button"
                onClick={proceedToPreview}
                disabled={selectedIdx === null}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Xem trước & Sửa
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {isSubmitting ? 'Đang import...' : 'Import vào hệ thống'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
