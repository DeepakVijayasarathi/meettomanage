export const PLATFORM_TOKEN_KEY = "mtm.platformToken";
export const PLATFORM_EMAIL_KEY = "mtm.platformEmail";
export const PLATFORM_SESSION_EVENT = "mtm-platform-session";
const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export type PlatformTenant = { id: string; code: string; name: string; customDomain?: string | null; customDomainVerifiedAtUtc?: string | null; status: "Provisioning" | "Active" | "Suspended" | "Failed"; appAccessGranted?: boolean };

export function clearPlatformSession() {
  sessionStorage.removeItem(PLATFORM_TOKEN_KEY);
  sessionStorage.removeItem(PLATFORM_EMAIL_KEY);
  window.dispatchEvent(new Event(PLATFORM_SESSION_EVENT));
}

/** Separate operator credentials; never reads or overwrites a client's access token. */
export async function platformRequest<T>(path: string, token: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${base}/api/platform${path}`, {
    method, signal, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    if (response.status === 401 && token && sessionStorage.getItem(PLATFORM_TOKEN_KEY) === token) clearPlatformSession();
    const problem = await response.json().catch(() => ({})) as { detail?: string };
    throw new Error(problem.detail || (response.status === 404 ? "This tenant or administration page is unavailable." : "The request could not be completed."));
  }
  return response.status === 204 ? undefined as T : await response.json() as T;
}
