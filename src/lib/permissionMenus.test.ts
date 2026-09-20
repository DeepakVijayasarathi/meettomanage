import { describe, expect, it } from "vitest";
import { summarizeMenus } from "@/lib/permissionMenus";

describe("summarizeMenus", () => {
  it("lists each page once, however many roles have it", () => {
    const { text } = summarizeMenus(["Admin — Users", "itadmin — Users", "Sub Admin — Users", "Admin — Roles & Permissions"]);
    expect(text).toBe("Menus: Users, Roles & Permissions");
  });

  it("caps the visible pages and counts the rest, keeping the full list for a tooltip", () => {
    const menus = ["A — One", "A — Two", "A — Three", "A — Four", "A — Five", "B — Six"];
    const { text, full } = summarizeMenus(menus);
    expect(text).toBe("Menus: One, Two, Three, Four +2 more");
    expect(full).toContain("B — Six");
  });
});
