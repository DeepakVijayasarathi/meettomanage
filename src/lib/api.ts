/**
 * Minimal typed API client. When VITE_API_BASE_URL is unset the app runs in
 * demo mode: screens keep their mock data and login skips the backend.
 */

const BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const TOKEN_KEY = "trn.accessToken";

export function apiEnabled(): boolean {
  return BASE_URL.length > 0;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
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
  if (init?.body != null) headers.set("Content-Type", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });

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
