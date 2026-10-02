import { useState } from "react";
import { CalendarClock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChildDetailsDialog } from "@/components/ChildDetailsDialog";
import { useApiData } from "@/api/hooks";
import { getChildSchedulePreference, type ApiChildSchedulePreference } from "@/api/parentPortal";
import { formatSchedulePreference, readSchedulePreference } from "@/lib/schedulePreference";
import { formatDate } from "@/lib/utils";

/**
 * Parent dashboard card for the selected child: until the parent has told us their preferred
 * class days/times it asks for them (click the child's name or the button); afterwards it shows
 * what was saved with an Edit action. The form saves onto the existing child.
 */
export function ChildDetailsPrompt({ childId, childName }: { childId: string; childName: string }) {
  const [open, setOpen] = useState(false);
  const { data: pref, loading, reload } = useApiData<ApiChildSchedulePreference | null>(
    () => getChildSchedulePreference(childId),
    null,
    undefined,
    { cacheKey: `child-schedule-pref:${childId}`, ttlMs: 30_000 }
  );
  const firstName = childName.split(" ")[0];
  const submitted = pref?.hasSubmitted === true;

  // Don't flash the "please fill this in" prompt at a parent who already did while it loads.
  if (loading && !pref) return null;

  return (
    <>
      <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 border-primary/30 bg-primary/5 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock className="h-4.5 w-4.5" />
          </span>
          {submitted ? (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                <button type="button" onClick={() => setOpen(true)} className="underline decoration-dotted underline-offset-4 hover:text-primary">
                  {firstName}
                </button>
                's preferred schedule
              </p>
              <p className="text-sm text-muted-foreground">
                {formatSchedulePreference(readSchedulePreference({ preferredDays: pref!.preferredDays, dayTimes: pref!.dayTimes, daysPerWeek: pref!.daysPerWeek }))}
                {pref!.preferredStartDate ? ` · from ${formatDate(pref!.preferredStartDate, "long")}` : ""}
              </p>
            </div>
          ) : (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Tell us when{" "}
                <button type="button" onClick={() => setOpen(true)} className="underline decoration-dotted underline-offset-4 hover:text-primary">
                  {firstName}
                </button>{" "}
                would like classes
              </p>
              <p className="text-sm text-muted-foreground">
                Preferred days &amp; timings, start date and school details — we use this to set up the class schedule, no WhatsApp needed.
              </p>
            </div>
          )}
        </div>
        <Button size="sm" variant={submitted ? "outline" : "default"} onClick={() => setOpen(true)}>
          {submitted && <Pencil className="h-3.5 w-3.5" />}
          {submitted ? "Edit details" : "Add details"}
        </Button>
      </Card>

      <ChildDetailsDialog childId={childId} childName={childName} open={open} onOpenChange={setOpen} onSaved={() => reload()} />
    </>
  );
}
