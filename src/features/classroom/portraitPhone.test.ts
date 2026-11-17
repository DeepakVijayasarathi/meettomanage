import { afterEach, describe, expect, it, vi } from "vitest";
import { isPortraitPhone } from "./portraitPhone";

function mockMatchMedia(matches: boolean) {
  const queries: string[] = [];
  vi.stubGlobal("matchMedia", (query: string) => {
    queries.push(query);
    return { matches, media: query, addEventListener() {}, removeEventListener() {} };
  });
  window.matchMedia = globalThis.matchMedia;
  return queries;
}

describe("isPortraitPhone", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is true for an upright touch phone, which then gets the faces along the bottom", () => {
    const queries = mockMatchMedia(true);
    expect(isPortraitPhone()).toBe(true);
    expect(queries[0]).toContain("orientation: portrait");
    expect(queries[0]).toContain("pointer: coarse");
  });

  it("is false otherwise (laptops, landscape phones), which keep the faces down the side", () => {
    mockMatchMedia(false);
    expect(isPortraitPhone()).toBe(false);
  });
});
