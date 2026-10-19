import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, ExternalLink, Gamepad2, PartyPopper, Search, Sparkles, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiWhiteboardActivity, ApiWhiteboardActivityItem } from "@/api/whiteboardActivities";
import { LEARNING_PLUGINS, type LearningPlugin } from "@/data/learningPlugins";

interface WhiteboardActivityProps {
  /** This class's resolved activity bank — the admin-authored Activity Bank for its course
   *  (falling back to the department-wide set), fetched once by InteractivePanel. Empty when
   *  nothing has been configured yet for this course/department. */
  activities: ApiWhiteboardActivity[];
  mode: "teacher" | "student";
  onClose: () => void;
  onAllMatched?: () => void;
  selection?: WhiteboardActivitySelection;
  onSelectionChange?: (selection: WhiteboardActivitySelection) => void;
}

export interface WhiteboardActivitySelection {
  source: "class" | "plugins" | "h5p";
  pluginId?: string;
  h5pUrl?: string;
}

/**
 * Interactive activity layer over the whiteboard: drag & drop, tap-to-pair tag & match, and
 * hotspot click — each fires the celebration on completion. Content is entirely admin-authored
 * (Admin → Academics → Activity Bank), scoped by department/course, replacing what used to be
 * one hardcoded fruit/letter set (and a fixed "sh" sound hotspot game) every class shared
 * regardless of subject or grade.
 */
export default function WhiteboardActivity({ activities, mode, onClose, onAllMatched, selection, onSelectionChange }: WhiteboardActivityProps) {
  const [activeId, setActiveId] = useState(activities[0]?.id);
  const [source, setSource] = useState<"class" | "plugins" | "h5p">("class");
  const [plugin, setPlugin] = useState<LearningPlugin | null>(null);
  const [query, setQuery] = useState("");
  const [h5pDraft, setH5pDraft] = useState("");
  const [h5pUrl, setH5pUrl] = useState("");
  const active = activities.find((a) => a.id === activeId) ?? activities[0];

  useEffect(() => {
    if (!selection) return;
    setSource(selection.source);
    setPlugin(selection.pluginId ? LEARNING_PLUGINS.find((item) => item.id === selection.pluginId) ?? null : null);
    setH5pUrl(selection.h5pUrl ?? "");
  }, [selection]);

  function chooseSource(next: "class" | "plugins" | "h5p") {
    setSource(next); setPlugin(null);
    onSelectionChange?.({ source: next });
  }

  function choosePlugin(next: LearningPlugin | null) {
    setPlugin(next);
    onSelectionChange?.({ source: "plugins", pluginId: next?.id });
  }

  function loadH5p() {
    const url = normalizeH5pUrl(h5pDraft);
    setH5pUrl(url);
    onSelectionChange?.({ source: "h5p", h5pUrl: url });
  }

  useEffect(() => {
    // The bank can arrive after this panel is already open (a slow fetch) — pick the first
    // activity once it lands instead of staying stuck on an undefined selection forever.
    if (!activeId && activities.length > 0) setActiveId(activities[0].id);
  }, [activities, activeId]);

  return (
    <div className="absolute inset-3 z-20 flex flex-col overflow-hidden rounded-2xl border border-border bg-card/95 p-4 shadow-pop backdrop-blur animate-pop-in sm:inset-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1">
          {(["class", "plugins", "h5p"] as const).map((item) => (
            <button key={item} onClick={() => chooseSource(item)} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize", source === item ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-foreground")}>
              {item === "class" ? "Class activities" : item === "plugins" ? `Plugins (${LEARNING_PLUGINS.length})` : "H5P"}
            </button>
          ))}
        </div>
        <button onClick={onClose} aria-label="Close activity" className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
      {source === "class" && <>
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
      </>}

      {source === "plugins" && (plugin ? (
        <div>
          <button onClick={() => choosePlugin(null)} className="mb-3 flex items-center gap-1 text-xs font-semibold text-primary"><ArrowLeft className="h-3.5 w-3.5" /> All plugins</button>
          <PluginActivity plugin={plugin} onComplete={onAllMatched} />
        </div>
      ) : (
        <div>
          <label className="relative mb-3 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search phonics, abacus, art, coding…" className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm" /></label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {LEARNING_PLUGINS.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase())).map((p) => (
              <button key={p.id} onClick={() => choosePlugin(p)} className="flex items-center gap-3 rounded-xl border bg-background p-3 text-left transition hover:border-primary hover:bg-primary/5">
                <span className="text-2xl">{p.emoji}</span><span className="min-w-0"><b className="block truncate text-sm">{p.name}</b><small className="block truncate text-muted-foreground">{p.type === "resource" ? "Resource" : p.type === "game" ? "Game" : "Game + resource"}</small></span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {source === "h5p" && <div className="flex h-full flex-col gap-3">
        {mode === "teacher" && <div className="rounded-xl border bg-muted/50 p-3">
          <label className="text-xs font-semibold">H5P public embed or content URL</label>
          <div className="mt-2 flex gap-2"><input value={h5pDraft} onChange={(e) => setH5pDraft(e.target.value)} placeholder="https://…/content/…/embed" className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm" /><button onClick={loadH5p} className="rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground">Load</button></div>
          <p className="mt-1 text-[11px] text-muted-foreground">Only load H5P content you created or have permission to reuse.</p>
        </div>}
        {h5pUrl ? <iframe title="H5P activity" src={h5pUrl} className="min-h-80 flex-1 rounded-xl border bg-white" allow="autoplay; microphone; camera" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : <div className="grid flex-1 place-items-center rounded-xl border border-dashed p-8 text-center"><div><ExternalLink className="mx-auto mb-2 h-7 w-7 text-muted-foreground" /><p className="font-semibold">Paste an H5P activity URL</p><p className="mt-1 text-xs text-muted-foreground">The activity opens safely inside the meeting whiteboard.</p></div></div>}
      </div>}
      </div>

      <style>{`
        @keyframes wiggle { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
      `}</style>
    </div>
  );
}

function normalizeH5pUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return "";
    if (!url.pathname.endsWith("/embed")) url.pathname = `${url.pathname.replace(/\/$/, "")}/embed`;
    return url.toString();
  } catch { return ""; }
}

function PluginActivity({ plugin, onComplete }: { plugin: LearningPlugin; onComplete?: () => void }) {
  if (/phonics|phonetics|pronunciation/i.test(plugin.name)) return <PhonicsGame title={plugin.name} onComplete={onComplete} />;
  if (/abacus|mental maths|speed maths|vedic maths/i.test(plugin.name)) return <AbacusGame title={plugin.name} onComplete={onComplete} />;
  return <QuickChallenge plugin={plugin} onComplete={onComplete} />;
}

const PHONICS = [
  { sound: "B says buh, like ball", answer: "B", choices: ["B", "D", "P"] },
  { sound: "M says mmm, like moon", answer: "M", choices: ["N", "M", "W"] },
  { sound: "S says sss, like sun", answer: "S", choices: ["C", "Z", "S"] },
  { sound: "F says fff, like fish", answer: "F", choices: ["V", "T", "F"] },
  { sound: "A says ah, like apple", answer: "A", choices: ["E", "O", "A"] },
];

function say(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(text); speech.rate = .82; speech.pitch = 1.08; window.speechSynthesis.speak(speech);
}

function PhonicsGame({ title, onComplete }: { title: string; onComplete?: () => void }) {
  const [round, setRound] = useState(0); const [score, setScore] = useState(0); const [message, setMessage] = useState("");
  const item = PHONICS[round % PHONICS.length];
  function answer(letter: string) { if (letter !== item.answer) { setMessage("Try again — listen closely!"); say(item.sound); return; } const next = score + 1; setScore(next); setMessage("Correct! ⭐"); if (next === 5) onComplete?.(); else setTimeout(() => { setRound((r) => r + 1); setMessage(""); }, 650); }
  if (score === 5) return <Complete message="Five sounds matched — fantastic phonics!" />;
  return <div className="text-center"><p className="text-xs font-bold uppercase tracking-wider text-primary">{title} · {score}/5</p><h3 className="my-3 text-xl font-bold">Which letter makes this sound?</h3><button onClick={() => say(item.sound)} className="mx-auto mb-5 flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground"><Volume2 className="h-5 w-5" /> Listen</button><div className="flex justify-center gap-3">{item.choices.map((choice) => <button key={choice} onClick={() => answer(choice)} className="h-20 w-20 rounded-2xl border-2 bg-background text-3xl font-bold shadow-sm hover:border-primary">{choice}</button>)}</div><p role="status" className="mt-3 min-h-5 text-sm font-semibold">{message}</p></div>;
}

function AbacusGame({ title, onComplete }: { title: string; onComplete?: () => void }) {
  const [target, setTarget] = useState(() => Math.floor(Math.random() * 9) + 1); const [moved, setMoved] = useState<Set<number>>(new Set()); const [score, setScore] = useState(0); const [message, setMessage] = useState("");
  function toggle(index: number) { setMoved((current) => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; }); }
  function check() { if (moved.size !== target) { setMessage(`You moved ${moved.size}. Try showing ${target}.`); return; } const next = score + 1; setScore(next); setMessage("Correct! ⭐"); if (next === 5) onComplete?.(); else setTimeout(() => { setTarget(Math.floor(Math.random() * 9) + 1); setMoved(new Set()); setMessage(""); }, 650); }
  if (score === 5) return <Complete message="Five numbers built — amazing abacus work!" />;
  return <div className="text-center"><p className="text-xs font-bold uppercase tracking-wider text-primary">{title} · {score}/5</p><h3 className="my-3 text-xl font-bold">Move {target} beads</h3><button onClick={() => say(`Move ${target} beads`)} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-primary"><Volume2 className="h-4 w-4" /> Hear number</button><div className="mx-auto max-w-md space-y-2 rounded-2xl border-8 border-amber-800 bg-amber-100 p-3">{[0,1].map((row) => <div key={row} className="flex gap-1 border-b-4 border-amber-700 py-1">{[0,1,2,3,4].map((col) => { const i=row*5+col; return <button key={i} onClick={() => toggle(i)} aria-pressed={moved.has(i)} className={cn("h-9 w-9 rounded-xl bg-orange-500 shadow-inner transition-transform", moved.has(i) && "translate-x-5 bg-violet-600")} />; })}</div>)}</div><ButtonLike onClick={check}>Check {moved.size} beads</ButtonLike><p role="status" className="mt-2 min-h-5 text-sm font-semibold">{message}</p></div>;
}

function ButtonLike({ onClick, children }: { onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{children}</button>; }

const QUICK_TASKS = ["Show one example to the class.", "Explain this skill in your own words.", "Work with a partner and create a mini challenge.", "Demonstrate the skill without speaking.", "Name three places this skill is useful."];
function QuickChallenge({ plugin, onComplete }: { plugin: LearningPlugin; onComplete?: () => void }) {
  const [task, setTask] = useState(0); const [done, setDone] = useState(false);
  if (done) return <Complete message={`${plugin.name} challenge complete!`} />;
  return <div className="mx-auto max-w-xl text-center"><span className="text-4xl">{plugin.emoji}</span><h3 className="mt-2 text-xl font-bold">{plugin.name}</h3><div className="my-5 rounded-2xl bg-primary/10 p-6"><p className="text-xs font-bold uppercase tracking-wider text-primary">Class challenge</p><p className="mt-2 text-lg font-semibold">{QUICK_TASKS[task]}</p></div><div className="flex flex-wrap justify-center gap-2"><button onClick={() => say(`${plugin.name}. ${QUICK_TASKS[task]}`)} className="rounded-lg border px-4 py-2 text-sm font-semibold"><Volume2 className="mr-1 inline h-4 w-4" /> Hear it</button><button onClick={() => setTask((task + 1) % QUICK_TASKS.length)} className="rounded-lg border px-4 py-2 text-sm font-semibold"><Gamepad2 className="mr-1 inline h-4 w-4" /> New challenge</button><button onClick={() => { setDone(true); onComplete?.(); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><BookOpen className="mr-1 inline h-4 w-4" /> Mark complete</button></div></div>;
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
