// ─────────────────────────────────────────────────────────────────────────────
// Template 1 – Text-Only Form
// Covers: MCQ, Fill-in-Blank, Matching, TFNG, YNNG, Speaking, Writing Task 2
// ─────────────────────────────────────────────────────────────────────────────

import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import type { TextOnlyValues } from '../types';

export function TextOnlyForm() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<TextOnlyValues>();

  const { fields, append, remove } = useFieldArray<TextOnlyValues>({
    name: 'options',
  });

  const correctAnswer = watch('correctAnswer');

  return (
    <div className="space-y-6">
      {/* Question stem */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Câu hỏi / Đề bài
        </label>
        <textarea
          {...register('questionText')}
          rows={4}
          placeholder="Nhập nội dung câu hỏi..."
          className="w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
        />
        {errors.questionText && (
          <p className="mt-1 text-xs text-red-500">{errors.questionText.message as string}</p>
        )}
      </div>

      {/* Dynamic options list */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-700">
            Danh sách đáp án
          </label>
          <button
            type="button"
            onClick={() => append({ value: '' })}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm đáp án
          </button>
        </div>

        {fields.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400">
            Chưa có đáp án nào. Nhấn "Thêm đáp án" để bắt đầu.
          </p>
        )}

        <div className="space-y-2.5">
          {fields.map((field, index) => {
            const optionValue = watch(`options.${index}.value`);
            const isCorrect = correctAnswer === optionValue && optionValue !== '';

            return (
              <div
                key={field.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition ${
                  isCorrect
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Letter badge */}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  {String.fromCharCode(65 + index)}
                </span>

                <input
                  {...register(`options.${index}.value`)}
                  placeholder={`Đáp án ${String.fromCharCode(65 + index)}`}
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                />

                {/* Mark-as-correct toggle */}
                <button
                  type="button"
                  title="Đặt làm đáp án đúng"
                  onClick={() => setValue('correctAnswer', optionValue)}
                  className={`shrink-0 rounded-full p-1 transition ${
                    isCorrect
                      ? 'text-emerald-500'
                      : 'text-slate-300 hover:text-emerald-400'
                  }`}
                >
                  <CheckCircle2 className="h-5 w-5" />
                </button>

                {/* Remove option */}
                <button
                  type="button"
                  title="Xoá đáp án"
                  onClick={() => remove(index)}
                  className="shrink-0 rounded-full p-1 text-slate-300 transition hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        {errors.options && (
          <p className="mt-1 text-xs text-red-500">
            {(errors.options as any)?.message ?? 'Kiểm tra lại danh sách đáp án'}
          </p>
        )}
      </div>

      {/* Correct answer (manual text override – useful for FILL_IN_BLANK, TFNG) */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Đáp án đúng
          <span className="ml-1.5 text-xs font-normal text-slate-400">
            (Nhấn ✔ ở đáp án phía trên hoặc gõ trực tiếp tại đây)
          </span>
        </label>
        <input
          {...register('correctAnswer')}
          placeholder="Ví dụ: A  hoặc  True  hoặc  climate change"
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
        />
        {errors.correctAnswer && (
          <p className="mt-1 text-xs text-red-500">{errors.correctAnswer.message as string}</p>
        )}
      </div>

      {/* Explanation */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Giải thích đáp án{' '}
          <span className="text-xs font-normal text-slate-400">(tuỳ chọn)</span>
        </label>
        <textarea
          {...register('explanation')}
          rows={2}
          placeholder="Giải thích tại sao đây là đáp án đúng..."
          className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
        />
      </div>
    </div>
  );
}
