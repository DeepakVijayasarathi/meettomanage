/**
 * The signed-in user's own timezone (session.tsx keeps this in sync with their account
 * setting — see setTimeZoneId). Read directly from localStorage rather than via React
 * context so the plain conversion functions below (and the many non-component call sites
 * that use them, like toFrontendSession) don't need a timezone threaded through every
 * signature. Defaults to Asia/Kolkata — the same fixed zone every session time in this
 * app was hardcoded to before per-user timezones existed, so an unset preference behaves
 * exactly as before.
 */
const TIMEZONE_KEY = "trn.timeZoneId";
const DEFAULT_TIME_ZONE = "Asia/Kolkata";

export function getUserTimeZone(): string {
  if (typeof window === "undefined") return DEFAULT_TIME_ZONE;
  return localStorage.getItem(TIMEZONE_KEY) || DEFAULT_TIME_ZONE;
}

export function setUserTimeZone(timeZoneId: string | null) {
  if (typeof window === "undefined") return;
  if (timeZoneId) localStorage.setItem(TIMEZONE_KEY, timeZoneId);
  else localStorage.removeItem(TIMEZONE_KEY);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * A timezone's offset from UTC (in minutes) at a specific instant — not a constant, since
 * it varies by DST. Standard trick: format the instant as wall-clock digits in that zone,
 * re-interpret those same digits as if they were UTC, and diff against the real instant.
 */
function offsetMinutesAt(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return (asUtc - instant.getTime()) / 60_000;
}

/**
 * Combines a "YYYY-MM-DD" date and "HH:mm" time — entered by the user as their own
 * timezone's wall-clock time — into a UTC ISO string, independent of the browser's own
 * timezone. Plain `new Date(`${date}T${time}`)` would parse the input as browser-local
 * time, which only happens to be correct if the machine's own clock matches `timeZone`.
 */
export function zonedToUtcIso(date: string, time: string, timeZone: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  // The offset itself depends on the instant (DST), so this resolves it from a same-day
  // approximation first, then applies it — accurate except in the rare case of a
  // scheduled time that falls inside that zone's own DST transition gap that day.
  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute);
  const offset = offsetMinutesAt(new Date(naiveUtcMs), timeZone);
  return new Date(naiveUtcMs - offset * 60_000).toISOString();
}

/** Inverse of zonedToUtcIso: splits a UTC ISO string into that timezone's "YYYY-MM-DD" and "HH:mm". */
export function utcIsoToZonedDateTime(isoUtc: string, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(isoUtc));
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  return { date: `${map.year}-${map.month}-${map.day}`, time: `${pad(Number(map.hour))}:${pad(Number(map.minute))}` };
}

/** Short display label for the signed-in user's own timezone, e.g. "IST", "EST", "GMT+5:30". */
export function getUserTimeZoneAbbreviation(): string {
  const timeZone = getUserTimeZone();
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}

/** zonedToUtcIso against the signed-in user's own timezone (getUserTimeZone). */
export function localToUtcIso(date: string, time: string): string {
  return zonedToUtcIso(date, time, getUserTimeZone());
}

/** utcIsoToZonedDateTime against the signed-in user's own timezone (getUserTimeZone). */
export function utcIsoToLocalDateTime(isoUtc: string): { date: string; time: string } {
  return utcIsoToZonedDateTime(isoUtc, getUserTimeZone());
}
