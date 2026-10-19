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

describe("Tenant Admin profile entry", () => {
  beforeEach(() => { sessionStorage.clear(); session.role = "admin"; });
  it("provides the separate administration entry for a client administrator", async () => {
    render(<MemoryRouter><Topbar onMenuClick={() => {}} /></MemoryRouter>);
    fireEvent.keyDown(screen.getByRole("button", { name: "Account menu for Test administrator" }), { key: "ArrowDown" });
    expect(await screen.findByRole("menuitem", { name: "Tenant administration" })).toBeInTheDocument();
  });
  it("does not show platform administration to a teacher", async () => {
    session.role = "teacher";
    render(<MemoryRouter><Topbar onMenuClick={() => {}} /></MemoryRouter>);
    fireEvent.keyDown(screen.getByRole("button", { name: "Account menu for Test administrator" }), { key: "ArrowDown" });
    await screen.findByRole("menuitem", { name: "Profile" });
    expect(screen.queryByRole("menuitem", { name: "Tenant administration" })).not.toBeInTheDocument();
  });
});
