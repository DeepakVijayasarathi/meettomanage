import { useEffect, useRef, useState } from "react";
import { PartyPopper, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiWhiteboardActivity, ApiWhiteboardActivityItem } from "@/api/whiteboardActivities";

interface WhiteboardActivityProps {
  /** This class's resolved activity bank — the admin-authored Activity Bank for its course
   *  (falling back to the department-wide set), fetched once by InteractivePanel. Empty when
   *  nothing has been configured yet for this course/department. */
  activities: ApiWhiteboardActivity[];
  mode: "teacher" | "student";
  onClose: () => void;
  onAllMatched?: () => void;
}

/**
 * Interactive activity layer over the whiteboard: drag & drop, tap-to-pair tag & match, and
 * hotspot click — each fires the celebration on completion. Content is entirely admin-authored
 * (Admin → Academics → Activity Bank), scoped by department/course, replacing what used to be
 * one hardcoded fruit/letter set (and a fixed "sh" sound hotspot game) every class shared
 * regardless of subject or grade.
 */
export default function WhiteboardActivity({ activities, mode, onClose, onAllMatched }: WhiteboardActivityProps) {
  const [activeId, setActiveId] = useState(activities[0]?.id);
  const active = activities.find((a) => a.id === activeId) ?? activities[0];

  useEffect(() => {
    // The bank can arrive after this panel is already open (a slow fetch) — pick the first
    // activity once it lands instead of staying stuck on an undefined selection forever.
    if (!activeId && activities.length > 0) setActiveId(activities[0].id);
  }, [activities, activeId]);

  return (
    <div className="absolute inset-x-4 top-4 z-20 rounded-2xl border border-border bg-card/95 p-4 shadow-pop backdrop-blur animate-pop-in sm:inset-x-10">
      <div className="mb-3 flex items-center justify-between gap-2">
        {activities.length > 1 ? (
          <div className="flex flex-1 items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1">
            {activities.map((a) => (
              <button
                key={a.id}
                onClick={() => setActiveId(a.id)}
                aria-pressed={active?.id === a.id}
                className={cn(
                  "shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active?.id === a.id ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {a.prompt}
              </button>
            ))}
          </div>
        ) : (
          <p className="flex-1 truncate text-sm font-semibold text-foreground">{active?.prompt}</p>
        )}
        <button
          onClick={onClose}
          aria-label="Close activity"
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!active ? (
        <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-foreground">No activities yet</p>
          <p className="max-w-[220px] text-xs text-muted-foreground">
            {mode === "teacher"
              ? "This course has no whiteboard activities configured — add some in Admin → Academics → Activity Bank."
              : "Your teacher hasn't set up any whiteboard activities for this class yet."}
          </p>
        </div>
      ) : active.mode === "DragDrop" ? (
        <DragDropActivity key={active.id} items={active.items} onComplete={onAllMatched} />
      ) : active.mode === "TagMatch" ? (
        <TagMatchActivity key={active.id} items={active.items} onComplete={onAllMatched} />
      ) : (
        <HotspotActivity key={active.id} prompt={active.prompt} items={active.items} onComplete={onAllMatched} />
      )}

      <style>{`
        @keyframes wiggle { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
      `}</style>
    </div>
  );
}

function Complete({ message }: { message: string }) {
  // The button grid this replaces is gone the instant the last match completes — the
  // button a keyboard user just activated is unmounted with it, dropping focus to
  // <body> with no announcement of what happened. tabIndex + the focus-on-mount effect
  // land focus here instead; role="status" announces the text to a screen reader either way.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div ref={ref} tabIndex={-1} role="status" className="flex items-center justify-center gap-2 py-4 text-success focus:outline-none">
      <PartyPopper className="h-5 w-5" />
      <p className="text-sm font-semibold">{message}</p>
    </div>
  );
}

interface ModeActivityProps {
  items: ApiWhiteboardActivityItem[];
  onComplete?: () => void;
}

/**
 * Pointer-events based drag & drop — native HTML5 DnD (draggable/onDragStart/onDrop)
 * has no touch equivalent and simply never fires on a tablet, which is this app's
 * plausible primary student device. Pointer events fire uniformly for mouse, touch
 * and pen, matching the pattern Whiteboard.tsx's own canvas already uses.
 */
function DragDropActivity({ items, onComplete }: ModeActivityProps) {
  const [matched, setMatched] = useState<Record<string, boolean>>({});
  const [shake, setShake] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // Click/keyboard alternative to the pointer drag below — select an item, then pick its
  // match. Same underlying match logic, so both paths stay in sync.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const allMatched = items.every((item) => matched[item.id]);
  const draggingItem = items.find((i) => i.id === draggingId);

  useEffect(() => {
    if (allMatched && items.length > 0) onComplete?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatched]);

  function resolveDropTarget(clientX: number, clientY: number): string | null {
    const el = document.elementFromPoint(clientX, clientY);
    return el?.closest<HTMLElement>("[data-drop-id]")?.dataset.dropId ?? null;
  }

  function attemptMatch(itemId: string, targetId: string | null) {
    if (!targetId || targetId !== itemId || matched[itemId]) {
      if (targetId && targetId !== itemId) {
        setShake(itemId);
        setTimeout(() => setShake(null), 450);
      }
      return;
    }
    setMatched((prev) => ({ ...prev, [itemId]: true }));
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>, itemId: string) {
    if (matched[itemId]) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingId(itemId);
    setDragPos({ x: e.clientX, y: e.clientY });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingId) return;
    setDragPos({ x: e.clientX, y: e.clientY });
    setOverId(resolveDropTarget(e.clientX, e.clientY));
  }

  function endDrag(e: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingId) return;
    attemptMatch(draggingId, resolveDropTarget(e.clientX, e.clientY));
    setDraggingId(null);
    setDragPos(null);
    setOverId(null);
  }

  function selectForKeyboard(itemId: string) {
    setSelectedId((prev) => (prev === itemId ? null : itemId));
  }

  function chooseTarget(targetId: string) {
    if (!selectedId) return;
    attemptMatch(selectedId, targetId);
    setSelectedId(null);
  }

  if (items.length === 0) return null;
  if (allMatched) return <Complete message="All matched — great job!" />;

  return (
    <>
      <p className="mb-3 text-sm font-semibold">
        🎯 Drag each piece to its match — or tap a piece, then tap its match
      </p>
      <div className="mb-4 flex flex-wrap justify-center gap-3">
        {items.filter((item) => !matched[item.id]).map((item) => (
          <button
            key={item.id}
            type="button"
            onPointerDown={(e) => handlePointerDown(e, item.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClick={() => selectForKeyboard(item.id)}
            aria-pressed={selectedId === item.id}
            aria-label={`${item.emoji}, matches ${item.label}`}
            className={cn(
              "touch-none select-none rounded-xl bg-muted p-2.5 text-3xl leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
              draggingId === item.id ? "cursor-grabbing opacity-30" : "cursor-grab",
              selectedId === item.id && "ring-2 ring-primary scale-110",
              shake === item.id && "animate-[wiggle_0.45s_ease-in-out] ring-2 ring-destructive"
            )}
          >
            {item.emoji}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            data-drop-id={item.id}
            onClick={() => chooseTarget(item.id)}
            disabled={matched[item.id]}
            aria-label={`Match ${item.label}${matched[item.id] ? `, matched with ${item.emoji}` : ""}`}
            className={cn(
              "flex h-14 min-w-14 items-center justify-center rounded-xl border-2 border-dashed px-2 text-lg font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              matched[item.id]
                ? "border-success bg-success/10 text-success"
                : overId === item.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary"
            )}
          >
            {matched[item.id] ? item.emoji : item.label}
          </button>
        ))}
      </div>

      {draggingItem && dragPos && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 text-4xl leading-none drop-shadow-lg"
          style={{ left: dragPos.x - 22, top: dragPos.y - 22 }}
        >
          {draggingItem.emoji}
        </div>
      )}
    </>
  );
}

function TagMatchActivity({ items, onComplete }: ModeActivityProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [paired, setPaired] = useState<Record<string, boolean>>({});
  const [shake, setShake] = useState<string | null>(null);
  const allPaired = items.every((item) => paired[item.id]);

  useEffect(() => {
    if (allPaired && items.length > 0) onComplete?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPaired]);

  function tagTarget(targetId: string) {
    if (!selectedItemId) return;
    if (selectedItemId === targetId) {
      setPaired((prev) => ({ ...prev, [selectedItemId]: true }));
      setSelectedItemId(null);
    } else {
      setShake(targetId);
      setTimeout(() => setShake(null), 450);
    }
  }

  if (items.length === 0) return null;
  if (allPaired) return <Complete message="Every pair tagged — brilliant!" />;

  return (
    <>
      <p className="mb-3 text-sm font-semibold">🏷️ Tap a piece, then tap its matching pair</p>
      <div className="mb-4 flex flex-wrap justify-center gap-3">
        {items.filter((item) => !paired[item.id]).map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedItemId(item.id)}
            aria-pressed={selectedItemId === item.id}
            className={cn(
              "rounded-xl bg-muted p-2.5 text-3xl leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedItemId === item.id && "ring-2 ring-primary scale-110"
            )}
          >
            {item.emoji}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => tagTarget(item.id)}
            disabled={paired[item.id]}
            className={cn(
              "flex h-14 min-w-14 items-center justify-center rounded-xl border-2 px-2 text-lg font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              paired[item.id]
                ? "border-success bg-success/10 text-success"
                : "border-dashed border-border text-muted-foreground hover:border-primary",
              shake === item.id && "animate-[wiggle_0.45s_ease-in-out] border-destructive text-destructive"
            )}
          >
            {paired[item.id] ? item.emoji : item.label}
          </button>
        ))}
      </div>
    </>
  );
}

function HotspotActivity({ prompt, items, onComplete }: ModeActivityProps & { prompt: string }) {
  const [found, setFound] = useState<Record<string, boolean>>({});
  const [shake, setShake] = useState<string | null>(null);
  const targets = items.filter((h) => h.isTarget);
  const allFound = targets.length > 0 && targets.every((t) => found[t.id]);

  useEffect(() => {
    if (allFound) onComplete?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFound]);

  function clickSpot(id: string, isTarget: boolean) {
    if (found[id]) return;
    if (isTarget) {
      setFound((prev) => ({ ...prev, [id]: true }));
    } else {
      setShake(id);
      setTimeout(() => setShake(null), 450);
    }
  }

  if (items.length === 0) return null;
  if (allFound) return <Complete message="Found them all — amazing!" />;

  return (
    <>
      <p className="mb-3 text-sm font-semibold">
        🔍 {prompt} ({targets.filter((t) => found[t.id]).length}/{targets.length} found)
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {items.map((spot) => (
          <button
            key={spot.id}
            onClick={() => clickSpot(spot.id, spot.isTarget)}
            className={cn(
              "rounded-xl bg-muted p-2.5 text-3xl leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              found[spot.id] && "bg-success/15 ring-2 ring-success",
              shake === spot.id && "animate-[wiggle_0.45s_ease-in-out] ring-2 ring-destructive"
            )}
          >
            {spot.emoji}
          </button>
        ))}
      </div>
    </>
  );
}
