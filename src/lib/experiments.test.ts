import { beforeEach, describe, expect, it } from "vitest";
import { experimentVariant } from "./experiments";

describe("experimentVariant", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/get-started");
  });

  it("keeps the same visitor in the same bucket", () => {
    const first = experimentVariant("copy", ["a", "b"] as const);
    for (let i = 0; i < 5; i++) expect(experimentVariant("copy", ["a", "b"] as const)).toBe(first);
  });

  it("honours ?variant= for previewing", () => {
    window.history.replaceState(null, "", "/get-started?variant=b");
    expect(experimentVariant("copy", ["a", "b"] as const)).toBe("b");
    window.history.replaceState(null, "", "/get-started?variant=zzz");
    expect(["a", "b"]).toContain(experimentVariant("copy", ["a", "b"] as const));
  });

  it("splits visitors roughly evenly", () => {
    let b = 0;
    for (let i = 0; i < 2000; i++) {
      localStorage.setItem("mtm.visitorId", `visitor-${i}`);
      if (experimentVariant("copy", ["a", "b"] as const) === "b") b++;
    }
    expect(b).toBeGreaterThan(900);
    expect(b).toBeLessThan(1100);
  });
});
