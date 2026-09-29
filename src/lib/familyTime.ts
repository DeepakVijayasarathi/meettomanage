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
