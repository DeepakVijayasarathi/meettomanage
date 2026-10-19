import { describe, expect, it } from "vitest";
import { tenantCodeForEmail, tenantLoginUrl } from "./tenantDiscovery";

describe("tenant email discovery", () => {
  it("prefers an exact email mapping over its domain", () => {
    expect(tenantCodeForEmail(" Admin@School.test ", {
      "admin@school.test": "head-office",
      "school.test": "school",
    })).toBe("head-office");
  });

  it("finds a tenant by email domain", () => {
    expect(tenantCodeForEmail("teacher@school.test", { "school.test": "school" })).toBe("school");
  });

  it("does not guess for mobile numbers or unknown domains", () => {
    expect(tenantCodeForEmail("9876543210", { "school.test": "school" })).toBeNull();
    expect(tenantCodeForEmail("user@other.test", { "school.test": "school" })).toBeNull();
  });

  it("builds a safe tenant login URL", () => {
    expect(tenantLoginUrl("school")).toBe("/t/school/login");
  });
});
