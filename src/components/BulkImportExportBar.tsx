import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileDown, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileDropzone } from "@/components/FileDropzone";
import { apiEnabled } from "@/lib/api";
import { toCsv } from "@/lib/utils";
import type { BulkImportResult } from "@/api/types";

interface BulkImportExportBarProps {
  /** Lowercase plural noun used in button labels/messages, e.g. "departments". */
  entityLabel: string;
  /** Column headers for the "Download template" CSV — a blank starting point in the exact
   *  shape the import endpoint expects. */
  templateColumns: string[];
  onImport: (file: File) => Promise<BulkImportResult>;
  onExport: () => Promise<void>;
  /** Called once after an import finishes (even a partial one) so the screen can reload its list. */
  onImported?: () => void;
}

/**
 * Shared "Import" / "Export" toolbar pair, meant to be passed as a DataTable's `toolbar` prop.
 * Mirrors the same continue-on-error, per-row-breakdown pattern the backend's bulk-import
 * endpoints use — one bad row never blocks the rest, so results always show a
 * succeeded/failed count plus the specific row errors rather than a single pass/fail.
 */
export function BulkImportExportBar({ entityLabel, templateColumns, onImport, onExport, onImported }: BulkImportExportBarProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setFile(null);
    setResult(null);
    setError(null);
    setOpen(true);
  }

  function downloadTemplate() {
    const csv = toCsv(templateColumns, []);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${entityLabel}-template.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const outcome = await onImport(file);
      setResult(outcome);
      onImported?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The import failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await onExport();
    } catch {
      /* the export helper's own fetch failure has nothing useful to add here — the browser
         download simply doesn't start, same as any other export button in this app. */
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={openDialog}>
          <Upload className="h-4 w-4" /> Import
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="h-4 w-4" /> {exporting ? "Exporting…" : "Export"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk import {entityLabel}</DialogTitle>
            <DialogDescription>Upload a .csv or .xlsx file — each row becomes one record. Bad rows are skipped and listed below; they never block the good ones.</DialogDescription>
          </DialogHeader>

          {!apiEnabled() ? (
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm font-medium text-warning-foreground">
              Bulk import requires the live API — this is demo mode.
            </p>
          ) : result ? (
            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                {result.failedCount === 0 ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-warning-foreground" />
                )}
                {result.succeededCount} of {result.totalRows} row{result.totalRows === 1 ? "" : "s"} imported
                {result.failedCount > 0 && `, ${result.failedCount} failed`}.
              </p>
              {result.errors.length > 0 && (
                <ScrollArea className="max-h-48 rounded-lg border border-border">
                  <ul className="divide-y divide-border">
                    {result.errors.map((e) => (
                      <li key={e.rowNumber} className="px-3 py-2 text-xs">
                        <span className="font-semibold text-foreground">Row {e.rowNumber}:</span>{" "}
                        <span className="text-muted-foreground">{e.message}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 self-start text-sm font-medium text-primary hover:underline"
              >
                <FileDown className="h-3.5 w-3.5" /> Download template
              </button>
              <FileDropzone
                label="Drag & drop or click to upload"
                hint=".csv or .xlsx"
                accept=".csv,.xlsx"
                onFile={setFile}
              />
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            </div>
          )}

          <DialogFooter>
            {result ? (
              <Button onClick={() => setOpen(false)}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                {apiEnabled() && (
                  <Button onClick={upload} disabled={!file || uploading}>
                    {uploading ? "Uploading…" : "Upload"}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
