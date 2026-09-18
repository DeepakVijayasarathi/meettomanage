import { apiFetch, setAccessToken } from "@/lib/api";
import type { LoginResponse } from "./types";

export async function login(email: string, pin: string): Promise<LoginResponse> {
  const response = await apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, pin }),
  });
  setAccessToken(response.accessToken);
  return response;
}

/** Refreshes the signed-in user's permissions/route, and swaps in a freshly-minted token that
 *  carries those same up-to-date claims — so an access grant made mid-session (e.g. an Admin
 *  approving a Relationship Manager's request) takes effect without a full logout/login. */
export async function getCurrentUser(): Promise<LoginResponse> {
  const response = await apiFetch<LoginResponse>("/api/auth/me");
  if (response.accessToken) setAccessToken(response.accessToken);
  return response;
}

export function logout() {
  setAccessToken(null);
}

/**
 * Always resolves the same way whether or not the address has an account —
 * the caller shows one fixed "if that email exists, we've sent a link"
 * message either way, so the UI itself never reveals which emails are real.
 */
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
