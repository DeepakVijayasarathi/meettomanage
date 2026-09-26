/**
 * Schedule preference collected on the parent's enrollment form: how many days a week, which days,
 * and a preferred start time for each day -- so the RM can pick a teacher and build the batch
 * without a separate conversation with the parent.
 *
 * Stored inside the form's answers JSON as `daysPerWeek`, `preferredDays` and `dayTimes`
 * ({ Mon: "16:00", Thu: "18:00" }). `preferredDays` keeps its original meaning and `preferredTime`
 * is still written (a coarse morning/afternoon/evening bucket of the earliest chosen day) so older
 * readers and forms submitted before this existed keep working.
 */

export const SCHEDULE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const DAYS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Hourly start times, 8 AM to 8 PM: the value is the 24-hour "HH:00" the RM schedules against. */
export const TIME_OPTIONS: { value: string; label: string }[] = Array.from({ length: 13 }, (_, i) => {
  const hour = 8 + i;
  const label = `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
  return { value: `${String(hour).padStart(2, "0")}:00`, label };
});

const LEGACY_TIME_LABELS: Record<string, string> = {
  morning: "Morning (8am–12pm)",
  afternoon: "Afternoon (12pm–4pm)",
  evening: "Evening (4pm–8pm)",
};

export function timeLabel(value: string): string {
  return TIME_OPTIONS.find((t) => t.value === value)?.label ?? LEGACY_TIME_LABELS[value] ?? value;
}

/** morning / afternoon / evening bucket for an "HH:mm" value, for the legacy `preferredTime` field. */
export function timeBucket(value: string): "morning" | "afternoon" | "evening" | "" {
  const hour = Number(value.slice(0, 2));
  if (!Number.isFinite(hour) || value === "") return "";
  if (hour < 12) return "morning";
  return hour < 16 ? "afternoon" : "evening";
}

export interface SchedulePreference {
  daysPerWeek: number | null;
  days: string[];
  dayTimes: Record<string, string>;
  /** Only set on forms submitted before per-day times existed. */
  legacyTime: string;
}

/** Reads a schedule preference from a submitted form's answers, tolerating the older shape. */
export function readSchedulePreference(answers: Record<string, unknown>): SchedulePreference {
  const days = Array.isArray(answers.preferredDays) ? (answers.preferredDays as string[]) : [];
  const rawTimes = answers.dayTimes && typeof answers.dayTimes === "object" ? (answers.dayTimes as Record<string, unknown>) : {};
  const dayTimes: Record<string, string> = {};
  for (const [day, time] of Object.entries(rawTimes)) if (typeof time === "string" && time) dayTimes[day] = time;
  const perWeek = Number(answers.daysPerWeek);
  return {
    daysPerWeek: Number.isInteger(perWeek) && perWeek > 0 ? perWeek : days.length > 0 ? days.length : null,
    days,
    dayTimes,
    legacyTime: typeof answers.preferredTime === "string" ? answers.preferredTime : "",
  };
}

/** Days in week order, each with its chosen time when there is one: "Mon 4:00 PM · Thu 6:00 PM". */
export function formatSchedulePreference(pref: SchedulePreference): string {
  if (pref.days.length === 0) return "—";
  const ordered = SCHEDULE_DAYS.filter((d) => pref.days.includes(d));
  const parts = ordered.map((d) => (pref.dayTimes[d] ? `${d} ${timeLabel(pref.dayTimes[d])}` : d));
  const legacy = Object.keys(pref.dayTimes).length === 0 && pref.legacyTime ? ` · ${timeLabel(pref.legacyTime)}` : "";
  return parts.join(" · ") + legacy;
}
