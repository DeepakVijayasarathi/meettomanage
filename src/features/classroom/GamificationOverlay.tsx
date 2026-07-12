import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import type { LeaderboardEntry } from "./classroomData";

interface GamificationOverlayProps {
  celebrating: boolean;
  onCelebrationEnd: () => void;
  leaderboard: LeaderboardEntry[];
}

const MEDAL_STYLES = [
  "bg-amber-400 text-amber-950",
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

export default function GamificationOverlay({ celebrating, onCelebrationEnd, leaderboard }: GamificationOverlayProps) {
  const [collapsed, setCollapsed] = useState(false);

  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.1 + Math.random() * 0.9,
        color: CHART_PALETTE[i % CHART_PALETTE.length],
        size: 6 + Math.random() * 8,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [celebrating]
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
        <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
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
            <div className="animate-pop-in rounded-2xl border border-white/10 bg-[#12162B]/95 px-7 py-5 text-center backdrop-blur">
              <p className="font-display text-xl font-bold text-white sm:text-2xl">Great job! 🎉</p>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          "absolute right-3 top-3 z-20 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#12162B]/95 backdrop-blur transition-[height] duration-150",
          collapsed && "h-11"
        )}
      >
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-white/40 hover:text-white/70"
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Trophy className="h-4 w-4 text-brand-amber" /> Leaderboard
          </span>
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
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
                <span title={badgeFor(entry.stars)!.label} className="text-sm leading-none">
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
    </>
  );
}
