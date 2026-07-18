import { apiFetch, setAccessToken } from "@/lib/api";
import type { LoginResponse } from "./types";

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
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
