import { describe, expect, it } from "vitest";
import { apiTenantPath, setSessionTenant, tenantPath } from "./tenantPath";
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
});
