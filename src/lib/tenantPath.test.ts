import { describe, expect, it } from "vitest";
import { apiTenantPath, hasTenantSessionMismatch, setSessionTenant, tenantPath } from "./tenantPath";
import { clearAuthStorage } from "./authStorage";

describe("public tenant URLs", () => {
  it("keeps a client prefix through public route navigation", () => {
    expect(tenantPath("/t/academy-one/reset-pin")).toBe("/t/academy-one");
    expect(tenantPath("/t/academy-two/pay/opaque-token")).toBe("/t/academy-two");
  });
  it("does not infer a client on global or malformed routes", () => {
    expect(tenantPath("/login")).toBe("");
    expect(tenantPath("/platform/tenants")).toBe("");
    expect(tenantPath("/t/../../login")).toBe("");
    expect(tenantPath("/t/UPPERCASE/login")).toBe("");
  });
});

describe("single-URL login tenant", () => {
  it("uses the signed-in tenant for API calls until the session is cleared", () => {
    expect(apiTenantPath()).toBe("");
    setSessionTenant("academy-one");
    expect(apiTenantPath()).toBe("/t/academy-one");
    clearAuthStorage();
    expect(apiTenantPath()).toBe("");
  });
  it("ignores malformed tenant codes", () => {
    setSessionTenant("../admin");
    expect(apiTenantPath()).toBe("");
  });
  it("detects a remembered login opened under another tenant URL", () => {
    setSessionTenant("academy-one");
    expect(hasTenantSessionMismatch("/t/academy-one/admin")).toBe(false);
    expect(hasTenantSessionMismatch("/t/academy-two/login")).toBe(true);
    expect(hasTenantSessionMismatch("/login")).toBe(false);
    clearAuthStorage();
  });
  it("uses the JWT tenant claim for sessions created before tenant code persistence", () => {
    const payload = btoa(JSON.stringify({ tenant_code: "legacy-academy" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    localStorage.setItem("trn.accessToken", `header.${payload}.signature`);
    expect(hasTenantSessionMismatch("/t/another-academy/admin")).toBe(true);
    clearAuthStorage();
  });
});
