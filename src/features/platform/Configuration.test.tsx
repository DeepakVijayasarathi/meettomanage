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

  describe("branding", () => {
    const brand = [
      { key: "brand.name", value: "Acme", category: "Branding", isPublic: true },
      { key: "brand.logoUrl", value: null, category: "Branding", isPublic: true },
      { key: "brand.primaryColor", value: "#1E3A5F", category: "Branding", isPublic: true },
      { key: "brand.accentColor", value: "#E63329", category: "Branding", isPublic: true },
    ];
    function mock() {
      return vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
        const u = String(url);
        if (u.endsWith("/tenants")) return response(tenants);
        if (u.endsWith("/branding/logo") && init?.method === "POST") return response({ logoUrl: "https://api.test/t/academy-a/api/settings/brand-logo?v=abc" });
        if (init?.method === "PUT") return response(JSON.parse(String(init.body)));
        return response(u.endsWith("/seo") ? [] : brand);
      });
    }
    async function openBranding() {
      render(<MemoryRouter initialEntries={["/platform/configuration?tenant=a"]}><Configuration /></MemoryRouter>);
      fireEvent.click(await screen.findByRole("tab", { name: "Branding" }));
    }

    it("edits colour and typeface and saves them (creating the font keys on first save)", async () => {
      const fetch = mock();
      await openBranding();
      fireEvent.change(await screen.findByLabelText("Primary colour hex code"), { target: { value: "#0A7D5C" } });
      fireEvent.change(screen.getByLabelText("Heading font"), { target: { value: "Playfair Display" } });
      fireEvent.click(screen.getByRole("button", { name: "Save configuration" }));
      await screen.findByText("Tenant configuration saved.");
      const save = fetch.mock.calls.find(([, init]) => init?.method === "PUT");
      const body = JSON.parse(String(save?.[1]?.body)) as { key: string; value: string; category: string; isPublic: boolean }[];
      expect(body).toContainEqual({ key: "brand.primaryColor", value: "#0A7D5C", category: "Branding", isPublic: true });
      expect(body).toContainEqual({ key: "brand.headingFont", value: "Playfair Display", category: "Branding", isPublic: true });
      expect(body.some(b => b.key === "brand.fontFamily")).toBe(false);
    });

    it("rejects an invalid hex code inline", async () => {
      mock();
      await openBranding();
      fireEvent.change(await screen.findByLabelText("Primary colour hex code"), { target: { value: "#12" } });
      expect(screen.getAllByText("Use a 6-digit hex code like #1E3A5F.").length).toBeGreaterThan(0);
    });

    it("uploads a logo for the selected tenant with the platform token and shows it", async () => {
      const fetch = mock();
      await openBranding();
      const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "logo.png", { type: "image/png" });
      fireEvent.change(await screen.findByLabelText("Upload logo file"), { target: { files: [file] } });
      await screen.findByText("Logo uploaded and applied.");
      const upload = fetch.mock.calls.find(([url]) => String(url).endsWith("/tenants/a/branding/logo"));
      expect(upload?.[1]?.method).toBe("POST");
      expect(upload?.[1]?.headers).toMatchObject({ Authorization: "Bearer platform-token" });
      expect(upload?.[1]?.body).toBeInstanceOf(FormData);
      expect((screen.getByLabelText("Or use a logo from a web address") as HTMLInputElement).value).toContain("brand-logo?v=abc");
      // already saved server-side, so it must not count as an unsaved change
      expect(screen.getByText("All changes saved")).toBeTruthy();
    });

    it("refuses a non-image file before uploading anything", async () => {
      const fetch = mock();
      await openBranding();
      fireEvent.change(await screen.findByLabelText("Upload logo file"), { target: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] } });
      await screen.findByText("Choose a PNG, JPG or WebP image.");
      expect(fetch.mock.calls.some(([url]) => String(url).includes("/branding/logo"))).toBe(false);
    });
  });
});
