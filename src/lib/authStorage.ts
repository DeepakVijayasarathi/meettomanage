/**
 * Backs every persisted auth/session key (access token, role, name, permissions,
 * home path) with either localStorage (survives closing the browser) or
 * sessionStorage (cleared when the tab/browser closes) — decided once per login
 * by the "Remember me" checkbox on the sign-in form. The decision itself always
 * lives in localStorage: it isn't sensitive on its own, and a fresh page load
 * needs it to know which of the two stores to check before any actual auth
 * state has been read yet.
 */
const REMEMBER_KEY = "trn.remember";

/** Every key persisted through authStorage() — kept in one place so a login can
 *  wipe a stale copy left in whichever store it isn't using this time, and so
 *  logout/expiry can clear both stores thoroughly regardless of which was used. */
const AUTH_KEYS = ["trn.accessToken", "trn.role", "trn.homePath", "trn.userName", "trn.permissions"];

export function getRemember(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(REMEMBER_KEY) !== "false";
}

/**
 * Call once, before the session setters run, as soon as a login's "Remember me"
 * choice is known. Also wipes AUTH_KEYS from the store that's no longer in use,
 * so a previous session's leftovers (e.g. someone who last chose "remember me"
 * on a shared machine) can never be read back on a login that chose otherwise.
 */
export function setRemember(remember: boolean): void {
  localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
  const other = remember ? sessionStorage : localStorage;
  AUTH_KEYS.forEach((k) => other.removeItem(k));
}

/** The Web Storage backing this login's auth/session state. */
export function authStorage(): Storage {
  if (typeof window === "undefined") return localStorage;
  return getRemember() ? localStorage : sessionStorage;
}

/** Clears every persisted auth key from BOTH stores — used on logout/expiry,
 *  where the session is ending regardless of which store it was living in. */
export function clearAuthStorage(): void {
  AUTH_KEYS.forEach((k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}
