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

type TenantResolve = { tenantCode?: string | null };

/** index.html starts this request before the app bundle has even downloaded, so the round trip overlaps
 *  the JavaScript download instead of following it (see the inline script there). */
function earlyResolve(): Promise<TenantResolve | null> | undefined {
  return (window as Window & { __m2mTenantResolve?: Promise<TenantResolve | null> }).__m2mTenantResolve;
}

async function fetchResolve(root: string): Promise<TenantResolve | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(`${root}/api/tenant/resolve`, { headers: { Accept: "application/json" }, signal: controller.signal });
    return response.ok ? ((await response.json()) as TenantResolve) : null;
  } finally {
    window.clearTimeout(timeout);
  }
}

/** Resolve a verified custom hostname before branding, routing or session state loads. */
export async function discoverHostTenant(): Promise<{ code: string | null; mismatch: boolean }> {
  hostTenantCode = null;
  if (tenantPath()) return { code: null, mismatch: false };
  const root = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  if (!root) return { code: null, mismatch: false };
  try {
    const early = earlyResolve();
    const result = early
      ? await Promise.race([early, new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 4_000))])
      : await fetchResolve(root);
    const code = result?.tenantCode && TENANT_CODE.test(result.tenantCode) ? result.tenantCode : null;
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
