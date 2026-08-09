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

/** Refreshes the signed-in user's permissions/route from the current token — no new token issued. */
export async function getCurrentUser(): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/auth/me");
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
