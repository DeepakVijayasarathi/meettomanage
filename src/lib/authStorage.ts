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
const AUTH_KEYS = ["trn.accessToken", "trn.role", "trn.homePath", "trn.userName", "trn.permissions", "trn.tenantCode"];

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

/**
 * "View as parent" (Users → View): a Relationship Manager opens a parent's portal read-only
 * in its own tab. That tab's whole session lives in its sessionStorage, marked by this key, so
 * it never touches the RM's own login (kept in localStorage, shared by their other tabs).
 */
const VIEW_AS_KEY = "trn.viewAs";

export interface ViewAsInfo {
  parentName: string;
  expiresAtUtc: string;
}

/** The read-only view-as session this tab is running, if any. */
export function getViewAs(): ViewAsInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(VIEW_AS_KEY);
    return raw ? (JSON.parse(raw) as ViewAsInfo) : null;
  } catch {
    return null;
  }
}

/** Turns this tab into a view-as session: wipes anything copied from the opener's sessionStorage first. */
export function beginViewAsStorage(info: ViewAsInfo): void {
  AUTH_KEYS.forEach((k) => sessionStorage.removeItem(k));
  sessionStorage.setItem(VIEW_AS_KEY, JSON.stringify(info));
}

/** The Web Storage backing this login's auth/session state. */
export function authStorage(): Storage {
  if (typeof window === "undefined") return localStorage;
  if (getViewAs()) return sessionStorage;
  return getRemember() ? localStorage : sessionStorage;
}

/** Per-tab preferences (timezone, active child) — kept to this tab during a view-as session. */
export function prefStorage(): Storage {
  return getViewAs() ? sessionStorage : localStorage;
}

/** Clears every persisted auth key from BOTH stores — used on logout/expiry,
 *  where the session is ending regardless of which store it was living in.
 *  A view-as tab only clears its own sessionStorage: the RM's own login must survive. */
export function clearAuthStorage(): void {
  if (getViewAs()) {
    AUTH_KEYS.forEach((k) => sessionStorage.removeItem(k));
    sessionStorage.removeItem(VIEW_AS_KEY);
    return;
  }
  AUTH_KEYS.forEach((k) => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}
