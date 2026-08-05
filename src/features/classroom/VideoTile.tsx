import { Hand, Mic, MicOff, PenSquare } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import type { Participant } from "@/types";

interface VideoTileProps {
  participant: Participant;
  canDrawBoard?: boolean;
  className?: string;
}

/** Placeholder "video" tile — no real WebRTC, just a colored gradient card with an
 * avatar/initials badge and a subtle pulse/ring treatment to suggest a live connection. */
export default function VideoTile({ participant, canDrawBoard, className }: VideoTileProps) {
  const { name, avatarColor, micOn, camOn, handRaised, speaking, role } = participant;

  return (
    <div
      className={cn(
        "group relative flex aspect-video flex-col items-center justify-center overflow-hidden rounded-2xl border shadow-card transition-all",
        speaking ? "border-brand-green shadow-[0_0_0_3px_rgba(87,179,59,0.35)]" : "border-white/10",
        className
      )}
    >
      {camOn ? (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 28% 22%, ${avatarColor}59, transparent 60%), linear-gradient(150deg, ${avatarColor}30, #0D1024 78%)`,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.06),transparent_55%)]" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-brand-navyDark" />
      )}

      <div
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full text-base font-bold text-white shadow-pop ring-4 ring-black/10 sm:h-16 sm:w-16",
          speaking && "animate-pulse"
        )}
        style={{ backgroundColor: avatarColor }}
      >
        {getInitials(name)}
      </div>

      {canDrawBoard && (
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-brand-violet/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-soft">
          <PenSquare className="h-3 w-3" /> Board access
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 via-black/20 to-transparent px-2.5 py-2">
        <span className="truncate text-xs font-semibold text-white">
          {name}
          {role === "teacher" && <span className="ml-1 text-white/60">· Teacher</span>}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {handRaised && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-amber text-amber-950">
              <Hand className="h-3 w-3" />
            </span>
          )}
          {micOn ? (
            <Mic className="h-3.5 w-3.5 text-white/85" />
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/90">
              <MicOff className="h-3 w-3 text-white" />
            </span>
          )}
        </span>
      </div>

      {!camOn && (
        <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white/70">
          Camera off
        </span>
      )}
    </div>
  );
}
