import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Star, Trophy, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { isSoundMuted, playCelebration, setSoundMuted } from "@/lib/sounds";
import type { LeaderboardEntry } from "./classroomData";

interface GamificationOverlayProps {
  celebrating: boolean;
  onCelebrationEnd: () => void;
  leaderboard: LeaderboardEntry[];
  /** Custom banner for special moments (e.g. birthdays); defaults to the reward cheer. */
  message?: string;
  /**
   * The persistent mini leaderboard card, not the celebration banner (that always shows
   * regardless — it's transient chrome, not overlapping anything). False whenever the
   * Interactive panel's own Stars tab already carries this same leaderboard, so the two
   * don't render the same "who's winning" info stacked on top of each other in the video
   * pane — same reasoning as the "Joined" roster card right next to it.
   */
  showLeaderboardCard: boolean;
}

const MEDAL_STYLES = [
  "bg-brand-amber text-amber-950",
  "bg-slate-300 text-slate-800",
  "bg-orange-300 text-orange-900",
];

// Milestone badges earned as stars accumulate during the class
const MILESTONES: { stars: number; badge: string; label: string }[] = [
  { stars: 10, badge: "🏆", label: "Champion — 10 stars" },
  { stars: 6, badge: "🥈", label: "Star Reader — 6 stars" },
  { stars: 3, badge: "🥉", label: "Rising Star — 3 stars" },
];

function badgeFor(stars: number) {
  return MILESTONES.find((m) => stars >= m.stars);
}

export default function GamificationOverlay({
  celebrating,
  onCelebrationEnd,
  leaderboard,
  message,
  showLeaderboardCard,
}: GamificationOverlayProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [muted, setMuted] = useState(() => isSoundMuted());
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggleMuted() {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  }

  // Dhol + clapping accompany every celebration moment (skipped if muted, via playCelebration itself)
  useEffect(() => {
    if (celebrating) playCelebration();
  }, [celebrating]);

  // Skipping confetti generation entirely (not just hiding it with CSS) for
  // prefers-reduced-motion — the celebration banner alone still confirms the moment.
  const pieces = useMemo(
    () =>
      reducedMotion
        ? []
        : Array.from({ length: 36 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 0.5,
            duration: 1.1 + Math.random() * 0.9,
            color: CHART_PALETTE[i % CHART_PALETTE.length],
            size: 6 + Math.random() * 8,
          })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [celebrating, reducedMotion]
  );

  useEffect(() => {
    if (!celebrating) return;
    const t = setTimeout(onCelebrationEnd, 1700);
    return () => clearTimeout(t);
  }, [celebrating, onCelebrationEnd]);

  const sorted = [...leaderboard].sort((a, b) => b.stars - a.stars);

  return (
    <>
      {celebrating && (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
          {pieces.map((p) => (
            <span
              key={p.id}
              className="absolute top-0 block animate-confetti rounded-sm"
              style={{
                left: `${p.left}%`,
                width: p.size,
                height: p.size * 1.6,
                backgroundColor: p.color,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={cn(
                "flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-brand-navy/95 px-8 py-6 text-center shadow-2xl shadow-black/40 backdrop-blur",
                !reducedMotion && "animate-pop-in"
              )}
            >
              <span
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-amber to-brand-violet text-3xl leading-none",
                  !reducedMotion && "animate-bounce"
                )}
              >
                👏
              </span>
              {/* role="status": this mounts/dismisses on its own (sound + a 1.7s auto-timeout,
                  see below) with no click to anchor a screen reader's attention — without an
                  announcement, a celebration that isn't seen or heard (sound muted) leaves no
                  trace at all for that user. */}
              <p role="status" className="font-display text-xl font-bold text-white sm:text-2xl">
                {message ?? "Great job, everyone!"}
              </p>
            </div>
          </div>
        </div>
      )}

      {showLeaderboardCard && (
        <div
          className={cn(
            "absolute right-3 top-3 z-20 w-52 overflow-hidden rounded-2xl border border-white/10 bg-brand-navy/95 backdrop-blur transition-[height] duration-150",
            collapsed && "h-11"
          )}
        >
          <div className="flex items-center justify-between px-3 py-2.5 text-white/40">
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand leaderboard" : "Collapse leaderboard"}
              className="flex flex-1 items-center justify-between text-left hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <Trophy className="h-4 w-4 text-brand-amber" /> Leaderboard
              </span>
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <button
              onClick={toggleMuted}
              aria-label={muted ? "Unmute celebration sounds" : "Mute celebration sounds"}
              title={muted ? "Unmute celebration sounds" : "Mute celebration sounds"}
              className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </div>
          <ul className="space-y-1 px-2 pb-2.5">
            {sorted.slice(0, 5).map((entry, i) => (
              <li
                key={entry.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
                style={{ backgroundColor: i < 3 ? `${entry.color}1F` : undefined }}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    i < 3 ? MEDAL_STYLES[i] : "bg-white/10 text-white/50"
                  )}
                >
                  {i + 1}
                </span>
                <span className="flex-1 truncate font-medium text-white/85">{entry.name}</span>
                {badgeFor(entry.stars) && (
                  // role="img" + aria-label (not just title): a bare <span> with only a title
                  // attribute isn't focusable and many screen readers don't reliably expose
                  // title text in browse mode, so the emoji's meaning was effectively lost.
                  <span
                    role="img"
                    aria-label={badgeFor(entry.stars)!.label}
                    title={badgeFor(entry.stars)!.label}
                    className="text-sm leading-none"
                  >
                    {badgeFor(entry.stars)!.badge}
                  </span>
                )}
                <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: entry.color }}>
                  <Star className="h-3 w-3 fill-current" />
                  {entry.stars}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
