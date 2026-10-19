import { tenantPath } from "./tenantPath";
import { tenantEmailMappingRecord } from "./tenantEmailMappings";

type TenantEmailMap = Record<string, string>;
const TENANT_CODE = /^[a-z][a-z0-9-]{2,49}$/;
const DISCOVERED_EMAIL_KEY = "mtm.discoveredEmail";

function configuredMap(): TenantEmailMap {
  const raw = import.meta.env.VITE_TENANT_EMAIL_MAP?.trim();
  if (!raw) return tenantEmailMappingRecord();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return {};
    return { ...Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string" && TENANT_CODE.test(entry[1]))
        .map(([key, value]) => [key.trim().toLowerCase().replace(/^@/, ""), value]),
    ), ...tenantEmailMappingRecord() };
  } catch {
    return tenantEmailMappingRecord();
  }
}

/** Resolves an exact email first, then its domain. Mobile logins must use a tenant URL. */
export function tenantCodeForEmail(identifier: string, mapping = configuredMap()): string | null {
  const email = identifier.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return mapping[email] ?? mapping[email.slice(at + 1)] ?? null;
}

export function isTenantPortal(): boolean {
  return tenantPath() !== "";
}

export function rememberDiscoveredEmail(email: string): void {
  sessionStorage.setItem(DISCOVERED_EMAIL_KEY, email.trim());
}

export function takeDiscoveredEmail(): string {
  const email = sessionStorage.getItem(DISCOVERED_EMAIL_KEY) ?? "";
  sessionStorage.removeItem(DISCOVERED_EMAIL_KEY);
  return email;
}

export function tenantLoginUrl(code: string): string {
  return `/t/${code}/login`;
}
