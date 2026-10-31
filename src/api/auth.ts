import { apiFetch, apiFetchGlobal, getAccessToken, setAccessToken } from "@/lib/api";
import type { LoginResponse } from "./types";

export async function login(email: string, pin: string): Promise<LoginResponse> {
  const response = await apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, pin }),
  });
  setAccessToken(response.accessToken);
  return response;
}

/** The marketing account belongs to the platform, not to any academy tenant. */
export async function loginMarketing(email: string, pin: string): Promise<LoginResponse> {
  const response = await apiFetchGlobal<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, pin }),
  });
  setAccessToken(response.accessToken);
  return response;
}

/** Refreshes the signed-in user's permissions/route, and swaps in a freshly-minted token that
 *  carries those same up-to-date claims — so an access grant made mid-session (e.g. an Admin
 *  approving a Relationship Manager's request) takes effect without a full logout/login. */
export async function getCurrentUser(): Promise<LoginResponse | null> {
  const sentWith = getAccessToken();
  const response = await apiFetch<LoginResponse>("/api/auth/me");
  // The tab's login can change while this is in flight -- a "View as parent" tab boots holding
  // the opener's own login, then swaps to the parent's read-only one. Writing this (older)
  // answer back would put the staff member's full login under the read-only banner (seen on
  // UAT: the view-as tab intermittently loaded the admin menu and 403'd every parent screen).
  // So only refresh the login the request was actually made with; otherwise report nothing.
  if (getAccessToken() !== sentWith) return null;
  if (response.accessToken) setAccessToken(response.accessToken);
  return response;
}

export function logout() {
  setAccessToken(null);
}

/** Rejects with a 404 ApiError (readable message) if the identifier has no account. */
export async function requestPinReset(email: string): Promise<void> {
  await apiFetch<void>("/api/auth/forgot-pin", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPin(token: string, newPin: string): Promise<void> {
  await apiFetch<void>("/api/auth/reset-pin", {
    method: "POST",
    body: JSON.stringify({ token, newPin }),
  });
}

/** The signed-in user (any role, Admin included) changes their own PIN. */
export async function changePin(currentPin: string, newPin: string): Promise<void> {
  await apiFetch<void>("/api/auth/change-pin", {
    method: "POST",
    body: JSON.stringify({ currentPin, newPin }),
  });
}

/** Closes a read-only "view as parent" session (recorded in the audit log). Best effort. */
export async function endViewAs(): Promise<void> {
  await apiFetch<void>("/api/auth/view-as/end", { method: "POST" });
}

/** Re-checks the signed-in user's own PIN before a sensitive change, without touching the stored login. */
export async function verifyOwnPin(pin: string): Promise<boolean> {
  const me = await apiFetch<LoginResponse>("/api/auth/me");
  try {
    await apiFetch<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: me.user.email, pin }),
    });
    return true;
  } catch {
    return false;
  }
}
