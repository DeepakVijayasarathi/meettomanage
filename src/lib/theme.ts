/**
 * Light/dark theme. Mirrors branding.ts's module-level pub/sub (useSyncExternalStore)
 * rather than a Context provider — same lightweight-state pattern already used for
 * white-label branding and the toast store, so there's nothing new to wrap the app in.
 *
 * Persisted under the "trn." localStorage namespace (see state/session.tsx) as
 * "trn.theme": "light" | "dark" | "system". "system" tracks the OS preference live —
 * tailwind.config.ts's darkMode: ["class"] strategy never reacts to
 * prefers-color-scheme on its own, so that listener is set up here.
 *
 * The persisted (or system-detected) class is also applied by a tiny inline script in
 * index.html that runs before this module (before React even mounts) to avoid a flash
 * of the wrong theme on load; this module re-derives the same value from the same key
 * so the two never disagree.
 */
import { useLayoutEffect, useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";

const THEME_KEY = "trn.theme";

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(THEME_KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

function systemPrefersDark(): boolean {
  // matchMedia is unavailable in the vitest/jsdom test environment (no polyfill) and in
  // some older browsers — guard rather than assume every "window exists" environment
  // also has it.
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

function resolveIsDark(mode: ThemeMode): boolean {
  return mode === "dark" || (mode === "system" && systemPrefersDark());
}

function applyDarkClass(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveIsDark(mode));
}

let theme: ThemeMode = getStoredTheme();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getTheme(): ThemeMode {
  return theme;
}

export function setTheme(next: ThemeMode) {
  theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* storage unavailable (private browsing, quota) — theme still applies for this load */
  }
  applyDarkClass(next);
  emit();
}

/** Idempotent with index.html's inline script; safe to call again once React mounts. */
export function applyInitialTheme() {
  applyDarkClass(theme);
}

if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  // Only "system" should ever move with the OS — an explicit light/dark choice is a
  // deliberate override and must not be silently undone by e.g. the OS flipping to
  // night mode at sunset.
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (theme === "system") applyDarkClass(theme);
  });
}

export interface UseThemeResult {
  theme: ThemeMode;
  setTheme: (next: ThemeMode) => void;
  /** Resolved effective appearance — what "system" currently means, collapsed to a boolean. */
  isDark: boolean;
}

export function useTheme(): UseThemeResult {
  const mode = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getTheme,
    getTheme
  );
  return { theme: mode, setTheme, isDark: resolveIsDark(mode) };
}

/**
 * For the fixed light "brand" pages (Login, ForgotPassword, ResetPin, marketing Home,
 * Store) — pins the whole document to the light tokens (via .theme-light-scope in
 * index.css) for as long as the calling page is mounted, then hands the app-wide
 * preference back on unmount.
 *
 * A CSS class on the page's own root element only reaches its DOM descendants, but
 * Radix's Dialog/Select/Popover/DropdownMenu all portal their content straight onto
 * document.body — a sibling of #root, not a descendant of anything these pages render.
 * <body> is the one ancestor shared by both, so that's where the scope has to live.
 * useLayoutEffect (not useEffect) so this lands before the browser's first paint,
 * matching index.html's own no-flash guarantee for the dark class.
 */
export function useLightBrandScope() {
  useLayoutEffect(() => {
    document.body.classList.add("theme-light-scope");
    return () => {
      document.body.classList.remove("theme-light-scope");
    };
  }, []);
}
