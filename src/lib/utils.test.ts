import { describe, expect, it } from "vitest";
import { pickAccentForegroundHsl } from "./utils";
import { ROLE_META } from "./roles";

function hslTripleToRgb(triple: string): [number, number, number] {
  const [h, s, l] = triple.split(" ").map((part) => parseFloat(part));
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r: number, g: number, b: number;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)];
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

describe("pickAccentForegroundHsl", () => {
  // Regression guard: every portal's primary button is tinted with ROLE_META[role].hex
  // via AppShell's accentStyle. Button text must clear WCAG AA's 4.5:1 minimum against
  // that background for every role — this failed for 6 of 8 roles before this function
  // existed (teacher's orange was 2.51:1 with hardcoded white text).
  it.each(Object.entries(ROLE_META))("clears 4.5:1 contrast for the %s role's accent color", (_role, meta) => {
    const foregroundRgb = hslTripleToRgb(pickAccentForegroundHsl(meta.hex));
    const backgroundRgb = hexToRgb(meta.hex);
    expect(contrastRatio(foregroundRgb, backgroundRgb)).toBeGreaterThanOrEqual(4.5);
  });

  it("picks white for a dark background", () => {
    expect(pickAccentForegroundHsl("#1F6FE0")).toBe("0.0 0.0% 100.0%");
  });

  it("picks dark navy for a light/bright background", () => {
    expect(pickAccentForegroundHsl("#F08A1D")).toBe("229.7 39.7% 14.3%");
  });
});
