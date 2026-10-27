import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Topbar } from "./Topbar";

const session = vi.hoisted(() => ({ userName: "Test administrator", role: "admin", logout: vi.fn() }));
vi.mock("@/state/session", () => ({ useSession: () => session }));
vi.mock("@/components/AccountDialog", () => ({ AccountDialog: () => null }));
vi.mock("@/components/NotificationPanel", () => ({ NotificationPanel: () => null }));
vi.mock("@/components/NetworkStatus", () => ({ NetworkStatus: () => null }));
vi.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => null }));

describe("Profile menu", () => {
  beforeEach(() => { sessionStorage.clear(); });
  it.each(["admin", "teacher"])("does not show Tenant administration to a %s", async (role) => {
    session.role = role;
    render(<MemoryRouter><Topbar onMenuClick={() => {}} /></MemoryRouter>);
    fireEvent.keyDown(screen.getByRole("button", { name: "Account menu for Test administrator" }), { key: "ArrowDown" });
    await screen.findByRole("menuitem", { name: "Profile" });
    expect(screen.queryByRole("menuitem", { name: "Tenant administration" })).not.toBeInTheDocument();
  });
});
