// Recovery from "this tab is running an old build" (a deploy replaced the hashed chunk files).
//
// A plain window.location.reload() is not enough: confirmed 9 Oct 2026, iPhone Chrome/Safari
// kept re-showing a copy of the page they had stored before the Hetzner switch-back, so every
// "Refresh" asked the server for the same, now-deleted chunks and landed on the same error
// screen. Reloading to the same path with a never-seen query parameter can't be answered from
// any stored copy, so the browser has to fetch the current index.html (and its current chunk
// map). The parameter is stripped again on start-up by stripFreshReloadParam().

export const FRESH_RELOAD_PARAM = "_fresh";

// Automatic retries are rate-limited per tab so a genuinely broken deploy can't loop forever:
// at most one automatic fresh reload per minute, after which the error screen stays up.
export const FRESH_RELOAD_GUARD_KEY = "trn.freshReloadAt";
const AUTO_RELOAD_COOLDOWN_MS = 60_000;

// Each engine words a failed lazy chunk differently: Chrome "Failed to fetch dynamically
// imported module", Firefox "error loading dynamically imported module", Safari/iOS (every iOS
// browser) "Importing a module script failed", webpack-style "Loading chunk", and Vite's own
// "Unable to preload CSS" when the route's stylesheet is the missing piece.
const CHUNK_LOAD_PATTERN =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading (css )?chunk|unable to preload css/i;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return CHUNK_LOAD_PATTERN.test(message);
}

export function freshReloadUrl(href: string = window.location.href, now: number = Date.now()): string {
  const url = new URL(href);
  url.searchParams.set(FRESH_RELOAD_PARAM, String(now));
  return url.toString();
}

/** Reloads the current page, bypassing any copy of it the browser has stored. */
export function reloadFresh(): void {
  window.location.replace(freshReloadUrl());
}

/**
 * Automatic version of reloadFresh(): returns false (and does nothing) if this tab already
 * auto-reloaded within the last minute or sessionStorage is unavailable, so callers can fall
 * back to showing their error screen.
 */
export function tryAutoReloadFresh(now: number = Date.now()): boolean {
  try {
    const last = Number(sessionStorage.getItem(FRESH_RELOAD_GUARD_KEY) ?? "0");
    if (now - last < AUTO_RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(FRESH_RELOAD_GUARD_KEY, String(now));
  } catch {
    return false;
  }
  reloadFresh();
  return true;
}

/** Removes the cache-busting parameter from the address bar once the fresh page has loaded. */
export function stripFreshReloadParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(FRESH_RELOAD_PARAM)) return;
  url.searchParams.delete(FRESH_RELOAD_PARAM);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
