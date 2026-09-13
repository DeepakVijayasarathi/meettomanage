import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ChevronLeft, ChevronRight, FileUp, Loader2, Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { fetchPresentationFile, getPresentation, uploadPresentation } from "@/api/sessions";

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
}

/**
 * "Present a file" — the Google Meet-style deck viewer. The teacher uploads a PDF once (any
 * presentation tool exports to PDF); everyone renders the same file locally via pdf.js, and
 * Next/Previous broadcasts the current page over the classroom hub (ClassroomHub.SendSlide)
 * instead of anyone re-uploading or re-rendering server-side per click.
 */
const PresentationViewer = forwardRef<PresentationViewerHandle, PresentationViewerProps>(function PresentationViewer(
  { sessionId, canPresent, onSlideChange },
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

  const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
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
        const parent = canvas.parentElement!;
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
      toast({ variant: "error", title: "PDF only", description: "Export your slides to PDF first, then upload that file." });
      return;
    }
    setUploading(true);
    try {
      await uploadPresentation(sessionId, file);
      const bytes = await fetchPresentationFile(sessionId);
      await loadDeckBytes(bytes, file.name);
      onSlideChange?.(0);
    } catch (err) {
      toast({ variant: "error", title: "Couldn't upload the deck", description: err instanceof Error ? err.message : "Try again." });
    } finally {
      setUploading(false);
    }
  }

  function stopPresenting() {
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
      className="text-white/70 hover:bg-white/10 hover:text-white"
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
      <div className="flex h-full items-center justify-center text-white/40">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  // Kept mounted across both the "no deck yet" and "presenting" states — it backs both the
  // initial upload button below and the in-place "Update deck" button once presenting (Teacher
  // feedback: PPT changes have to be made in the original file elsewhere, then brought into
  // class — this is what lets the *bringing in* half happen without ever leaving this panel,
  // let alone the call). handleFileSelected doesn't care which state triggered it.
  const fileInput = <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileSelected} />;

  if (!fileName) {
    return canPresent ? (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <FileUp className="h-8 w-8 text-white/30" />
        <p className="text-sm text-white/50">No deck uploaded yet</p>
        {fileInput}
        <Button size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
          {uploading ? "Uploading…" : "Upload PDF to present"}
        </Button>
      </div>
    ) : (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-white/40">
        <Loader2 className="h-5 w-5" />
        <p className="text-sm">Waiting for the teacher to present</p>
      </div>
    );
  }

  return (
    // Same full-viewport overlay pattern as Whiteboard.tsx's own `maximized` — fills the whole
    // screen on demand instead of the ~380px side panel this otherwise lives in.
    <div className={cn("flex h-full flex-col", maximized && "fixed inset-0 z-40 h-screen bg-brand-navy p-4")}>
      {fileInput}
      <div className="relative flex-1 overflow-hidden bg-white/[0.02] p-3">
        <div className="flex h-full w-full items-center justify-center">
          <canvas ref={canvasRef} className="max-h-full max-w-full rounded-md bg-white shadow-lg" />
        </div>
        {(rendering || uploading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <Loader2 className="h-5 w-5 animate-spin text-white/60" />
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-white/10 p-2">
        {canPresent ? (
          <>
            <Button size="sm" variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" disabled={pageIndex === 0} onClick={() => goTo(pageIndex - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[52px] text-center text-xs font-medium tabular-nums text-white/60">
              {pageIndex + 1} / {pageCount}
            </span>
            <Button size="sm" variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white" disabled={pageIndex === pageCount - 1} onClick={() => goTo(pageIndex + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="mx-1 h-5 w-px bg-white/10" aria-hidden="true" />
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
              className="text-white/70 hover:bg-white/10 hover:text-white"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
              Update deck
            </Button>
            <Button size="sm" variant="ghost" className="text-white/50 hover:bg-white/10 hover:text-white" onClick={stopPresenting}>
              <X className="h-3.5 w-3.5" /> Stop presenting
            </Button>
          </>
        ) : (
          <>
            <span className="flex-1 text-center text-xs text-white/40">
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
