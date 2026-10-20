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

/** API prefix: a /t/<code> URL wins, otherwise the tenant the session signed in to. */
export function apiTenantPath(): string {
  const fromUrl = tenantPath();
  if (fromUrl) return fromUrl;
  const code = authStorage().getItem(TENANT_CODE_KEY);
  return code && TENANT_CODE.test(code) ? `/t/${code}` : "";
}
