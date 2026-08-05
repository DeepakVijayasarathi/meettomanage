import { useState } from "react";
import { Check, Hand, Mic, MicOff, PenSquare, Search, Users, Video, VideoOff, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  boardAccess: Record<string, boolean>;
  waitingGuests?: WaitingGuest[];
  onAdmitGuest?: (id: string) => void;
  onDenyGuest?: (id: string) => void;
  onToggleMic: (id: string) => void;
  onToggleCam: (id: string) => void;
  onToggleBoardAccess: (id: string) => void;
}

export default function ParticipantsPanel({
  mode,
  participants,
  boardAccess,
  waitingGuests = [],
  onAdmitGuest,
  onDenyGuest,
  onToggleMic,
  onToggleCam,
  onToggleBoardAccess,
}: ParticipantsPanelProps) {
  const [query, setQuery] = useState("");

  const filtered = participants.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));
  const raisedHands = participants.filter((p) => p.handRaised).length;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-2 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search participants…"
            className="h-9 border-white/10 bg-white/5 pl-8 text-xs text-white placeholder:text-white/40 focus-visible:ring-white/30"
          />
        </div>
        <div className="flex items-center justify-between text-xs text-white/50">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> {participants.length} in class
          </span>
          {raisedHands > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-brand-amber/20 px-2 py-0.5 font-semibold text-brand-amber">
              <Hand className="h-3 w-3" /> {raisedHands} raised
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <ul className="space-y-1 pb-3">
          {mode === "teacher" && waitingGuests.length > 0 && (
            <li className="mb-2 rounded-xl border border-brand-amber/25 bg-brand-amber/10 p-2.5">
              <p className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-amber">
                Waiting to join · {waitingGuests.length}
              </p>
              <ul className="space-y-1.5">
                {waitingGuests.map((g) => (
                  <li key={g.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-amber/25 text-[11px] font-bold text-brand-amber">
                      {getInitials(g.name)}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{g.name}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white/60 hover:bg-white/10 hover:text-white" title="Deny" aria-label={`Deny ${g.name}`} onClick={() => onDenyGuest?.(g.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" className="h-7 w-7 !bg-brand-green hover:!bg-brand-greenDark" title="Admit" aria-label={`Admit ${g.name}`} onClick={() => onAdmitGuest?.(g.id)}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </li>
          )}

          {filtered.map((p) => (
            <li
              key={p.id}
              className="group flex items-center gap-2.5 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-white/10 hover:bg-white/5"
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: p.avatarColor }}
              >
                {getInitials(p.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-white">{p.name}</p>
                <p className="text-[11px] capitalize text-white/40">{p.role}</p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {p.handRaised && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-amber/20 text-brand-amber">
                    <Hand className="h-3.5 w-3.5" />
                  </span>
                )}
                {boardAccess[p.id] && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-violet/20 text-brand-violet">
                    <PenSquare className="h-3.5 w-3.5" />
                  </span>
                )}

                {mode === "teacher" && p.role === "student" ? (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-white/70 hover:bg-white/10 hover:text-white"
                      title={p.micOn ? "Mute" : "Unmute"}
                      aria-label={`${p.micOn ? "Mute" : "Unmute"} ${p.name}`}
                      onClick={() => onToggleMic(p.id)}
                    >
                      {p.micOn ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5 text-destructive" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-white/70 hover:bg-white/10 hover:text-white"
                      title={p.camOn ? "Disable video" : "Enable video"}
                      aria-label={`${p.camOn ? "Disable" : "Enable"} video for ${p.name}`}
                      onClick={() => onToggleCam(p.id)}
                    >
                      {p.camOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5 text-destructive" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn("h-7 w-7 text-white/70 hover:bg-white/10 hover:text-white", boardAccess[p.id] && "bg-brand-violet/20 text-brand-violet")}
                      title={boardAccess[p.id] ? "Revoke whiteboard access" : "Give whiteboard access"}
                      aria-label={`${boardAccess[p.id] ? "Revoke" : "Give"} whiteboard access for ${p.name}`}
                      onClick={() => onToggleBoardAccess(p.id)}
                    >
                      <PenSquare className={cn("h-3.5 w-3.5", boardAccess[p.id] && "text-brand-violet")} />
                    </Button>
                  </>
                ) : (
                  <>
                    {p.micOn ? <Mic className="h-3.5 w-3.5 text-white/40" /> : <MicOff className="h-3.5 w-3.5 text-white/25" />}
                    {p.camOn ? <Video className="h-3.5 w-3.5 text-white/40" /> : <VideoOff className="h-3.5 w-3.5 text-white/25" />}
                  </>
                )}
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-2 py-6 text-center text-xs text-white/40">No participants match "{query}"</li>
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}
