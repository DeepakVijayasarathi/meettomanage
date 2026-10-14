/**
 * Shared stroke model + canvas painter for the two drawing surfaces in the classroom: the
 * whiteboard (Whiteboard.tsx, pixel coordinates on an infinite canvas) and marks drawn on a
 * presented slide (SlideAnnotationLayer.tsx, which scales its slide-relative strokes to pixels
 * before calling drawStroke). One painter keeps a pen/highlighter/arrow looking identical on both.
 */

export type ToolId = "pen" | "highlighter" | "eraser" | "rectangle" | "circle" | "line" | "arrow" | "text" | "sticky" | "pan";

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  tool: ToolId;
  points: Point[];
  color: string;
  width: number;
  text?: string;
}

/** Freehand tools: their points are a path, not two corners of a shape. */
export function isFreehand(tool: ToolId): boolean {
  return tool === "pen" || tool === "highlighter" || tool === "eraser";
}

// A highlighter is a wide, see-through marker: the slide/board text underneath stays readable.
export const HIGHLIGHTER_ALPHA = 0.35;
export const HIGHLIGHTER_WIDTH_FACTOR = 4;

export function textFontPx(width: number): number {
  return Math.max(16, width * 5);
}

export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  ctx.save();
  ctx.lineCap = stroke.tool === "highlighter" ? "square" : "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.tool === "highlighter" ? stroke.width * HIGHLIGHTER_WIDTH_FACTOR : stroke.width;
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
  // The whole path is stroked once, so the alpha applies to the stroke as one shape --
  // overlapping segments of the same highlighter pass don't darken where they cross.
  if (stroke.tool === "highlighter") ctx.globalAlpha = HIGHLIGHTER_ALPHA;

  if (isFreehand(stroke.tool)) {
    if (stroke.points.length < 2) {
      const p = stroke.points[0];
      if (p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const p of stroke.points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  } else if (stroke.tool === "line" || stroke.tool === "arrow") {
    const [a, b] = stroke.points;
    if (a && b) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if (stroke.tool === "arrow") {
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        const head = Math.max(10, stroke.width * 3.5);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - head * Math.cos(angle - Math.PI / 7), b.y - head * Math.sin(angle - Math.PI / 7));
        ctx.lineTo(b.x - head * Math.cos(angle + Math.PI / 7), b.y - head * Math.sin(angle + Math.PI / 7));
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (stroke.tool === "rectangle") {
    const [a, b] = stroke.points;
    if (a && b) ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  } else if (stroke.tool === "circle") {
    const [a, b] = stroke.points;
    if (a && b) {
      const rx = Math.abs(b.x - a.x) / 2;
      const ry = Math.abs(b.y - a.y) / 2;
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (stroke.tool === "text") {
    const p = stroke.points[0];
    if (p) {
      ctx.font = `600 ${textFontPx(stroke.width)}px "Inter", sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(stroke.text ?? "", p.x, p.y);
    }
  } else if (stroke.tool === "sticky") {
    const p = stroke.points[0];
    if (p) {
      const lines = (stroke.text ?? "").split("\n");
      const noteW = 168;
      const noteH = Math.max(64, 26 + lines.length * 18);
      ctx.save();
      ctx.shadowColor = "rgba(15, 23, 42, 0.18)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = stroke.color;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, noteW, noteH, 8);
      ctx.fill();
      ctx.restore();
      ctx.font = '500 13px "Inter", sans-serif';
      ctx.textBaseline = "top";
      ctx.fillStyle = "#0F172A";
      lines.forEach((line, i) => ctx.fillText(line, p.x + 10, p.y + 12 + i * 18, noteW - 20));
    }
  }
  ctx.restore();
}
