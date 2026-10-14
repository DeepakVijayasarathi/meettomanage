import { getUserTimeZone, zonedToUtcIso } from "@/lib/datetime";

/**
 * Staff schedule in their own (India) time, but a family abroad lives a different day: 3:30 AM
 * IST on a Tuesday is 6:00 PM on Monday in New York. Reported live -- parents abroad saw classes
 * on different days than agreed, and staff had no way to notice. These helpers show staff the
 * family's own local day and time.
 */

function offsetLabel(instant: Date, zone: string): string {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "short" })
      .formatToParts(instant)
      .find((p) => p.type === "timeZoneName")?.value ?? zone
  );
}

function sameOffset(instant: Date, a: string, b: string): boolean {
  try {
    const fmt = (z: string) =>
      new Intl.DateTimeFormat("en-US", { timeZone: z, timeZoneName: "shortOffset" })
        .formatToParts(instant)
        .find((p) => p.type === "timeZoneName")?.value;
    return fmt(a) === fmt(b);
  } catch {
    return true;
  }
}

/** e.g. "Mon 28 Sep, 6:00 PM EDT" — one class instant as seen in `zone`. */
export function formatInZone(instant: Date, zone: string): string {
  const text = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(instant);
  return `${text.replace(/\bam\b/i, "AM").replace(/\bpm\b/i, "PM")} ${offsetLabel(instant, zone)}`;
}

/**
 * The family's local day/time for a class, for every parent zone that differs from the viewer's
 * own; empty when everyone shares the viewer's zone. `date`/`time` are in the viewer's zone.
 */
export function familyTimes(date: string, time: string, parentZones: string[] | undefined): string[] {
  if (!parentZones || parentZones.length === 0 || !date || !time) return [];
  const viewer = getUserTimeZone();
  let instant: Date;
  try {
    instant = new Date(zonedToUtcIso(date, time, viewer));
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const zone of parentZones) {
    try {
      if (!sameOffset(instant, zone, viewer)) out.push(formatInZone(instant, zone));
    } catch {
      /* an unknown zone id: skip */
    }
  }
  return Array.from(new Set(out));
}

/**
 * For the schedule editors (which take a weekday + time in IST): what that weekly slot is for a
 * family in `zone`, e.g. "Mon 6:00 PM EDT". Uses the next occurrence of that IST weekday.
 */
export function istSlotInZone(dayOfWeek: number, timeIst: string, zone: string): string | null {
  try {
    const now = new Date();
    const todayIst = new Date(zonedToUtcIso(now.toISOString().slice(0, 10), "12:00", "Asia/Kolkata"));
    const istWeekday = Number(
      new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short" })
        .formatToParts(todayIst)
        .find((p) => p.type === "weekday")
        ?.value.replace(/Sun/, "0").replace(/Mon/, "1").replace(/Tue/, "2").replace(/Wed/, "3").replace(/Thu/, "4").replace(/Fri/, "5").replace(/Sat/, "6")
    );
    const ahead = (dayOfWeek - istWeekday + 7) % 7;
    const target = new Date(todayIst.getTime() + ahead * 86_400_000);
    const dateIst = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(target);
    const instant = new Date(zonedToUtcIso(dateIst, timeIst, "Asia/Kolkata"));
    if (sameOffset(instant, zone, "Asia/Kolkata")) return null;
    const text = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(instant);
    return `${text} ${offsetLabel(instant, zone)}`;
  } catch {
    return null;
  }
}

const ACADEMY_ZONE = "Asia/Kolkata";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Minutes east of UTC for `zone` at `instant` (e.g. +330 for India, +660 for Melbourne in summer). */
export function zoneOffsetMinutes(zone: string, instant: Date = new Date()): number {
  try {
    const name =
      new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
        .formatToParts(instant)
        .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
    const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
    if (!m) return 0;
    const minutes = Number(m[2]) * 60 + Number(m[3] ?? 0);
    return m[1] === "-" ? -minutes : minutes;
  } catch {
    return 0;
  }
}

/** True when `zone` keeps the academy's (India) clock right now. */
export function isAcademyClock(zone: string | null | undefined): boolean {
  return !zone || zone === ACADEMY_ZONE || zoneOffsetMinutes(zone) === zoneOffsetMinutes(ACADEMY_ZONE);
}

/** "Australia/Melbourne" -> "Melbourne". */
export function zoneCity(zone: string): string {
  return (zone.split("/").pop() ?? zone).replace(/_/g, " ");
}

/**
 * A weekly slot -- weekday ("Tue") + "HH:mm" -- chosen in `fromZone`, as the same moment in
 * `toZone`. The weekday can change across midnight: Tue 12:30 AM Melbourne is Mon 7:00 PM IST.
 */
export function weeklySlotIn(day: string, time: string, fromZone: string, toZone: string): { day: string; time: string } | null {
  try {
    const target = WEEKDAYS.indexOf(day as (typeof WEEKDAYS)[number]);
    if (target < 0 || !/^\d{2}:\d{2}$/.test(time)) return null;
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const probe = new Date(now.getTime() + i * 86_400_000);
      const date = new Intl.DateTimeFormat("en-CA", { timeZone: fromZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(probe);
      const weekday = new Intl.DateTimeFormat("en-US", { timeZone: fromZone, weekday: "short" }).format(probe);
      if (weekday !== day) continue;
      const instant = new Date(zonedToUtcIso(date, time, fromZone));
      const parts = new Intl.DateTimeFormat("en-GB", { timeZone: toZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(instant);
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
      return { day: get("weekday"), time: `${get("hour")}:${get("minute")}` };
    }
    return null;
  } catch {
    return null;
  }
}

function clockLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/**
 * Staff label for a preferred weekly slot the parent chose in `zone`: "Tue 6:00 PM" for a family
 * on India time, otherwise "Tue 6:00 PM Melbourne (Tue 12:30 PM IST)" -- reported live: a
 * Melbourne parent's "6:00 PM" was read as 6:00 PM India time.
 */
export function describePreferredSlot(day: string, time: string, zone: string | null | undefined): string {
  // A group batch's day carries two comma-joined slots ("16:00,18:00"): describe each one.
  if (time.includes(",")) {
    const slots = time.split(",").map((s) => s.trim()).filter(Boolean);
    if (slots.length > 1) return slots.map((s) => describePreferredSlot(day, s, zone)).join(" + ");
    time = slots[0] ?? time;
  }
  const local = `${day} ${clockLabel(time)}`;
  if (!zone || isAcademyClock(zone)) return local;
  const ist = weeklySlotIn(day, time, zone, ACADEMY_ZONE);
  return ist ? `${local} ${zoneCity(zone)} (${ist.day} ${clockLabel(ist.time)} IST)` : `${local} ${zoneCity(zone)}`;
}
