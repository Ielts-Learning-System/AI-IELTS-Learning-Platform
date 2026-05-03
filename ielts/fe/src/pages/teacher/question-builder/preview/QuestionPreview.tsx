// ─────────────────────────────────────────────────────────────────────────────
// QuestionPreview – live read-only render of what a student sees
// ─────────────────────────────────────────────────────────────────────────────

import type { QuestionType, TextMediaValues, ComplexTableValues, TableCell } from '../types';

interface PreviewProps {
  questionType: QuestionType;
  data: Partial<TextMediaValues & ComplexTableValues>;
}

function OptionItem({
  letter,
  text,
  isCorrect,
}: {
  letter: string;
  text: string;
  isCorrect: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm ${
        isCorrect
          ? 'bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-emerald-300'
          : 'bg-slate-50 text-slate-700'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
        }`}
      >
        {letter}
      </span>
      <span className="leading-relaxed">{text || <em className="opacity-40">Chưa nhập</em>}</span>
    </div>
  );
}

function TablePreview({ data }: { data: Partial<ComplexTableValues> }) {
  const headers = data.headers ?? [];
  const rows    = data.rows    ?? [];

  if (!headers.length && !rows.length) {
    return <p className="text-sm italic text-slate-400">Chưa có dữ liệu bảng</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="border-r border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600 last:border-r-0">
                {h.val || `Cột ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-t border-slate-200">
              {row.cells.map((cell: TableCell, cellIdx: number) => (
                <td
                  key={cellIdx}
                  className={`border-r border-slate-200 px-3 py-2 last:border-r-0 ${
                    cell.type === 'blank' ? 'bg-blue-50' : ''
                  }`}
                >
                  {cell.type === 'blank' ? (
                    <span className="inline-block min-w-[80px] rounded border-b-2 border-blue-400 px-2 py-0.5 text-center text-xs text-blue-400">
                      _________
                    </span>
                  ) : (
                    <span className="text-slate-700">{cell.val}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function QuestionPreview({ questionType, data }: PreviewProps) {
  const questionText = data.questionText ?? '';
  const options      = data.options ?? [];
  const correctAnswer = data.correctAnswer ?? '';
  const explanation  = data.explanation ?? '';
  const mediaUrl     = data.mediaUrl ?? '';
  const mediaType    = data.mediaType ?? 'none';

  return (
    <div className="space-y-4 text-slate-800">
      {/* Badge */}
      <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600">
        {questionType}
      </span>

      {/* Media */}
      {mediaType === 'image' && mediaUrl && (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <img
            src={mediaUrl}
            alt="question media"
            className="max-h-56 w-full object-contain"
          />
        </div>
      )}
      {mediaType === 'audio' && mediaUrl && (
        <audio src={mediaUrl} controls className="w-full rounded-xl" />
      )}

      {/* Question text */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
        {questionText || <span className="italic text-slate-400">Chưa có nội dung câu hỏi</span>}
      </p>

      {/* Options */}
      {questionType !== 'TABLE_COMPLETION' && questionType !== 'DRAG_DROP' && (
        <div className="space-y-2">
          {options.length === 0 && (
            <p className="text-sm italic text-slate-400">Chưa có đáp án nào</p>
          )}
          {options.map((opt, i) => (
            <OptionItem
              key={i}
              letter={String.fromCharCode(65 + i)}
              text={opt.value}
              isCorrect={correctAnswer !== '' && opt.value === correctAnswer}
            />
          ))}
        </div>
      )}

      {/* Table preview */}
      {(questionType === 'TABLE_COMPLETION' || questionType === 'DRAG_DROP') && (
        <TablePreview data={data} />
      )}

      {/* Explanation */}
      {explanation && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <span className="font-semibold">Giải thích: </span>
          {explanation}
        </div>
      )}
    </div>
  );
}
