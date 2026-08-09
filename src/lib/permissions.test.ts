import { describe, expect, it } from "vitest";
import { checkPermission } from "./permissions";

describe("checkPermission", () => {
  it("grants an admin every permission with no claims present", () => {
    expect(checkPermission("admin", [], "BillingFinance", "Delete")).toBe(true);
  });

  it("denies a non-admin role with no matching claim", () => {
    expect(checkPermission("subadmin", [], "BillingFinance", "View")).toBe(false);
  });

  it("grants a non-admin role only the exact Module:Action claim it holds", () => {
    const permissions = ["BillingFinance:View", "ReportsAnalytics:View"];
    expect(checkPermission("subadmin", permissions, "BillingFinance", "View")).toBe(true);
    expect(checkPermission("subadmin", permissions, "ReportsAnalytics", "View")).toBe(true);
  });

  it("does not grant a different action on a module the role can otherwise view", () => {
    // View access must never imply Edit/Delete/Create/Approve on the same module.
    const permissions = ["BillingFinance:View"];
    expect(checkPermission("subadmin", permissions, "BillingFinance", "Edit")).toBe(false);
    expect(checkPermission("subadmin", permissions, "BillingFinance", "Delete")).toBe(false);
  });

  it("does not grant the same action on a different module (no cross-module leakage)", () => {
    const permissions = ["BillingFinance:View"];
    expect(checkPermission("subadmin", permissions, "UserManagement", "View")).toBe(false);
  });

  it("treats a null role as non-admin (fails closed, not open)", () => {
    expect(checkPermission(null, ["BillingFinance:Delete"], "BillingFinance", "Delete")).toBe(true);
    expect(checkPermission(null, [], "BillingFinance", "Delete")).toBe(false);
  });
});
