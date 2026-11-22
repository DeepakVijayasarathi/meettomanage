import { fireEvent, render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { MarketingShell } from "./MarketingShell";

vi.mock("@/state/session", () => ({
  useSession: () => ({ userName: "Marketing Team", logout: vi.fn() }),
}));

it("shows the uploaded marketing logo in the console sidebar", () => {
  render(<HelmetProvider><MemoryRouter initialEntries={["/marketing"]}>
    <MarketingShell><p>Dashboard content</p></MarketingShell>
  </MemoryRouter></HelmetProvider>);

  const sidebar = within(screen.getByRole("complementary"));
  const logo = sidebar.getByAltText("Meet to Manage");
  expect(logo.getAttribute("src")).toMatch(/\/api\/platform\/public\/marketing-logo$/);
  fireEvent.load(logo);
  expect(logo).toBeVisible();
  expect(sidebar.queryByText("Meet to Manage")).not.toBeInTheDocument();
});
