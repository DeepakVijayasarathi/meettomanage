import { authStorage } from "./authStorage";

const TENANT_CODE_KEY = "trn.tenantCode";
const TENANT_CODE = /^[a-z][a-z0-9-]{2,49}$/;
let hostTenantCode: string | null = null;

/** Public links carry the client code in their path; login still resolves it from email/mobile. */
export function tenantPath(pathname = window.location.pathname): string {
  return pathname.match(/^\/t\/[a-z][a-z0-9-]{2,49}(?=\/|$)/)?.[0] ?? "";
}

/** The tenant a single-URL (/login) sign-in resolved from the email; kept with the session, not the URL. */
export function setSessionTenant(code: string | null): void {
  if (code && TENANT_CODE.test(code)) authStorage().setItem(TENANT_CODE_KEY, code);
  else authStorage().removeItem(TENANT_CODE_KEY);
}

/** Tenant code persisted with the authenticated session, if it is well formed. */
export function sessionTenantCode(): string | null {
  const code = authStorage().getItem(TENANT_CODE_KEY);
  if (code && TENANT_CODE.test(code)) return code;

  // Sessions issued before tenantCode was persisted still carry the signed
  // tenant_code JWT claim. Reading it here is only an early UI safety check;
  // the API independently verifies the signature and tenant on every request.
  try {
    const token = authStorage().getItem("trn.accessToken");
    const payload = token?.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const claim = JSON.parse(atob(base64))?.tenant_code;
    return typeof claim === "string" && TENANT_CODE.test(claim) ? claim : null;
  } catch {
    return null;
  }
}

/**
 * A remembered login must never be reused under another client's URL. The API
 * already rejects that token, but detecting it before React mounts avoids a
 * redirect/403 loop and, more importantly, prevents tenant A's cached identity
 * from being rendered in tenant B's branded portal.
 */
export function hasTenantSessionMismatch(pathname = window.location.pathname): boolean {
  const path = tenantPath(pathname);
  const sessionCode = sessionTenantCode();
  return Boolean(path && sessionCode && path !== `/t/${sessionCode}`);
}

/** Resolve a verified custom hostname before branding, routing or session state loads. */
export async function discoverHostTenant(): Promise<{ code: string | null; mismatch: boolean }> {
  hostTenantCode = null;
  if (tenantPath()) return { code: null, mismatch: false };
  const root = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  if (!root) return { code: null, mismatch: false };
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4_000);
    const response = await fetch(`${root}/api/tenant/resolve`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    }).finally(() => window.clearTimeout(timeout));
    if (!response.ok) return { code: null, mismatch: false };
    const result = await response.json() as { tenantCode?: string | null };
    const code = result.tenantCode && TENANT_CODE.test(result.tenantCode) ? result.tenantCode : null;
    if (!code) return { code: null, mismatch: false };
    hostTenantCode = code;
    return { code, mismatch: Boolean(sessionTenantCode() && sessionTenantCode() !== code) };
  } catch {
    return { code: null, mismatch: false };
  }
}

/** API prefix: a /t/<code> URL wins, otherwise the tenant the session signed in to. */
export function apiTenantPath(): string {
  const fromUrl = tenantPath();
  if (fromUrl) return fromUrl;
  if (hostTenantCode) return `/t/${hostTenantCode}`;
  const code = sessionTenantCode();
  return code ? `/t/${code}` : "";
}
