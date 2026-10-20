/**
 * Minimal typed API client. When VITE_API_BASE_URL is unset the app runs in
 * demo mode: screens keep their mock data and login skips the backend.
 */
import { authStorage, clearAuthStorage, getViewAs } from "@/lib/authStorage";
import { apiTenantPath } from "@/lib/tenantPath";

const API_ROOT: string = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
/** Read per request: a single-URL login sets the tenant after this module has loaded. */
const baseUrl = () => API_ROOT + apiTenantPath();

const TOKEN_KEY = "trn.accessToken";

export function apiEnabled(): boolean {
  return (import.meta.env.VITE_API_BASE_URL ?? "").length > 0;
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

const GENERIC_BY_STATUS: Record<number, string> = {
  400: "Some of the information isn't right. Please check it and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You don't have permission to do this.",
  404: "We couldn't find what you were looking for.",
  405: "That action isn't available right now.",
  408: "The request took too long. Please try again.",
  409: "This conflicts with something that already exists. Please refresh and try again.",
  413: "That file is too large to upload.",
  415: "That type of file isn't supported.",
  429: "Too many attempts. Please wait a moment and try again.",
};
const SERVER_TROUBLE = "Something went wrong on our side. Please try again in a moment.";
const NETWORK_TROUBLE = "Can't reach the server. Please check your internet connection and try again.";
const BAD_FORMAT = "Some of the information entered isn't in the right format. Please check it and try again.";

function genericForStatus(status: number): string {
  return GENERIC_BY_STATUS[status] ?? (status >= 500 ? SERVER_TROUBLE : "Something went wrong. Please try again.");
}

/** "startAtUtc" / "$.request.reasonText" -> "Start at utc" / "Reason text" (last path segment). */
function humanizeField(raw: string): string {
  const last = raw.split(/[.[\]]/).filter(Boolean).pop() ?? raw;
  const words = last.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : "This field";
}

/** True for text meant for developers (framework/JSON/stack-trace wording), not people. */
function looksTechnical(text: string): boolean {
  return /exception|\bSystem\.|\$\.|json|LineNumber|BytePositionInLine|could not be converted|stack ?trace|\bat [\w.]+\(|nullref|sqlstate|object reference|is not valid for|unexpected token/i.test(text);
}

/** Rewrites one ASP.NET model-validation sentence into plain language. */
function friendlyValidationText(text: string, field?: string): string {
  let m = /^The (?:field )?(.+?) field is required\.?$/i.exec(text);
  if (m) return `${humanizeField(m[1])} is required.`;
  m = /^The field (.+?) must be a string (?:or array type )?with a maximum length of '?(\d+)'?\.?$/i.exec(text);
  if (m) return `${humanizeField(m[1])} is too long (maximum ${m[2]} characters).`;
  m = /^The field (.+?) must be a string (?:or array type )?with a minimum length of '?(\d+)'?\.?$/i.exec(text);
  if (m) return `${humanizeField(m[1])} is too short (minimum ${m[2]} characters).`;
  m = /^The field (.+?) must be between (.+?) and (.+?)\.?$/i.exec(text);
  if (m) return `${humanizeField(m[1])} must be between ${m[2]} and ${m[3]}.`;
  if (/not a valid e-?mail address/i.test(text)) return "Please enter a valid email address.";
  if (/not a valid phone number/i.test(text)) return "Please enter a valid phone number.";
  if (/non-empty request body is required/i.test(text)) return "Please fill in the form and try again.";
  if (looksTechnical(text)) return field && field !== "$" && field !== "request" ? `${humanizeField(field)} isn't in the right format.` : BAD_FORMAT;
  return text;
}

/**
 * A message a person can act on for a failed response -- never framework wording or a bare
 * status code. Business rules the backend deliberately words for users (ProblemDetails
 * `detail`) pass through untouched; ASP.NET's automatic model validation (generic title
 * "One or more validation errors occurred." plus a per-field `errors` map) is rewritten
 * field by field; anything technical or empty falls back to a plain sentence for the status.
 */
export async function readProblemMessage(response: Response): Promise<string> {
  let problem: { detail?: string; title?: string; errors?: Record<string, string[]> } | null = null;
  try {
    problem = await response.json();
  } catch {
    /* non-JSON or empty error body */
  }

  const fieldMessages = problem?.errors
    ? Object.entries(problem.errors).flatMap(([field, msgs]) => (Array.isArray(msgs) ? msgs : [String(msgs)]).map((t) => friendlyValidationText(t, field)))
    : [];
  if (fieldMessages.length > 0) return [...new Set(fieldMessages)].join(" ");

  const detail = problem?.detail?.trim();
  if (detail && response.status < 500 && !looksTechnical(detail)) return detail;
  return genericForStatus(response.status);
}

/**
 * The text to show a person for any caught error. API failures already carry a readable
 * message (see readProblemMessage); anything else -- a JS runtime error, a Jitsi/SignalR
 * failure, a dropped connection -- is checked so raw wording like "Cannot read properties of
 * undefined" or "Failed to fetch" never reaches the screen. `fallback` is used when there's
 * nothing readable to show.
 */
export function userMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) return err.message || fallback;
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!raw.trim()) return fallback;
  if (/failed to fetch|networkerror|load failed|network request failed|err_internet|err_network/i.test(raw)) return NETWORK_TROUBLE;
  if (/not ?allowed ?error|permission ?denied|notallowederror/i.test(raw)) return "Permission was denied. Please allow access in your browser and try again.";
  if (looksTechnical(raw) || /cannot read propert|is not a function|is not defined|undefined|null|typeerror|referenceerror|syntaxerror|rangeerror/i.test(raw)) return fallback;
  return raw;
}

/** fetch() that turns a dropped connection ("Failed to fetch") into a readable ApiError. */
async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ApiError(0, NETWORK_TROUBLE);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  // FormData sets its own multipart boundary; forcing JSON would corrupt uploads
  if (init?.body != null && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response = await safeFetch(`${baseUrl()}${path}`, { ...init, headers });

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
    response = await safeFetch(`${baseUrl()}${path}`, { ...init, headers });
  }

  // An expired/revoked token means the session is no longer authenticated: clear it
  // and land on login. Auth endpoints are exempt (a wrong PIN is also a 401).
  if (response.status === 401 && token && !path.startsWith("/api/auth/")) {
    // A read-only "view as parent" tab has no login page to go back to: it just ends.
    const viewAs = getViewAs() !== null;
    clearAuthStorage();
    window.location.assign(viewAs ? "/view-as?ended=1" : "/login");
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
  const response = await safeFetch(`${baseUrl()}${path}`, {
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
