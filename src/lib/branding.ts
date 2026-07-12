/**
 * White-label branding: one deployment = one brand, driven entirely by env vars
 * so a client rebrand needs no code change (see backend docs/WHITE_LABEL_BRANDING.md).
 *
 *   VITE_BRAND_NAME     — product display name (browser title, wordmark)
 *   VITE_BRAND_PRIMARY  — primary colour as "H S% L%" HSL triple for the theme tokens
 *   VITE_BRAND_LOGO_URL — logo image URL; falls back to the built-in mark
 */

export const BRAND_NAME: string = (import.meta.env.VITE_BRAND_NAME as string | undefined) ?? "The Reader Nest";

export const BRAND_LOGO_URL: string | undefined = import.meta.env.VITE_BRAND_LOGO_URL as string | undefined;

const BRAND_PRIMARY: string | undefined = import.meta.env.VITE_BRAND_PRIMARY as string | undefined;

/** Applies the brand at startup: document title + theme token overrides. */
export function applyBranding() {
  document.title = BRAND_NAME;
  if (BRAND_PRIMARY) {
    document.documentElement.style.setProperty("--primary", BRAND_PRIMARY);
    document.documentElement.style.setProperty("--ring", BRAND_PRIMARY);
  }
}
