import { useState } from "react";
import { Hand, Mic, MicOff, PenSquare, Pin, Search, Video, VideoOff } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, getInitials } from "@/lib/utils";
import type { Participant } from "@/types";

interface WaitingGuest {
  id: string;
  name: string;
}

interface ParticipantsPanelProps {
  mode: "teacher" | "student";
  participants: Participant[];
  selfId?: string;
  boardAccess: Record<string, boolean>;
  waitingGuests?: WaitingGuest[];
  onAdmitGuest?: (id: string) => void;
  onDenyGuest?: (id: string) => void;
  onAdmitAll?: () => void;
  onMuteAll?: () => void;
  onToggleMic: (id: string) => void;
  onToggleCam: (id: string) => void;
  onToggleBoardAccess: (id: string) => void;
  onPin?: (id: string) => void;
}

const iconBtn =
  "flex h-8 w-8 items-center justify-center rounded-full text-call-ink/70 transition-colors hover:bg-call-ink/10 hover:text-call-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange";

function Avatar({ name, color, size = "h-9 w-9 text-sm" }: { name: string; color: string; size?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-full font-medium text-white", size)} style={{ backgroundColor: color }}>
      {getInitials(name)}
    </span>
  );
}

/** People panel styled after Google Meet: waiting room first, then everyone in the class with host controls. */
export default function ParticipantsPanel({
  mode,
  participants,
  selfId,
  boardAccess,
  waitingGuests = [],
  onAdmitGuest,
  onDenyGuest,
  onAdmitAll,
  onMuteAll,
  onToggleMic,
  onToggleCam,
  onToggleBoardAccess,
  onPin,
}: ParticipantsPanelProps) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = participants.filter((p) => p.name.toLowerCase().includes(q));
  // Raised hands first, like Meet's "Raised hands" grouping, then the teacher, then everyone else.
  const ordered = [...filtered].sort(
    (a, b) => Number(b.handRaised) - Number(a.handRaised) || Number(b.role === "teacher") - Number(a.role === "teacher")
  );
  const isHost = mode === "teacher";

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-4 pb-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-call-ink/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for people"
            aria-label="Search for people"
            className="h-11 w-full rounded-full border border-call-ink/15 bg-transparent pl-10 pr-4 text-sm text-call-ink placeholder:text-call-ink/50 focus:border-brand-orange focus:outline-none"
          />
        </label>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 px-2 pb-4">
          {isHost && waitingGuests.length > 0 && (
            <section className="rounded-2xl bg-call-ink/[0.04] px-2 py-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <h3 className="text-xs font-medium uppercase tracking-wider text-call-ink/60">Waiting to join · {waitingGuests.length}</h3>
                {waitingGuests.length > 1 && (
                  <button onClick={onAdmitAll} className="rounded-full px-3 py-1 text-sm font-medium text-brand-orange-ink hover:bg-brand-orange/10">
                    Admit all
                  </button>
                )}
              </div>
              <ul>
                {waitingGuests.map((g) => (
                  <li key={g.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                    <Avatar name={g.name} color="#3a414e" />
                    <span className="min-w-0 flex-1 truncate text-sm text-call-ink">{g.name}</span>
                    <button onClick={() => onDenyGuest?.(g.id)} className="rounded-full px-3 py-1.5 text-sm font-medium text-call-ink/80 hover:bg-call-ink/10" aria-label={`Deny ${g.name}`}>
                      Deny
                    </button>
                    <button onClick={() => onAdmitGuest?.(g.id)} className="rounded-full px-3 py-1.5 text-sm font-medium text-brand-orange-ink hover:bg-brand-orange/10" aria-label={`Admit ${g.name}`}>
                      Admit
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between px-2 py-1.5">
              <h3 className="text-xs font-medium uppercase tracking-wider text-call-ink/60">In the class · {participants.length}</h3>
              {isHost && (
                <button onClick={onMuteAll} className="rounded-full px-3 py-1 text-sm font-medium text-brand-orange-ink hover:bg-brand-orange/10">
                  Mute all
                </button>
              )}
            </div>
            <ul>
              {ordered.map((p) => {
                const self = p.id === selfId;
                const controllable = isHost && p.role === "student";
                return (
                  <li key={p.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-call-ink/[0.06]">
                    <Avatar name={p.name} color={p.avatarColor} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-call-ink">
                        {p.name}
                        {self && <span className="text-call-ink/60"> (You)</span>}
                      </p>
                      <p className="text-xs text-call-ink/50">{p.role === "teacher" ? "Teacher · host" : "Student"}</p>
                    </div>

                    <div className="flex shrink-0 items-center">
                      {p.handRaised && (
                        <span className="mr-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-amber text-amber-950" title="Hand raised">
                          <Hand className="h-4 w-4" />
                        </span>
                      )}
                      {boardAccess[p.id] && !controllable && <PenSquare className="mx-1.5 h-4 w-4 text-call-ink/60" aria-label="Whiteboard access" />}

                      {controllable ? (
                        <>
                          <button
                            className={cn(iconBtn, boardAccess[p.id] && "bg-brand-orange/20 text-brand-orange-ink")}
                            title={boardAccess[p.id] ? "Revoke whiteboard access" : "Give whiteboard access"}
                            aria-label={`${boardAccess[p.id] ? "Revoke" : "Give"} whiteboard access for ${p.name}`}
                            onClick={() => onToggleBoardAccess(p.id)}
                          >
                            <PenSquare className="h-4 w-4" />
                          </button>
                          <button
                            className={iconBtn}
                            title={p.camOn ? "Turn off their camera" : "Ask to turn on camera"}
                            aria-label={`${p.camOn ? "Disable" : "Enable"} video for ${p.name}`}
                            onClick={() => onToggleCam(p.id)}
                          >
                            {p.camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-call-danger" />}
                          </button>
                          <button
                            className={iconBtn}
                            title={p.micOn ? "Mute" : "Ask to unmute"}
                            aria-label={`${p.micOn ? "Mute" : "Unmute"} ${p.name}`}
                            onClick={() => onToggleMic(p.id)}
                          >
                            {p.micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-call-danger" />}
                          </button>
                        </>
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center" aria-label={p.micOn ? "Mic on" : "Muted"}>
                          {p.micOn ? <Mic className="h-4 w-4 text-call-ink/50" /> : <MicOff className="h-4 w-4 text-call-danger" />}
                        </span>
                      )}
                      {onPin && (
                        <button className={cn(iconBtn, "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")} title="Pin to main screen" aria-label={`Pin ${p.name}`} onClick={() => onPin(p.id)}>
                          <Pin className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
              {ordered.length === 0 && <li className="px-2 py-8 text-center text-sm text-call-ink/50">No one matches "{query}"</li>}
            </ul>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
