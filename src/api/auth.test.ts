import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, setAccessToken } from "@/lib/api";
import { beginViewAsStorage } from "@/lib/authStorage";
import { completeTwoFactorLogin, getCurrentUser, login } from "./auth";

function meResponse(accessToken: string) {
  return new Response(
    JSON.stringify({ accessToken, permissions: [], defaultRoute: "/admin", user: { firstName: "A", lastName: "B", role: "Admin" } }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

describe("getCurrentUser", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("swaps in the refreshed login when nothing changed meanwhile", async () => {
    setAccessToken("admin-old");
    vi.mocked(fetch).mockResolvedValueOnce(meResponse("admin-new"));

    const response = await getCurrentUser();

    expect(response?.accessToken).toBe("admin-new");
    expect(getAccessToken()).toBe("admin-new");
  });

  // The UAT bug: a "View as parent" tab boots holding the opener's admin login, starts this
  // refresh, then receives the parent's read-only login before the refresh answers.
  it("never writes an older login over one that arrived while the request was in flight", async () => {
    setAccessToken("admin-old");
    let answer!: (r: Response) => void;
    vi.mocked(fetch).mockReturnValueOnce(new Promise<Response>((resolve) => (answer = resolve)));

    const pending = getCurrentUser();
    beginViewAsStorage({ parentName: "Test Parent", expiresAtUtc: new Date(Date.now() + 30 * 60_000).toISOString() });
    setAccessToken("parent-view-as");
    answer(meResponse("admin-new"));

    expect(await pending).toBeNull();
    expect(getAccessToken()).toBe("parent-view-as");
  });
});

describe("two-step sign-in", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

  it("keeps no session after the PIN step, and stores it once the code is accepted", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(json({ accessToken: "", requiresTwoFactor: true, twoFactorChallenge: "c1", permissions: [], defaultRoute: "" }));
    const first = await login("admin@test.com", "1234");
    expect(first.requiresTwoFactor).toBe(true);
    expect(getAccessToken()).toBeNull();

    vi.mocked(fetch).mockResolvedValueOnce(json({ accessToken: "admin-token", permissions: [], defaultRoute: "/admin", user: { firstName: "A", lastName: "B", role: "Admin" } }));
    await completeTwoFactorLogin("c1", " 123456 ");
    expect(getAccessToken()).toBe("admin-token");
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body));
    expect(body).toEqual({ challenge: "c1", code: "123456" });
  });
});
