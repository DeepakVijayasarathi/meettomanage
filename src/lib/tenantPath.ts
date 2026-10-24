import { authStorage } from "./authStorage";

const TENANT_CODE_KEY = "trn.tenantCode";
const TENANT_CODE = /^[a-z][a-z0-9-]{2,49}$/;

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

/** API prefix: a /t/<code> URL wins, otherwise the tenant the session signed in to. */
export function apiTenantPath(): string {
  const fromUrl = tenantPath();
  if (fromUrl) return fromUrl;
  const code = sessionTenantCode();
  return code ? `/t/${code}` : "";
}
