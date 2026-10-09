import { describe, expect, it, vi } from "vitest";
import type { Stroke } from "./drawing";
import { isSlideMarkOp, SlideMarksStore } from "./slideMarks";

const pen = (id: string, points = [{ x: 0.1, y: 0.1 }]): Stroke => ({ id, tool: "pen", points, color: "#EF4444", width: 0.004 });

describe("SlideMarksStore", () => {
  it("keeps marks per slide", () => {
    const store = new SlideMarksStore();
    store.apply({ kind: "slideStroke", slide: 0, stroke: pen("a") });
    store.apply({ kind: "slideStroke", slide: 2, stroke: pen("b") });
    expect(store.get(0).map((s) => s.id)).toEqual(["a"]);
    expect(store.get(2).map((s) => s.id)).toEqual(["b"]);
    expect(store.get(1)).toEqual([]);
  });

  it("grows a live stroke from appends and replaces a re-sent one instead of duplicating it", () => {
    const store = new SlideMarksStore();
    store.apply({ kind: "slideStroke", slide: 0, stroke: pen("a") });
    store.apply({ kind: "slideStrokeAppend", slide: 0, strokeId: "a", points: [{ x: 0.2, y: 0.2 }] });
    expect(store.get(0)[0].points).toHaveLength(2);
    store.apply({ kind: "slideStroke", slide: 0, stroke: pen("a", [{ x: 0.5, y: 0.5 }]) });
    expect(store.get(0)).toHaveLength(1);
    expect(store.get(0)[0].points).toEqual([{ x: 0.5, y: 0.5 }]);
  });

  it("ignores an append whose stroke never arrived", () => {
    const store = new SlideMarksStore();
    store.apply({ kind: "slideStrokeAppend", slide: 0, strokeId: "missing", points: [{ x: 0.2, y: 0.2 }] });
    expect(store.get(0)).toEqual([]);
  });

  it("undoes one mark, clears one slide, or clears everything", () => {
    const store = new SlideMarksStore();
    store.apply({ kind: "slideStroke", slide: 0, stroke: pen("a") });
    store.apply({ kind: "slideStroke", slide: 0, stroke: pen("b") });
    store.apply({ kind: "slideStroke", slide: 1, stroke: pen("c") });
    store.apply({ kind: "slideUndo", slide: 0, strokeId: "b" });
    expect(store.get(0).map((s) => s.id)).toEqual(["a"]);
    store.apply({ kind: "slideClear", slide: 0 });
    expect(store.get(0)).toEqual([]);
    expect(store.get(1)).toHaveLength(1);
    store.apply({ kind: "slideClearAll" });
    expect(store.get(1)).toEqual([]);
  });

  it("returns the same array until that slide changes and notifies subscribers", () => {
    const store = new SlideMarksStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.apply({ kind: "slideStroke", slide: 0, stroke: pen("a") });
    const snapshot = store.get(0);
    expect(store.get(0)).toBe(snapshot);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.apply({ kind: "slideClear", slide: 0 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("isSlideMarkOp", () => {
  it("tells slide marks apart from whiteboard ops on the shared channel", () => {
    expect(isSlideMarkOp({ kind: "slideStroke" })).toBe(true);
    expect(isSlideMarkOp({ kind: "stroke" })).toBe(false);
    expect(isSlideMarkOp({ kind: "reset" })).toBe(false);
  });
});
