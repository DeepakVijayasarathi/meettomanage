import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { SessionProvider, useSession } from "@/state/session";

function RoleProbe() {
  const { role } = useSession();
  return <span data-testid="role-probe">{role ?? "null"}</span>;
}

// apiEnabled() is false in the test environment (no VITE_API_BASE_URL), so every
// network effect AppShell/SessionProvider/FloatingNotes fire — all gated on it — is
// inert here; only the localStorage-seeded session state under test is in play.
describe("AppShell role sync", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("does not overwrite a Sub Admin's real role when visiting a preset display portal", () => {
    // Mirrors what Login already wrote for a Sub Admin assigned the Coordinator preset:
    // the real backend role, plus that preset's own defaultRoute as homePath.
    localStorage.setItem("trn.role", "subadmin");
    localStorage.setItem("trn.homePath", "/coordinator");

    render(
      <MemoryRouter>
        <SessionProvider>
          <RoleProbe />
          <AppShell role="coordinator">
            <div />
          </AppShell>
        </SessionProvider>
      </MemoryRouter>
    );

    // BUG (regression guard, authorization/routing audit 2026-08-22): AppShell used to
    // call setRole("coordinator") here unconditionally, permanently overwriting the real
    // "subadmin" role RequireAuth relies on to admit this same account into its own
    // /subadmin/permissions, /subadmin/integrations and /subadmin/audit-log screens —
    // stranding it there for the rest of the session with no nav path back.
    expect(screen.getByTestId("role-probe").textContent).toBe("subadmin");
  });

  it("still syncs role normally for a genuine, non-preset portal", () => {
    localStorage.setItem("trn.role", "teacher");
    localStorage.setItem("trn.homePath", "/teacher");

    render(
      <MemoryRouter>
        <SessionProvider>
          <RoleProbe />
          <AppShell role="teacher">
            <div />
          </AppShell>
        </SessionProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("role-probe").textContent).toBe("teacher");
  });

  it("leaves the Student View's parent role untouched (pre-existing carve-out)", () => {
    localStorage.setItem("trn.role", "parent");
    localStorage.setItem("trn.homePath", "/parent");

    render(
      <MemoryRouter>
        <SessionProvider>
          <RoleProbe />
          <AppShell role="student">
            <div />
          </AppShell>
        </SessionProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("role-probe").textContent).toBe("parent");
  });
});
