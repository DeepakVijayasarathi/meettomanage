import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, useSyncExternalStore } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ArrowUpRight, ChevronLeft, ChevronRight, Circle as CircleIcon, Eraser, FileUp, Highlighter, Loader2, Maximize2, Minimize2, Minus, Pencil, PenTool, Square, Trash2, Type, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { fetchPresentationFile, getPresentation, uploadPresentation } from "@/api/sessions";
import { userMessage } from "@/lib/api";
import SlideAnnotationLayer from "./SlideAnnotationLayer";
import type { ToolId } from "./drawing";
import type { SlideMarkOp, SlideMarksStore } from "./slideMarks";

const MARK_TOOLS: { id: ToolId; label: string; icon: typeof PenTool }[] = [
  { id: "pen", label: "Pen", icon: PenTool },
  { id: "highlighter", label: "Highlighter", icon: Highlighter },
  { id: "eraser", label: "Eraser (rubs out your marks, never the slide)", icon: Eraser },
  { id: "text", label: "Text", icon: Type },
  { id: "line", label: "Line", icon: Minus },
  { id: "arrow", label: "Arrow", icon: ArrowUpRight },
  { id: "rectangle", label: "Rectangle", icon: Square },
  { id: "circle", label: "Circle", icon: CircleIcon },
];
// Red first: the usual teacher's-pen colour, and readable on almost any slide.
const MARK_COLORS = ["#EF4444", "#1F6FE0", "#16A34A", "#FACC15", "#0F172A", "#FFFFFF"];
const MARK_WIDTHS = [2, 4, 8];

/**
 * pdf.js's worker is an ES module (.mjs), which browsers refuse to run unless the server sends
 * a JS-family Content-Type — some static hosts (this one included, confirmed live) serve every
 * unrecognized extension as application/octet-stream, since .mjs isn't in their default MIME
 * map. That's a hosting config fix outside this app's reach, so instead of depending on the
 * server's headers at all, the worker's bytes are fetched once as plain text and re-wrapped in
 * a same-origin blob: URL with an explicit correct type — the browser only cares about the type
 * *this* code hands it, not what the original request's response header said.
 */
let workerReadyPromise: Promise<void> | null = null;
function ensureWorkerReady(): Promise<void> {
  if (!workerReadyPromise) {
    workerReadyPromise = fetch(pdfjsWorker)
      .then((res) => res.text())
      .then((code) => {
        const blob = new Blob([code], { type: "text/javascript" });
        pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
      });
  }
  return workerReadyPromise;
}

export interface PresentationViewerHandle {
  /** Applies a slide index that arrived from the hub (a classmate's click, or the replay a
   *  student gets on joining mid-class) — never re-broadcasts it. */
  applyRemoteSlide: (pageIndex: number) => void;
}

interface PresentationViewerProps {
  sessionId: string;
  /** Only the teacher can upload a deck or change slides — students are view-only. */
  canPresent: boolean;
  /** Fires once per local Next/Previous click so the panel can broadcast it over the hub. */
  onSlideChange?: (pageIndex: number) => void;
  /** Everyone's view of the marks drawn on slides — owned by InteractivePanel, see slideMarks.ts. */
  marks: SlideMarksStore;
  /** Teacher's own mark ops: the panel applies them locally and broadcasts them. */
  onMarkOp: (op: SlideMarkOp) => void;
}

/**
 * "Present a file" — the Google Meet-style deck viewer. The teacher uploads a PDF once (any
 * presentation tool exports to PDF); everyone renders the same file locally via pdf.js, and
 * Next/Previous broadcasts the current page over the classroom hub (ClassroomHub.SendSlide)
 * instead of anyone re-uploading or re-rendering server-side per click.
 */
const PresentationViewer = forwardRef<PresentationViewerHandle, PresentationViewerProps>(function PresentationViewer(
  { sessionId, canPresent, onSlideChange, marks, onMarkOp },
  ref
) {
  const { toast } = useToast();
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [rendering, setRendering] = useState(false);
  // Same "fill the viewport on demand" affordance the Whiteboard tab already has — a deck
  // otherwise lives in the same ~380px side panel, cramped for anyone at the back of the room
  // to actually read the slide (teacher feedback: wanted the same full-screen option here too).
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    if (!maximized) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMaximized(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [maximized]);

  // Drawing on the slide (teacher feedback: "annotate directly on PPT slides while presenting").
  // Off by default so a click on the slide never leaves a stray dot.
  const [drawOn, setDrawOn] = useState(false);
  const [markTool, setMarkTool] = useState<ToolId>("pen");
  const [markColor, setMarkColor] = useState(MARK_COLORS[0]);
  const [markWidth, setMarkWidth] = useState(4);
  function pickMarkTool(id: ToolId) {
    setMarkTool(id);
    // A red highlighter is rarely what anyone wants; switch to the classic yellow once.
    if (id === "highlighter" && markColor === MARK_COLORS[0]) setMarkColor("#FACC15");
  }
  // Re-render the toolbar's Undo/Clear enabled state whenever marks change.
  const marksOnSlide = useSyncExternalStore(marks.subscribe, () => marks.get(pageIndex));

  const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // A remote slide can arrive before the deck itself has finished loading (a late-joining
  // student's replay vs. this component's own initial fetch racing each other) — stashed here
  // and applied the moment the document is ready, instead of being silently dropped.
  const pendingRemotePage = useRef<number | null>(null);

  const loadDeckBytes = useCallback(async (bytes: ArrayBuffer, name: string) => {
    await ensureWorkerReady();
    const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
    docRef.current = doc;
    setPageCount(doc.numPages);
    setFileName(name);
    const target = pendingRemotePage.current ?? 0;
    pendingRemotePage.current = null;
    setPageIndex(Math.min(Math.max(target, 0), doc.numPages - 1));
  }, []);

  // On mount: whatever's already uploaded for this session, if anything.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPresentation(sessionId)
      .then(async (meta) => {
        if (!meta || cancelled) return;
        const bytes = await fetchPresentationFile(sessionId);
        if (cancelled) return;
        await loadDeckBytes(bytes, meta.originalFileName);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, loadDeckBytes]);

  // Render the current page to the canvas whenever it changes, the deck first loads, or the
  // panel is maximized/restored — `maximized` changes the canvas's own parent size (see the
  // wrapping div below) without touching pageIndex/pageCount, so it has to be a dependency
  // here too or toggling full-screen would just stretch the last, smaller-resolution render
  // via CSS instead of re-rendering pdf.js's output crisp at the new, much larger size.
  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || pageCount === 0) return;
    let cancelled = false;
    setRendering(true);
    doc
      .getPage(pageIndex + 1)
      .then((page) => {
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1 });
        // The stage, not the canvas's direct parent: that wrapper shrink-wraps the canvas (so
        // the mark layer can sit exactly on top of it) and would feed its own size back in here.
        const parent = stageRef.current ?? canvas.parentElement!;
        const scale = Math.min(parent.clientWidth / viewport.width, parent.clientHeight / viewport.height) || 1;
        const scaledViewport = page.getViewport({ scale });
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        return page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setRendering(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pageIndex, pageCount, maximized]);

  useImperativeHandle(ref, () => ({
    applyRemoteSlide(remotePageIndex: number) {
      if (!docRef.current) {
        pendingRemotePage.current = remotePageIndex;
        return;
      }
      setPageIndex(Math.min(Math.max(remotePageIndex, 0), docRef.current.numPages - 1));
    },
  }));

  function goTo(next: number) {
    const clamped = Math.min(Math.max(next, 0), pageCount - 1);
    if (clamped === pageIndex) return;
    setPageIndex(clamped);
    onSlideChange?.(clamped);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      // Teachers' decks are almost always PowerPoint — the picker lets those through (see
      // fileInput's accept) just so this can say exactly how to convert, instead of the file
      // silently not appearing in the picker at all.
      const isSlideDeck = /\.(pptx?|ppsx?|odp|key)$/i.test(file.name);
      toast({
        variant: "error",
        title: isSlideDeck ? "Save your slides as PDF first" : "PDF only",
        description: isSlideDeck
          ? "In PowerPoint: File → Save As (or Export) → choose PDF. In Google Slides: File → Download → PDF. Then upload that PDF here."
          : "Export your slides to PDF first, then upload that file.",
      });
      return;
    }
    setUploading(true);
    try {
      await uploadPresentation(sessionId, file);
      const bytes = await fetchPresentationFile(sessionId);
      await loadDeckBytes(bytes, file.name);
      onMarkOp({ kind: "slideClearAll" });
      onSlideChange?.(0);
    } catch (err) {
      toast({ variant: "error", title: "Couldn't upload the deck", description: userMessage(err, "Try again.") });
    } finally {
      setUploading(false);
    }
  }

  function stopPresenting() {
    onMarkOp({ kind: "slideClearAll" });
    setDrawOn(false);
    docRef.current = null;
    setFileName(null);
    setPageCount(0);
    setPageIndex(0);
  }

  // Same button in both toolbars below (presenter and view-only) — mirrors
  // Whiteboard.tsx's own renderMaximizeButton so the two tabs behave identically.
  const renderMaximizeButton = () => (
    <Button
      size="sm"
      variant="ghost"
      className="text-call-ink/70 hover:bg-call-ink/10 hover:text-call-ink"
      title={maximized ? "Shrink the slide back down" : "Make the slide bigger"}
      aria-label={maximized ? "Shrink the slide back down" : "Make the slide bigger"}
      aria-pressed={maximized}
      onClick={() => setMaximized((m) => !m)}
    >
      {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
    </Button>
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-call-ink/40">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  // Kept mounted across both the "no deck yet" and "presenting" states — it backs both the
  // initial upload button below and the in-place "Update deck" button once presenting (Teacher
  // feedback: PPT changes have to be made in the original file elsewhere, then brought into
  // class — this is what lets the *bringing in* half happen without ever leaving this panel,
  // let alone the call). handleFileSelected doesn't care which state triggered it.
  const fileInput = <input ref={fileInputRef} type="file" accept="application/pdf,.pdf,.ppt,.pptx,.pps,.ppsx,.odp,.key" className="hidden" onChange={handleFileSelected} />;

  if (!fileName) {
    return canPresent ? (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <FileUp className="h-8 w-8 text-call-ink/30" />
        <p className="text-sm text-call-ink/50">No deck uploaded yet</p>
        <p className="max-w-xs text-xs text-call-ink/40">
          Change slides right here without leaving the class — students see each slide as you click Next. Using PowerPoint?
          Save it as PDF first (File → Save As → PDF).
        </p>
        {fileInput}
        <Button size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : "Upload PDF to present"}
        </Button>
      </div>
    ) : (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-call-ink/40">
        <Loader2 className="h-5 w-5" />
        <p className="text-sm">Waiting for the teacher to present</p>
      </div>
    );
  }

  return (
    // Same full-viewport overlay pattern as Whiteboard.tsx's own `maximized` — fills the whole
    // screen on demand instead of the ~380px side panel this otherwise lives in. Offset below
    // the classroom header via the same --classroom-header-h var Whiteboard.tsx's maximize
    // now uses, for the same reason: `inset-0` used to bury Leave/Focus Mode/Waiting Room (and
    // the reconnecting/error banners) under this overlay with no way back except Escape or
    // hunting for the Shrink button below — not acceptable on a currently-live classroom.
    <div
      className={cn("flex h-full flex-col", maximized && "fixed inset-x-0 bottom-0 z-40 bg-call-surface p-4")}
      style={maximized ? { top: "var(--classroom-header-h, 64px)" } : undefined}
    >
      {fileInput}
      <div className="relative flex-1 overflow-hidden bg-call-ink/[0.02] p-3">
        <div ref={stageRef} className="flex h-full w-full items-center justify-center">
          <div className="relative max-h-full max-w-full">
            <canvas ref={canvasRef} className="block max-h-full max-w-full rounded-md bg-white shadow-lg" />
            <SlideAnnotationLayer
              slide={pageIndex}
              store={marks}
              active={canPresent && drawOn}
              tool={markTool}
              color={markColor}
              width={markWidth}
              onOp={onMarkOp}
            />
          </div>
        </div>
        {(rendering || uploading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <Loader2 className="h-5 w-5 animate-spin text-call-ink/60" />
          </div>
        )}
      </div>
      {canPresent && drawOn && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-call-ink/10 px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-0.5 rounded-xl bg-call-ink/5 p-1">
            {MARK_TOOLS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={markTool === id}
                onClick={() => pickMarkTool(id)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  markTool === id ? "bg-brand-orange-deep text-white shadow-soft" : "text-call-ink/60 hover:bg-call-ink/5 hover:text-call-ink"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-call-ink/5 p-1.5">
            {MARK_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title="Colour"
                aria-label={`Colour ${c}`}
                aria-pressed={markColor === c}
                onClick={() => setMarkColor(c)}
                className={cn(
                  "h-5 w-5 rounded-full ring-1 ring-call-ink/20 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  markColor === c && "scale-110 ring-2 ring-white"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-0.5 rounded-xl bg-call-ink/5 p-1">
            {MARK_WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                title={w === 2 ? "Thin" : w === 4 ? "Medium" : "Thick"}
                aria-label={w === 2 ? "Thin" : w === 4 ? "Medium" : "Thick"}
                aria-pressed={markWidth === w}
                onClick={() => setMarkWidth(w)}
                className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition-colors", markWidth === w ? "bg-call-ink/15" : "hover:bg-call-ink/5")}
              >
                <span className="rounded-full bg-white" style={{ width: w + 3, height: w + 3 }} />
              </button>
            ))}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-call-ink/70 hover:bg-call-ink/10 hover:text-call-ink"
            title="Undo your last mark on this slide"
            aria-label="Undo"
            disabled={marksOnSlide.length === 0}
            onClick={() => {
              const last = marksOnSlide[marksOnSlide.length - 1];
              if (last) onMarkOp({ kind: "slideUndo", slide: pageIndex, strokeId: last.id });
            }}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-call-ink/70 hover:bg-call-ink/10 hover:text-call-ink"
            title="Clear all marks from this slide"
            aria-label="Clear marks on this slide"
            disabled={marksOnSlide.length === 0}
            onClick={() => onMarkOp({ kind: "slideClear", slide: pageIndex })}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {/* flex-wrap: in the ~380px side panel, Draw pushed Update deck / Stop presenting off the
          edge (seen on UAT) -- they now drop to a second row instead of disappearing. */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-call-ink/10 p-2">
        {canPresent ? (
          <>
            <Button size="sm" variant="ghost" className="text-call-ink/70 hover:bg-call-ink/10 hover:text-call-ink" disabled={pageIndex === 0} onClick={() => goTo(pageIndex - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[52px] text-center text-xs font-medium tabular-nums text-call-ink/60">
              {pageIndex + 1} / {pageCount}
            </span>
            <Button size="sm" variant="ghost" className="text-call-ink/70 hover:bg-call-ink/10 hover:text-call-ink" disabled={pageIndex === pageCount - 1} onClick={() => goTo(pageIndex + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="mx-1 h-5 w-px bg-call-ink/10" aria-hidden="true" />
            <Button
              size="sm"
              variant="ghost"
              aria-pressed={drawOn}
              title={drawOn ? "Stop drawing — clicks go back to normal" : "Draw on this slide: pen, highlighter, shapes, text. Students see your marks live."}
              className={cn("gap-1.5 text-call-ink/70 hover:bg-call-ink/10 hover:text-call-ink", drawOn && "bg-brand-orange-deep text-white hover:bg-brand-orange-deep")}
              onClick={() => setDrawOn((d) => !d)}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{drawOn ? "Drawing" : "Draw"}</span>
            </Button>
            {renderMaximizeButton()}
            <div className="flex-1" />
            {/* Re-export the edited deck to PDF, then bring it in right here — no "Stop
                presenting" round-trip (which used to blank every student's screen back to
                "Waiting for the teacher to present" for the whole swap) and no leaving this
                page. Making the actual edits still has to happen in the source PPT app itself
                (this panel only ever renders a static PDF snapshot, never the original slides),
                but that edit no longer forces you out of the class to bring the result back in. */}
            <Button
              size="sm"
              variant="ghost"
              className="text-call-ink/70 hover:bg-call-ink/10 hover:text-call-ink"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
              Update deck
            </Button>
            <Button size="sm" variant="ghost" className="text-call-ink/50 hover:bg-call-ink/10 hover:text-call-ink" onClick={stopPresenting}>
              <X className="h-3.5 w-3.5" /> Stop presenting
            </Button>
          </>
        ) : (
          <>
            <span className="flex-1 text-center text-xs text-call-ink/40">
              {pageIndex + 1} / {pageCount} — following the teacher
            </span>
            {renderMaximizeButton()}
          </>
        )}
      </div>
    </div>
  );
});

export default PresentationViewer;
