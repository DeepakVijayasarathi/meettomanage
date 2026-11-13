import { describe, expect, it } from "vitest";
import { featuredSurface, registerRecordingSurface } from "./surfaces";

function canvasAt(rect: { left: number; top: number; width: number; height: number }) {
  const c = document.createElement("canvas");
  c.width = 800;
  c.height = 600;
  document.body.appendChild(c);
  c.getBoundingClientRect = () => ({ ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => ({}) }) as DOMRect;
  return c;
}

const view = { width: 1000, height: 800 };

describe("recording surfaces", () => {
  it("features a maximized board, not one in the side panel", () => {
    const small = canvasAt({ left: 600, top: 100, width: 380, height: 300 });
    const off = registerRecordingSurface({ canvas: small, group: "board", layer: 0, background: "#fff" });
    expect(featuredSurface(view)).toBeNull();
    off();

    const big = canvasAt({ left: 0, top: 60, width: 1000, height: 740 });
    const off2 = registerRecordingSurface({ canvas: big, group: "board", layer: 0, background: "#fef" });
    expect(featuredSurface(view)).toEqual({ layers: [big], background: "#fef" });
    off2();
  });

  it("stacks a slide with its annotations, bottom layer first", () => {
    const slide = canvasAt({ left: 0, top: 0, width: 900, height: 700 });
    const marks = canvasAt({ left: 0, top: 0, width: 900, height: 700 });
    const a = registerRecordingSurface({ canvas: marks, group: "slides", layer: 1 });
    const b = registerRecordingSurface({ canvas: slide, group: "slides", layer: 0, background: "#ffffff" });
    expect(featuredSurface(view)?.layers).toEqual([slide, marks]);
    a();
    b();
    expect(featuredSurface(view)).toBeNull();
  });
});
