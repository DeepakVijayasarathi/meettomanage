import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { drawStroke, isFreehand, textFontPx, type Point, type Stroke, type ToolId } from "./drawing";
import type { SlideMarkOp, SlideMarksStore } from "./slideMarks";

let uidCounter = 0;
const nextId = () => `slidemark-${Date.now()}-${uidCounter++}`;

/** Slide-relative stroke (see slideMarks.ts) → pixels on a canvas of this size. */
function toPixels(stroke: Stroke, w: number, h: number): Stroke {
  return { ...stroke, points: stroke.points.map((p) => ({ x: p.x * w, y: p.y * h })), width: stroke.width * w };
}

interface SlideAnnotationLayerProps {
  slide: number;
  store: SlideMarksStore;
  /** Teacher with drawing switched on. Otherwise the layer only shows marks and lets every
   *  click fall through. */
  active: boolean;
  tool: ToolId;
  color: string;
  /** Pen width in on-screen pixels; stored relative to the slide's width. */
  width: number;
  onOp: (op: SlideMarkOp) => void;
}

/**
 * Transparent drawing surface laid exactly over the rendered slide canvas (PresentationViewer).
 * Everyone renders the same marks from the shared SlideMarksStore; only the teacher draws.
 */
export default function SlideAnnotationLayer({ slide, store, active, tool, color, width, onOp }: SlideAnnotationLayerProps) {
  const strokes = useSyncExternalStore(store.subscribe, () => store.get(slide));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const draftRef = useRef<Stroke | null>(null);
  const lastSendRef = useRef(0);
  const sentPointCountRef = useRef(0);
  const establishedRef = useRef(false);
  const [textDraft, setTextDraftState] = useState<{ x: number; y: number; value: string } | null>(null);
  // Mirrors textDraft synchronously: clicking the slide while typing fires pointerdown and then
  // the input's blur in the same tick, and both must agree there's one draft to commit, once.
  const textDraftRef = useRef(textDraft);
  const setTextDraft = (next: typeof textDraft) => {
    textDraftRef.current = next;
    setTextDraftState(next);
  };

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || size.w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    const draft = draftRef.current;
    // The in-progress stroke also reaches the store through its own live ops -- skip that
    // copy so it isn't painted twice (a doubled highlighter would look darker).
    for (const stroke of strokes) if (stroke.id !== draft?.id) drawStroke(ctx, toPixels(stroke, size.w, size.h));
    if (draft) drawStroke(ctx, toPixels(draft, size.w, size.h));
  }, [strokes, size]);

  useEffect(paint, [paint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      setSize({ w, h });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // A slide change mid-stroke or mid-text abandons it rather than landing it on the next slide.
  useEffect(() => {
    draftRef.current = null;
    textDraftRef.current = null;
    setTextDraftState(null);
  }, [slide]);

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    // 4 decimals = sub-pixel even on a 4K slide, and keeps each op well under the hub's
    // 32 KB message limit (full-precision floats roughly double the payload).
    const round = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000;
    return { x: round((e.clientX - rect.left) / rect.width), y: round((e.clientY - rect.top) / rect.height) };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!active || size.w === 0) return;
    const pt = getPoint(e);
    if (tool === "text") {
      // A click while a text box is open just finishes it (the input's blur commits);
      // the next click places a new one.
      if (!textDraftRef.current) setTextDraft({ x: pt.x, y: pt.y, value: "" });
      return;
    }
    draftRef.current = { id: nextId(), tool, points: [pt], color, width: width / size.w };
    establishedRef.current = false;
    sentPointCountRef.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
    paint();
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const draft = draftRef.current;
    if (!draft) return;
    const pt = getPoint(e);
    if (isFreehand(draft.tool)) draft.points.push(pt);
    else draft.points = [draft.points[0], pt];
    paint();

    // Same live-drawing scheme as the whiteboard: ~20 sends/sec, establishing op first, then
    // only the new points. Shapes resend whole (they're always just two points).
    const now = performance.now();
    if (now - lastSendRef.current < 50) return;
    lastSendRef.current = now;
    if (!establishedRef.current || !isFreehand(draft.tool)) {
      establishedRef.current = true;
      sentPointCountRef.current = draft.points.length;
      onOp({ kind: "slideStroke", slide, stroke: { ...draft, points: [...draft.points] } });
    } else {
      const fresh = draft.points.slice(sentPointCountRef.current);
      if (fresh.length > 0) {
        sentPointCountRef.current = draft.points.length;
        onOp({ kind: "slideStrokeAppend", slide, strokeId: draft.id, points: fresh });
      }
    }
  }

  function handlePointerUp() {
    const draft = draftRef.current;
    if (!draft) return;
    draftRef.current = null;
    // Only what the live sends haven't covered yet -- resending a long freehand stroke whole
    // could exceed the hub's message size limit and be dropped outright.
    if (!establishedRef.current || !isFreehand(draft.tool)) {
      onOp({ kind: "slideStroke", slide, stroke: draft });
    } else {
      const rest = draft.points.slice(sentPointCountRef.current);
      if (rest.length > 0) onOp({ kind: "slideStrokeAppend", slide, strokeId: draft.id, points: rest });
      else paint();
    }
  }

  function commitText() {
    const draft = textDraftRef.current;
    if (!draft) return;
    setTextDraft(null);
    if (draft.value.trim() && size.w > 0) {
      onOp({
        kind: "slideStroke",
        slide,
        stroke: { id: nextId(), tool: "text", points: [{ x: draft.x, y: draft.y }], color, width: width / size.w, text: draft.value },
      });
    }
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className={cn("absolute inset-0 h-full w-full touch-none", active ? "cursor-crosshair" : "pointer-events-none")}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      {textDraft && (
        <input
          autoFocus
          value={textDraft.value}
          onChange={(e) => textDraftRef.current && setTextDraft({ ...textDraftRef.current, value: e.target.value })}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitText();
            if (e.key === "Escape") setTextDraft(null);
            e.stopPropagation(); // arrow keys / typing mustn't reach the deck's own shortcuts
          }}
          placeholder="Type, then Enter"
          className="absolute min-w-[8rem] rounded border border-dashed border-brand-violet bg-white/80 px-1 font-semibold outline-none"
          style={{
            left: `${textDraft.x * 100}%`,
            top: `${textDraft.y * 100}%`,
            color,
            fontSize: textFontPx(width),
            lineHeight: 1.1,
          }}
        />
      )}
    </>
  );
}
