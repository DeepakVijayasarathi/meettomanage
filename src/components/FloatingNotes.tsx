import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { GripVertical, Plus, StickyNote, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiEnabled } from "@/lib/api";
import { getPublicSettings } from "@/api/settings";
import { createNote, deleteNote, listMyNotes, updateNote, type ApiFloatingNote, type SaveFloatingNoteRequest } from "@/api/notes";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

/** Must match the key the admin Settings & Branding → Widgets tab saves. */
const WIDGET_SETTING_KEY = "widgets.floatingNotes.enabledPortals";

const OPEN_KEY = "trn.notesWidget.open";
const POS_KEY = "trn.notesWidget.pos";
/** Demo mode (no API) has no signed-in user to scope notes to, so they just live in this browser. */
const DEMO_NOTES_KEY = "trn.notes.demo";

const NOTE_COLORS = ["#FDE68A", "#BFDBFE", "#BBF7D0", "#FBCFE8", "#DDD6FE"];
const PANEL_WIDTH = 288;

interface NoteRow {
  id: string;
  content: string;
  color: string | null;
  sortOrder: number;
}

function loadDemoNotes(): NoteRow[] {
  try {
    const raw = localStorage.getItem(DEMO_NOTES_KEY);
    return raw ? (JSON.parse(raw) as NoteRow[]) : [];
  } catch {
    return [];
  }
}

function saveDemoNotes(notes: NoteRow[]) {
  localStorage.setItem(DEMO_NOTES_KEY, JSON.stringify(notes));
}

function toRow(note: ApiFloatingNote): NoteRow {
  return { id: note.id, content: note.content, color: note.color, sortOrder: note.sortOrder };
}

function toRequest(note: NoteRow): SaveFloatingNoteRequest {
  return { content: note.content, color: note.color, sortOrder: note.sortOrder };
}

/**
 * Per-user floating sticky notes, mounted once in AppShell so it floats above every
 * portal. Visibility is admin-configured per portal (Settings & Branding → Widgets);
 * note content itself is always private to the signed-in user (scoped server-side by
 * their user id — see FloatingNotesController).
 */
export function FloatingNotes({ role }: { role: Role }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(() => localStorage.getItem(OPEN_KEY) === "1");
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      return raw ? (JSON.parse(raw) as { x: number; y: number }) : null;
    } catch {
      return null;
    }
  });

  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Widget visibility is a public setting (readable by any signed-in role without a
  // permission check) so every portal can gate on it without hitting Settings.View.
  useEffect(() => {
    if (!apiEnabled()) {
      // Demo mode has no backend to ask — show the widget everywhere, like the rest
      // of the app's demo fallback (see loadBrandingFromApi in lib/branding.ts).
      setEnabled(true);
      return;
    }
    let cancelled = false;
    getPublicSettings()
      .then((settings) => {
        if (cancelled) return;
        const row = settings.find((s) => s.key === WIDGET_SETTING_KEY);
        if (!row?.value) {
          // Not configured yet (admin never saved the Widgets tab) — default to on.
          setEnabled(true);
          return;
        }
        try {
          const enabledPortals = JSON.parse(row.value) as string[];
          setEnabled(enabledPortals.includes(role));
        } catch {
          setEnabled(true);
        }
      })
      .catch(() => {
        if (!cancelled) setEnabled(true);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    if (!open || loaded) return;
    if (apiEnabled()) {
      listMyNotes()
        .then((list) => setNotes(list.map(toRow)))
        .catch(() => setNotes([]))
        .finally(() => setLoaded(true));
    } else {
      setNotes(loadDemoNotes());
      setLoaded(true);
    }
  }, [open, loaded]);

  useEffect(() => {
    localStorage.setItem(OPEN_KEY, open ? "1" : "0");
  }, [open]);

  function persistPos(next: { x: number; y: number }) {
    setPos(next);
    localStorage.setItem(POS_KEY, JSON.stringify(next));
  }

  function onDragPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, originX: rect.left, originY: rect.top };
  }

  function onDragPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    const { startX, startY, originX, originY } = dragState.current;
    const maxX = Math.max(window.innerWidth - PANEL_WIDTH - 8, 0);
    const maxY = Math.max(window.innerHeight - 120, 0);
    persistPos({
      x: Math.min(Math.max(originX + (e.clientX - startX), 0), maxX),
      y: Math.min(Math.max(originY + (e.clientY - startY), 0), maxY),
    });
  }

  function onDragPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    dragState.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  async function addNote() {
    const draft: NoteRow = {
      id: crypto.randomUUID(),
      content: "",
      color: NOTE_COLORS[notes.length % NOTE_COLORS.length],
      sortOrder: notes.length,
    };
    if (apiEnabled()) {
      try {
        const created = await createNote(toRequest(draft));
        setNotes((prev) => [...prev, toRow(created)]);
      } catch {
        /* leave the list as-is; nothing to roll back since nothing was added locally */
      }
    } else {
      const next = [...notes, draft];
      setNotes(next);
      saveDemoNotes(next);
    }
  }

  function editNote(id: string, content: string) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, content } : n)));
  }

  async function persistNote(note: NoteRow) {
    if (apiEnabled()) {
      try {
        await updateNote(note.id, toRequest(note));
      } catch {
        /* keep the local edit even if the save failed; next successful save will catch up */
      }
    } else {
      saveDemoNotes(notes.map((n) => (n.id === note.id ? note : n)));
    }
  }

  function recolorNote(note: NoteRow, color: string) {
    const updated = { ...note, color };
    setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
    void persistNote(updated);
  }

  async function removeNote(id: string) {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    if (apiEnabled()) {
      try {
        await deleteNote(id);
      } catch {
        /* note stays removed locally; a stale server row is harmless until next load */
      }
    } else {
      saveDemoNotes(next);
    }
  }

  if (enabled !== true) return null;

  return (
    <>
      {/* bottom-20 on mobile (vs. the sm:bottom-6 used everywhere else on desktop): extra
          clearance on the tightest viewports, where a page's primary action button is most
          likely to sit right at the visible bottom-right corner. AppShell's main reserves
          matching (and then some) bottom padding so this never sits on top of page content —
          see the comment there for why that padding is generous rather than exact. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
        aria-label={open ? "Close my notes" : "Open my notes"}
      >
        <StickyNote className="h-5 w-5" />
      </button>

      {open && (
        <Card
          ref={panelRef}
          className={cn("fixed z-50 flex flex-col overflow-hidden shadow-xl", !pos && "bottom-36 right-4 sm:bottom-[88px] sm:right-6")}
          style={{ width: PANEL_WIDTH, ...(pos ? { left: pos.x, top: pos.y } : {}) }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
            {/* Only this label area is a drag handle — action buttons live outside it so a
                pointerdown on them doesn't bubble into setPointerCapture and swallow their click. */}
            <span
              className="flex flex-1 cursor-grab items-center gap-1.5 text-xs font-semibold text-foreground active:cursor-grabbing"
              onPointerDown={onDragPointerDown}
              onPointerMove={onDragPointerMove}
              onPointerUp={onDragPointerUp}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" /> My Notes
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={addNote} aria-label="Add note">
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto p-3">
            {loaded && notes.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">No notes yet — add one.</p>
            )}
            {notes.map((note) => (
              <div key={note.id} className="rounded-lg border border-border/60 p-2" style={{ backgroundColor: `${note.color ?? NOTE_COLORS[0]}33` }}>
                <Textarea
                  value={note.content}
                  onChange={(e) => editNote(note.id, e.target.value)}
                  onBlur={() => void persistNote(note)}
                  placeholder="Write a note…"
                  className="min-h-[60px] resize-none border-none bg-transparent p-1 text-xs shadow-none focus-visible:ring-0"
                />
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex gap-1">
                    {NOTE_COLORS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => recolorNote(note, hex)}
                        className={cn("h-3.5 w-3.5 rounded-full border", note.color === hex ? "border-foreground" : "border-transparent")}
                        style={{ backgroundColor: hex }}
                        aria-label={`Color note ${hex}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeNote(note.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
