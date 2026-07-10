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

export function logout() {
  setAccessToken(null);
}
