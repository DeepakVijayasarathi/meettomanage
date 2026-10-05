import { isAcademyClock, zoneOffsetMinutes } from "@/lib/familyTime";

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

/** "HH:mm" (24-hour) -> "4:15 PM". */
function toLabel(minutesOfDay: number): string {
  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

/** Start times every 15 minutes from `from` to `to` (inclusive), as 24-hour "HH:mm" values. */
function quarterHourOptions(fromHour: number, toHour: number): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let m = fromHour * 60; m <= toHour * 60; m += 15) {
    options.push({ value: `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`, label: toLabel(m) });
  }
  return options;
}

/**
 * Class start times a parent can pick, every 15 minutes (client: parents need 4:15, 4:30, ...).
 * Group classes run 4–8 PM; individual (1:1) classes 10 AM–10 PM. Before a course is chosen the
 * wider individual range is offered.
 */
export const GROUP_TIME_OPTIONS = quarterHourOptions(16, 20);
export const INDIVIDUAL_TIME_OPTIONS = quarterHourOptions(10, 22);
export const TIME_OPTIONS: { value: string; label: string }[] = INDIVIDUAL_TIME_OPTIONS;

/**
 * The class hours above are India (IST) hours. A family in another zone picks in their own clock,
 * so for `zone` each IST slot is shifted to that zone's time of day (keeping IST order, so a range
 * crossing midnight -- 9:30 PM to 1:30 AM in Melbourne -- still reads start to end).
 */
export function timeOptionsFor(
  courseType: "Individual" | "Group" | "group" | "individual" | "" | null | undefined,
  zone?: string | null
) {
  const ist = courseType?.toLowerCase() === "group" ? GROUP_TIME_OPTIONS : INDIVIDUAL_TIME_OPTIONS;
  if (!zone || isAcademyClock(zone)) return ist;
  const shift = zoneOffsetMinutes(zone) - zoneOffsetMinutes("Asia/Kolkata");
  return ist.map((t) => {
    const [h, m] = t.value.split(":").map(Number);
    const local = (((h * 60 + m + shift) % 1440) + 1440) % 1440;
    return { value: `${String(Math.floor(local / 60)).padStart(2, "0")}:${String(local % 60).padStart(2, "0")}`, label: toLabel(local) };
  });
}

/** "4:00 PM – 8:00 PM" for the course type, in `zone` when given. */
export function classHoursLabel(courseType: Parameters<typeof timeOptionsFor>[0], zone?: string | null): string {
  const options = timeOptionsFor(courseType, zone);
  return `${options[0].label} – ${options[options.length - 1].label}`;
}

const LEGACY_TIME_LABELS: Record<string, string> = {
  morning: "Morning (8am–12pm)",
  afternoon: "Afternoon (12pm–4pm)",
  evening: "Evening (4pm–8pm)",
};

/** A group batch needs this many preferred slots on every chosen day (an individual batch needs one). */
export const GROUP_SLOTS_PER_DAY = 2;

/**
 * A day's value in `dayTimes` is one "HH:mm" for an individual batch, or the two slots joined with
 * a comma ("16:00,18:00", first choice first) for a group batch -- so the stored shape (a string
 * per day) and the older single-time values keep working unchanged.
 */
export function splitSlots(value: string | undefined): string[] {
  return (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/** True when every slot a day needs is filled in and (for a group batch) the slots differ. */
export function daySlotsComplete(value: string | undefined, slotsNeeded: number): boolean {
  const slots = splitSlots(value);
  return slots.length === slotsNeeded && new Set(slots).size === slots.length;
}

/** "4:00 PM" for one slot, "4:00 PM + 6:00 PM" for a day's two group slots. */
export function timeLabel(value: string): string {
  return splitSlots(value)
    .map((slot) => {
      const m = /^(\d{2}):(\d{2})$/.exec(slot);
      if (m) return toLabel(Number(m[1]) * 60 + Number(m[2]));
      return LEGACY_TIME_LABELS[slot] ?? slot;
    })
    .join(" + ");
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
