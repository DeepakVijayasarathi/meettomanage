// Read-only demo mode: decides what the desktop app may send to a client's live API.
// Used by main.cjs (request filter) and covered by demo-guard.test.cjs.

/** POSTs that are only needed to sign in. Everything else that isn't a read is blocked. */
const SIGN_IN_POSTS = new Set(["/api/auth/login", "/api/auth/login/two-factor"]);
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** The site prefixes tenant-scoped calls with /t/<code>. A client's own host already identifies its tenant, so drop it. */
function stripTenant(pathname) {
  return pathname.replace(/^\/t\/[a-z][a-z0-9-]{2,49}(?=\/)/, "");
}

/** "allow" = forward to the client API, "block" = cancel the request. */
function decide(method, pathname) {
  const m = String(method).toUpperCase();
  if (READ_METHODS.has(m)) return "allow";
  if (m === "POST" && SIGN_IN_POSTS.has(stripTenant(pathname).replace(/\/+$/, ""))) return "allow";
  return "block";
}

/** Accepts "https://host" or "https://host/api" and returns the bare https origin, or "" if it isn't one. */
function parseDemoRoot(value) {
  if (!value) return "";
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password) return "";
    if (u.pathname.replace(/\/+$/, "") !== "" && u.pathname.replace(/\/+$/, "") !== "/api") return "";
    return u.origin;
  } catch {
    return "";
  }
}

module.exports = { decide, stripTenant, parseDemoRoot };
