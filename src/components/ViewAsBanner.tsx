import { useEffect, useState } from "react";
import { Eye, LogOut } from "lucide-react";
import { getViewAs } from "@/lib/authStorage";
import { exitViewAs } from "@/lib/viewAs";

/**
 * Always-visible strip in a "View as parent" tab (see lib/viewAs.ts): who is being viewed,
 * that it's read-only, a countdown to when the session ends, and Exit. Renders nothing in
 * an ordinary tab. Ends the tab itself when the time runs out.
 */
export function ViewAsBanner() {
  const [info] = useState(getViewAs);
  const [now, setNow] = useState(() => Date.now());

  const endsAt = info ? new Date(info.expiresAtUtc).getTime() : 0;
  const minutesLeft = Math.max(0, Math.ceil((endsAt - now) / 60_000));

  useEffect(() => {
    if (!info) return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [info]);

  useEffect(() => {
    if (info && now >= endsAt) void exitViewAs();
  }, [info, now, endsAt]);

  if (!info) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[100] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-warning/50 bg-warning/95 py-1.5 pl-4 pr-1.5 text-sm text-warning-foreground shadow-lg"
    >
      <Eye className="h-4 w-4 shrink-0" />
      <span className="truncate">
        Viewing as <strong>{info.parentName}</strong> · read-only · {minutesLeft} min left
      </span>
      <button
        type="button"
        onClick={() => void exitViewAs()}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LogOut className="h-3.5 w-3.5" /> Exit
      </button>
    </div>
  );
}
