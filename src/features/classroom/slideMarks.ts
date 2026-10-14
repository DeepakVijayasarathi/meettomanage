import type { Point, Stroke } from "./drawing";

/**
 * Marks the teacher draws on a presented slide (pen, highlighter, shapes, text — see
 * SlideAnnotationLayer). Unlike the whiteboard, coordinates are slide-relative (0..1 of the
 * slide's width/height, and stroke width as a fraction of slide width), so a mark lands on the
 * same word for a student on a phone as for the teacher on a laptop.
 *
 * Travels over the classroom hub's existing Board channel: the server relays it verbatim and
 * keeps it in the same per-session history it replays to anyone joining late, so no server
 * change was needed. The whiteboard ignores these kinds; InteractivePanel routes them here.
 */
export type SlideMarkOp =
  | { kind: "slideStroke"; slide: number; stroke: Stroke }
  | { kind: "slideStrokeAppend"; slide: number; strokeId: string; points: Point[] }
  | { kind: "slideUndo"; slide: number; strokeId: string }
  | { kind: "slideClear"; slide: number }
  // A different deck was uploaded or presenting stopped -- old marks no longer match any slide.
  | { kind: "slideClearAll" };

const SLIDE_OP_KINDS = new Set<string>(["slideStroke", "slideStrokeAppend", "slideUndo", "slideClear", "slideClearAll"]);

export function isSlideMarkOp(op: { kind: string }): op is SlideMarkOp {
  return SLIDE_OP_KINDS.has(op.kind);
}

const EMPTY: Stroke[] = [];

/** Holds every slide's marks for the life of the panel, so switching tabs (which unmounts
 *  the Slides tab) never loses them, and late-join replay has somewhere to land even before
 *  the Slides tab is ever opened. Shaped for useSyncExternalStore. */
export class SlideMarksStore {
  private bySlide = new Map<number, Stroke[]>();
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Stable array per slide until it changes (useSyncExternalStore needs that). */
  get(slide: number): Stroke[] {
    return this.bySlide.get(slide) ?? EMPTY;
  }

  reset() {
    if (this.bySlide.size === 0) return;
    this.bySlide.clear();
    this.emit();
  }

  apply(op: SlideMarkOp) {
    switch (op.kind) {
      case "slideStroke": {
        const strokes = this.get(op.slide);
        const i = strokes.findIndex((s) => s.id === op.stroke.id);
        // Upsert: a shape (line, arrow, box, circle) is re-sent whole each time it is dragged.
        this.set(op.slide, i === -1 ? [...strokes, op.stroke] : strokes.map((s, j) => (j === i ? op.stroke : s)));
        break;
      }
      case "slideStrokeAppend": {
        const strokes = this.get(op.slide);
        const i = strokes.findIndex((s) => s.id === op.strokeId);
        if (i === -1) return; // establishing op not here yet -- same tolerance as the whiteboard
        this.set(
          op.slide,
          strokes.map((s, j) => (j === i ? { ...s, points: [...s.points, ...op.points] } : s))
        );
        break;
      }
      case "slideUndo":
        this.set(
          op.slide,
          this.get(op.slide).filter((s) => s.id !== op.strokeId)
        );
        break;
      case "slideClear":
        this.set(op.slide, EMPTY);
        break;
      case "slideClearAll":
        this.reset();
        break;
    }
  }

  private set(slide: number, strokes: Stroke[]) {
    this.bySlide.set(slide, strokes);
    this.emit();
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }
}
