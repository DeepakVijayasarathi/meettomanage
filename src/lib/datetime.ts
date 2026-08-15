const IST_OFFSET_MINUTES = 5 * 60 + 30;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Combines a "YYYY-MM-DD" date and "HH:mm" time — entered by the user as IST wall-clock
 * time — into a UTC ISO string, independent of the browser's own timezone. Plain
 * `new Date(`${date}T${time}`)` would parse the input as browser-local time, which only
 * happens to be correct if the admin's machine is set to IST.
 */
export function istToUtcIso(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MINUTES * 60_000;
  return new Date(utcMs).toISOString();
}

/** Inverse of istToUtcIso: splits a UTC ISO string back into IST "YYYY-MM-DD" and "HH:mm". */
export function utcIsoToIstDateTime(isoUtc: string): { date: string; time: string } {
  const istMs = new Date(isoUtc).getTime() + IST_OFFSET_MINUTES * 60_000;
  const ist = new Date(istMs);
  return {
    date: `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`,
    time: `${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`,
  };
}
