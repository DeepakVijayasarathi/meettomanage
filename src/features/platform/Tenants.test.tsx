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
    await screen.findByRole("heading", { name: "Create client" });
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
});
