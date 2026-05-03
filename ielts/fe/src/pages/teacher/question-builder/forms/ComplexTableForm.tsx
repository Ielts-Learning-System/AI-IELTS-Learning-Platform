// ─────────────────────────────────────────────────────────────────────────────
// Template 3 – Complex Table Form
// Covers: Table Completion, Drag & Drop
//
// How it works:
//  1. Teacher sets column count + row count.
//  2. A grid renders with every cell as a plain text input.
//  3. Clicking a cell's "toggle blank" button converts it to a BLANK cell
//     (highlighted blue). A secondary input appears for the expected answer.
//  4. On submit the parent wrapper calls JSON.stringify() on the full
//     { headers, rows } structure and stuffs it into the `options[0]` field
//     of the QuestionPayload so that it is stored in the existing `options`
//     column without any backend change.
// ─────────────────────────────────────────────────────────────────────────────

import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import type { ComplexTableValues, TableCell } from '../types';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeCell(): TableCell {
  return { type: 'text', val: '', answer: '' };
}

function makeRow(colCount: number): { cells: TableCell[] } {
  return { cells: Array.from({ length: colCount }, makeCell) };
}

// ── component ─────────────────────────────────────────────────────────────────

export function ComplexTableForm() {
  const { register, watch, setValue, formState: { errors } } =
    useFormContext<ComplexTableValues>();

  const {
    fields: headerFields,
    append: appendHeader,
    remove: removeHeader,
  } = useFieldArray<ComplexTableValues>({ name: 'headers' });

  const {
    fields: rowFields,
    append: appendRow,
    remove: removeRow,
  } = useFieldArray<ComplexTableValues>({ name: 'rows' });

  const headers = watch('headers');
  const rows    = watch('rows');
  const colCount = headers?.length ?? 1;

  // ── column management ──────────────────────────────────────────────────────

  function addColumn() {
    appendHeader({ val: '' });
    // add a new cell to every existing row
    const currentRows = rows ?? [];
    currentRows.forEach((_, rowIdx) => {
      const cells = watch(`rows.${rowIdx}.cells`) ?? [];
      setValue(`rows.${rowIdx}.cells`, [...cells, makeCell()]);
    });
  }

  function removeColumn(colIdx: number) {
    removeHeader(colIdx);
    const currentRows = rows ?? [];
    currentRows.forEach((_, rowIdx) => {
      const cells = watch(`rows.${rowIdx}.cells`) ?? [];
      setValue(
        `rows.${rowIdx}.cells`,
        cells.filter((_, i) => i !== colIdx),
      );
    });
  }

  // ── row management ─────────────────────────────────────────────────────────

  function addRow() {
    appendRow(makeRow(colCount));
  }

  // ── cell toggle ───────────────────────────────────────────────────────────

  function toggleCell(rowIdx: number, cellIdx: number) {
    const current: TableCell = watch(`rows.${rowIdx}.cells.${cellIdx}`);
    setValue(`rows.${rowIdx}.cells.${cellIdx}`, {
      ...current,
      type: current.type === 'blank' ? 'text' : 'blank',
    });
  }

  return (
    <div className="space-y-6">
      {/* Question stem */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Hướng dẫn / Đề bài
        </label>
        <textarea
          {...register('questionText')}
          rows={2}
          placeholder="Ví dụ: Complete the table below. Write NO MORE THAN TWO WORDS..."
          className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
        />
      </div>

      {/* ── Table builder ── */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">
            Bảng dữ liệu
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {colCount} cột · {rowFields.length} hàng
            </span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addColumn}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-red-300 hover:text-red-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm cột
            </button>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-red-300 hover:text-red-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm hàng
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            {/* Header row */}
            <thead>
              <tr className="bg-slate-100">
                {headerFields.map((hField, colIdx) => (
                  <th key={hField.id} className="min-w-[140px] border-r border-slate-200 px-2 py-2 last:border-r-0">
                    <div className="flex items-center gap-1">
                      <input
                        {...register(`headers.${colIdx}.val`)}
                        placeholder={`Tiêu đề ${colIdx + 1}`}
                        className="min-w-0 flex-1 bg-transparent text-center text-xs font-semibold text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400"
                      />
                      {headerFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(colIdx)}
                          className="shrink-0 text-slate-300 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                {/* Row actions column header */}
                <th className="w-8 bg-slate-100 px-1" />
              </tr>
            </thead>

            <tbody>
              {rowFields.map((rowField, rowIdx) => (
                <tr key={rowField.id} className="group border-t border-slate-200 hover:bg-slate-50">
                  {Array.from({ length: colCount }, (_, cellIdx) => {
                    const cell: TableCell | undefined =
                      rows?.[rowIdx]?.cells?.[cellIdx];
                    const isBlank = cell?.type === 'blank';

                    return (
                      <td
                        key={cellIdx}
                        className={`border-r border-slate-200 px-2 py-1.5 last:border-r-0 ${
                          isBlank ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          {/* Cell value input */}
                          <div className="flex items-center gap-1">
                            <input
                              {...register(`rows.${rowIdx}.cells.${cellIdx}.val`)}
                              placeholder={isBlank ? '(ô trống)' : 'Nội dung ô'}
                              disabled={isBlank}
                              className={`min-w-0 flex-1 rounded px-2 py-1 text-xs outline-none transition ${
                                isBlank
                                  ? 'cursor-not-allowed bg-blue-100 text-blue-400 placeholder:text-blue-300'
                                  : 'bg-white text-slate-700 placeholder:text-slate-400 focus:ring-1 focus:ring-red-300'
                              }`}
                            />
                            {/* Toggle blank button */}
                            <button
                              type="button"
                              title={isBlank ? 'Chuyển về ô văn bản' : 'Đặt thành ô cần điền'}
                              onClick={() => toggleCell(rowIdx, cellIdx)}
                              className={`shrink-0 transition ${
                                isBlank ? 'text-blue-500' : 'text-slate-300 hover:text-blue-400'
                              }`}
                            >
                              {isBlank
                                ? <ToggleRight className="h-4 w-4" />
                                : <ToggleLeft className="h-4 w-4" />}
                            </button>
                          </div>

                          {/* Answer input (only when blank) */}
                          {isBlank && (
                            <input
                              {...register(`rows.${rowIdx}.cells.${cellIdx}.answer`)}
                              placeholder="Đáp án đúng..."
                              className="w-full rounded border border-blue-300 bg-white px-2 py-1 text-xs text-blue-700 outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-blue-300"
                            />
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {/* Remove row */}
                  <td className="w-8 px-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(rowIdx)}
                      className="text-slate-300 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {rowFields.length === 0 && (
                <tr>
                  <td
                    colSpan={colCount + 1}
                    className="py-8 text-center text-sm text-slate-400"
                  >
                    Chưa có hàng nào. Nhấn "Thêm hàng".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-xs text-slate-400">
          Nhấn vào biểu tượng{' '}
          <ToggleLeft className="inline h-3.5 w-3.5 align-text-bottom" />{' '}
          trong ô để biến ô đó thành <span className="font-semibold text-blue-500">ô cần điền</span>.
          Sau đó nhập đáp án đúng ngay bên dưới ô đó.
        </p>
      </div>

      {/* Explanation */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Giải thích{' '}
          <span className="text-xs font-normal text-slate-400">(tuỳ chọn)</span>
        </label>
        <textarea
          {...register('explanation')}
          rows={2}
          placeholder="Giải thích cách điền bảng..."
          className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
        />
      </div>
    </div>
  );
}
