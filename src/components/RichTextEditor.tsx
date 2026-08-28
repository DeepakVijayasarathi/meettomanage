import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Link2Off,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TEXT_COLORS = ["#0F172A", "#DC2626", "#EA580C", "#16A34A", "#0284C7", "#7C3AED", "#FFFFFF"];
// A hex code alone ("title=#DC2626") isn't a meaningful accessible name when announced —
// this backs both `title` and `aria-label` with a real color word instead.
const TEXT_COLOR_NAMES: Record<string, string> = {
  "#0F172A": "Ink",
  "#DC2626": "Red",
  "#EA580C": "Orange",
  "#16A34A": "Green",
  "#0284C7": "Blue",
  "#7C3AED": "Violet",
  "#FFFFFF": "White",
};

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ToolbarButton({ label, active, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      // mousedown (not click) so the editor's text selection survives the click —
      // a click handler fires after mouseup/blur has already collapsed it, which
      // would make every toolbar button apply to nothing.
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      // Keyboard activation (Enter/Space) never goes through mousedown at all, so
      // without this a keyboard user tabbing to any toolbar button could type but never
      // apply a single format — exec()'s own editorRef.focus() re-targets the editor
      // correctly either way, and Tab-driven blur (unlike a raw pointer mousedown)
      // doesn't collapse the selection, so this doesn't need the same preventDefault dance.
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-primary/10 text-primary"
      )}
    >
      {children}
    </button>
  );
}

interface RichTextEditorProps {
  /** HTML string — the single source of truth (shared with any raw-HTML edit view). */
  value: string;
  onChange: (html: string) => void;
  onFocus?: () => void;
  minHeight?: number;
  className?: string;
}

export interface RichTextEditorHandle {
  /** Inserts plain text at the caret — falls back to appending at the end if the
   *  editor lost focus/selection since (e.g. the caller is a toolbar button
   *  outside the editor, which blurs it on click). */
  insertText: (text: string) => void;
}

/**
 * Minimal WYSIWYG editor for the email template body: format visually instead of
 * hand-writing HTML tags, while still producing the same plain HTML string the
 * raw "Edit HTML" tab and the backend both work with — same `value`/`onChange`
 * contract, so both views of the same template stay in sync.
 *
 * Deliberately dependency-free (document.execCommand) rather than pulling in a
 * rich-text library: the formatting surface a system email needs (bold, links,
 * lists, headings, color, alignment) is small and stable, and execCommand,
 * despite being long-deprecated, is still universally supported for exactly
 * this scope in every browser this admin screen needs to run in.
 */
export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(function RichTextEditor(
  { value, onChange, onFocus, minHeight = 360, className },
  ref
) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isFocused = useRef(false);
  // Selection at the moment the editor lost focus — restored before an insert so
  // "click a placeholder chip" (which blurs the editor first) still lands where
  // the user was actually typing, not wherever the caret happens to default to.
  const savedRange = useRef<Range | null>(null);
  const [colorOpen, setColorOpen] = useState(false);

  // Only push `value` into the DOM when it changed from OUTSIDE this editor (a
  // template switch, or an edit made on the raw-HTML tab) — never while this
  // editor itself has focus, which would reset innerHTML mid-keystroke and throw
  // the caret to the start of the field on every character typed.
  useEffect(() => {
    const el = editorRef.current;
    if (!el || isFocused.current) return;
    if (el.innerHTML !== value) el.innerHTML = value;
  }, [value]);

  function emitChange() {
    onChange(editorRef.current?.innerHTML ?? "");
  }

  function exec(command: string, arg?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    emitChange();
  }

  function handleLink() {
    const url = window.prompt("Link URL (e.g. https://meettomanage.cloud)");
    if (url) exec("createLink", url);
  }

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }

  useImperativeHandle(ref, () => ({
    insertText(text: string) {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      if (sel && savedRange.current) {
        sel.removeAllRanges();
        sel.addRange(savedRange.current);
      }
      document.execCommand("insertText", false, text);
      emitChange();
    },
  }));

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 p-1.5">
        <ToolbarButton label="Bold" onClick={() => exec("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => exec("italic")}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => exec("underline")}>
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton label="Heading 1" onClick={() => exec("formatBlock", "h1")}>
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Heading 2" onClick={() => exec("formatBlock", "h2")}>
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Heading 3" onClick={() => exec("formatBlock", "h3")}>
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Paragraph" onClick={() => exec("formatBlock", "p")}>
          <Pilcrow className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton label="Bullet list" onClick={() => exec("insertUnorderedList")}>
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton label="Align left" onClick={() => exec("justifyLeft")}>
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Align center" onClick={() => exec("justifyCenter")}>
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Align right" onClick={() => exec("justifyRight")}>
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton label="Link" onClick={handleLink}>
          <Link2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Remove link" onClick={() => exec("unlink")}>
          <Link2Off className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="relative">
          <ToolbarButton label="Text color" onClick={() => setColorOpen((o) => !o)}>
            <span className="h-3.5 w-3.5 rounded-full border border-border" style={{ background: "conic-gradient(#DC2626,#EA580C,#16A34A,#0284C7,#7C3AED,#DC2626)" }} />
          </ToolbarButton>
          {colorOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 flex gap-1 rounded-lg border border-border bg-card p-1.5 shadow-pop">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={TEXT_COLOR_NAMES[c] ?? c}
                  aria-label={`Text color: ${TEXT_COLOR_NAMES[c] ?? c}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    exec("foreColor", c);
                    setColorOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      exec("foreColor", c);
                      setColorOpen(false);
                    }
                  }}
                  className="h-5 w-5 rounded-full border border-border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton label="Clear formatting" onClick={() => exec("removeFormat")}>
          <Eraser className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      <style>{`
        .rte-surface h1 { font-size: 1.5rem; font-weight: 700; margin: 0.5em 0; }
        .rte-surface h2 { font-size: 1.25rem; font-weight: 700; margin: 0.5em 0; }
        .rte-surface h3 { font-size: 1.1rem; font-weight: 600; margin: 0.5em 0; }
        .rte-surface p { margin: 0.5em 0; }
        .rte-surface ul, .rte-surface ol { margin: 0.5em 0; padding-left: 1.5em; }
        .rte-surface a { color: #0284C7; text-decoration: underline; }
      `}</style>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onFocus={() => {
          isFocused.current = true;
          onFocus?.();
        }}
        onBlur={() => {
          isFocused.current = false;
          saveSelection();
        }}
        onClick={() => setColorOpen(false)}
        className="rte-surface overflow-y-auto bg-white p-3 text-sm text-slate-900 focus:outline-none"
        style={{ minHeight }}
      />
    </div>
  );
});
