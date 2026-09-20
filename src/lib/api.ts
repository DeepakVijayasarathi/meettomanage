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

/**
 * Message from an RFC 7807 error body. ASP.NET's automatic model validation (e.g. a field
 * over its [MaxLength]) answers with the generic title "One or more validation errors
 * occurred." and puts the real reason in an `errors` map -- surface that instead of the
 * useless generic title.
 */
async function readProblemMessage(response: Response): Promise<string> {
  let message = response.statusText;
  try {
    const problem = (await response.json()) as { detail?: string; title?: string; errors?: Record<string, string[]> };
    const fieldErrors = problem.errors ? Object.values(problem.errors).flat().filter(Boolean) : [];
    message = problem.detail ?? (fieldErrors.length > 0 ? fieldErrors.join(" ") : (problem.title ?? message));
  } catch {
    /* non-JSON error body */
  }
  return message;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  // FormData sets its own multipart boundary; forcing JSON would corrupt uploads
  if (init?.body != null && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  // Any request that 401s is retried once before treating it as a real logout — this is
  // exactly the shape of a transient hiccup (the backend re-verifies the account's live
  // status and permission claims on every single authenticated request, not just once at
  // login — see OnTokenValidated in the API's Program.cs — so a brief DB hiccup or a race
  // during that recheck can 401 a genuinely valid, unexpired token), and a spurious bounce
  // to /login on an otherwise-valid session is worse than one extra round trip.
  //
  // Previously GET-only, on the theory that retrying a mutating request risked double-
  // firing it if the first attempt had actually gone through server-side. That's not the
  // failure mode here: [Authorize] rejects a 401 *before* the controller action ever runs,
  // so a 401'd POST/PUT/DELETE never executed any business logic the first time either —
  // retrying it is exactly as safe as retrying a 401'd GET. Confirmed live as a real
  // teacher complaint ("frequently asked to log in again") that hit hardest during an
  // active class, which is precisely when a teacher's own calls skew mutating (complete
  // session, register a recording, post engagement) rather than GET.
  if (response.status === 401 && token && !path.startsWith("/api/auth/")) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  }

  // An expired/revoked token means the session is no longer authenticated: clear it
  // and land on login. Auth endpoints are exempt (a wrong PIN is also a 401).
  if (response.status === 401 && token && !path.startsWith("/api/auth/")) {
    clearAuthStorage();
    window.location.assign("/login");
  }

  if (!response.ok) {
    // Backend errors arrive as RFC 7807 ProblemDetails
    throw new ApiError(response.status, await readProblemMessage(response));
  }

  // Some endpoints return 200 with no body (e.g. MonitoringController.BroadcastReload's
  // bare `Ok()`), not just 204 -- .json() on an empty body throws "Unexpected end of JSON
  // input" rather than resolving to anything useful, so check the actual text first.
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Downloads a file response (a bulk-export CSV) with the auth token and saves it as `filename`. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readProblemMessage(response));
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
