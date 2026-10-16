/** Public links carry the client code in their path; login still resolves it from email/mobile. */
export function tenantPath(pathname = window.location.pathname): string {
  return pathname.match(/^\/t\/[a-z][a-z0-9-]{2,49}(?=\/|$)/)?.[0] ?? "";
}
