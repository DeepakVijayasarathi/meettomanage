import { describe, expect, it } from "vitest";
import { buildJitsiJoinUrl } from "./jitsi";

describe("buildJitsiJoinUrl", () => {
  it("puts the token in the query string, where Jitsi actually reads it", () => {
    const url = buildJitsiJoinUrl("meet.example.org", "trn-room", "a.b.c", "Rama S");
    expect(url.startsWith("https://meet.example.org/trn-room?jwt=a.b.c#")).toBe(true);
    expect(url).not.toContain("#jwt=");
    expect(url).toContain("config.prejoinConfig.enabled=false");
    expect(url).toContain("userInfo.displayName=");
  });

  it("builds a plain room link with no token or name", () => {
    expect(buildJitsiJoinUrl("meet.example.org", "trn-room")).toBe("https://meet.example.org/trn-room");
  });
});
