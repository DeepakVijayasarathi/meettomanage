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
  /**
   * When true, the leaderboard card gives up its own absolute top-right positioning and
   * renders as a plain block instead — for JitsiLive, which stacks it above the "Joined"
   * roster card in one shared flex column so the two (both teacher-only, both shown
   * whenever the Interactive panel is closed) never land on the exact same corner and
   * overlap. LiveClassroom's mock/demo screen has no second card to share that corner
   * with, so it leaves this off and keeps the card self-positioned as before.
   */
  stacked?: boolean;
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
  stacked,
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
  // Mixed rounded-sm/rounded-full shapes (not one shape repeated 44 times) and a
  // per-piece horizontal drift so the fall reads as tumbling paper, not a straight drop.
  const pieces = useMemo(
    () =>
      reducedMotion
        ? []
        : Array.from({ length: 44 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 0.5,
            duration: 1.5 + Math.random() * 1.1,
            color: CHART_PALETTE[i % CHART_PALETTE.length],
            size: 6 + Math.random() * 8,
            drift: (Math.random() - 0.5) * 90,
            round: i % 3 === 0,
          })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [celebrating, reducedMotion]
  );

  // A dozen sparks fired outward from the card in a full circle — the radial "burst"
  // layer, distinct from the falling confetti above it.
  const sparks = useMemo(
    () =>
      reducedMotion
        ? []
        : Array.from({ length: 12 }, (_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const distance = 70 + Math.random() * 50;
            return {
              id: i,
              tx: Math.cos(angle) * distance,
              ty: Math.sin(angle) * distance,
              delay: Math.random() * 0.1,
              color: CHART_PALETTE[i % CHART_PALETTE.length],
            };
          }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [celebrating, reducedMotion]
  );

  useEffect(() => {
    if (!celebrating) return;
    // Matches the longer confetti fall (animate-confetti is 1.9s) plus a beat to let
    // the last pieces settle before the banner itself dismisses.
    const t = setTimeout(onCelebrationEnd, 2200);
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
              className={cn("absolute top-0 block animate-confetti", p.round ? "rounded-full" : "rounded-sm")}
              style={{
                left: `${p.left}%`,
                width: p.size,
                height: p.round ? p.size : p.size * 1.6,
                backgroundColor: p.color,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                ["--drift" as string]: `${p.drift}px`,
              }}
            />
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            {sparks.map((s) => (
              <span
                key={s.id}
                className="absolute left-1/2 top-1/2 block h-2 w-2 animate-spark-burst rounded-full"
                style={{
                  backgroundColor: s.color,
                  animationDelay: `${s.delay}s`,
                  ["--tx" as string]: `${s.tx}px`,
                  ["--ty" as string]: `${s.ty}px`,
                }}
              />
            ))}
            <div
              className={cn(
                "relative flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-white/10 bg-brand-navy/95 px-9 py-7 text-center shadow-2xl shadow-black/50 ring-1 ring-white/10 backdrop-blur-xl",
                !reducedMotion && "animate-pop-in"
              )}
            >
              {/* Soft radial glow behind the emoji badge — purely decorative, ties the
                  celebration moment to the same violet/amber accent used everywhere else
                  a "this matters" moment appears (celebrate button, active toggles). */}
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(245,165,36,0.18),transparent_60%)]"
                aria-hidden="true"
              />
              <span
                className={cn(
                  "relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-amber to-brand-violet text-3xl leading-none shadow-lg shadow-brand-violet/40",
                  !reducedMotion && "animate-badge-pop"
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
        // w-64 (was w-52) matches JitsiLive's Joined roster card — the two used to be
        // visibly mismatched widths stacked in the same corner, which read as sloppy
        // rather than one deliberate card family.
        <div
          className={cn(
            "z-20 w-64 overflow-hidden rounded-2xl border border-white/10 bg-brand-navy/90 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-xl transition-[height] duration-150",
            stacked ? "shrink-0" : "absolute right-3 top-3",
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
                <span className="min-w-0 flex-1 truncate font-medium text-white/85">{entry.name}</span>
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
