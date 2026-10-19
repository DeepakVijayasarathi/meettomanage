import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "./classroomData";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Stars leaderboard as a side panel (the demo classroom's Meet-style layout keeps the video stage clear). */
export default function LeaderboardPanel({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  const sorted = [...leaderboard].sort((a, b) => b.stars - a.stars);
  const top = sorted[0]?.stars || 1;

  return (
    <div className="h-full overflow-y-auto px-4 pb-4">
      <p className="mb-3 text-sm text-white/60">Stars earned in class today. Top three get a medal.</p>
      <ol className="space-y-1">
        {sorted.map((entry, i) => (
          <li key={entry.id} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5", i < 3 && "bg-white/[0.05]")}>
            <span className="w-6 text-center text-lg leading-none" aria-label={`Rank ${i + 1}`}>
              {MEDALS[i] ?? <span className="text-sm font-medium text-white/50">{i + 1}</span>}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{entry.name}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${(entry.stars / top) * 100}%`, backgroundColor: entry.color }} />
              </div>
            </div>
            <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-[#FFC24B]">
              <Star className="h-4 w-4 fill-current" /> {entry.stars}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
