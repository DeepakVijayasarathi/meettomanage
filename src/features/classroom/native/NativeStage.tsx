import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Hand,
  Keyboard,
  LayoutGrid,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  MoreVertical,
  PhoneOff,
  Pin,
  PinOff,
  Search,
  Send,
  UserMinus,
  Users,
  Video,
  VideoOff,
  WifiOff,
  X,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { JitsiTrack } from "./libJitsi";
import type { NativeJitsiApi, NativeParticipant, NativeState } from "./NativeJitsiApi";
import { bestColumns, galleryPage, type CallLayout } from "./stageLayout";

const AVATAR_COLORS = ["#F26B1D", "#2F80ED", "#27AE60", "#9B51E0", "#EB5757", "#00A3A3", "#D97706", "#DB2777"];
function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const PREFS_KEY = "trn.callPrefs";
interface CallPrefs { layout: CallLayout; maxTiles: number; hideSelf: boolean }
function readPrefs(): CallPrefs {
  try {
    const raw = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "{}") as Partial<CallPrefs>;
    return {
      layout: raw.layout === "gallery" || raw.layout === "speaker" ? raw.layout : "auto",
      maxTiles: [6, 9, 16, 25].includes(raw.maxTiles ?? 0) ? raw.maxTiles! : 16,
      hideSelf: Boolean(raw.hideSelf),
    };
  } catch {
    return { layout: "auto", maxTiles: 16, hideSelf: false };
  }
}

function useNativeState(api: NativeJitsiApi): NativeState {
  return useSyncExternalStore(api.subscribe, api.getSnapshot);
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ width: e.contentRect.width, height: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(t);
  }, []);
  return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function TrackVideo({ track, mirror, contain }: { track: JitsiTrack; mirror?: boolean; contain?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    track.attach(el);
    el.play().catch(() => undefined);
    return () => track.detach(el);
  }, [track]);
  return <video ref={ref} autoPlay playsInline muted className={cn("absolute inset-0 h-full w-full", contain ? "object-contain" : "object-cover", mirror && "-scale-x-100")} />;
}

/**
 * Remote audio plays through hidden <audio> elements. Browsers (iOS Safari most of all) may refuse
 * to start them before the viewer touches the page, so every element is retried on the first gesture.
 */
function RemoteAudio({ participants }: { participants: NativeParticipant[] }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const resume = () => container.current?.querySelectorAll("audio").forEach((a) => a.play().catch(() => undefined));
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, []);
  return (
    <div ref={container} className="hidden" aria-hidden>
      {participants.filter((p) => !p.isLocal && p.audioTrack).map((p) => <AudioEl key={p.id} track={p.audioTrack!} />)}
    </div>
  );
}

function AudioEl({ track }: { track: JitsiTrack }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    track.attach(el);
    el.play().catch(() => undefined);
    return () => track.detach(el);
  }, [track]);
  return <audio ref={ref} autoPlay />;
}

function SpeakingBars() {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-full w-[3px] origin-bottom animate-orb-wave rounded-full bg-white motion-reduce:animate-none" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

function Avatar({ p, size }: { p: NativeParticipant; size: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-medium text-white",
        size === "sm" && "h-8 w-8 text-xs",
        size === "md" && "h-12 w-12 text-lg",
        size === "lg" && "h-20 w-20 text-3xl sm:h-24 sm:w-24"
      )}
      style={{ backgroundColor: colorFor(p.id + p.name) }}
    >
      {getInitials(p.name)}
    </span>
  );
}

/** Per-person actions, shared by the tile menu and the People panel. */
function ParticipantMenu({ p, isModerator, pinned, onPin, onMute, onRemove, trigger }: {
  p: NativeParticipant; isModerator: boolean; pinned: boolean; onPin: () => void; onMute: () => void; onRemove: () => void; trigger: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate">{p.isLocal ? "You" : p.name}</DropdownMenuLabel>
        <DropdownMenuItem onClick={onPin}>{pinned ? <PinOff /> : <Pin />} {pinned ? "Unpin" : "Pin for me"}</DropdownMenuItem>
        {isModerator && !p.isLocal && (
          <>
            <DropdownMenuItem disabled={p.audioMuted} onClick={onMute}><MicOff /> {p.audioMuted ? "Already muted" : "Mute"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemove} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><UserMinus /> Remove from class</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TileProps {
  participant: NativeParticipant;
  /** Render this participant's shared screen instead of their camera. */
  screen?: boolean;
  speaking: boolean;
  pinned: boolean;
  compact?: boolean;
  handOrder?: number;
  isModerator: boolean;
  onTogglePin: () => void;
  onMute: () => void;
  onRemove: () => void;
}

function Tile({ participant: p, screen, speaking, pinned, compact, handOrder, isModerator, onTogglePin, onMute, onRemove }: TileProps) {
  const label = screen ? `${p.isLocal ? "You are" : `${p.name} is`} presenting` : p.isLocal ? "You" : p.name;
  const track = screen ? p.desktopTrack : !p.videoMuted ? p.videoTrack : undefined;
  return (
    <div className={cn("group relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-call-raised", screen && "bg-black")}>
      {track ? <TrackVideo track={track} mirror={p.isLocal && !screen} contain={screen} /> : <Avatar p={p} size={compact ? "md" : "lg"} />}

      <span className={cn("pointer-events-none absolute inset-0 rounded-xl border-[3px] transition-colors", speaking && !screen ? "border-brand-orange" : "border-transparent")} />

      {!screen && p.handRaised && (
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-brand-amber px-2 py-1 text-xs font-semibold text-amber-950 shadow">
          <Hand className="h-3.5 w-3.5" /> {handOrder ? `#${handOrder}` : ""}{!compact && " Hand raised"}
        </span>
      )}
      {!screen && (
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {p.audioMuted ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55" title="Muted"><MicOff className="h-4 w-4 text-white" aria-label="Muted" /></span>
          ) : speaking ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange-deep" title="Speaking"><SpeakingBars /></span>
          ) : null}
        </div>
      )}

      {!screen && (
        <ParticipantMenu
          p={p}
          isModerator={isModerator}
          pinned={pinned}
          onPin={onTogglePin}
          onMute={onMute}
          onRemove={onRemove}
          trigger={
            <button
              aria-label={`More options for ${label}`}
              className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:bg-black/75 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange group-hover:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          }
        />
      )}
      {screen && (
        <button onClick={onTogglePin} aria-label={pinned ? `Unpin ${label}` : `Pin ${label}`} className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:bg-black/75 focus-visible:opacity-100 group-hover:opacity-100">
          {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </button>
      )}

      <div className="pointer-events-none absolute bottom-2 left-2 flex max-w-[calc(100%-3.5rem)] items-center gap-1.5">
        <span className={cn("flex min-w-0 items-center gap-1 rounded-md bg-black/55 px-2 py-0.5 font-medium text-white", compact ? "text-xs" : "text-sm")}>
          {pinned && <Pin className="h-3 w-3 shrink-0" aria-label="Pinned" />}
          {screen && <MonitorUp className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          <span className="truncate">{label}</span>
          {p.role === "moderator" && !screen && !p.isLocal && <span className="shrink-0 text-white/70">· Teacher</span>}
        </span>
      </div>
    </div>
  );
}

type Item = { key: string; participant: NativeParticipant; screen: boolean };

function ControlButton({ label, shortcut, state = "default", onClick, disabled, children, badge }: {
  label: string; shortcut?: string; state?: "default" | "off" | "on"; onClick: () => void; disabled?: boolean; children: ReactNode; badge?: number;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={state === "on" ? true : undefined}
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-call-bg disabled:opacity-40 sm:h-11 sm:w-11",
            state === "off" && "bg-call-danger text-white hover:bg-call-danger-hover",
            state === "on" && "bg-brand-orange-deep text-white hover:brightness-110",
            state === "default" && "bg-call-raised text-call-ink hover:bg-call-hover"
          )}
        >
          {children}
          {badge ? (
            <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-orange-deep px-1 text-[10px] font-bold text-white ring-2 ring-call-bg">{badge}</span>
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}{shortcut && <span className="ml-1.5 text-muted-foreground">{shortcut}</span>}</TooltipContent>
    </Tooltip>
  );
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

const SHORTCUTS: [string, string][] = [
  [`${MOD} + D`, "Turn microphone on or off"],
  [`${MOD} + E`, "Turn camera on or off"],
  [`${MOD} + Alt + H`, "Raise or lower your hand"],
  [`${MOD} + Alt + C`, "Open or close chat"],
  [`${MOD} + Alt + P`, "Open or close people"],
  ["?", "Show keyboard shortcuts"],
];

interface Toast { id: number; text: string; icon: "join" | "hand" | "leave" }

export interface NativeStageProps {
  api: NativeJitsiApi;
  mode: "teacher" | "student";
  canShareScreen: boolean;
  /** Opens JitsiLive's own leave/end-class dialog. */
  onLeave: () => void;
  hideLeave?: boolean;
  /** Shown beside the clock in the control bar, like Meet's meeting name. */
  title?: string;
}

/** Meet-style call view for the native engine: layouts, people, chat, waiting room and controls. */
export default function NativeStage({ api, mode, canShareScreen, onLeave, hideLeave, title }: NativeStageProps) {
  const s = useNativeState(api);
  const clock = useClock();
  const [panel, setPanel] = useState<"chat" | "people" | null>(null);
  const [prefs, setPrefsState] = useState(readPrefs);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [seen, setSeen] = useState(0);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [knockDismissed, setKnockDismissed] = useState<string[]>([]);
  const [confirmRemove, setConfirmRemove] = useState<NativeParticipant | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [gridRef, size] = useSize<HTMLDivElement>();
  const chatEnd = useRef<HTMLDivElement>(null);
  const toastSeq = useRef(0);

  const joined = s.phase === "joined";
  const local = s.participants.find((p) => p.isLocal);
  const sharers = s.participants.filter((p) => p.desktopTrack);
  const unread = panel === "chat" ? 0 : s.messages.filter((m) => !m.self).length - seen;
  const isModerator = s.isModerator;

  const setPrefs = (patch: Partial<CallPrefs>) =>
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      try { window.localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* preference just isn't remembered */ }
      return next;
    });

  // Raised hands in the order they went up; the number shows on tiles and in People.
  const hands = useMemo(
    () => s.participants.filter((p) => p.handRaised).sort((a, b) => (a.raisedAt ?? 0) - (b.raisedAt ?? 0)),
    [s.participants]
  );
  const handOrder = (id: string) => {
    const i = hands.findIndex((p) => p.id === id);
    return i < 0 ? undefined : i + 1;
  };

  // The roster that is already there when you join (and hands already up) shouldn't flood you with
  // alerts; only changes after the first few seconds are announced.
  const joinedAt = useRef<number | null>(null);
  useEffect(() => {
    if (joined && joinedAt.current === null) joinedAt.current = Date.now();
  }, [joined]);

  const toast = useCallback((text: string, icon: Toast["icon"]) => {
    if (joinedAt.current === null || Date.now() - joinedAt.current < 4000) return;
    const id = ++toastSeq.current;
    setToasts((t) => [...t.slice(-2), { id, text, icon }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  // Join, leave and (for the teacher) raised-hand alerts, like Meet's corner notifications.
  useEffect(() => {
    const names = new Map(api.getSnapshot().participants.map((p) => [p.id, p.name]));
    const onJoin = (e: { id?: string; displayName?: string }) => {
      if (e.id) names.set(e.id, e.displayName ?? "Someone");
      if (api.getSnapshot().phase === "joined") toast(`${e.displayName ?? "Someone"} joined`, "join");
    };
    const onLeft = (e: { id?: string }) => {
      const name = e.id ? names.get(e.id) : undefined;
      if (name) toast(`${name} left`, "leave");
    };
    const onHand = (e: { id?: string; handRaised?: boolean }) => {
      const snap = api.getSnapshot();
      if (!e.handRaised || e.id === snap.localId || !snap.isModerator) return;
      toast(`${snap.participants.find((p) => p.id === e.id)?.name ?? "A student"} raised a hand`, "hand");
    };
    api.addListener("participantJoined", onJoin);
    api.addListener("participantLeft", onLeft);
    api.addListener("raiseHandUpdated", onHand);
    return () => {
      api.removeListener("participantJoined", onJoin);
      api.removeListener("participantLeft", onLeft);
      api.removeListener("raiseHandUpdated", onHand);
    };
  }, [api, toast]);

  useEffect(() => {
    if (panel === "chat") {
      setSeen(s.messages.filter((m) => !m.self).length);
      chatEnd.current?.scrollIntoView({ block: "end" });
    }
  }, [panel, s.messages]);

  // Meet's keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && !e.altKey && key === "d") { e.preventDefault(); api.executeCommand("toggleAudio"); }
      else if (mod && !e.altKey && key === "e") { e.preventDefault(); api.executeCommand("toggleVideo"); }
      else if (mod && e.altKey && e.code === "KeyH") { e.preventDefault(); api.executeCommand("toggleRaiseHand"); }
      else if (mod && e.altKey && e.code === "KeyC") { e.preventDefault(); setPanel((p) => (p === "chat" ? null : "chat")); }
      else if (mod && e.altKey && e.code === "KeyP") { e.preventDefault(); setPanel((p) => (p === "people" ? null : "people")); }
      else if (!typing && e.key === "?") setShortcutsOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api]);

  // Everything that can be a tile: each person's camera, plus a separate tile per shared screen.
  const items: Item[] = useMemo(() => {
    const list: Item[] = [];
    for (const p of s.participants) {
      if (p.desktopTrack) list.push({ key: `${p.id}:screen`, participant: p, screen: true });
      list.push({ key: p.id, participant: p, screen: false });
    }
    return list;
  }, [s.participants]);

  // With "hide self view", your own camera leaves the grid and floats small in the corner instead.
  const selfFloats = prefs.hideSelf && s.participants.length > 1;
  const gridItems = selfFloats ? items.filter((i) => !(i.participant.isLocal && !i.screen)) : items;

  // Main stage: a pin wins; a share or Speaker layout puts one person on stage; otherwise the gallery.
  const stage: Item | undefined = useMemo(() => {
    const pinned = s.pinnedId ? s.participants.find((p) => p.id === s.pinnedId) : undefined;
    if (pinned) return { key: pinned.desktopTrack ? `${pinned.id}:screen` : pinned.id, participant: pinned, screen: Boolean(pinned.desktopTrack) };
    const sharer = sharers.find((p) => !p.isLocal) ?? sharers[0];
    const wantsStage = prefs.layout === "speaker" || (prefs.layout === "auto" && (!s.tileView || Boolean(sharer)));
    if (!wantsStage) return undefined;
    if (sharer) return { key: `${sharer.id}:screen`, participant: sharer, screen: true };
    const speaker = s.participants.find((p) => p.id === s.dominantId && !p.isLocal) ?? s.participants.find((p) => !p.isLocal);
    if (speaker) return { key: speaker.id, participant: speaker, screen: false };
    return undefined;
  }, [s.pinnedId, s.tileView, s.participants, s.dominantId, sharers, prefs.layout]);

  const pinToggle = (p: NativeParticipant) => api.executeCommand("pinParticipant", s.pinnedId === p.id ? null : p.id);
  const mute = (p: NativeParticipant) => api.executeCommand("muteRemoteParticipant", p.id, "audio");
  const visibleKnocks = isModerator ? s.knocking.filter((k) => !knockDismissed.includes(k.id)) : [];

  function sendChat(e: FormEvent) {
    e.preventDefault();
    api.sendChatMessage(draft);
    setDraft("");
  }

  const tileProps = (i: Item, compact = false) => ({
    participant: i.participant,
    screen: i.screen,
    compact,
    speaking: s.dominantId === i.participant.id && s.participants.length > 1,
    pinned: s.pinnedId === i.participant.id,
    handOrder: handOrder(i.participant.id),
    isModerator,
    onTogglePin: () => pinToggle(i.participant),
    onMute: () => mute(i.participant),
    onRemove: () => setConfirmRemove(i.participant),
  });

  // Gallery: as many tiles per page as the chosen maximum allows, with Meet-style page arrows.
  const gap = 8;
  const { pageItems, pages } = galleryPage(gridItems, prefs.maxTiles, page);
  useEffect(() => {
    if (page > pages - 1) setPage(Math.max(0, pages - 1));
  }, [page, pages]);
  const cols = bestColumns(pageItems.length, Math.max(0, size.width - 16), Math.max(0, size.height - 16), gap);
  const rows = Math.max(1, Math.ceil(pageItems.length / cols));
  const tileW = Math.max(0, Math.min((size.width - 16 - gap * (cols - 1)) / cols, (((size.height - 16 - gap * (rows - 1)) / rows) * 16) / 9));

  const filteredPeople = s.participants.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));
  const peopleCount = s.participants.length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative flex h-full w-full flex-col bg-call-bg text-call-ink">
        <RemoteAudio participants={s.participants} />

        <div className="relative flex min-h-0 flex-1">
          <div ref={gridRef} className="relative min-h-0 min-w-0 flex-1">
            {s.phase === "connecting" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-call-ink/70">
                <Loader2 className="h-8 w-8 animate-spin text-brand-orange-ink" aria-hidden />
                <p className="text-sm">Joining the class…</p>
              </div>
            )}
            {s.phase === "lobby" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-call-raised">
                  <span className="absolute inset-0 animate-ping rounded-full bg-brand-orange/25" />
                  <Users className="h-7 w-7 text-brand-orange-ink" aria-hidden />
                </span>
                <div>
                  <p className="text-lg font-medium">Asking to join…</p>
                  <p className="mt-1 text-sm text-call-ink/60">You'll join the class as soon as your teacher lets you in.</p>
                </div>
              </div>
            )}
            {s.phase === "ended" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-6 text-center">
                <p className="text-lg font-medium">The class has ended</p>
                <p className="text-sm text-call-ink/60">Thanks for joining.</p>
              </div>
            )}

            {joined &&
              (stage ? (
                <div className="flex h-full flex-col gap-2 p-2 md:flex-row">
                  <div className="min-h-0 flex-1"><Tile {...tileProps(stage)} /></div>
                  <div className="flex h-28 shrink-0 gap-2 overflow-x-auto md:h-auto md:w-56 md:flex-col md:overflow-y-auto md:overflow-x-hidden">
                    {gridItems.filter((i) => i.key !== stage.key).map((i) => (
                      <div key={i.key} className="aspect-video h-full shrink-0 md:h-auto md:w-full"><Tile {...tileProps(i, true)} /></div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative h-full">
                  <div className="flex h-full flex-wrap content-center items-center justify-center p-2" style={{ gap }}>
                    {pageItems.map((i) => (
                      <div key={i.key} style={{ width: tileW, height: (tileW * 9) / 16 }}><Tile {...tileProps(i, tileW < 260)} /></div>
                    ))}
                  </div>
                  {pages > 1 && (
                    <>
                      <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page of participants" className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-call-surface text-call-ink shadow-lg disabled:opacity-0">
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} aria-label="Next page of participants" className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-call-surface text-call-ink shadow-lg disabled:opacity-0">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <p className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-call-surface px-3 py-1 text-xs text-call-ink/70 shadow">Page {page + 1} of {pages}</p>
                    </>
                  )}
                </div>
              ))}

            {joined && selfFloats && local && (
              <div className="absolute bottom-3 right-3 z-20 aspect-video w-40 overflow-hidden rounded-xl shadow-xl ring-1 ring-black/10 sm:w-52">
                <Tile {...tileProps({ key: local.id, participant: local, screen: false }, true)} />
              </div>
            )}

            {s.reconnecting && joined && (
              <p role="status" className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-call-surface px-4 py-2 text-sm text-call-ink shadow-lg">
                <WifiOff className="h-4 w-4 text-call-danger" aria-hidden /> Connection lost. Trying to reconnect…
              </p>
            )}
            {s.deviceError && joined && !s.reconnecting && (
              <p className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-call-surface px-4 py-2 text-xs text-call-ink/80 shadow-lg">{s.deviceError}</p>
            )}

            <div className="pointer-events-none absolute bottom-3 left-3 z-30 flex w-[min(360px,calc(100%-1.5rem))] flex-col gap-2">
              {visibleKnocks.length > 0 && (
                <div role="alert" className="pointer-events-auto rounded-2xl bg-call-surface p-4 shadow-2xl shadow-black/10">
                  <p className="text-sm font-medium">{visibleKnocks.length === 1 ? `${visibleKnocks[0].name} wants to join` : `${visibleKnocks.length} people want to join`}</p>
                  <ul className="mt-2 space-y-1">
                    {visibleKnocks.slice(0, 4).map((k) => (
                      <li key={k.id} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-call-ink/80">{k.name}</span>
                        <button onClick={() => api.executeCommand("answerKnockingParticipant", k.id, false)} className="rounded-full px-3 py-1.5 text-sm font-medium text-call-ink/80 hover:bg-call-ink/10">Deny</button>
                        <button onClick={() => api.executeCommand("answerKnockingParticipant", k.id, true)} className="rounded-full bg-brand-orange-deep px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-orange-to">Admit</button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex justify-end gap-1">
                    <button onClick={() => setKnockDismissed((d) => [...d, ...visibleKnocks.map((k) => k.id)])} className="rounded-full px-3 py-1.5 text-sm font-medium text-call-ink/70 hover:bg-call-ink/10">Later</button>
                    {visibleKnocks.length > 1 && (
                      <button onClick={() => visibleKnocks.forEach((k) => api.executeCommand("answerKnockingParticipant", k.id, true))} className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-orange-ink hover:bg-brand-orange/10">Admit all</button>
                    )}
                  </div>
                </div>
              )}
              {toasts.map((t) => (
                <div key={t.id} role="status" className="flex w-fit max-w-full items-center gap-2 rounded-full bg-call-ink/85 px-3 py-1.5 text-xs font-medium text-call-bg shadow-lg">
                  {t.icon === "hand" ? <Hand className="h-4 w-4 text-brand-amber" /> : <Users className="h-4 w-4 opacity-80" />}
                  <span className="truncate">{t.text}</span>
                </div>
              ))}
            </div>
          </div>

          {panel && (
            <aside
              aria-label={panel === "chat" ? "In-call messages" : "People"}
              className="absolute inset-0 z-40 flex flex-col bg-call-bg sm:static sm:z-auto sm:my-2 sm:mr-2 sm:w-[340px] sm:shrink-0 sm:rounded-2xl sm:bg-call-surface"
            >
              <div className="flex items-center justify-between px-4 pb-2 pt-3">
                <h2 className="text-base font-medium">{panel === "chat" ? "In-call messages" : "People"}</h2>
                <button onClick={() => setPanel(null)} aria-label="Close panel" className="flex h-9 w-9 items-center justify-center rounded-full text-call-ink/80 hover:bg-call-ink/10"><X className="h-5 w-5" /></button>
              </div>

              {panel === "chat" ? (
                <>
                  <p className="mx-4 mb-2 rounded-xl bg-call-ink/[0.06] px-3 py-2 text-center text-xs text-call-ink/60">Visible to everyone in the call. Not saved after the class.</p>
                  <div className="min-h-0 flex-1 overflow-y-auto px-4" role="log" aria-live="polite">
                    {s.messages.length === 0 && <p className="py-10 text-center text-sm text-call-ink/50">No messages yet.</p>}
                    <ul className="space-y-3 py-2">
                      {s.messages.map((m) => (
                        <li key={m.id}>
                          <p className="flex items-baseline gap-2">
                            <span className="text-sm font-medium">{m.self ? "You" : m.name}</span>
                            <span className="text-xs text-call-ink/50">{new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                          </p>
                          <p className="mt-0.5 break-words text-sm text-call-ink/85">{m.text}</p>
                        </li>
                      ))}
                    </ul>
                    <div ref={chatEnd} />
                  </div>
                  <form onSubmit={sendChat} className="m-3 flex items-center gap-1 rounded-full bg-call-raised py-1 pl-4 pr-1 focus-within:ring-2 focus-within:ring-brand-orange">
                    <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Send a message" aria-label="Message" className="h-9 min-w-0 flex-1 bg-transparent text-sm placeholder:text-call-ink/50 focus:outline-none" />
                    <button type="submit" disabled={!draft.trim()} aria-label="Send message" className="flex h-9 w-9 items-center justify-center rounded-full text-brand-orange-ink hover:bg-call-ink/10 disabled:text-call-ink/30"><Send className="h-5 w-5" /></button>
                  </form>
                </>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="mx-4 mb-3 flex items-center gap-2 rounded-full bg-call-raised px-3 focus-within:ring-2 focus-within:ring-brand-orange">
                    <Search className="h-4 w-4 text-call-ink/50" aria-hidden />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for people" aria-label="Search for people" className="h-9 min-w-0 flex-1 bg-transparent text-sm placeholder:text-call-ink/50 focus:outline-none" />
                  </div>
                  {isModerator && (
                    <div className="mx-4 mb-2 flex gap-2">
                      <button onClick={() => api.executeCommand("muteEveryone", "audio")} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-call-ink/15 py-2 text-sm font-medium hover:bg-call-ink/5">
                        <MicOff className="h-4 w-4" /> Mute all
                      </button>
                    </div>
                  )}
                  <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
                    {isModerator && s.knocking.length > 0 && (
                      <PeopleSection title={`Waiting to join (${s.knocking.length})`}>
                        {s.knocking.map((k) => (
                          <li key={k.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-call-raised text-xs font-medium">{getInitials(k.name)}</span>
                            <span className="min-w-0 flex-1 truncate text-sm">{k.name}</span>
                            <button onClick={() => api.executeCommand("answerKnockingParticipant", k.id, false)} className="rounded-full px-2.5 py-1 text-xs font-medium text-call-ink/70 hover:bg-call-ink/10">Deny</button>
                            <button onClick={() => api.executeCommand("answerKnockingParticipant", k.id, true)} className="rounded-full bg-brand-orange-deep px-2.5 py-1 text-xs font-medium text-white">Admit</button>
                          </li>
                        ))}
                      </PeopleSection>
                    )}
                    {hands.length > 0 && (
                      <PeopleSection title={`Raised hands (${hands.length})`}>
                        {hands.map((p, i) => (
                          <li key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-amber text-xs font-bold text-amber-950">{i + 1}</span>
                            <span className="min-w-0 flex-1 truncate text-sm">{p.isLocal ? "You" : p.name}</span>
                            <Hand className="h-4 w-4 text-brand-amber" aria-hidden />
                          </li>
                        ))}
                      </PeopleSection>
                    )}
                    <PeopleSection title={`In the class (${peopleCount})`}>
                      {filteredPeople.map((p) => (
                        <li key={p.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-call-ink/[0.04]">
                          <Avatar p={p} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{p.isLocal ? `${p.name} (You)` : p.name}</span>
                            {p.role === "moderator" && <span className="block text-xs text-call-ink/55">Teacher</span>}
                          </span>
                          {p.desktopTrack && <MonitorUp className="h-4 w-4 text-call-ink/60" aria-label="Presenting" />}
                          {p.audioMuted ? <MicOff className="h-4 w-4 text-call-ink/50" aria-label="Muted" /> : <Mic className={cn("h-4 w-4", s.dominantId === p.id ? "text-brand-orange-ink" : "text-call-ink/50")} aria-label="Microphone on" />}
                          <ParticipantMenu
                            p={p}
                            isModerator={isModerator}
                            pinned={s.pinnedId === p.id}
                            onPin={() => pinToggle(p)}
                            onMute={() => mute(p)}
                            onRemove={() => setConfirmRemove(p)}
                            trigger={<button aria-label={`More options for ${p.name}`} className="flex h-8 w-8 items-center justify-center rounded-full text-call-ink/70 hover:bg-call-ink/10"><MoreVertical className="h-4 w-4" /></button>}
                          />
                        </li>
                      ))}
                      {filteredPeople.length === 0 && <li className="px-2 py-4 text-center text-sm text-call-ink/50">No one matches “{query}”.</li>}
                    </PeopleSection>
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>

        {/* Control bar: clock and class on the left, call controls in the middle, panels on the right. */}
        <div className="grid h-[72px] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-4">
          <div className="hidden min-w-0 items-center gap-3 text-sm md:flex">
            <span className="font-medium tabular-nums">{clock}</span>
            {title && <><span className="h-4 w-px bg-call-ink/20" /><span className="truncate text-call-ink/80">{title}</span></>}
            {s.recording && <span className="flex items-center gap-1.5 rounded-full bg-call-danger/10 px-2 py-0.5 text-xs font-medium text-call-danger-ink"><span className="h-2 w-2 animate-pulse rounded-full bg-call-danger" /> REC</span>}
          </div>
          <div className="col-start-2 flex items-center justify-center gap-2 sm:gap-2.5">
            <ControlButton label={local?.audioMuted ? "Turn on microphone" : "Turn off microphone"} shortcut={`${MOD}+D`} state={local?.audioMuted ? "off" : "default"} onClick={() => api.executeCommand("toggleAudio")} disabled={!joined}>
              {local?.audioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </ControlButton>
            <ControlButton label={local?.videoMuted ? "Turn on camera" : "Turn off camera"} shortcut={`${MOD}+E`} state={local?.videoMuted ? "off" : "default"} onClick={() => api.executeCommand("toggleVideo")} disabled={!joined}>
              {local?.videoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </ControlButton>
            {mode === "student" && (
              <ControlButton label={local?.handRaised ? "Lower hand" : "Raise hand"} shortcut={`${MOD}+Alt+H`} state={local?.handRaised ? "on" : "default"} onClick={() => api.executeCommand("toggleRaiseHand")} disabled={!joined}>
                <Hand className="h-5 w-5" />
              </ControlButton>
            )}
            {canShareScreen && (
              <ControlButton label={local?.desktopTrack ? "Stop presenting" : "Present now"} state={local?.desktopTrack ? "on" : "default"} onClick={() => api.executeCommand("toggleShareScreen")} disabled={!joined}>
                <MonitorUp className="h-5 w-5" />
              </ControlButton>
            )}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button aria-label="More options" disabled={!joined} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-call-raised text-call-ink transition-colors hover:bg-call-hover disabled:opacity-40 sm:h-11 sm:w-11">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">More options</TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="top" align="center" className="w-60">
                <DropdownMenuItem onClick={() => setLayoutOpen(true)}><LayoutGrid /> Change layout</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPrefs({ hideSelf: !prefs.hideSelf })}><EyeOff /> {prefs.hideSelf ? "Show me in the grid" : "Move me to the corner"}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShortcutsOpen(true)}><Keyboard /> Keyboard shortcuts</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {!hideLeave && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onLeave} aria-label={mode === "teacher" ? "Leave or end the class" : "Leave class"} className="flex h-10 w-14 shrink-0 items-center justify-center rounded-full bg-call-danger text-white transition-colors hover:bg-call-danger-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange sm:h-11 sm:w-16">
                    <PhoneOff className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{mode === "teacher" ? "Leave or end the class" : "Leave class"}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="col-start-3 flex items-center justify-end gap-1">
            <ControlButton label="People" shortcut={`${MOD}+Alt+P`} state={panel === "people" ? "on" : "default"} onClick={() => setPanel((p) => (p === "people" ? null : "people"))} disabled={!joined} badge={isModerator && s.knocking.length ? s.knocking.length : undefined}>
              <Users className="h-5 w-5" />
            </ControlButton>
            <ControlButton label="Chat with everyone" shortcut={`${MOD}+Alt+C`} state={panel === "chat" ? "on" : "default"} onClick={() => setPanel((p) => (p === "chat" ? null : "chat"))} disabled={!joined} badge={unread > 0 ? unread : undefined}>
              <MessageSquare className="h-5 w-5" />
            </ControlButton>
          </div>
        </div>

        <Dialog open={layoutOpen} onOpenChange={setLayoutOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Change layout</DialogTitle>
              <DialogDescription>Only changes your own screen.</DialogDescription>
            </DialogHeader>
            <div role="radiogroup" aria-label="Layout" className="grid gap-2">
              {([["auto", "Auto", "Gallery, switching to the presenter when someone shares"], ["gallery", "Gallery", "Everyone in equal tiles"], ["speaker", "Speaker", "The person talking fills the screen"]] as const).map(([value, label, hint]) => (
                <button key={value} role="radio" aria-checked={prefs.layout === value} onClick={() => setPrefs({ layout: value })} className={cn("flex items-start gap-3 rounded-lg border p-3 text-left", prefs.layout === value ? "border-primary bg-primary/5" : "border-border hover:bg-accent")}>
                  <span className={cn("mt-0.5 h-4 w-4 shrink-0 rounded-full border-2", prefs.layout === value ? "border-primary bg-primary" : "border-muted-foreground/40")} />
                  <span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{hint}</span></span>
                </button>
              ))}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Tiles per page</p>
              <div className="flex gap-2">
                {[6, 9, 16, 25].map((n) => (
                  <button key={n} onClick={() => setPrefs({ maxTiles: n })} aria-pressed={prefs.maxTiles === n} className={cn("flex-1 rounded-md border py-1.5 text-sm", prefs.maxTiles === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent")}>{n}</button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Keyboard shortcuts</DialogTitle></DialogHeader>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {SHORTCUTS.map(([keys, what]) => (
                <div key={keys} className="contents">
                  <dt><kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-medium">{keys}</kbd></dt>
                  <dd className="text-muted-foreground">{what}</dd>
                </div>
              ))}
            </dl>
          </DialogContent>
        </Dialog>

        <Dialog open={!!confirmRemove} onOpenChange={(o) => !o && setConfirmRemove(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Remove {confirmRemove?.name}?</DialogTitle>
              <DialogDescription>They'll leave the class now. They can rejoin from the class link if they're still allowed in.</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmRemove(null)} className="rounded-md border px-3 py-2 text-sm hover:bg-accent">Cancel</button>
              <button
                onClick={() => {
                  if (confirmRemove) api.executeCommand("kickParticipant", confirmRemove.id);
                  setConfirmRemove(null);
                }}
                className="rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function PeopleSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-3">
      <h3 className="px-2 pb-1 text-xs font-medium text-call-ink/60">{title}</h3>
      <ul>{children}</ul>
    </section>
  );
}
