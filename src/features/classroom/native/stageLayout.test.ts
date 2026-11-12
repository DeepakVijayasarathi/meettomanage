import { describe, expect, it } from "vitest";
import { bestColumns, galleryPage } from "./stageLayout";

describe("call stage layout", () => {
  it("picks the column count that gives the biggest 16:9 tiles", () => {
    expect(bestColumns(1, 1200, 700, 8)).toBe(1);
    expect(bestColumns(4, 1200, 700, 8)).toBe(2);
    expect(bestColumns(9, 1400, 800, 8)).toBe(3);
    expect(bestColumns(3, 1600, 300, 8)).toBe(3); // a wide, short strip lays tiles side by side
  });

  it("pages the gallery and clamps the page to what exists", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    expect(galleryPage(items, 16, 0)).toEqual({ pageItems: items.slice(0, 16), pages: 2, page: 0 });
    expect(galleryPage(items, 16, 1).pageItems).toEqual([16, 17, 18, 19]);
    expect(galleryPage(items, 16, 9).page).toBe(1);
    expect(galleryPage([], 9, 0)).toEqual({ pageItems: [], pages: 1, page: 0 });
  });
});
