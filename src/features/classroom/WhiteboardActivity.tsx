import { useEffect, useState } from "react";
import { PartyPopper, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FruitItem {
  id: string;
  emoji: string;
  letter: string;
}

const ITEMS: FruitItem[] = [
  { id: "apple", emoji: "🍎", letter: "A" },
  { id: "banana", emoji: "🍌", letter: "B" },
  { id: "grapes", emoji: "🍇", letter: "G" },
  { id: "orange", emoji: "🍊", letter: "O" },
];

const HOTSPOTS = [
  { id: "sun", emoji: "☀️", isTarget: false },
  { id: "ship", emoji: "🚢", isTarget: true },
  { id: "tree", emoji: "🌳", isTarget: false },
  { id: "shoe", emoji: "👟", isTarget: true },
  { id: "fish", emoji: "🐟", isTarget: false },
  { id: "sheep", emoji: "🐑", isTarget: true },
];

type ActivityMode = "dragdrop" | "tagmatch" | "hotspot";

const MODES: { id: ActivityMode; label: string }[] = [
  { id: "dragdrop", label: "Drag & Drop" },
  { id: "tagmatch", label: "Tag & Match" },
  { id: "hotspot", label: "Hotspot" },
];

interface WhiteboardActivityProps {
  onClose: () => void;
  onAllMatched?: () => void;
}

/** Interactive activity layer over the whiteboard: drag & drop, tap-to-pair
 * tag & match, and hotspot click — each fires the celebration on completion. */
export default function WhiteboardActivity({ onClose, onAllMatched }: WhiteboardActivityProps) {
  const [mode, setMode] = useState<ActivityMode>("dragdrop");

  return (
    <div className="absolute inset-x-4 top-4 z-20 rounded-2xl border border-border bg-card/95 p-4 shadow-pop backdrop-blur animate-pop-in sm:inset-x-10">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-xl bg-muted p-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                mode === m.id ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          aria-label="Close activity"
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {mode === "dragdrop" && <DragDropActivity key="dragdrop" onComplete={onAllMatched} />}
      {mode === "tagmatch" && <TagMatchActivity key="tagmatch" onComplete={onAllMatched} />}
      {mode === "hotspot" && <HotspotActivity key="hotspot" onComplete={onAllMatched} />}

      <style>{`
        @keyframes wiggle { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
      `}</style>
    </div>
  );
}

function Complete({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4 text-success">
      <PartyPopper className="h-5 w-5" />
      <p className="text-sm font-semibold">{message}</p>
    </div>
  );
}

/**
 * Pointer-events based drag & drop — native HTML5 DnD (draggable/onDragStart/onDrop)
 * has no touch equivalent and simply never fires on a tablet, which is this app's
 * plausible primary student device. Pointer events fire uniformly for mouse, touch
 * and pen, matching the pattern Whiteboard.tsx's own canvas already uses.
 */
function DragDropActivity({ onComplete }: { onComplete?: () => void }) {
  const [matched, setMatched] = useState<Record<string, boolean>>({});
  const [shake, setShake] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [overLetter, setOverLetter] = useState<string | null>(null);
  // Click/keyboard alternative to the pointer drag below — select a fruit, then
  // pick its letter. Same underlying match logic, so both paths stay in sync.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const allMatched = ITEMS.every((item) => matched[item.id]);
  const draggingItem = ITEMS.find((i) => i.id === draggingId);

  useEffect(() => {
    if (allMatched) onComplete?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatched]);

  function resolveDropLetter(clientX: number, clientY: number): string | null {
    const el = document.elementFromPoint(clientX, clientY);
    return el?.closest<HTMLElement>("[data-drop-letter]")?.dataset.dropLetter ?? null;
  }

  function attemptMatch(itemId: string, letter: string | null) {
    if (!letter) return;
    const item = ITEMS.find((i) => i.id === itemId);
    if (!item || matched[itemId]) return;
    if (item.letter === letter) {
      setMatched((prev) => ({ ...prev, [itemId]: true }));
    } else {
      setShake(itemId);
      setTimeout(() => setShake(null), 450);
    }
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
    setOverLetter(resolveDropLetter(e.clientX, e.clientY));
  }

  function endDrag(e: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingId) return;
    attemptMatch(draggingId, resolveDropLetter(e.clientX, e.clientY));
    setDraggingId(null);
    setDragPos(null);
    setOverLetter(null);
  }

  function selectForKeyboard(itemId: string) {
    setSelectedId((prev) => (prev === itemId ? null : itemId));
  }

  function chooseLetter(letter: string) {
    if (!selectedId) return;
    attemptMatch(selectedId, letter);
    setSelectedId(null);
  }

  if (allMatched) return <Complete message="All matched — great job!" />;

  return (
    <>
      <p className="mb-3 text-sm font-semibold">
        🎯 Drag the fruit to its matching first letter — or tap a fruit, then tap its letter
      </p>
      <div className="mb-4 flex flex-wrap justify-center gap-3">
        {ITEMS.filter((item) => !matched[item.id]).map((item) => (
          <button
            key={item.id}
            type="button"
            onPointerDown={(e) => handlePointerDown(e, item.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onClick={() => selectForKeyboard(item.id)}
            aria-pressed={selectedId === item.id}
            aria-label={`${item.emoji} fruit, starts with ${item.letter}`}
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
        {ITEMS.map((item) => (
          <button
            key={item.letter}
            type="button"
            data-drop-letter={item.letter}
            onClick={() => chooseLetter(item.letter)}
            disabled={matched[item.id]}
            aria-label={`Letter ${item.letter}${matched[item.id] ? `, matched with ${item.emoji}` : ""}`}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed text-lg font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              matched[item.id]
                ? "border-success bg-success/10 text-success"
                : overLetter === item.letter
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary"
            )}
          >
            {matched[item.id] ? item.emoji : item.letter}
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

function TagMatchActivity({ onComplete }: { onComplete?: () => void }) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [paired, setPaired] = useState<Record<string, boolean>>({});
  const [shake, setShake] = useState<string | null>(null);
  const allPaired = ITEMS.every((item) => paired[item.id]);

  useEffect(() => {
    if (allPaired) onComplete?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPaired]);

  function tagLetter(letter: string) {
    if (!selectedEmoji) return;
    const item = ITEMS.find((i) => i.id === selectedEmoji);
    if (!item) return;
    if (item.letter === letter) {
      setPaired((prev) => ({ ...prev, [item.id]: true }));
      setSelectedEmoji(null);
    } else {
      setShake(letter);
      setTimeout(() => setShake(null), 450);
    }
  }

  if (allPaired) return <Complete message="Every pair tagged — brilliant!" />;

  return (
    <>
      <p className="mb-3 text-sm font-semibold">🏷️ Tap a fruit, then tap its matching letter</p>
      <div className="mb-4 flex flex-wrap justify-center gap-3">
        {ITEMS.filter((item) => !paired[item.id]).map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedEmoji(item.id)}
            aria-pressed={selectedEmoji === item.id}
            className={cn(
              "rounded-xl bg-muted p-2.5 text-3xl leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selectedEmoji === item.id && "ring-2 ring-primary scale-110"
            )}
          >
            {item.emoji}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {ITEMS.map((item) => (
          <button
            key={item.letter}
            onClick={() => tagLetter(item.letter)}
            disabled={paired[item.id]}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl border-2 text-lg font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              paired[item.id]
                ? "border-success bg-success/10 text-success"
                : "border-dashed border-border text-muted-foreground hover:border-primary",
              shake === item.letter && "animate-[wiggle_0.45s_ease-in-out] border-destructive text-destructive"
            )}
          >
            {paired[item.id] ? item.emoji : item.letter}
          </button>
        ))}
      </div>
    </>
  );
}

function HotspotActivity({ onComplete }: { onComplete?: () => void }) {
  const [found, setFound] = useState<Record<string, boolean>>({});
  const [shake, setShake] = useState<string | null>(null);
  const targets = HOTSPOTS.filter((h) => h.isTarget);
  const allFound = targets.every((t) => found[t.id]);

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

  if (allFound) return <Complete message="You found every 'sh' sound — amazing!" />;

  return (
    <>
      <p className="mb-3 text-sm font-semibold">
        🔍 Click everything that starts with the “sh” sound ({targets.filter((t) => found[t.id]).length}/{targets.length} found)
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {HOTSPOTS.map((spot) => (
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
