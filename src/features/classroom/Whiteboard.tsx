import { useCallback, useEffect, useRef, useState } from "react";
import {
  Circle as CircleIcon,
  Eraser,
  Hand,
  Minus,
  PenTool,
  Plus,
  Puzzle,
  Square,
  StickyNote,
  Trash2,
  Type,
  ChevronLeft,
  ChevronRight,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import WhiteboardActivity from "./WhiteboardActivity";

type ToolId = "pen" | "eraser" | "rectangle" | "circle" | "line" | "text" | "sticky" | "pan";

interface Point {
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

/** One synced board operation, relayed verbatim through the classroom hub. */
export type BoardOp =
  | { kind: "stroke"; pageIndex: number; stroke: Stroke }
  | { kind: "clear"; pageIndex: number }
  | { kind: "addPage" }
  | { kind: "removePage"; pageIndex: number };

interface Page {
  id: string;
  strokes: Stroke[];
}

let uidCounter = 0;
const nextId = () => `stroke-${Date.now()}-${uidCounter++}`;

const SWATCHES = ["#0F172A", "#FFFFFF", ...CHART_PALETTE];
const WIDTHS = [2, 4, 8];

const TOOLS: { id: ToolId; label: string; icon: typeof PenTool }[] = [
  { id: "pen", label: "Pen", icon: PenTool },
  { id: "eraser", label: "Eraser", icon: Eraser },
  { id: "rectangle", label: "Rectangle", icon: Square },
  { id: "circle", label: "Circle", icon: CircleIcon },
  { id: "line", label: "Line", icon: Minus },
  { id: "text", label: "Text", icon: Type },
  { id: "sticky", label: "Sticky note", icon: StickyNote },
  { id: "pan", label: "Pan the canvas", icon: Hand },
];

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.width;
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";

  if (stroke.tool === "pen" || stroke.tool === "eraser") {
    if (stroke.points.length < 2) {
      const p = stroke.points[0];
      if (!p) return;
      ctx.beginPath();
      ctx.arc(p.x, p.y, stroke.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const p of stroke.points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  } else if (stroke.tool === "line") {
    const [a, b] = stroke.points;
    if (a && b) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
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
    if (!p) return;
    ctx.font = `600 ${Math.max(16, stroke.width * 5)}px "Inter", sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(stroke.text ?? "", p.x, p.y);
  } else if (stroke.tool === "sticky") {
    const p = stroke.points[0];
    if (!p) return;
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
  ctx.globalCompositeOperation = "source-over";
}

interface WhiteboardProps {
  canDraw: boolean;
  onActivityComplete?: () => void;
  /** Engagement tracking: fired for every committed stroke/text/sticky. */
  onInteraction?: () => void;
  /** Real-time sync: local board ops broadcast to the class via the hub. */
  onBoardOp?: (op: BoardOp) => void;
  /** Real-time sync: subscribe to remote board ops; returns an unsubscribe. */
  subscribeBoardOps?: (handler: (op: BoardOp) => void) => () => void;
}

export default function Whiteboard({ canDraw, onActivityComplete, onInteraction, onBoardOp, subscribeBoardOps }: WhiteboardProps) {
  const [pages, setPages] = useState<Page[]>([{ id: nextId(), strokes: [] }]);
  const [pageIndex, setPageIndex] = useState(0);
  const [tool, setTool] = useState<ToolId>("pen");
  const [color, setColor] = useState(CHART_PALETTE[0]);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [showActivity, setShowActivity] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [lastCleared, setLastCleared] = useState<{ pageIndex: number; strokes: Stroke[] } | null>(null);
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; value: string; sticky?: boolean } | null>(null);
  // Infinite canvas: strokes live in world coordinates; the view pans over them
  const [viewOffset, setViewOffset] = useState<Point>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const draftRef = useRef<Stroke | null>(null);
  const panRef = useRef<{ startX: number; startY: number; origin: Point } | null>(null);
  // Offscreen cache of this page's already-committed strokes. handlePointerMove used to call
  // a redraw() that replayed every committed stroke from scratch on every single pointer
  // event — fine for a fresh page, but with hundreds of strokes accumulated over a real class
  // session that's O(strokes) canvas work per mouse-move, and it visibly degrades drawing
  // smoothness the longer a board stays in active use. Now the committed strokes are painted
  // here once (whenever they actually change), and the hot path just blits this bitmap plus
  // the one in-progress stroke on top — back to O(1) per pointer event regardless of history.
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentPage = pages[pageIndex];

  const redrawBackground = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!bgCanvasRef.current) bgCanvasRef.current = document.createElement("canvas");
    const bg = bgCanvasRef.current;
    bg.width = canvas.width;
    bg.height = canvas.height;
    const ctx = bg.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.translate(-viewOffset.x, -viewOffset.y);
    for (const stroke of currentPage.strokes) drawStroke(ctx, stroke);
    ctx.restore();
  }, [currentPage, viewOffset]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bgCanvasRef.current) ctx.drawImage(bgCanvasRef.current, 0, 0);
    if (draftRef.current) {
      ctx.save();
      ctx.translate(-viewOffset.x, -viewOffset.y);
      drawStroke(ctx, draftRef.current);
      ctx.restore();
    }
  }, [viewOffset]);

  // Re-render whenever this page's committed strokes change (page switch, new stroke, pan).
  useEffect(() => {
    redrawBackground();
    redraw();
  }, [redrawBackground, redraw]);

  // Size the canvas to its container and redraw on resize.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width));
      canvas.height = Math.max(1, Math.floor(rect.height));
      redrawBackground();
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [redrawBackground, redraw]);

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Screen → world: pan offset keeps strokes anchored while the view moves
    return { x: e.clientX - rect.left + viewOffset.x, y: e.clientY - rect.top + viewOffset.y };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!canDraw) return;
    if (tool === "pan") {
      panRef.current = { startX: e.clientX, startY: e.clientY, origin: viewOffset };
      canvasRef.current?.setPointerCapture(e.pointerId);
      return;
    }
    const pt = getPoint(e);
    if (tool === "text" || tool === "sticky") {
      // The input is positioned in screen space; converted back to world on commit
      setTextDraft({ x: pt.x - viewOffset.x, y: pt.y - viewOffset.y, value: "", sticky: tool === "sticky" });
      return;
    }
    drawingRef.current = true;
    draftRef.current = { id: nextId(), tool, points: [pt], color, width: strokeWidth };
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (panRef.current) {
      const { startX, startY, origin } = panRef.current;
      setViewOffset({ x: origin.x - (e.clientX - startX), y: origin.y - (e.clientY - startY) });
      return;
    }
    if (!drawingRef.current || !draftRef.current) return;
    const pt = getPoint(e);
    if (tool === "pen" || tool === "eraser") {
      draftRef.current.points.push(pt);
    } else {
      draftRef.current.points = [draftRef.current.points[0], pt];
    }
    redraw();
  }

  function commitDraft() {
    panRef.current = null;
    if (!drawingRef.current || !draftRef.current) return;
    drawingRef.current = false;
    const finished = draftRef.current;
    draftRef.current = null;
    setPages((prev) => prev.map((p, i) => (i === pageIndex ? { ...p, strokes: [...p.strokes, finished] } : p)));
    setLastCleared(null);
    onBoardOp?.({ kind: "stroke", pageIndex, stroke: finished });
    onInteraction?.();
  }

  function commitText() {
    if (!textDraft) return;
    if (textDraft.value.trim()) {
      const stroke: Stroke = {
        id: nextId(),
        tool: textDraft.sticky ? "sticky" : "text",
        points: [{ x: textDraft.x + viewOffset.x, y: textDraft.y + viewOffset.y }],
        // Sticky notes read best on a warm paper tone unless a light swatch is picked
        color: textDraft.sticky && color === CHART_PALETTE[0] ? "#FDE68A" : color,
        width: strokeWidth,
        text: textDraft.value,
      };
      setPages((prev) => prev.map((p, i) => (i === pageIndex ? { ...p, strokes: [...p.strokes, stroke] } : p)));
      setLastCleared(null);
      onBoardOp?.({ kind: "stroke", pageIndex, stroke });
      onInteraction?.();
    }
    setTextDraft(null);
  }

  function clearBoard() {
    setLastCleared({ pageIndex, strokes: currentPage.strokes });
    setPages((prev) => prev.map((p, i) => (i === pageIndex ? { ...p, strokes: [] } : p)));
    onBoardOp?.({ kind: "clear", pageIndex });
  }

  /**
   * One-level, local-only undo for the page that was just cleared — "Clear" wiped
   * every stroke with a single click and no way back; this restores it. Local-only
   * (not broadcast) since it just un-does what this device already sent.
   */
  function undoClear() {
    if (!lastCleared) return;
    setPages((prev) => prev.map((p, i) => (i === lastCleared.pageIndex ? { ...p, strokes: lastCleared.strokes } : p)));
    setLastCleared(null);
  }

  function addPage() {
    setPages((prev) => [...prev, { id: nextId(), strokes: [] }]);
    setPageIndex(pages.length);
    onBoardOp?.({ kind: "addPage" });
  }

  function removePage() {
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((_, i) => i !== pageIndex));
    setPageIndex((i) => Math.max(0, i - 1));
    onBoardOp?.({ kind: "removePage", pageIndex });
  }

  // Apply remote board ops from classmates (relayed through the classroom hub).
  useEffect(() => {
    if (!subscribeBoardOps) return;
    return subscribeBoardOps((op) => {
      switch (op.kind) {
        case "stroke":
          setPages((prev) => {
            // Pad so an op for a page we haven't created yet still lands
            const pages = [...prev];
            while (pages.length <= op.pageIndex) pages.push({ id: nextId(), strokes: [] });
            return pages.map((p, i) => (i === op.pageIndex ? { ...p, strokes: [...p.strokes, op.stroke] } : p));
          });
          break;
        case "clear":
          setPages((prev) => prev.map((p, i) => (i === op.pageIndex ? { ...p, strokes: [] } : p)));
          break;
        case "addPage":
          setPages((prev) => [...prev, { id: nextId(), strokes: [] }]);
          break;
        case "removePage":
          setPages((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== op.pageIndex) : prev));
          setPageIndex((i) => Math.max(0, Math.min(i, pages.length - 2)));
          break;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribeBoardOps]);

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      {canDraw ? (
        // Dark toolbar chrome matches the rest of the interactive panel (tabs, roster,
        // quiz) — only the canvas below stays a light "paper" surface, so this reads
        // as one dark product with a sheet of paper on it, not two stitched-together UIs.
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2.5 py-2">
          <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
            {TOOLS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                title={label}
                aria-label={label}
                aria-pressed={tool === id}
                onClick={() => setTool(id)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  // Violet marks "this tool is engaged," same accent used for Interactive/
                  // board-access/quiz elsewhere in the classroom — one consistent signal.
                  tool === id ? "bg-brand-violet text-white shadow-soft" : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
            {SWATCHES.map((sw) => (
              <button
                key={sw}
                title={sw}
                aria-label={`Use ${sw} ink color`}
                aria-pressed={color === sw}
                onClick={() => setColor(sw)}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-brand-navy",
                  color === sw ? "scale-110 border-white" : "border-transparent"
                )}
                style={{ backgroundColor: sw }}
              />
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
            {WIDTHS.map((w) => (
              <button
                key={w}
                title={`${w}px`}
                aria-label={`Stroke width ${w}px`}
                aria-pressed={strokeWidth === w}
                onClick={() => setStrokeWidth(w)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  strokeWidth === w ? "bg-white/15 text-white shadow-soft" : "text-white/50 hover:bg-white/5 hover:text-white/80"
                )}
              >
                <span className="rounded-full bg-current" style={{ width: w + 2, height: w + 2 }} />
              </button>
            ))}
          </div>

          <Button size="sm" variant="ghost" className="gap-1.5 text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setClearConfirmOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </Button>
          {lastCleared && lastCleared.pageIndex === pageIndex && (
            <Button size="sm" variant="ghost" className="gap-1.5 text-white/70 hover:bg-white/10 hover:text-white" onClick={undoClear}>
              <Undo2 className="h-3.5 w-3.5" /> Undo clear
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "gap-1.5",
              showActivity ? "bg-brand-violet text-white hover:bg-brand-violet/90" : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
            onClick={() => setShowActivity((s) => !s)}
          >
            <Puzzle className="h-3.5 w-3.5" /> Activity
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Previous page"
              onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
              disabled={pageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="whitespace-nowrap text-xs font-medium text-white/50">
              Page {pageIndex + 1}/{pages.length}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Next page"
              onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
              disabled={pageIndex === pages.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white" title="Add page" aria-label="Add page" onClick={addPage}>
              <Plus className="h-4 w-4" />
            </Button>
            {pages.length > 1 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-300/90 hover:bg-destructive/15 hover:text-red-200"
                title="Delete page"
                aria-label="Delete page"
                onClick={removePage}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/60">
          <span>👀 View only — ask your teacher for whiteboard access to draw</span>
          <span className="text-white/40">
            Page {pageIndex + 1}/{pages.length}
          </span>
        </div>
      )}

      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-brand-cream shadow-pop">
        <canvas
          ref={canvasRef}
          className={cn(
            "h-full w-full touch-none",
            !canDraw && "cursor-default",
            canDraw && (tool === "text" || tool === "sticky") && "cursor-text",
            canDraw && tool === "pan" && "cursor-grab active:cursor-grabbing",
            canDraw && tool !== "text" && tool !== "sticky" && tool !== "pan" && "cursor-crosshair"
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={commitDraft}
          onPointerLeave={commitDraft}
        />

        {textDraft && (
          <input
            autoFocus
            value={textDraft.value}
            onChange={(e) => setTextDraft((d) => (d ? { ...d, value: e.target.value } : d))}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitText();
              if (e.key === "Escape") setTextDraft(null);
            }}
            onBlur={commitText}
            placeholder="Type…"
            className="absolute z-10 rounded-md border border-brand-violet bg-white px-1.5 py-0.5 text-sm text-slate-900 shadow-pop outline-none"
            style={{ left: textDraft.x, top: textDraft.y, color }}
          />
        )}

        {showActivity && (
          <WhiteboardActivity
            onClose={() => setShowActivity(false)}
            onAllMatched={onActivityComplete}
          />
        )}
      </div>

      <ConfirmDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title="Clear this page?"
        description={`This wipes every stroke on page ${pageIndex + 1} for the class. You can undo it right after, but not once you draw something new.`}
        confirmLabel="Clear"
        destructive
        onConfirm={clearBoard}
      />
    </div>
  );
}
