import { describe, expect, it } from "vitest";
import { detectPlatform, getMediaHelp } from "./mediaPermissionHelp";

describe("media permission help", () => {
  it("detects Android, iPadOS-as-Mac and desktop", () => {
    expect(detectPlatform("Mozilla/5.0 (Linux; Android 13; Tab) Chrome/120 Safari/537.36")).toBe("android");
    expect(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1")).toBe("ios");
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1", 5)).toBe("ios");
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120", 0)).toBe("desktop");
    expect(detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120")).toBe("desktop");
  });

  it("only mentions Windows/Mac settings on desktop", () => {
    expect(getMediaHelp("android").stillStuck).toMatch(/Apps → Chrome/);
    expect(getMediaHelp("android").stillStuck).not.toMatch(/Windows|Mac/);
    expect(getMediaHelp("desktop").stillStuck).toMatch(/Windows/);
    for (const p of ["android", "ios", "desktop"] as const) expect(getMediaHelp(p).steps.at(-1)).toMatch(/Try again/);
  });
});
