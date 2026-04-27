import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  RotateCcw,
  RotateCw,
  Table,
  SquareDashed,
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  borderColor?: string;
  focusBorderColor?: string;
}

type FormatCmd =
  | 'bold' | 'italic' | 'underline'
  | 'formatBlock'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'undo' | 'redo';

interface ToolbarButton {
  title: string;
  icon: React.ReactNode;
  cmd: FormatCmd;
  arg?: string;
}

const TOOLBAR_GROUPS: ToolbarButton[][] = [
  [
    { title: 'Đậm (Ctrl+B)', icon: <Bold className="h-3.5 w-3.5" />, cmd: 'bold' },
    { title: 'Nghiêng (Ctrl+I)', icon: <Italic className="h-3.5 w-3.5" />, cmd: 'italic' },
    { title: 'Gạch chân (Ctrl+U)', icon: <Underline className="h-3.5 w-3.5" />, cmd: 'underline' },
  ],
  [
    { title: 'Tiêu đề lớn (H2)', icon: <Heading2 className="h-3.5 w-3.5" />, cmd: 'formatBlock', arg: 'h2' },
    { title: 'Tiêu đề nhỏ (H3)', icon: <Heading3 className="h-3.5 w-3.5" />, cmd: 'formatBlock', arg: 'h3' },
    { title: 'Đoạn văn', icon: <Minus className="h-3.5 w-3.5" />, cmd: 'formatBlock', arg: 'p' },
  ],
  [
    { title: 'Danh sách chấm', icon: <List className="h-3.5 w-3.5" />, cmd: 'insertUnorderedList' },
    { title: 'Danh sách số', icon: <ListOrdered className="h-3.5 w-3.5" />, cmd: 'insertOrderedList' },
    { title: 'Trích dẫn', icon: <Quote className="h-3.5 w-3.5" />, cmd: 'formatBlock', arg: 'blockquote' },
  ],
  [
    { title: 'Hoàn tác (Ctrl+Z)', icon: <RotateCcw className="h-3.5 w-3.5" />, cmd: 'undo' },
    { title: 'Làm lại (Ctrl+Y)', icon: <RotateCw className="h-3.5 w-3.5" />, cmd: 'redo' },
  ],
];

const MAX_ROWS = 8;
const MAX_COLS = 8;

/** Builds a bordered HTML table with empty cells */
function buildTableHtml(rows: number, cols: number): string {
  const cellStyle =
    'border:1px solid #cbd5e1;padding:6px 10px;min-width:60px;text-align:left;';
  const headerStyle =
    'border:1px solid #cbd5e1;padding:6px 10px;background:#f1f5f9;font-weight:600;text-align:left;';

  const headerRow = `<tr>${Array.from({ length: cols })
    .map(() => `<th style="${headerStyle}">&nbsp;</th>`)
    .join('')}</tr>`;

  const bodyRows = Array.from({ length: rows - 1 })
    .map(
      () =>
        `<tr>${Array.from({ length: cols })
          .map(() => `<td style="${cellStyle}">&nbsp;</td>`)
          .join('')}</tr>`
    )
    .join('');

  return `<table style="border-collapse:collapse;width:100%;margin:8px 0;">
<thead>${headerRow}</thead>
<tbody>${bodyRows}</tbody>
</table><p><br></p>`;
}

/** Table size picker dropdown */
function TablePicker({ onInsert }: { onInsert: (rows: number, cols: number) => void }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const label = hover ? `${hover.r} × ${hover.c}` : 'Bảng';

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        title="Chèn bảng"
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className="flex h-7 items-center gap-1 rounded-md px-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
      >
        <Table className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold leading-none">{label}</span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
          onMouseLeave={() => setHover(null)}
        >
          <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {hover ? `${hover.r} hàng × ${hover.c} cột` : 'Chọn kích thước bảng'}
          </p>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1fr)` }}
          >
            {Array.from({ length: MAX_ROWS }).map((_, ri) =>
              Array.from({ length: MAX_COLS }).map((_, ci) => {
                const isActive = hover && ri < hover.r && ci < hover.c;
                return (
                  <div
                    key={`${ri}-${ci}`}
                    onMouseEnter={() => setHover({ r: ri + 1, c: ci + 1 })}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onInsert(ri + 1, ci + 1);
                      setOpen(false);
                      setHover(null);
                    }}
                    className={`h-5 w-5 cursor-pointer rounded-sm border transition ${
                      isActive
                        ? 'border-blue-400 bg-blue-100'
                        : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MiniRichEditor({
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  minHeight = 200,
  borderColor = 'border-slate-300',
  focusBorderColor = 'focus-within:border-red-300',
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // Set initial HTML only on mount
  useEffect(() => {
    if (editorRef.current && !isInitializedRef.current) {
      editorRef.current.innerHTML = value || '';
      isInitializedRef.current = true;
    }
  }, []);

  // When parent resets value to empty string, clear editor
  useEffect(() => {
    if (!value && editorRef.current && isInitializedRef.current) {
      editorRef.current.innerHTML = '';
    }
  }, [value]);

  const execCmd = useCallback((cmd: FormatCmd, arg?: string) => {
    document.execCommand(cmd, false, arg);
    editorRef.current?.focus();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertTable = useCallback((rows: number, cols: number) => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, buildTableHtml(rows, cols));
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertBorderBox = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    const selectedText = sel && sel.rangeCount > 0 ? sel.toString() : '';
    const inner = selectedText.trim()
      ? selectedText
      : '\u00a0'; // non-breaking space so box is not empty
    const boxHtml =
      `<div style="border:2px solid #333;padding:15px;margin-bottom:20px;">${inner}</div><p><br></p>`;
    document.execCommand('insertHTML', false, boxHtml);
    onChange(editor.innerHTML);
  }, [onChange]);

  return (
    <div className={`overflow-hidden rounded-xl border ${borderColor} ${focusBorderColor} transition ring-0 focus-within:ring focus-within:ring-red-100`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        {TOOLBAR_GROUPS.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <span className="mx-1 h-4 w-px bg-slate-300" />}
            {group.map((btn) => (
              <button
                key={btn.title}
                type="button"
                title={btn.title}
                onMouseDown={(e) => {
                  e.preventDefault();
                  execCmd(btn.cmd, btn.arg);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
              >
                {btn.icon}
              </button>
            ))}
          </React.Fragment>
        ))}

        {/* Separator before table */}
        <span className="mx-1 h-4 w-px bg-slate-300" />
        <TablePicker onInsert={insertTable} />

        {/* Border box */}
        <button
          type="button"
          title="Chèn khung viền (border box)"
          onMouseDown={(e) => {
            e.preventDefault();
            insertBorderBox();
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
        >
          <SquareDashed className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className="prose prose-sm prose-slate max-w-none px-4 py-3 text-sm text-slate-800 outline-none leading-7
          [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-1
          [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1
          [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-500
          [&_ul]:list-disc [&_ul]:pl-5
          [&_ol]:list-decimal [&_ol]:pl-5
          [&_table]:w-full [&_table]:border-collapse [&_table]:my-2
          [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold
          [&_td]:border [&_td]:border-slate-300 [&_td]:px-2.5 [&_td]:py-1.5
          empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none
          [&_div[style*='border']]:rounded-sm"
        style={{ minHeight }}
      />
    </div>
  );
}
