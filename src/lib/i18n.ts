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
export type MarketingLocale = { code: string; label: string; nativeLabel: string; dir?: "rtl" };

export const MARKETING_LOCALES: readonly MarketingLocale[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "fr", label: "French", nativeLabel: "Français" },
  { code: "de", label: "German", nativeLabel: "Deutsch" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "zh", label: "Chinese", nativeLabel: "中文" },
  { code: "ja", label: "Japanese", nativeLabel: "日本語" },
  { code: "ko", label: "Korean", nativeLabel: "한국어" },
  { code: "id", label: "Indonesian", nativeLabel: "Bahasa Indonesia" },
  { code: "ms", label: "Malay", nativeLabel: "Bahasa Melayu" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা" },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు" },
  { code: "ur", label: "Urdu", nativeLabel: "اردو", dir: "rtl" },
  { code: "tr", label: "Turkish", nativeLabel: "Türkçe" },
  { code: "ru", label: "Russian", nativeLabel: "Русский" },
  { code: "it", label: "Italian", nativeLabel: "Italiano" },
  { code: "nl", label: "Dutch", nativeLabel: "Nederlands" },
  { code: "pl", label: "Polish", nativeLabel: "Polski" },
  { code: "th", label: "Thai", nativeLabel: "ไทย" },
  { code: "vi", label: "Vietnamese", nativeLabel: "Tiếng Việt" },
  { code: "sw", label: "Swahili", nativeLabel: "Kiswahili" },
];

const LANG_KEY = "trn.lang";
const LOCALE_KEY = "trn.marketingLocale";

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
function getStoredMarketingLocale(): string {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    return MARKETING_LOCALES.some((item) => item.code === stored) ? stored! : lang;
  } catch { return lang; }
}
let marketingLocale = getStoredMarketingLocale();
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

export function getMarketingLocale() { return marketingLocale; }

export function setMarketingLocale(next: string) {
  const locale = MARKETING_LOCALES.find((item) => item.code === next) ?? MARKETING_LOCALES[0];
  marketingLocale = locale.code;
  lang = locale.code === "ar" ? "ar" : "en";
  try {
    localStorage.setItem(LOCALE_KEY, locale.code);
    localStorage.setItem(LANG_KEY, lang);
  } catch { /* preference remains active for this page */ }
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale.code;
    document.documentElement.dir = locale.dir ?? "ltr";
    document.body.classList.toggle("lang-ar", locale.dir === "rtl");
  }
  emit();
}

export function useMarketingLocale(): [string, (next: string) => void] {
  const current = useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, getMarketingLocale, getMarketingLocale);
  return [current, setMarketingLocale];
}

/** Idempotent; safe to call again once React mounts (mirrors theme.ts's applyInitialTheme). */
export function applyInitialLang() {
  const locale = MARKETING_LOCALES.find((item) => item.code === marketingLocale) ?? MARKETING_LOCALES[0];
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale.code;
    document.documentElement.dir = locale.dir ?? "ltr";
    document.body.classList.toggle("lang-ar", locale.dir === "rtl");
  }
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
