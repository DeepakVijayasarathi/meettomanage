import { CalendarClock } from "lucide-react";
import type { ApiChildSchedulePreference } from "@/api/parentPortal";
import { formatDate } from "@/lib/utils";
import { SCHEDULE_DAYS, timeLabel } from "@/lib/schedulePreference";

/**
 * Staff view (Users → Students) of what the parent entered from the portal: preferred days and
 * times, start date, school and so on — so scheduling no longer needs a WhatsApp conversation.
 */
export function ChildSchedulePreferenceSummary({ preference }: { preference?: ApiChildSchedulePreference | null }) {
  if (!preference?.hasSubmitted) {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>The parent hasn't submitted this child's preferred schedule yet. They'll see a prompt on their portal dashboard.</span>
      </div>
    );
  }

  const days = SCHEDULE_DAYS.filter((d) => preference.preferredDays.includes(d));
  const rows: [string, string | null | undefined][] = [
    ["Course", preference.courseName],
    ["Start from", preference.preferredStartDate ? formatDate(preference.preferredStartDate, "long") : null],
    ["School", preference.schoolName],
    ["Grade", preference.grade],
    ["Prior experience", preference.priorExperience],
    ["Allergies / medical", preference.allergies],
    ["Other notes", preference.notes],
  ];

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <CalendarClock className="h-4 w-4 text-primary" /> Preferred schedule (from parent)
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {days.map((d) => (
          <span key={d} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {d} · {preference.dayTimes[d] ? timeLabel(preference.dayTimes[d]) : "—"}
          </span>
        ))}
      </div>
      <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
        {rows
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-foreground">{value}</dd>
            </div>
          ))}
      </dl>
      {preference.submittedAtUtc && (
        <p className="mt-2 text-xs text-muted-foreground">Submitted {formatDate(preference.submittedAtUtc, "long")}</p>
      )}
    </div>
  );
}
