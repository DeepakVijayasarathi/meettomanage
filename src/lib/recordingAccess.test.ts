import { describe, expect, it } from "vitest";
import { canDownloadRecordings } from "./recordingAccess";

describe("canDownloadRecordings", () => {
  it("allows Admin and the Management / Founder presets", () => {
    expect(canDownloadRecordings("admin", "/admin")).toBe(true);
    expect(canDownloadRecordings("subadmin", "/management")).toBe(true);
    expect(canDownloadRecordings("subadmin", "/executive")).toBe(true);
  });

  it("refuses every other team member and families", () => {
    expect(canDownloadRecordings("subadmin", "/subadmin")).toBe(false);
    expect(canDownloadRecordings("subadmin", "/coordinator")).toBe(false);
    expect(canDownloadRecordings("subadmin", "/itadmin")).toBe(false);
    expect(canDownloadRecordings("subadmin", "/managementx")).toBe(false);
    expect(canDownloadRecordings("subadmin", null)).toBe(false);
    expect(canDownloadRecordings("teacher", "/teacher")).toBe(false);
    expect(canDownloadRecordings("parent", "/parent")).toBe(false);
    expect(canDownloadRecordings(null, null)).toBe(false);
  });
});
