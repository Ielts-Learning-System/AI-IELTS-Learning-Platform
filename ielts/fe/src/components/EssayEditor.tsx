import { useCallback, useEffect, useRef } from 'react';
import { MessageCircle, HighlighterIcon, Undo2 } from 'lucide-react';

interface Props {
  originalContent: string;
  /** HTML string representing teacher-edited/annotated version */
  value: string;
  onChange: (html: string) => void;
  className?: string;
}

// Escape text so it's safe to insert inside HTML attributes / text nodes
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build the initial HTML for the editor.
 * Each "word-like chunk" of the original text is wrapped in a protected span.
 * The teacher cannot delete these spans but can insert new content (shown in red)
 * between / after them, and can highlight selected original text.
 */
function buildProtectedHtml(originalText: string): string {
  if (!originalText) return '';

  // Split on whitespace boundaries, keeping the delimiter (space/newline) attached
  // so paragraphs / line breaks are respected visually.
  const lines = originalText.split(/\n/);

  const paragraphs = lines.map((line) => {
    if (!line.trim()) {
      // blank line → paragraph break
      return `<p><br></p>`;
    }

    const words = line.split(/(\s+)/);
    const spans = words
      .map((chunk) => {
        if (/^\s+$/.test(chunk)) {
          // whitespace — keep as-is so spacing is preserved
          return chunk.replace(/ /g, '&nbsp;');
        }
        return `<span data-original="true" style="color:#1e293b;user-select:text;" contenteditable="false">${escapeHtml(chunk)}</span>`;
      })
      .join('');

    return `<p>${spans}</p>`;
  });

  return paragraphs.join('');
}

/**
 * Serialize the editor's current DOM back to a storable HTML string.
 * We preserve both original spans and any teacher additions/highlights.
 */
function serializeEditor(el: HTMLDivElement): string {
  return el.innerHTML;
}

export default function EssayEditor({ originalContent, value, onChange, className = '' }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // --- Initial setup: render protected HTML only once ---
  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      // If we already have a teacher-edited version, use it directly
      if (value && value.includes('data-original')) {
        editorRef.current.innerHTML = value;
      } else {
        editorRef.current.innerHTML = buildProtectedHtml(originalContent);
        // Notify parent about the initial HTML
        onChange(serializeEditor(editorRef.current));
      }
      initializedRef.current = true;
    }
  }, []);

  // --- Keep editor in sync when parent resets (e.g., submission change) ---
  useEffect(() => {
    if (!initializedRef.current) return;
    // Only reset if value is empty (parent cleared state)
    if (!value && editorRef.current) {
      editorRef.current.innerHTML = buildProtectedHtml(originalContent);
      initializedRef.current = true;
    }
  }, [value, originalContent]);

  // --- Handle input: style newly typed characters as red ---
  const handleInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(serializeEditor(editor));
  }, [onChange]);

  // --- On keydown: wrap newly typed characters in a red <span> ---
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    // If it's a printable character (not ctrl/meta combos), wrap insertion in red span
    if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      e.preventDefault();
      const redSpan = document.createElement('span');
      redSpan.style.color = '#E31837';
      redSpan.style.fontWeight = '500';
      redSpan.setAttribute('data-teacher', 'true');
      redSpan.textContent = e.key;

      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(redSpan);

      // Move cursor after the newly inserted span
      const newRange = document.createRange();
      newRange.setStartAfter(redSpan);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);

      onChange(serializeEditor(editor));
    } else if (e.key === 'Enter') {
      // Allow Enter to create new lines with red color
      e.preventDefault();
      const br = document.createElement('span');
      br.setAttribute('data-teacher', 'true');
      br.style.color = '#E31837';
      br.innerHTML = '<br>';

      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(br);

      const newRange = document.createRange();
      newRange.setStartAfter(br);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);

      onChange(serializeEditor(editor));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      // Prevent deletion of original spans
      const range = sel.getRangeAt(0);
      const container = range.startContainer;

      // Check if cursor is right before/inside a protected span
      const nearestSpan = (container instanceof HTMLElement ? container : container.parentElement);
      if (nearestSpan?.closest('[data-original="true"]')) {
        e.preventDefault();
        return;
      }

      // Check if the previous sibling is a protected span (backspace would eat it)
      if (e.key === 'Backspace' && range.collapsed) {
        const parentEl = container instanceof HTMLElement ? container : container.parentElement;
        if (parentEl && range.startOffset === 0) {
          // At the start of a text node — check if previous sibling is protected
          const prev = container.previousSibling ?? parentEl.previousSibling;
          if (prev instanceof HTMLElement && prev.dataset.original === 'true') {
            e.preventDefault();
            return;
          }
        }
      }
    }
  }, [onChange]);

  // --- Highlight selected original text in yellow ---
  const handleHighlight = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

    const range = sel.getRangeAt(0);

    // Wrap selected content in a highlight span
    const highlight = document.createElement('mark');
    highlight.style.backgroundColor = 'rgba(254, 240, 138, 0.8)';
    highlight.style.borderRadius = '3px';
    highlight.style.padding = '0 2px';
    highlight.setAttribute('data-teacher-highlight', 'true');

    try {
      range.surroundContents(highlight);
    } catch {
      // If selection spans multiple elements, just wrap what we can
      const fragment = range.extractContents();
      highlight.appendChild(fragment);
      range.insertNode(highlight);
    }

    sel.removeAllRanges();
    onChange(serializeEditor(editor));
  }, [onChange]);

  // --- Insert inline comment ---
  const handleComment = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const commentText = window.prompt('Nhập comment của giáo viên:');
    if (!commentText) return;

    const range = sel.getRangeAt(0);
    const commentSpan = document.createElement('span');
    commentSpan.setAttribute('data-teacher-comment', 'true');
    commentSpan.style.cssText =
      'background:#fef2f2;color:#E31837;border:1px solid #fca5a5;border-radius:4px;padding:1px 6px;font-size:0.85em;font-weight:600;margin:0 2px;cursor:default;';
    commentSpan.contentEditable = 'false';
    commentSpan.title = commentText;
    commentSpan.textContent = `💬 ${commentText}`;

    range.collapse(false);
    range.insertNode(commentSpan);

    const newRange = document.createRange();
    newRange.setStartAfter(commentSpan);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);

    onChange(serializeEditor(editor));
  }, [onChange]);

  // --- Reset editor to original content ---
  const handleReset = useCallback(() => {
    if (!editorRef.current) return;
    if (!window.confirm('Xoá tất cả chỉnh sửa và quay về bài gốc của học viên?')) return;
    editorRef.current.innerHTML = buildProtectedHtml(originalContent);
    onChange(serializeEditor(editorRef.current));
  }, [originalContent, onChange]);

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-red-100 bg-red-50/60 px-3 py-2 rounded-t-[22px]">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-400 mr-2">
          Công cụ giáo viên
        </span>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); handleHighlight(); }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
          title="Highlight đoạn văn đang chọn"
        >
          <HighlighterIcon className="h-3 w-3" />
          Highlight
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); handleComment(); }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-50"
          title="Chèn comment vào vị trí con trỏ"
        >
          <MessageCircle className="h-3 w-3" />
          Comment
        </button>
        <div className="ml-auto">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleReset(); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-red-500"
            title="Khôi phục bài gốc"
          >
            <Undo2 className="h-3 w-3" />
            Khôi phục gốc
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-b border-red-50 bg-slate-50/80 px-4 py-1.5 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-800" />
          Bài gốc (không thể xoá)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#E31837]" />
          Chú thích của giáo viên
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-300" />
          Highlight
        </span>
      </div>

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        data-placeholder="Bài làm của học viên sẽ hiển thị ở đây. Bạn có thể thêm chú thích, highlight hoặc bình luận..."
        className="flex-1 overflow-y-auto rounded-b-[22px] px-5 py-4 text-[15px] leading-8 text-slate-800 outline-none
          empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300 empty:before:pointer-events-none
          focus:ring-4 focus:ring-red-100 focus:border-red-200"
        style={{ minHeight: 'inherit' }}
      />
    </div>
  );
}
