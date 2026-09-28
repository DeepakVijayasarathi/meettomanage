import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getUserTimeZone } from "@/lib/datetime";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatPercent(value: number, fractionDigits = 0) {
  return `${value.toFixed(fractionDigits)}%`;
}

/**
 * Chart Y-axis currency tick label, e.g. "₹1.5k". Rounding every tick to a whole "k"
 * (`(v/1000).toFixed(0)`) collapses distinct low-value ticks — 500 and 1000 both become
 * "₹1k" — into duplicate gridline labels on charts whose values stay under a few
 * thousand. Only drops to a decimal when the whole-number label would actually collide.
 */
export function formatCurrencyAxisTick(value: number) {
  const thousands = value / 1000;
  const rounded = Math.round(thousands);
  const label = Math.abs(thousands - rounded) < 0.05 ? String(rounded) : thousands.toFixed(1);
  return `₹${label}k`;
}

function formatDateWithZone(date: Date, pattern: "short" | "long" | "time" | "datetime", timeZone: string) {
  switch (pattern) {
    case "long":
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone });
    case "time":
      // hour12 explicit, not left to en-IN's default -- Intl's locale defaults are an
      // implementation detail, not a guarantee; this is a platform-wide 12-hour convention.
      return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone });
    case "datetime":
      return `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone })}, ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone })}`;
    default:
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone });
  }
}

/**
 * `value` is either a plain "YYYY-MM-DD" calendar date (already resolved to the right day by
 * whoever built it -- typically utcIsoToLocalDateTime/utcIsoToZonedDateTime, which convert a UTC
 * instant into a *specific* timezone) or a real UTC instant (Date / full ISO string) still
 * needing that conversion.
 *
 * Client-reported bug: a "YYYY-MM-DD" string has no timezone of its own left to apply, but this
 * used to get re-parsed with `new Date(value)` (interpreted as UTC midnight) and rendered with no
 * `timeZone` option, silently falling back to the *browser's* own ambient zone -- a third,
 * uncontrolled timezone with no relation to the account's chosen one. For India-based accounts
 * whose browser also happens to be set to IST this never shows up; for anyone further from UTC
 * (reported: Canadian parents) it silently shifted the calendar day by one. Fixed by never letting
 * a resolved calendar date pass through a timezone conversion again (rendered as a fixed UTC
 * instant, so no zone can shift it), and by converting a genuine instant using the signed-in
 * account's own timezone (getUserTimeZone(), same as utcIsoToLocalDateTime) instead of the
 * browser's.
 */
export function formatDate(value: string | Date, pattern: "short" | "long" | "time" | "datetime" = "short") {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return formatDateWithZone(new Date(Date.UTC(year, month - 1, day)), pattern, "UTC");
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return formatDateWithZone(date, pattern, getUserTimeZone());
}

/**
 * "HH:mm" (24-hour, e.g. ClassSession.startTime, or any other raw time-of-day string coming
 * straight off the API) -> 12-hour display, e.g. "14:05" -> "2:05 PM". Session/leave/holiday
 * times are stored and round-tripped through native <input type="time"> as 24-hour "HH:mm" —
 * that representation must stay as-is for those inputs and for API payloads — but everywhere
 * a time is only ever *read*, this is what renders it. Previously duplicated verbatim across
 * six different feature files (formatDate's own "time"/"datetime" patterns were already
 * 12-hour via en-IN's locale default, but raw `session.startTime` text skipped that path
 * entirely) — this is the one copy every call site should import instead.
 */
export function formatTimeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * "1 Sep 2026" for a single-day span, "1 Sep 2026 – 30 Sep 2026" for a multi-day one — the
 * calendar-day comparison is on each date's own local rendering (`formatDate`'s "short"),
 * not a raw millisecond diff, so a same-day leave that merely spans midnight in UTC still
 * reads as one date rather than a misleading "day 1 – day 2" range.
 *
 * `endIso` is every caller's leave-request `endAtUtc`, which is stored as an *exclusive*
 * boundary — midnight of the day AFTER the last day of leave (see Leave.tsx's own
 * `addDays(toDate, 1)` on submit), so the overlap check against a session's start time
 * works correctly right up through the last day. Displaying that raw timestamp showed every
 * leave as ending one day later than the teacher actually requested; subtracting a day back
 * off here converts it to the inclusive last day for display, matching what was submitted.
 */
export function formatDateRange(startIso: string, endIso: string): string {
  const start = formatDate(startIso, "short");
  const end = formatDate(new Date(new Date(endIso).getTime() - 86_400_000), "short");
  return start === end ? start : `${start} – ${end}`;
}

/** Amount still owed on an invoice; partial payments reduce it (mock rows have no amountPaid). */
export function invoiceBalance(invoice: { amount: number; amountPaid?: number }): number {
  return Math.max(0, invoice.amount - (invoice.amountPaid ?? 0));
}

/**
 * Returns the URL only if it is safe to hand to an href/window.open, i.e. plain
 * http(s). Links we render can be stored strings another user typed (a session
 * recording URL, a gateway checkout link): a "javascript:" or "data:" URL there
 * runs script in *our* origin the moment the viewer clicks it, which is enough to
 * read their access token out of localStorage. Anything not http(s) is dropped.
 */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * Returns the path only if it navigates inside this app. Navigation targets can
 * come from outside the code (the API's role `defaultRoute`, a persisted
 * `trn.homePath`), and "//evil.com", "https://evil.com", "/\evil.com" or
 * "javascript:…" all leave the origin when passed to navigate()/<Navigate to>,
 * turning login into an off-site redirect onto a look-alike sign-in page.
 */
export function safeInternalPath(path: string | null | undefined): string | null {
  if (!path) return null;
  return /^\/(?!\/)[^\s\\]*$/.test(path) ? path : null;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function getInitials(name: string) {
  return initials(name);
}

// Same shape already used in parent/Enrollment.tsx's own local copy — shared here so every
// email field validates consistently instead of each form re-deciding what "valid" means.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Converts a #rrggbb hex color into an "H S% L%" triple for CSS var use. */
export function hexToHslTriple(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const delta = max - min;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  if (delta !== 0) {
    switch (max) {
      case r:
        h = 60 * (((g - b) / delta) % 6);
        break;
      case g:
        h = 60 * ((b - r) / delta + 2);
        break;
      case b:
        h = 60 * ((r - g) / delta + 4);
        break;
    }
  }
  if (h < 0) h += 360;

  return `${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => parseInt(clean.substring(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA: string, hexB: string): number {
  const [l1, l2] = [relativeLuminance(hexA), relativeLuminance(hexB)];
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Buttons/badges tinted with a per-role accent color (see AppShell's accentStyle)
 * hardcoded white text underneath — fine for some roles (e.g. admin blue) but as low
 * as 2.51:1 for others (e.g. teacher orange), well under WCAG AA's 4.5:1 minimum for
 * button-label text. Picks whichever of white or the app's dark navy ink actually
 * contrasts better against the given accent color, instead of assuming white always works.
 *
 * Not currently called by AppShell's accentStyle — white was chosen there as a
 * deliberate, informed product tradeoff (brand consistency over this contrast fix, see
 * accentStyle's own comment). Kept here, and still covered by tests, in case that
 * tradeoff is ever revisited for some or all portals.
 */
export function pickAccentForegroundHsl(hex: string): string {
  const white = "#FFFFFF";
  const navy = "#161B33";
  const chosen = contrastRatio(hex, white) >= contrastRatio(hex, navy) ? white : navy;
  return hexToHslTriple(chosen);
}

/**
 * Formula injection: a cell opening with =/+/-/@ is interpreted by Excel/Sheets as a
 * formula the moment the file is opened. Several exports in this app include
 * user/parent-editable free text (child/parent/teacher/actor names) — neutralize it
 * with a leading apostrophe, then quote if the value itself needs it. Mirrors
 * ReportsService.cs's own `Escape()` on the backend, which every client-side CSV
 * export helper should match rather than reimplementing (or skipping) escaping locally.
 */
export function escapeCsvCell(value: string | number): string {
  let str = String(value);
  if (str.length > 0 && (str[0] === "=" || str[0] === "+" || str[0] === "-" || str[0] === "@")) {
    str = "'" + str;
  }
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Builds a CSV string with every cell escaped via {@link escapeCsvCell}. */
export function toCsv(columns: string[], rows: (string | number)[][]): string {
  const lines = [columns.map(escapeCsvCell).join(","), ...rows.map((r) => r.map(escapeCsvCell).join(","))];
  return lines.join("\n");
}
