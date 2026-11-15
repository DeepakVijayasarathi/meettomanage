import type { CSSProperties } from "react";

/**
 * Coloured initials circles ("RK", "AG"): a faint tint of the person's colour behind the letters.
 * The letters used to be the raw colour itself, which on its own tint is only 1.7–3.4:1 contrast.
 * They are now that colour mixed toward black (toward white in dark mode), keeping the hue but
 * reaching at least 4.5:1. Use both together: style={initialsStyle(color)} className={INITIALS_TEXT}.
 */
export const INITIALS_TEXT =
  "[color:color-mix(in_srgb,var(--initials)_52%,#000)] dark:[color:color-mix(in_srgb,var(--initials)_45%,#fff)]";

/** `tint` is the background's hex alpha: "22" for initials circles, "1A" for the lighter icon/date chips. */
export function initialsStyle(color: string | null | undefined, tint = "22"): CSSProperties {
  const c = color || "#999999";
  return { backgroundColor: `${c}${tint}`, "--initials": c } as CSSProperties;
}
