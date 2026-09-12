import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  /** Set once a stroke stops receiving new points (local commit, or no strokeAppend for a
   *  moment on a remote copy) — the moment its disappearing-ink countdown actually starts.
   *  Undefined while still actively being drawn, local or remote. */
  lastUpdatedAt?: number;
}

export type AnnotationOp =
  | { kind: "stroke"; stroke: Stroke }
  | { kind: "strokeAppend"; strokeId: string; points: Point[] }
  | { kind: "clear" };

export interface AnnotationOverlayHandle {
  /** Apply an op received from a classmate over the hub. */
  applyRemoteOp: (op: AnnotationOp) => void;
}

let uidCounter = 0;
const nextId = () => `mark-${Date.now()}-${uidCounter++}`;

// Disappearing ink (teacher feedback: "temporarily mark something without permanently
// leaving the annotation"): a finished stroke holds at full opacity for a beat, then fades
// out on its own — no explicit clear needed for a quick point-at-this. FADE_HOLD_MS is a
// grace window after the last new point so a brief pause mid-stroke (finger lift between
// underline segments) doesn't visibly dim before continuing.
const FADE_HOLD_MS = 1500;
const FADE_DURATION_MS = 1000;

function strokeOpacity(stroke: Stroke, now: number): number {
  if (stroke.lastUpdatedAt === undefined) return 1;
  const age = now - stroke.lastUpdatedAt - FADE_HOLD_MS;
  if (age <= 0) return 1;
  return Math.max(0, 1 - age / FADE_DURATION_MS);
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, w: number, h: number, opacity = 1) {
  if (stroke.points.length === 0 || opacity <= 0) return;
  ctx.globalAlpha = opacity;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.width;
  ctx.strokeStyle = stroke.color;
  if (stroke.points.length < 2) {
    const p = stroke.points[0];
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, stroke.width / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.color;
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
  for (const p of stroke.points.slice(1)) ctx.lineTo(p.x * w, p.y * h);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

interface AnnotationOverlayProps {
  /** Only the teacher ever draws — students receive marks read-only. */
  canDraw: boolean;
  /** Whether the pen tool is actively toggled on right now. When off the overlay still
   *  renders (so a mark mid-fade isn't yanked away) but never captures pointer events. */
  active: boolean;
  color: string;
  onLocalOp?: (op: AnnotationOp) => void;
}

/**
 * Transparent freehand layer over the Jitsi video stage — lets the teacher mark directly on
 * top of whatever's currently on screen (camera or a shared screen) instead of only on the
 * separate whiteboard tab. Deliberately has no history/persistence (see SendAnnotation on the
 * hub): a student who joins mid-class just sees a blank overlay until the teacher draws again,
 * which is fine for "point at this while the child reads" — it was never meant to be a durable
 * record the way the whiteboard is.
 */
const AnnotationOverlay = forwardRef<AnnotationOverlayHandle, AnnotationOverlayProps>(function AnnotationOverlay(
  { canDraw, active, color, onLocalOp },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const draftRef = useRef<Stroke | null>(null);
  const drawingRef = useRef(false);
  const lastSendRef = useRef(0);
  const sentPointCountRef = useRef(0);
  const establishedRef = useRef(false);

  const fadeFrameRef = useRef<number | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = performance.now();
    let anyFading = false;
    const remaining: Stroke[] = [];
    for (const stroke of strokesRef.current) {
      const opacity = strokeOpacity(stroke, now);
      if (opacity <= 0) continue;
      if (stroke.lastUpdatedAt !== undefined) anyFading = true;
      drawStroke(ctx, stroke, canvas.width, canvas.height, opacity);
      remaining.push(stroke);
    }
    if (remaining.length !== strokesRef.current.length) strokesRef.current = remaining;
    if (draftRef.current) drawStroke(ctx, draftRef.current, canvas.width, canvas.height);

    // Keep redrawing on our own while anything is mid-fade — nothing else (pointer move,
    // a network op) would otherwise trigger the next frame's slightly-more-transparent pass.
    if (anyFading && fadeFrameRef.current === null) {
      fadeFrameRef.current = requestAnimationFrame(() => {
        fadeFrameRef.current = null;
        redraw();
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (fadeFrameRef.current !== null) cancelAnimationFrame(fadeFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width));
      canvas.height = Math.max(1, Math.floor(rect.height));
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [redraw]);

  // Clearing the pen tool off clears the marks too — this overlay is a "point at this
  // right now" tool, not something meant to linger once the teacher's moved on. Broadcasts
  // the clear (when this side can draw) so classmates' overlays wipe along with this one,
  // not just the teacher's own view.
  const wasActiveRef = useRef(active);
  useEffect(() => {
    if (active) {
      wasActiveRef.current = true;
      return;
    }
    if (!wasActiveRef.current) return;
    wasActiveRef.current = false;
    strokesRef.current = [];
    draftRef.current = null;
    redraw();
    if (canDraw) onLocalOp?.({ kind: "clear" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, redraw, canDraw]);

  useImperativeHandle(ref, () => ({
    applyRemoteOp(op: AnnotationOp) {
      switch (op.kind) {
        case "stroke": {
          // Received while its sender is still actively drawing (before their own commit) —
          // stamped "now", not left unset, so a remote copy doesn't start fading before the
          // teacher has even finished the mark. Refreshed again by every strokeAppend below,
          // and for real once appends stop arriving (see FADE_HOLD_MS/strokeOpacity above).
          const stamped: Stroke = { ...op.stroke, lastUpdatedAt: performance.now() };
          const existing = strokesRef.current.findIndex((s) => s.id === stamped.id);
          if (existing === -1) strokesRef.current = [...strokesRef.current, stamped];
          else strokesRef.current = strokesRef.current.map((s, i) => (i === existing ? stamped : s));
          break;
        }
        case "strokeAppend": {
          strokesRef.current = strokesRef.current.map((s) =>
            s.id === op.strokeId ? { ...s, points: [...s.points, ...op.points], lastUpdatedAt: performance.now() } : s
          );
          break;
        }
        case "clear":
          strokesRef.current = [];
          break;
      }
      redraw();
    },
  }));

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0,
      y: rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!canDraw || !active) return;
    drawingRef.current = true;
    draftRef.current = { id: nextId(), points: [getPoint(e)], color, width: 4 };
    sentPointCountRef.current = 0;
    establishedRef.current = false;
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !draftRef.current) return;
    draftRef.current.points.push(getPoint(e));
    redraw();

    const now = performance.now();
    if (onLocalOp && now - lastSendRef.current >= 50) {
      lastSendRef.current = now;
      const allPoints = draftRef.current.points;
      if (!establishedRef.current) {
        establishedRef.current = true;
        sentPointCountRef.current = allPoints.length;
        onLocalOp({ kind: "stroke", stroke: { ...draftRef.current, points: [...allPoints] } });
      } else {
        const newPoints = allPoints.slice(sentPointCountRef.current);
        if (newPoints.length > 0) {
          sentPointCountRef.current = allPoints.length;
          onLocalOp({ kind: "strokeAppend", strokeId: draftRef.current.id, points: newPoints });
        }
      }
    }
  }

  function commitDraft() {
    if (!drawingRef.current || !draftRef.current) return;
    drawingRef.current = false;
    const finished = draftRef.current;
    // The pen lifting is the actual "mark is finished" moment for the person drawing it —
    // this is what starts its disappearing-ink countdown (see strokeOpacity/FADE_HOLD_MS).
    finished.lastUpdatedAt = performance.now();
    draftRef.current = null;
    strokesRef.current = [...strokesRef.current, finished];
    redraw();
    if (!establishedRef.current) {
      onLocalOp?.({ kind: "stroke", stroke: finished });
    } else {
      const remaining = finished.points.slice(sentPointCountRef.current);
      if (remaining.length > 0) onLocalOp?.({ kind: "strokeAppend", strokeId: finished.id, points: remaining });
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 z-30 h-full w-full touch-none", canDraw && active ? "cursor-crosshair" : "pointer-events-none")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={commitDraft}
      onPointerLeave={commitDraft}
    />
  );
});

export default AnnotationOverlay;
