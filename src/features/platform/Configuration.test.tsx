import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Configuration from "./Configuration";

const tenants = [{ id: "a", name: "Academy A", code: "academy-a", status: "Active" }, { id: "b", name: "Academy B", code: "academy-b", status: "Active" }];
const settings = (name: string) => [{ key: "org.name", value: name, category: "General", isPublic: true }];
const response = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });

describe("Tenant Admin configuration", () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); sessionStorage.setItem("mtm.platformToken", "platform-token"); vi.restoreAllMocks(); });

  it("saves only the selected tenant's changed keys and loads another tenant separately", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if (String(url).endsWith("/tenants")) return response(tenants);
      if (init?.method === "PUT") return response(JSON.parse(String(init.body)));
      return response(settings(String(url).includes("/tenants/a/") ? "Academy A" : "Academy B"));
    });
    render(<MemoryRouter initialEntries={["/platform/configuration?tenant=a"]}><Configuration /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText("Name"), { target: { value: "Updated academy" } });
    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));
    await screen.findByText("Tenant configuration saved.");
    const save = fetch.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(String(save?.[0])).toContain("/api/platform/tenants/a/configuration");
    expect(JSON.parse(String(save?.[1]?.body))).toEqual([{ key: "org.name", value: "Updated academy", category: "General", isPublic: true }]);
    fireEvent.change(screen.getByRole("combobox", { name: "Select tenant" }), { target: { value: "b" } });
    await screen.findByDisplayValue("Academy B");
    expect(screen.queryByDisplayValue("Updated academy")).not.toBeInTheDocument();
  });

  it("never silently substitutes the first tenant for an invalid explicit selection", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(response(tenants));
    render(<MemoryRouter initialEntries={["/platform/configuration?tenant=missing"]}><Configuration /></MemoryRouter>);
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Save configuration" })).not.toBeInTheDocument();
    expect(fetch.mock.calls.every(([url]) => String(url).endsWith("/tenants"))).toBe(true);
  });

  it("persists a newly added setting even when its value is empty", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) =>
      response(String(url).endsWith("/tenants") ? tenants : init?.method === "PUT" ? JSON.parse(String(init.body)) : settings("Academy A")));
    render(<MemoryRouter initialEntries={["/platform/configuration?tenant=a"]}><Configuration /></MemoryRouter>);
    await screen.findByLabelText("Name");
    fireEvent.click(screen.getByRole("button", { name: "Add setting" }));
    fireEvent.change(screen.getByLabelText("Setting key"), { target: { value: "org.optionalNote" } });
    fireEvent.click(screen.getByRole("button", { name: "Add to configuration" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save configuration" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));
    await screen.findByText("Tenant configuration saved.");
    const save = fetch.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(JSON.parse(String(save?.[1]?.body))).toEqual([{ key: "org.optionalNote", value: "", category: "General", isPublic: false }]);
  });
});
