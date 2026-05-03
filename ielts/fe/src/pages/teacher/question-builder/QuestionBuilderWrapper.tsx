// ─────────────────────────────────────────────────────────────────────────────
// QuestionBuilderWrapper – top-level container
//
// Responsibilities:
//  1. Renders a QuestionType selector (filtered by module).
//  2. Mounts the correct form template from the registry.
//  3. Provides a react-hook-form FormProvider so every child can useFormContext.
//  4. On submit, compiles the raw form values into a QuestionPayload compatible
//     with the existing backend schema (JSON.stringify for complex types).
//  5. Shows a live Preview panel next to the form.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, X, ChevronDown } from 'lucide-react';

import {
  QUESTION_FORM_REGISTRY,
  getTemplate,
  getTypesForModule,
} from './QuestionFormRegistry';
import { TextOnlyForm }     from './forms/TextOnlyForm';
import { TextMediaForm }    from './forms/TextMediaForm';
import { ComplexTableForm } from './forms/ComplexTableForm';
import { QuestionPreview }  from './preview/QuestionPreview';

import type {
  BuilderModule,
  ComplexTableValues,
  QuestionBuilderProps,
  QuestionPayload,
  QuestionType,
  TextMediaValues,
  TextOnlyValues,
} from './types';

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const textOnlySchema = z.object({
  questionText:  z.string().min(1, 'Câu hỏi không được để trống'),
  options:       z.array(z.object({ value: z.string() })),
  correctAnswer: z.string().min(1, 'Cần nhập đáp án đúng'),
  explanation:   z.string().optional().default(''),
});

const textMediaSchema = textOnlySchema.extend({
  mediaUrl:  z.string().optional().default(''),
  mediaType: z.enum(['image', 'audio', 'none']).default('none'),
});

const tableSchema = z.object({
  questionText: z.string().optional().default(''),
  explanation:  z.string().optional().default(''),
  headers: z.array(z.object({ val: z.string() })).min(1, 'Cần ít nhất 1 cột'),
  rows: z.array(
    z.object({
      cells: z.array(
        z.object({
          type:   z.enum(['text', 'blank']),
          val:    z.string(),
          answer: z.string(),
        }),
      ),
    }),
  ),
});

type AnyFormValues = TextOnlyValues | TextMediaValues | ComplexTableValues;

function resolverForTemplate(template: ReturnType<typeof getTemplate>) {
  switch (template) {
    case 'text-media':     return zodResolver(textMediaSchema);
    case 'complex-table':  return zodResolver(tableSchema);
    default:               return zodResolver(textOnlySchema);
  }
}

function defaultValuesForTemplate(template: ReturnType<typeof getTemplate>): AnyFormValues {
  switch (template) {
    case 'text-media':
      return {
        questionText: '', options: [], correctAnswer: '', explanation: '',
        mediaUrl: '', mediaType: 'none',
      } satisfies TextMediaValues;
    case 'complex-table':
      return {
        questionText: '', explanation: '',
        headers: [{ val: '' }, { val: '' }],
        rows: [
          { cells: [{ type: 'text', val: '', answer: '' }, { type: 'text', val: '', answer: '' }] },
        ],
      } satisfies ComplexTableValues;
    default:
      return { questionText: '', options: [], correctAnswer: '', explanation: '' } satisfies TextOnlyValues;
  }
}

// ─── Compile form values → QuestionPayload ────────────────────────────────────

function compilePayload(
  type: QuestionType,
  template: ReturnType<typeof getTemplate>,
  values: AnyFormValues,
): QuestionPayload {
  if (template === 'complex-table') {
    const tv = values as ComplexTableValues;
    // Stringify the entire table structure into options[0]
    const tableJson = JSON.stringify({
      headers: tv.headers.map((h) => h.val),
      rows: tv.rows.map((r) =>
        r.cells.map((c) => ({ type: c.type, val: c.val, answer: c.answer })),
      ),
    });
    return {
      type,
      text:          tv.questionText ?? '',
      options:       [tableJson],
      correctAnswer: '',
      explanation:   tv.explanation ?? '',
    };
  }

  if (template === 'text-media') {
    const mv = values as TextMediaValues;
    return {
      type,
      text:          mv.questionText,
      options:       mv.options.map((o) => o.value).filter(Boolean),
      correctAnswer: mv.correctAnswer,
      explanation:   mv.explanation ?? '',
      imageUrl:      mv.mediaType === 'image' ? mv.mediaUrl : undefined,
      audioUrl:      mv.mediaType === 'audio' ? mv.mediaUrl : undefined,
    };
  }

  // text-only
  const sv = values as TextOnlyValues;
  return {
    type,
    text:          sv.questionText,
    options:       sv.options.map((o) => o.value).filter(Boolean),
    correctAnswer: sv.correctAnswer,
    explanation:   sv.explanation ?? '',
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function QuestionBuilderWrapper({
  module,
  onSubmit,
  onCancel,
  defaultValues,
  submitLabel = 'Thêm câu hỏi',
}: QuestionBuilderProps) {
  const availableTypes = getTypesForModule(module);
  const [selectedType, setSelectedType] = useState<QuestionType>(availableTypes[0]);
  const [showPreview, setShowPreview]   = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const template = getTemplate(selectedType);
  const entry    = QUESTION_FORM_REGISTRY[selectedType];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = useForm<any>({
    resolver:      resolverForTemplate(template) as any,
    defaultValues: defaultValuesForTemplate(template),
    mode:          'onChange',
  });

  // Reset form when type changes (new template = new schema)
  useEffect(() => {
    methods.reset(defaultValuesForTemplate(getTemplate(selectedType)));
  }, [selectedType]); // eslint-disable-line react-hooks/exhaustive-deps

  const liveValues = useWatch({ control: methods.control as any }) as AnyFormValues;

  async function handleSubmit(values: AnyFormValues) {
    try {
      setIsSubmitting(true);
      const payload = compilePayload(selectedType, template, values);
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* ── Header bar ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-3">
        <h2 className="text-base font-bold text-slate-800">
          Tạo câu hỏi thủ công
          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold uppercase text-red-600">
            {module}
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400"
          >
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPreview ? 'Ẩn preview' : 'Xem trước'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ── Type selector ── */}
      <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-5 py-3">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Dạng câu hỏi
        </label>
        <div className="relative inline-block w-full max-w-sm">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as QuestionType)}
            className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
          >
            {availableTypes.map((t) => (
              <option key={t} value={t}>
                {QUESTION_FORM_REGISTRY[t]?.label ?? t}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* ── Two-column layout: Form | Preview ── */}
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(handleSubmit as any)}
          className="flex min-h-0 flex-1 overflow-hidden"
        >
          {/* Form panel */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {template === 'text-only'    && <TextOnlyForm />}
            {template === 'text-media'   && <TextMediaForm hasAudio={entry?.hasAudio} />}
            {template === 'complex-table' && <ComplexTableForm />}
          </div>

          {/* Preview panel */}
          {showPreview && (
            <aside className="hidden w-[360px] shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-50 px-5 py-5 lg:block">
              <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Eye className="h-3.5 w-3.5" />
                Học viên sẽ thấy
              </p>
              <QuestionPreview
                questionType={selectedType}
                data={liveValues as any}
              />
            </aside>
          )}
        </form>
      </FormProvider>

      {/* ── Footer actions ── */}
      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 px-5 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Huỷ
        </button>
        <button
          type="submit"
          form=""
          onClick={methods.handleSubmit(handleSubmit as any)}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 active:scale-95 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
