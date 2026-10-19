import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  Hand,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Pin,
  PinOff,
  Send,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { JitsiTrack } from "./libJitsi";
import type { NativeJitsiApi, NativeParticipant, NativeState } from "./NativeJitsiApi";

const AVATAR_COLORS = ["#F26B1D", "#2F80ED", "#27AE60", "#9B51E0", "#EB5757", "#00A3A3", "#D97706", "#DB2777"];
function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function useNativeState(api: NativeJitsiApi): NativeState {
  return useSyncExternalStore(api.subscribe, api.getSnapshot);
}

/** Same "largest 16:9 tiles that fit" maths as the demo classroom's VideoStage. */
function bestColumns(count: number, width: number, height: number, gap: number) {
  let best = { cols: 1, area: 0 };
  for (let cols = 1; cols <= Math.max(1, count); cols++) {
    const rows = Math.ceil(count / cols);
    const tileW = Math.min((width - gap * (cols - 1)) / cols, (((height - gap * (rows - 1)) / rows) * 16) / 9);
    const area = tileW * ((tileW * 9) / 16);
    if (area > best.area) best = { cols, area };
  }
  return best.cols;
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

function TrackVideo({ track, mirror, contain }: { track: JitsiTrack; mirror?: boolean; contain?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    track.attach(el);
    el.play().catch(() => undefined);
    return () => track.detach(el);
  }, [track]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={cn("absolute inset-0 h-full w-full", contain ? "object-contain" : "object-cover", mirror && "-scale-x-100")}
    />
  );
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
      {participants
        .filter((p) => !p.isLocal && p.audioTrack)
        .map((p) => (
          <AudioEl key={p.id} track={p.audioTrack!} />
        ))}
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

interface TileProps {
  participant: NativeParticipant;
  /** Render this participant's shared screen instead of their camera. */
  screen?: boolean;
  speaking: boolean;
  pinned: boolean;
  compact?: boolean;
  onTogglePin: () => void;
}

function Tile({ participant: p, screen, speaking, pinned, compact, onTogglePin }: TileProps) {
  const label = screen ? `${p.isLocal ? "You are" : `${p.name} is`} presenting` : p.isLocal ? "You" : p.name;
  const track = screen ? p.desktopTrack : !p.videoMuted ? p.videoTrack : undefined;
  return (
    <div className="group relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-call-raised">
      {track ? (
        <TrackVideo track={track} mirror={p.isLocal && !screen} contain={screen} />
      ) : (
        <span
          className={cn("flex items-center justify-center rounded-full font-medium text-white", compact ? "h-12 w-12 text-lg" : "h-20 w-20 text-3xl sm:h-24 sm:w-24")}
          style={{ backgroundColor: colorFor(p.id + p.name) }}
        >
          {getInitials(p.name)}
        </span>
      )}

      <span className={cn("pointer-events-none absolute inset-0 rounded-xl border-[3px] transition-colors", speaking && !screen ? "border-brand-orange" : "border-transparent")} />

      {!screen && p.handRaised && (
        <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-brand-amber px-2 py-1 text-xs font-medium text-call-bg">
          <Hand className="h-3.5 w-3.5" /> {!compact && "Hand raised"}
        </span>
      )}
      {!screen && (
        <div className="absolute right-2.5 top-2.5">
          {p.audioMuted ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55" title="Muted">
              <MicOff className="h-4 w-4 text-white" aria-label="Muted" />
            </span>
          ) : speaking ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange-deep" title="Speaking">
              <SpeakingBars />
            </span>
          ) : null}
        </div>
      )}

      <button
        onClick={onTogglePin}
        aria-label={pinned ? `Unpin ${label}` : `Pin ${label}`}
        title={pinned ? "Unpin" : "Pin to main screen (only for you)"}
        className={cn(
          "absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/75 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange group-hover:opacity-100",
          compact ? "h-9 w-9" : "h-11 w-11"
        )}
      >
        {pinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
      </button>

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/40 to-transparent px-3 pb-2 pt-6">
        {pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-white" aria-label="Pinned" />}
        {screen && <MonitorUp className="h-3.5 w-3.5 shrink-0 text-white" aria-hidden />}
        <span className={cn("truncate font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]", compact ? "text-xs" : "text-sm")}>{label}</span>
      </div>
    </div>
  );
}

type Item = { key: string; participant: NativeParticipant; screen: boolean };

function ControlButton({ label, state = "default", onClick, disabled, children }: { label: string; state?: "default" | "off" | "on"; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={state === "on" ? true : undefined}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-call-bg disabled:opacity-40 sm:h-12 sm:w-12",
            state === "off" && "bg-call-danger text-white hover:bg-call-danger-hover",
            state === "on" && "bg-gradient-to-br from-brand-orange-from to-brand-orange-to text-white hover:brightness-110",
            state === "default" && "bg-call-raised text-white hover:bg-call-hover"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export interface NativeStageProps {
  api: NativeJitsiApi;
  mode: "teacher" | "student";
  canShareScreen: boolean;
  /** Opens JitsiLive's own leave/end-class dialog. */
  onLeave: () => void;
  hideLeave?: boolean;
}

/** Meet-style call view for the native engine: tiles, spotlight, waiting room, chat and controls. */
export default function NativeStage({ api, mode, canShareScreen, onLeave, hideLeave }: NativeStageProps) {
  const s = useNativeState(api);
  const [chatOpen, setChatOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const [draft, setDraft] = useState("");
  const [knockDismissed, setKnockDismissed] = useState<string[]>([]);
  const [gridRef, size] = useSize<HTMLDivElement>();
  const chatEnd = useRef<HTMLDivElement>(null);

  const local = s.participants.find((p) => p.isLocal);
  const sharers = s.participants.filter((p) => p.desktopTrack);
  const unread = chatOpen ? 0 : s.messages.filter((m) => !m.self).length - seen;

  useEffect(() => {
    if (chatOpen) {
      setSeen(s.messages.filter((m) => !m.self).length);
      chatEnd.current?.scrollIntoView({ block: "end" });
    }
  }, [chatOpen, s.messages]);

  // Everything that can be a tile: each person's camera, plus a separate tile per shared screen.
  const items: Item[] = useMemo(() => {
    const list: Item[] = [];
    for (const p of s.participants) {
      if (p.desktopTrack) list.push({ key: `${p.id}:screen`, participant: p, screen: true });
      list.push({ key: p.id, participant: p, screen: false });
    }
    return list;
  }, [s.participants]);

  // Main stage: a pin wins; otherwise JitsiLive switches viewers to stage view (tileView=false)
  // while someone else presents, so the share fills the screen with faces in the strip.
  const stage: Item | undefined = useMemo(() => {
    const pinned = s.pinnedId ? s.participants.find((p) => p.id === s.pinnedId) : undefined;
    if (pinned) return { key: pinned.desktopTrack ? `${pinned.id}:screen` : pinned.id, participant: pinned, screen: Boolean(pinned.desktopTrack) };
    if (!s.tileView) {
      const sharer = sharers.find((p) => !p.isLocal) ?? sharers[0];
      if (sharer) return { key: `${sharer.id}:screen`, participant: sharer, screen: true };
      const speaker = s.participants.find((p) => p.id === s.dominantId && !p.isLocal);
      if (speaker) return { key: speaker.id, participant: speaker, screen: false };
    }
    return undefined;
  }, [s.pinnedId, s.tileView, s.participants, s.dominantId, sharers]);

  const pinToggle = (p: NativeParticipant) => api.executeCommand("pinParticipant", s.pinnedId === p.id ? null : p.id);
  const visibleKnocks = s.isModerator ? s.knocking.filter((k) => !knockDismissed.includes(k.id)) : [];

  function sendChat(e: FormEvent) {
    e.preventDefault();
    api.sendChatMessage(draft);
    setDraft("");
  }

  const gap = 8;
  const cols = bestColumns(items.length, Math.max(0, size.width - 16), Math.max(0, size.height - 16), gap);
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const tileW = Math.max(
    0,
    Math.min((size.width - 16 - gap * (cols - 1)) / cols, (((size.height - 16 - gap * (rows - 1)) / rows) * 16) / 9)
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="relative flex h-full w-full flex-col bg-call-bg text-white">
        <RemoteAudio participants={s.participants} />

        <div className="relative flex min-h-0 flex-1">
          {/* Stage — measured once here so the grid can size its tiles. */}
          <div ref={gridRef} className="relative min-h-0 min-w-0 flex-1">
            {s.phase === "connecting" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-white/70">
                <Loader2 className="h-8 w-8 animate-spin text-brand-orange" aria-hidden />
                <p className="text-sm">Joining the class…</p>
              </div>
            )}
            {s.phase === "lobby" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-call-raised">
                  <span className="absolute inset-0 animate-ping rounded-full bg-brand-orange/25" />
                  <Users className="h-7 w-7 text-brand-orange" aria-hidden />
                </span>
                <div>
                  <p className="text-lg font-medium">Asking to join…</p>
                  <p className="mt-1 text-sm text-white/60">You'll join the class as soon as your teacher lets you in.</p>
                </div>
              </div>
            )}
            {s.phase === "ended" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-6 text-center">
                <p className="text-lg font-medium">The class has ended</p>
                <p className="text-sm text-white/60">Thanks for joining.</p>
              </div>
            )}

            {s.phase === "joined" &&
              (stage ? (
                <div className="flex h-full flex-col gap-2 p-2 md:flex-row">
                  <div className="min-h-0 flex-1">
                    <Tile
                      participant={stage.participant}
                      screen={stage.screen}
                      speaking={s.dominantId === stage.participant.id}
                      pinned={s.pinnedId === stage.participant.id}
                      onTogglePin={() => pinToggle(stage.participant)}
                    />
                  </div>
                  <div className="flex h-28 shrink-0 gap-2 overflow-x-auto md:h-auto md:w-56 md:flex-col md:overflow-y-auto md:overflow-x-hidden">
                    {items
                      .filter((i) => i.key !== stage.key)
                      .map((i) => (
                        <div key={i.key} className="aspect-video h-full shrink-0 md:h-auto md:w-full">
                          <Tile
                            participant={i.participant}
                            screen={i.screen}
                            compact
                            speaking={s.dominantId === i.participant.id}
                            pinned={s.pinnedId === i.participant.id}
                            onTogglePin={() => pinToggle(i.participant)}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-wrap content-center items-center justify-center p-2" style={{ gap }}>
                  {items.map((i) => (
                    <div key={i.key} style={{ width: tileW, height: (tileW * 9) / 16 }}>
                      <Tile
                        participant={i.participant}
                        screen={i.screen}
                        speaking={s.dominantId === i.participant.id && s.participants.length > 1}
                        pinned={false}
                        onTogglePin={() => pinToggle(i.participant)}
                      />
                    </div>
                  ))}
                </div>
              ))}

            {s.deviceError && s.phase === "joined" && (
              <p className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-call-surface px-4 py-2 text-xs text-white/80 shadow-lg">{s.deviceError}</p>
            )}

            {visibleKnocks.length > 0 && (
              <div role="alert" className="absolute bottom-3 left-3 z-30 w-[min(360px,calc(100%-1.5rem))] rounded-2xl bg-call-surface p-4 shadow-2xl shadow-black/50">
                <p className="text-sm font-medium">
                  {visibleKnocks.length === 1 ? `${visibleKnocks[0].name} wants to join` : `${visibleKnocks.length} people want to join`}
                </p>
                <ul className="mt-2 space-y-1">
                  {visibleKnocks.slice(0, 4).map((k) => (
                    <li key={k.id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-white/80">{k.name}</span>
                      <button onClick={() => api.executeCommand("answerKnockingParticipant", k.id, false)} className="rounded-full px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10">
                        Deny
                      </button>
                      <button onClick={() => api.executeCommand("answerKnockingParticipant", k.id, true)} className="rounded-full bg-brand-orange px-3 py-1.5 text-sm font-medium text-call-bg hover:bg-brand-orange-light">
                        Admit
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex justify-end gap-1">
                  <button onClick={() => setKnockDismissed((d) => [...d, ...visibleKnocks.map((k) => k.id)])} className="rounded-full px-3 py-1.5 text-sm font-medium text-white/70 hover:bg-white/10">
                    Later
                  </button>
                  {visibleKnocks.length > 1 && (
                    <button onClick={() => visibleKnocks.forEach((k) => api.executeCommand("answerKnockingParticipant", k.id, true))} className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-orange hover:bg-brand-orange/10">
                      Admit all
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {chatOpen && (
            <aside aria-label="In-call messages" className="absolute inset-0 z-40 flex flex-col bg-call-bg sm:static sm:z-auto sm:my-2 sm:mr-2 sm:w-80 sm:shrink-0 sm:rounded-2xl sm:bg-call-surface">
              <div className="flex items-center justify-between px-4 pb-2 pt-3">
                <h2 className="text-base font-normal">In-call messages</h2>
                <button onClick={() => setChatOpen(false)} aria-label="Close messages" className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mx-4 mb-2 rounded-xl bg-white/[0.06] px-3 py-2 text-center text-xs text-white/60">Visible to everyone in the call. Not saved after the class.</p>
              <div className="min-h-0 flex-1 overflow-y-auto px-4" role="log" aria-live="polite">
                <ul className="space-y-3 py-2">
                  {s.messages.map((m) => (
                    <li key={m.id}>
                      <p className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">{m.self ? "You" : m.name}</span>
                        <span className="text-xs text-white/50">{new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                      </p>
                      <p className="mt-0.5 break-words text-sm text-white/85">{m.text}</p>
                    </li>
                  ))}
                </ul>
                <div ref={chatEnd} />
              </div>
              <form onSubmit={sendChat} className="m-3 flex items-center gap-1 rounded-full bg-call-raised py-1 pl-4 pr-1 focus-within:ring-2 focus-within:ring-brand-orange">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Send a message" aria-label="Message" className="h-9 min-w-0 flex-1 bg-transparent text-sm placeholder:text-white/50 focus:outline-none" />
                <button type="submit" disabled={!draft.trim()} aria-label="Send message" className="flex h-9 w-9 items-center justify-center rounded-full text-brand-orange hover:bg-white/10 disabled:text-white/30">
                  <Send className="h-5 w-5" />
                </button>
              </form>
            </aside>
          )}
        </div>

        {/* Control bar */}
        <div className="flex h-[72px] shrink-0 items-center justify-center gap-2 px-3 sm:gap-3">
          <ControlButton label={local?.audioMuted ? "Turn on microphone" : "Turn off microphone"} state={local?.audioMuted ? "off" : "default"} onClick={() => api.executeCommand("toggleAudio")} disabled={s.phase !== "joined"}>
            {local?.audioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </ControlButton>
          <ControlButton label={local?.videoMuted ? "Turn on camera" : "Turn off camera"} state={local?.videoMuted ? "off" : "default"} onClick={() => api.executeCommand("toggleVideo")} disabled={s.phase !== "joined"}>
            {local?.videoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </ControlButton>
          {mode === "student" && (
            <ControlButton label={local?.handRaised ? "Lower hand" : "Raise hand"} state={local?.handRaised ? "on" : "default"} onClick={() => api.executeCommand("toggleRaiseHand")} disabled={s.phase !== "joined"}>
              <Hand className="h-5 w-5" />
            </ControlButton>
          )}
          {canShareScreen && (
            <ControlButton label={local?.desktopTrack ? "Stop presenting" : "Present now"} state={local?.desktopTrack ? "on" : "default"} onClick={() => api.executeCommand("toggleShareScreen")} disabled={s.phase !== "joined"}>
              <MonitorUp className="h-5 w-5" />
            </ControlButton>
          )}
          <div className="relative">
            <ControlButton label="Chat with everyone" state={chatOpen ? "on" : "default"} onClick={() => setChatOpen((o) => !o)} disabled={s.phase !== "joined"}>
              <MessageSquare className="h-5 w-5" />
            </ControlButton>
            {unread > 0 && (
              <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-call-bg ring-2 ring-call-bg">
                {unread}
              </span>
            )}
          </div>
          {!hideLeave && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onLeave}
                  aria-label={mode === "teacher" ? "Leave or end the class" : "Leave class"}
                  className="flex h-10 w-14 shrink-0 items-center justify-center rounded-full bg-call-danger text-white transition-colors hover:bg-call-danger-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange sm:h-12 sm:w-16"
                >
                  <PhoneOff className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{mode === "teacher" ? "Leave or end the class" : "Leave class"}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
