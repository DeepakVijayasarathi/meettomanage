import { describe, expect, it } from "vitest";
import { tenantPath } from "./tenantPath";

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
