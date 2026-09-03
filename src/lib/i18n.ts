/**
 * Marketing-site language: English or Arabic. Same lightweight module-level pub/sub
 * pattern as theme.ts (useSyncExternalStore, not a Context provider) — nothing new to
 * wrap the app in, consistent with how theme/branding state already works here.
 *
 * Persisted under the "trn." localStorage namespace as "trn.lang": "en" | "ar". Unlike
 * theme (which defaults to the OS preference), language defaults to "en" and never
 * auto-detects the browser locale — an English-speaking visitor whose OS happens to be
 * set to Arabic shouldn't be silently switched; Arabic is an explicit choice via the
 * language switcher.
 *
 * Setting the language also flips `<html dir>` between "ltr"/"rtl" and toggles the
 * `lang-ar` class on <body> (index.css uses it to swap in an Arabic-capable font stack —
 * DM Sans/Plus Jakarta Sans have no Arabic glyphs). `dir="rtl"` gets most layout mirroring
 * for free from the browser (flex-direction, text alignment, form control alignment) —
 * it does NOT mirror physical-direction Tailwind utilities used directly in markup
 * (ml-/mr-/pl-/pr-/left-/right-/rounded-l-/rounded-r-), so pages need those swapped by
 * hand where they matter visually. Applied only on the pages that actually call
 * useLang()/applyInitialLang() (the marketing site) — authenticated portals are English-
 * only today and untouched by this.
 */
import { useSyncExternalStore } from "react";

export type Lang = "en" | "ar";

const LANG_KEY = "trn.lang";

function getStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    return localStorage.getItem(LANG_KEY) === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

function applyLangAttributes(next: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = next === "ar" ? "ar" : "en";
  document.body.classList.toggle("lang-ar", next === "ar");
}

let lang: Lang = getStoredLang();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang) {
  lang = next;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {
    /* storage unavailable (private browsing, quota) — language still applies for this load */
  }
  applyLangAttributes(next);
  emit();
}

/** Idempotent; safe to call again once React mounts (mirrors theme.ts's applyInitialTheme). */
export function applyInitialLang() {
  applyLangAttributes(lang);
}

export function useLang(): [Lang, (next: Lang) => void] {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getLang,
    getLang
  );
  return [current, setLang];
}
