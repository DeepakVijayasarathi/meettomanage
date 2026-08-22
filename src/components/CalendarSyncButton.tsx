import { useState } from "react";
import { CalendarPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiEnabled } from "@/lib/api";
import { getCalendarFeedUrl } from "@/api/sessions";

/**
 * Calendar sync: copies the user's personal iCalendar feed URL so they can
 * subscribe from Google/Outlook/Apple Calendar. Hidden in demo mode (no backend).
 */
export function CalendarSyncButton() {
  const [state, setState] = useState<"idle" | "busy" | "copied" | "error">("idle");

  if (!apiEnabled()) return null;

  async function handleClick() {
    setState("busy");
    try {
      const url = await getCalendarFeedUrl();
      await navigator.clipboard.writeText(url);
      setState("copied");
      setTimeout(() => setState("idle"), 3000);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={state === "busy"} aria-live="polite" className="gap-1.5">
      {state === "copied" ? <Check className="h-3.5 w-3.5" /> : <CalendarPlus className="h-3.5 w-3.5" />}
      {state === "copied" ? "Link copied" : state === "error" ? "Copy failed" : "Calendar sync"}
    </Button>
  );
}
