import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Tenants from "./Tenants";

const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });

describe("platform administration authorization", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); });

  it("signs in separately from the client's existing session", async () => {
    localStorage.setItem("trn.accessToken", "existing-client-token");
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url).endsWith("/login") ? response({ accessToken: "platform-token" }) : response([]));
    render(<MemoryRouter><Tenants /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "platform@example.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "long-platform-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByRole("heading", { name: "Tenant management" });
    expect(sessionStorage.getItem("mtm.platformToken")).toBe("platform-token");
    expect(localStorage.getItem("trn.accessToken")).toBe("existing-client-token");
    expect(fetch.mock.calls[0][1]?.headers).not.toHaveProperty("Authorization");
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/platform/tenants"),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer platform-token" }) })));
    fireEvent.keyDown(screen.getByRole("button", { name: "Tenant Admin profile menu" }), { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Sign out" }));
    expect(sessionStorage.getItem("mtm.platformToken")).toBeNull();
    expect(localStorage.getItem("trn.accessToken")).toBe("existing-client-token");
  });

  it("returns expired platform sessions to platform login without ending the client session", async () => {
    localStorage.setItem("trn.accessToken", "existing-client-token");
    sessionStorage.setItem("mtm.platformToken", "expired-platform-token");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(response({ detail: "Session expired" }, 401));
    render(<MemoryRouter><Tenants /></MemoryRouter>);
    await screen.findByRole("heading", { name: "Platform administrator sign in" });
    expect(sessionStorage.getItem("mtm.platformToken")).toBeNull();
    expect(localStorage.getItem("trn.accessToken")).toBe("existing-client-token");
  });

  describe("tenant cards", () => {
    const tenants = [
      { id: "t1", code: "acme", name: "Acme Academy", status: "Active" },
      { id: "t2", code: "broken", name: "Broken Co", status: "Failed" },
    ];
    const subs = [{
      tenantId: "t1", tenantCode: "acme", tenantName: "Acme Academy", tenantStatus: "Active", id: "s1", planCode: "starter", planName: "Starter", status: "Trialing",
      price: null, trialEndsAtUtc: "2026-11-03T00:00:00Z", currentPeriodEndUtc: null, graceEndsAtUtc: null, cancelAtPeriodEnd: false, suspendedByBilling: false, mrr: 0,
      usage: { activeStudents: 12, staffCount: 3, storageMb: 5, sessionMinutesMonth: 0, date: "2026-10-20" }, openInvoices: 0, openAmount: 0,
    }];
    const plans = [{ id: "p1", code: "starter", name: "Starter", description: null, isPublic: true, isActive: true, trialDays: 0, sortOrder: 1, subscribers: 1, prices: [], entitlements: [] }];

    function mockApi() {
      return vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        const u = String(url);
        if (init?.method === "POST" && u.endsWith("/tenants")) return response({ id: "t3", code: "new", name: "New Co", status: "Active" });
        if (u.endsWith("/tenants")) return response(tenants);
        if (u.endsWith("/subscriptions")) return response(subs);
        if (u.endsWith("/plans")) return response(plans);
        return response([]);
      });
    }
    beforeEach(() => { sessionStorage.setItem("mtm.platformToken", "platform-token"); });

    it("shows each client's plan, trial date and usage next to its status", async () => {
      mockApi();
      render(<MemoryRouter><Tenants /></MemoryRouter>);
      expect(await screen.findByRole("heading", { name: "Acme Academy" })).toBeTruthy();
      expect(await screen.findByText("Starter")).toBeTruthy();
      expect(screen.getByText(/Trial ends/)).toBeTruthy();
      expect(screen.getByText(/12 students · 3 staff/)).toBeTruthy();
    });

    it("filters to clients that need setup", async () => {
      mockApi();
      render(<MemoryRouter><Tenants /></MemoryRouter>);
      await screen.findByRole("heading", { name: "Acme Academy" });
      fireEvent.click(screen.getByRole("button", { name: "Needs setup" }));
      expect(screen.queryByRole("heading", { name: "Acme Academy" })).toBeNull();
      expect(screen.getByRole("heading", { name: "Broken Co" })).toBeTruthy();
    });

    it("creates a client from the dialog and sends the chosen plan", async () => {
      const fetch = mockApi();
      render(<MemoryRouter><Tenants /></MemoryRouter>);
      await screen.findByRole("heading", { name: "Acme Academy" });
      fireEvent.click(screen.getByRole("button", { name: /New client/ }));
      fireEvent.change(await screen.findByLabelText("Client code"), { target: { value: "new" } });
      fireEvent.change(screen.getByLabelText("Client name"), { target: { value: "New Co" } });
      fireEvent.change(screen.getByLabelText(/Administrator email/), { target: { value: "owner@new.test" } });
      fireEvent.change(screen.getByLabelText("Initial four-digit PIN"), { target: { value: "1234" } });
      fireEvent.change(screen.getByLabelText("Starting plan"), { target: { value: "starter" } });
      fireEvent.click(screen.getByRole("button", { name: "Create client" }));
      await waitFor(() => expect(fetch.mock.calls.some(c => c[1]?.method === "POST")).toBe(true));
      const post = fetch.mock.calls.find(c => c[1]?.method === "POST")!;
      expect(JSON.parse(String(post[1]?.body))).toMatchObject({ code: "new", name: "New Co", planCode: "starter" });
      expect(await screen.findByText(/New Co is ready/)).toBeTruthy();
    });
  });

  describe("mobile app access", () => {
    const list = [
      { id: "t1", code: "acme", name: "Acme Academy", status: "Active", appAccessGranted: true },
      { id: "t2", code: "nogo", name: "No App Co", status: "Active", appAccessGranted: false },
    ];
    function mockApi() {
      return vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        const u = String(url);
        if (init?.method === "POST" && u.endsWith("/tenants")) return response({ id: "t3", code: "new", name: "New Co", status: "Active", appAccessGranted: false });
        if (init?.method === "PUT" && u.endsWith("/app-access")) return new Response(null, { status: 204 });
        if (u.endsWith("/tenants")) return response(list);
        return response([]);
      });
    }
    beforeEach(() => { sessionStorage.setItem("mtm.platformToken", "platform-token"); });

    it("shows whether each client has the app on or off", async () => {
      mockApi();
      render(<MemoryRouter><Tenants /></MemoryRouter>);
      await screen.findByRole("heading", { name: "Acme Academy" });
      expect(screen.getByText("App on")).toBeTruthy();
      expect(screen.getByText("App off")).toBeTruthy();
    });

    it("sends the app-access choice when creating a client (on by default, can be switched off)", async () => {
      const fetch = mockApi();
      render(<MemoryRouter><Tenants /></MemoryRouter>);
      await screen.findByRole("heading", { name: "Acme Academy" });
      fireEvent.click(screen.getByRole("button", { name: /New client/ }));
      const box = await screen.findByLabelText(/Grant mobile app access/) as HTMLInputElement;
      expect(box.checked).toBe(true);
      fireEvent.click(box);
      fireEvent.change(screen.getByLabelText("Client code"), { target: { value: "new" } });
      fireEvent.change(screen.getByLabelText("Client name"), { target: { value: "New Co" } });
      fireEvent.change(screen.getByLabelText(/Administrator email/), { target: { value: "o@new.test" } });
      fireEvent.change(screen.getByLabelText("Initial four-digit PIN"), { target: { value: "1234" } });
      fireEvent.click(screen.getByRole("button", { name: "Create client" }));
      await waitFor(() => expect(fetch.mock.calls.some(c => c[1]?.method === "POST")).toBe(true));
      const post = fetch.mock.calls.find(c => c[1]?.method === "POST")!;
      expect(JSON.parse(String(post[1]?.body))).toMatchObject({ code: "new", appAccessGranted: false });
    });

    it("grants app access from the client's menu", async () => {
      const fetch = mockApi();
      render(<MemoryRouter><Tenants /></MemoryRouter>);
      await screen.findByRole("heading", { name: "No App Co" });
      fireEvent.keyDown(screen.getByRole("button", { name: "More actions for No App Co" }), { key: "ArrowDown" });
      fireEvent.click(await screen.findByRole("menuitem", { name: /Grant mobile app access/ }));
      await waitFor(() => expect(fetch.mock.calls.some(c => String(c[0]).endsWith("/tenants/t2/app-access"))).toBe(true));
      const put = fetch.mock.calls.find(c => String(c[0]).endsWith("/tenants/t2/app-access"))!;
      expect(put[1]?.method).toBe("PUT");
      expect(JSON.parse(String(put[1]?.body))).toEqual({ granted: true });
    });
  });
});
