import { describe, expect, it } from "vitest";
import { Circle } from "lucide-react";
import { currentNavItem, type NavSection } from "./nav";

const sections: NavSection[] = [
  { items: [{ label: "Dashboard", to: "/admin", icon: Circle, end: true }] },
  { title: "Insights", items: [
    { label: "Bulk Email", to: "/admin/bulk-email", icon: Circle },
    { label: "Bulk Email History", to: "/admin/bulk-email/history", icon: Circle },
  ] },
];

describe("breadcrumb page lookup", () => {
  it("picks the most specific menu entry for the URL", () => {
    expect(currentNavItem(sections, "/admin/bulk-email/history")?.label).toBe("Bulk Email History");
    expect(currentNavItem(sections, "/admin/bulk-email")?.section).toBe("Insights");
    expect(currentNavItem(sections, "/admin")?.label).toBe("Dashboard");
    expect(currentNavItem(sections, "/admin/users/42")).toBeNull(); // "end" entries match only exactly
    expect(currentNavItem(sections, "/teacher")).toBeNull();
  });
});
