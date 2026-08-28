/**
 * White-label branding. Env vars provide the build-time defaults; once the API
 * is configured the DB-backed public settings (Settings & Branding screen)
 * override them at runtime, so a rebrand needs no redeploy.
 *
 *   VITE_BRAND_NAME     — product display name (browser title, wordmark)
 *   VITE_BRAND_PRIMARY  — primary colour as "H S% L%" HSL triple for the theme tokens
 *   VITE_BRAND_ACCENT   — accent colour as "H S% L%" HSL triple for the --brand-accent token
 *   VITE_BRAND_LOGO_URL — logo image URL; falls back to the built-in mark
 *
 * DB keys: brand.name, brand.logoUrl, brand.primaryColor (#hex), brand.accentColor (#hex).
 * Components must read colour through the --primary / --brand-accent CSS tokens (Tailwind's
 * `primary` / `brand-accent` classes) — never a literal hex or an arbitrary-value Tailwind
 * class — since those bake the colour in at build time and can't react to a runtime
 * Settings change.
 */

import { useSyncExternalStore } from "react";
import { apiEnabled } from "@/lib/api";
import { getPublicSettings, toSettingsMap } from "@/api/settings";
import { hexToHslTriple } from "@/lib/utils";

export const BRAND_NAME: string = (import.meta.env.VITE_BRAND_NAME as string | undefined) ?? "Meet to Manage";

export const BRAND_LOGO_URL: string | undefined = import.meta.env.VITE_BRAND_LOGO_URL as string | undefined;

// Fall back to :root's own default HSL triples (src/index.css), not undefined — setBrand()
// only writes the --primary/--ring/--brand-accent inline style on <html> when these are
// set, and that inline value is what makes .theme-light-scope pages (login, marketing)
// correctly stay pinned to the light brand color even when dark mode is toggled and no
// runtime override has loaded yet (demo mode never calls loadBrandingFromApi at all).
const BRAND_PRIMARY: string = (import.meta.env.VITE_BRAND_PRIMARY as string | undefined) ?? "214 52% 25%";

const BRAND_ACCENT: string = (import.meta.env.VITE_BRAND_ACCENT as string | undefined) ?? "3 79% 53%";

export interface Brand {
  name: string;
  logoUrl?: string;
  /** Primary colour as "H S% L%" triple, ready for the --primary token. */
  primaryHsl?: string;
  /** Accent colour as "H S% L%" triple, ready for the --brand-accent token. */
  accentHsl?: string;
}

let brand: Brand = {
  name: BRAND_NAME,
  logoUrl: BRAND_LOGO_URL,
  primaryHsl: BRAND_PRIMARY,
  accentHsl: BRAND_ACCENT,
};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getBrand(): Brand {
  return brand;
}

/** Reactive brand for components (Logo, login screens). */
export function useBrand(): Brand {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getBrand,
    getBrand
  );
}

export function setBrand(next: Brand) {
  brand = next;
  document.title = brand.name;
  if (brand.primaryHsl) {
    document.documentElement.style.setProperty("--primary", brand.primaryHsl);
    document.documentElement.style.setProperty("--ring", brand.primaryHsl);
  }
  if (brand.accentHsl) {
    document.documentElement.style.setProperty("--brand-accent", brand.accentHsl);
  }
  emit();
}

/** Applies the env-var brand at startup: document title + theme token overrides. */
export function applyBranding() {
  setBrand(brand);
}

/**
 * Overrides the env defaults with the DB-backed public settings. Fire-and-forget
 * from main.tsx; demo mode (no API) and fetch failures keep the env brand.
 */
export async function loadBrandingFromApi(): Promise<void> {
  if (!apiEnabled()) return;
  try {
    const map = toSettingsMap(await getPublicSettings());
    const primaryHex = map["brand.primaryColor"];
    const accentHex = map["brand.accentColor"];
    setBrand({
      name: map["brand.name"] || BRAND_NAME,
      logoUrl: map["brand.logoUrl"] || BRAND_LOGO_URL,
      primaryHsl: primaryHex ? hexToHslTriple(primaryHex) : BRAND_PRIMARY,
      accentHsl: accentHex ? hexToHslTriple(accentHex) : BRAND_ACCENT,
    });
  } catch {
    /* keep env brand */
  }
}
