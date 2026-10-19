import { Hand, MicOff, PenSquare, Pin, PinOff } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import type { Participant } from "@/types";

interface VideoTileProps {
  participant: Participant;
  isSelf?: boolean;
  canDrawBoard?: boolean;
  pinned?: boolean;
  onTogglePin?: () => void;
  /** Filmstrip tiles are small — scale the avatar and labels down. */
  compact?: boolean;
  className?: string;
}

/** Three bars that bounce while someone speaks — Meet's "audio level" indicator. */
function SpeakingBars() {
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-full w-[3px] origin-bottom animate-orb-wave rounded-full bg-white motion-reduce:animate-none"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

/**
 * Placeholder "video" tile (no real WebRTC in the demo classroom). Styled after Google Meet:
 * flat charcoal tile, large centred avatar, name bottom-left, audio state top-right, blue
 * outline while speaking, and a pin control on hover.
 */
export default function VideoTile({ participant, isSelf, canDrawBoard, pinned, onTogglePin, compact, className }: VideoTileProps) {
  const { name, avatarColor, micOn, camOn, handRaised, speaking, role } = participant;
  const label = isSelf ? "You" : name;

  return (
    <div
      className={cn(
        "group relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-xl bg-call-raised",
        className
      )}
    >
      {/* Camera on: a soft, desaturated wash standing in for the video feed. */}
      {camOn && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(120% 90% at 50% 35%, ${avatarColor}40 0%, #1b1f26 70%), #1b1f26`,
          }}
        />
      )}

      <div
        className={cn(
          "relative flex items-center justify-center rounded-full font-medium text-white",
          compact ? "h-12 w-12 text-lg" : "h-20 w-20 text-3xl sm:h-28 sm:w-28 sm:text-4xl",
          speaking && "ring-4 ring-brand-orange/40 ring-offset-0"
        )}
        style={{ backgroundColor: avatarColor }}
      >
        {getInitials(name)}
      </div>

      {/* Speaking outline sits above the content so it's never clipped. */}
      <span
        className={cn(
          "pointer-events-none absolute inset-0 rounded-xl border-[3px] transition-colors",
          speaking ? "border-brand-orange" : "border-transparent"
        )}
      />

      {/* Top-left: raised hand / board access */}
      <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
        {handRaised && (
          <span className="flex items-center gap-1 rounded-full bg-brand-amber px-2 py-1 text-xs font-medium text-call-bg">
            <Hand className="h-3.5 w-3.5" /> {!compact && "Hand raised"}
          </span>
        )}
        {canDrawBoard && (
          <span className="flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-xs text-white" title="Can draw on the whiteboard">
            <PenSquare className="h-3.5 w-3.5" /> {!compact && "Board"}
          </span>
        )}
      </div>

      {/* Top-right: audio state */}
      <div className="absolute right-2.5 top-2.5">
        {!micOn ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/55" title="Muted">
            <MicOff className="h-4 w-4 text-white" aria-label="Muted" />
          </span>
        ) : speaking ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange-deep" title="Speaking">
            <SpeakingBars />
          </span>
        ) : null}
      </div>

      {/* Hover: pin to spotlight */}
      {onTogglePin && (
        <button
          onClick={onTogglePin}
          aria-label={pinned ? `Unpin ${label}` : `Pin ${label}`}
          title={pinned ? "Unpin" : "Pin to main screen"}
          className={cn(
            "absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/75 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange group-hover:opacity-100",
            compact && "h-9 w-9"
          )}
        >
          {pinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
        </button>
      )}

      {/* Bottom-left: name, Meet style (plain text with a shadow, no bar) */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 px-3 pb-2.5 pt-6">
        {pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-white" aria-label="Pinned" />}
        <span className={cn("truncate font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]", compact ? "text-xs" : "text-sm")}>
          {label}
          {role === "teacher" && !compact && <span className="font-normal text-white/70"> · Teacher</span>}
        </span>
        {!camOn && !compact && <span className="sr-only">(camera off)</span>}
      </div>
    </div>
  );
}
