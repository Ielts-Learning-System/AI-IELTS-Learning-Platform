import React, { useCallback, useEffect, useRef } from 'react';
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
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  borderColor?: string; // tailwind border class e.g. 'border-slate-300'
  focusBorderColor?: string; // tailwind focus border class e.g. 'focus:border-red-300'
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
    // Emit updated html
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
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
                  e.preventDefault(); // Prevents blur on editor
                  execCmd(btn.cmd, btn.arg);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
              >
                {btn.icon}
              </button>
            ))}
          </React.Fragment>
        ))}
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
          empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
        style={{ minHeight }}
      />
    </div>
  );
}
