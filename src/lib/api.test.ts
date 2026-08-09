import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, getAccessToken, setAccessToken } from "./api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetch", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
    // jsdom's window.location.assign isn't spy-able in place (non-configurable) —
    // replace the whole global binding instead of trying to redefine one method on it.
    vi.stubGlobal("location", { ...window.location, assign: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("attaches the stored bearer token to the request", async () => {
    setAccessToken("test-token-123");
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch("/api/sessions");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-token-123");
  });

  it("sends no Authorization header when signed out", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch("/api/sessions");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.has("Authorization")).toBe(false);
  });

  it("returns parsed JSON on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ id: "abc" }));

    await expect(apiFetch("/api/sessions/abc")).resolves.toEqual({ id: "abc" });
  });

  it("returns undefined for a 204 No Content response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(apiFetch("/api/sessions/abc")).resolves.toBeUndefined();
  });

  it("throws an ApiError carrying the RFC7807 'detail' message on failure", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ title: "Bad Request", detail: "Payment of 500 exceeds the outstanding balance of 200." }, 400)
    );

    await expect(apiFetch("/api/invoices/1/payments")).rejects.toMatchObject({
      status: 400,
      message: "Payment of 500 exceeds the outstanding balance of 200.",
    });
  });

  it("falls back to statusText when the error body isn't JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("<html>502</html>", { status: 502, statusText: "Bad Gateway" }));

    await expect(apiFetch("/api/sessions")).rejects.toBeInstanceOf(ApiError);
  });

  it("on a 401 outside /api/auth/*, clears the session and redirects to /login", async () => {
    setAccessToken("stale-token");
    localStorage.setItem("trn.role", "admin");
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ detail: "Unauthorized" }, 401));

    await expect(apiFetch("/api/sessions")).rejects.toBeInstanceOf(ApiError);

    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem("trn.role")).toBeNull();
    expect(window.location.assign).toHaveBeenCalledWith("/login");
  });

  it("on a 401 from /api/auth/login, does NOT clear session or redirect (a wrong PIN is a normal 401 there)", async () => {
    // No token stored — this mirrors a login attempt, where the 401-implies-expired-session
    // logic must not fire (there's no session to expire, and login already shows its own error).
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ detail: "Invalid credentials." }, 401));

    await expect(apiFetch("/api/auth/login", { method: "POST" })).rejects.toBeInstanceOf(ApiError);

    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
