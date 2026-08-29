/**
 * Per-page SEO title/description, admin-editable (Settings & Branding → SEO) instead of
 * hardcoded — the same "public settings" key-value store branding.ts reads from, filtered
 * to the "seo.*" keys. Falls back to whatever default each page's <Seo> call passes when
 * no override is set (or the API isn't configured — demo mode keeps the hardcoded copy).
 */
import { useSyncExternalStore } from "react";
import { apiEnabled } from "@/lib/api";
import { getPublicSettings, toSettingsMap } from "@/api/settings";

let overrides: Record<string, string> = {};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** `key` is the bare "home" / "blog" part — resolved internally to "seo.<key>.<field>". */
export function useSeoOverride(key: string, field: "title" | "description", fallback: string): string {
  const settingKey = `seo.${key}.${field}`;
  const value = useSyncExternalStore(
    subscribe,
    () => overrides[settingKey],
    () => overrides[settingKey]
  );
  return value || fallback;
}

/**
 * Applies SEO values straight from the Settings screen's in-memory form state, the same
 * way saveAll() applies brand.* fields via setBrand() — so a save is visible immediately
 * (including in demo mode, which never calls the real API at all).
 */
export function applySeoOverrides(values: Record<string, string>): void {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith("seo.") && value) next[key] = value;
  }
  overrides = next;
  emit();
}

/** Fire-and-forget from main.tsx, alongside loadBrandingFromApi. */
export async function loadSeoSettingsFromApi(): Promise<void> {
  if (!apiEnabled()) return;
  try {
    const map = toSettingsMap(await getPublicSettings());
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(map)) {
      if (key.startsWith("seo.") && value) next[key] = value;
    }
    overrides = next;
    emit();
  } catch {
    /* keep whatever hardcoded fallbacks each page already passes */
  }
}
