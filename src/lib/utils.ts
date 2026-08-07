import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function formatDate(value: string | Date, pattern: "short" | "long" | "time" | "datetime" = "short") {
  const date = typeof value === "string" ? new Date(value) : value;
  switch (pattern) {
    case "long":
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    case "time":
      return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    case "datetime":
      return `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
    default:
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
}

/** Amount still owed on an invoice; partial payments reduce it (mock rows have no amountPaid). */
export function invoiceBalance(invoice: { amount: number; amountPaid?: number }): number {
  return Math.max(0, invoice.amount - (invoice.amountPaid ?? 0));
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
 */
export function pickAccentForegroundHsl(hex: string): string {
  const white = "#FFFFFF";
  const navy = "#161B33";
  const chosen = contrastRatio(hex, white) >= contrastRatio(hex, navy) ? white : navy;
  return hexToHslTriple(chosen);
}
