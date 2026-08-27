/**
 * Minimal typed API client. When VITE_API_BASE_URL is unset the app runs in
 * demo mode: screens keep their mock data and login skips the backend.
 */
import { authStorage, clearAuthStorage } from "@/lib/authStorage";

const BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const TOKEN_KEY = "trn.accessToken";

export function apiEnabled(): boolean {
  return BASE_URL.length > 0;
}

export function getAccessToken(): string | null {
  return authStorage().getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  if (token) authStorage().setItem(TOKEN_KEY, token);
  else authStorage().removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  // FormData sets its own multipart boundary; forcing JSON would corrupt uploads
  if (init?.body != null && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  // An expired/revoked token means the session is no longer authenticated: clear it
  // and land on login. Auth endpoints are exempt (a wrong PIN is also a 401).
  if (response.status === 401 && token && !path.startsWith("/api/auth/")) {
    clearAuthStorage();
    window.location.assign("/login");
  }

  if (!response.ok) {
    // Backend errors arrive as RFC 7807 ProblemDetails
    let detail = response.statusText;
    try {
      const problem = (await response.json()) as { detail?: string; title?: string };
      detail = problem.detail ?? problem.title ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Downloads a file response (a bulk-export CSV) with the auth token and saves it as `filename`. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const problem = (await response.json()) as { detail?: string; title?: string };
      detail = problem.detail ?? problem.title ?? detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, detail);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
