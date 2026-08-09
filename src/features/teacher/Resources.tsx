import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Download, Eye, EyeOff, FileText, FolderOpen, Upload, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { FileDropzone } from "@/components/FileDropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RESOURCES } from "@/data/resources";
import { BATCHES, getBatchById } from "@/data/batches";
import { CHART_PALETTE } from "@/lib/roles";
import { cn, formatDate } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  downloadMyResource,
  listMyResources,
  uploadMyResource,
  type ApiResource,
  type ApiResourceType,
} from "@/api/resources";
import { listMySessions } from "@/api/sessions";
import type { Resource } from "@/types";

const TEACHER_ID = "t-1";

/** Normalized shape the screen renders, unified across demo mock and API. */
interface ViewResource {
  id: string;
  title: string;
  type: Resource["type"];
  batchName: string;
  uploadedOn: string;
  downloadable: boolean;
  visibleToParents: boolean;
  sizeLabel?: string;
}

interface BatchOption {
  id: string;
  name: string;
}

const TYPE_META: Record<Resource["type"], { label: string; icon: typeof BookOpen; hex: string }> = {
  book: { label: "Book", icon: BookOpen, hex: CHART_PALETTE[0] },
  worksheet: { label: "Worksheet", icon: FileText, hex: CHART_PALETTE[3] },
  recording: { label: "Recording", icon: Video, hex: CHART_PALETTE[4] },
};

// Frontend type -> API ResourceType (recordings live in SessionRecordings; upload generic as Other)
const API_TYPE: Record<Resource["type"], ApiResourceType> = {
  book: "ReadingBook",
  worksheet: "Worksheet",
  recording: "Other",
};

const TYPE_FROM_API: Record<ApiResourceType, Resource["type"]> = {
  ReadingBook: "book",
  Worksheet: "worksheet",
  Other: "recording",
};

function formatSize(bytes: number | null): string | undefined {
  if (bytes == null) return undefined;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function apiToView(r: ApiResource): ViewResource {
  return {
    id: r.id,
    title: r.title,
    type: TYPE_FROM_API[r.type],
    batchName: r.batchName ?? "General",
    uploadedOn: r.createdAtUtc.slice(0, 10),
    downloadable: r.isDownloadable,
    // Teacher-owned resources are surfaced to the teacher regardless of parent visibility
    visibleToParents: true,
    sizeLabel: formatSize(r.fileSizeBytes),
  };
}

export default function TeacherResources() {
  const usingApi = apiEnabled();

  // Demo roster (mock) — filtered to this teacher's batches.
  const demoBatches = BATCHES.filter((b) => b.teacherId === TEACHER_ID);
  const demoBatchIds = demoBatches.map((b) => b.id);
  const demoView: ViewResource[] = RESOURCES.filter((r) => r.batchId && demoBatchIds.includes(r.batchId)).map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    batchName: r.batchId ? getBatchById(r.batchId)?.name ?? "General" : "General",
    uploadedOn: r.uploadedOn,
    downloadable: r.downloadable,
    visibleToParents: r.visibleToParents,
    sizeLabel: r.sizeLabel,
  }));

  // Real resources for the signed-in teacher's batches.
  const { data: apiResources, loading, error, reload } = useApiData<ApiResource[]>(
    () => listMyResources(),
    []
  );
  // The teacher's batches (for the upload dropdown) are derived from their sessions.
  const { data: apiSessions } = useApiData(() => listMySessions(), []);

  const [localAdds, setLocalAdds] = useState<ViewResource[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<Resource["type"]>("worksheet");
  // Multi-batch visibility: the teacher chooses which of their batches see this material.
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const batchOptions: BatchOption[] = useMemo(() => {
    if (!usingApi) return demoBatches.map((b) => ({ id: b.id, name: b.name }));
    const seen = new Map<string, string>();
    for (const s of apiSessions) {
      if (s.batchId && s.batchName && !seen.has(s.batchId)) seen.set(s.batchId, s.batchName);
    }
    return [...seen].map(([id, name]) => ({ id, name }));
  }, [usingApi, apiSessions, demoBatches]);

  const resources: ViewResource[] = usingApi
    ? [...localAdds, ...apiResources.map(apiToView)]
    : [...localAdds, ...demoView];

  useEffect(() => {
    setSelectedBatchIds((prev) => (prev.length > 0 ? prev : batchOptions[0]?.id ? [batchOptions[0].id] : []));
  }, [batchOptions]);

  function toggleBatch(id: string) {
    setSelectedBatchIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  }

  useEffect(() => {
    if (!confirmation) return;
    const timer = setTimeout(() => setConfirmation(null), 5000);
    return () => clearTimeout(timer);
  }, [confirmation]);

  function resetUploadForm() {
    setTitle("");
    setType("worksheet");
    setSelectedBatchIds(batchOptions[0]?.id ? [batchOptions[0].id] : []);
    setFile(null);
    setUploadError(null);
  }

  async function handleUpload() {
    if (!title.trim() || selectedBatchIds.length === 0) return;
    const batchLabel = batchOptions
      .filter((b) => selectedBatchIds.includes(b.id))
      .map((b) => b.name)
      .join(", ");

    if (usingApi) {
      if (!file) {
        setUploadError("Please choose a file to upload.");
        return;
      }
      setSubmitting(true);
      setUploadError(null);
      try {
        await uploadMyResource(file, {
          title: title.trim(),
          type: API_TYPE[type],
          batchIds: selectedBatchIds,
          isDownloadable: type === "worksheet",
        });
        setConfirmation(`"${title.trim()}" uploaded — visible to ${batchLabel}.`);
        setUploadOpen(false);
        resetUploadForm();
        reload();
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Upload failed. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Demo mode: optimistic local add, not persisted.
    const newResource: ViewResource = {
      id: `r-new-${Date.now()}`,
      title: title.trim(),
      type,
      batchName: batchLabel || "General",
      uploadedOn: "2026-07-09",
      downloadable: type !== "recording",
      visibleToParents: false,
      sizeLabel: file ? "New upload" : undefined,
    };
    setLocalAdds((prev) => [newResource, ...prev]);
    setConfirmation(`"${newResource.title}" uploaded — pending admin visibility review. (Demo only — not persisted.)`);
    setUploadOpen(false);
    resetUploadForm();
  }

  async function handleDownload(resource: ViewResource) {
    if (!usingApi) {
      setDownloadingId(resource.id);
      setTimeout(() => setDownloadingId(null), 1600);
      return;
    }
    setDownloadingId(resource.id);
    try {
      await downloadMyResource(resource.id, resource.title);
    } catch {
      setUploadError("Download failed.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Resources"
        description="Books, worksheets and recordings tied to your batches."
        eyebrow="My Account"
        actions={
          <Dialog
            open={uploadOpen}
            onOpenChange={(open) => {
              setUploadOpen(open);
              if (!open) resetUploadForm();
            }}
          >
            <Button onClick={() => setUploadOpen(true)} disabled={usingApi && batchOptions.length === 0}>
              <Upload className="h-4 w-4" /> Upload resource
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload a resource</DialogTitle>
                <DialogDescription>Share a book, worksheet or recording with one of your batches. Visibility to parents is admin-controlled.</DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                <FileDropzone label="Drag & drop or click to upload" hint="PDF, PNG, JPG, MP4 up to 25MB" onFile={(f) => setFile(f)} />

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="resource-title">Title</Label>
                  <Input id="resource-title" placeholder="e.g. Blending Sounds Worksheet — Week 4" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Type</Label>
                    <Select value={type} onValueChange={(v) => setType(v as Resource["type"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="book">Book</SelectItem>
                        <SelectItem value="worksheet">Worksheet</SelectItem>
                        <SelectItem value="recording">Recording</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>Visible to batches</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {batchOptions.map((b) => (
                        <Button
                          key={b.id}
                          type="button"
                          variant="pill"
                          size="pill"
                          aria-pressed={selectedBatchIds.includes(b.id)}
                          onClick={() => toggleBatch(b.id)}
                        >
                          {b.name}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Pick one or more batches — the material shows only to those batches.</p>
                  </div>
                </div>

                {uploadError && <p className="text-sm font-medium text-destructive">{uploadError}</p>}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={!title.trim() || selectedBatchIds.length === 0 || submitting} onClick={handleUpload}>
                  {submitting ? "Uploading…" : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {confirmation && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" />
          {confirmation}
        </div>
      )}

      {usingApi && error && (
        <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          Couldn't load your resources: {error}
        </div>
      )}

      {usingApi && loading ? (
        <p className="text-sm text-muted-foreground">Loading your resources…</p>
      ) : resources.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No resources yet"
          description="Resources uploaded by you or the admin team for your batches will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => {
            const meta = TYPE_META[resource.type];
            const Icon = meta.icon;
            return (
              <Card key={resource.id} className="flex flex-col transition-shadow hover:shadow-pop">
                <CardHeader className="flex-row items-start gap-3 space-y-0">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${meta.hex}1A`, color: meta.hex }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="text-sm leading-snug">{resource.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">{resource.batchName}</p>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-3 pt-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{meta.label}</Badge>
                    <Badge variant={resource.visibleToParents ? "success" : "muted"} className="gap-1">
                      {resource.visibleToParents ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {resource.visibleToParents ? "Visible to parents" : "Hidden from parents"}
                    </Badge>
                    <Badge variant={resource.downloadable ? "secondary" : "muted"}>{resource.downloadable ? "Downloadable" : "View only"}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Uploaded {formatDate(resource.uploadedOn, "short")}</span>
                    {resource.sizeLabel && <span>{resource.sizeLabel}</span>}
                  </div>

                  {resource.downloadable ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={downloadingId === resource.id}
                      onClick={() => handleDownload(resource)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloadingId === resource.id ? "Downloading…" : "Download"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full" disabled>
                      {resource.type === "recording" ? "Preview unavailable" : "View only"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className={cn("mt-6 text-xs text-muted-foreground")}>
        Only admins can toggle parent visibility or downloadability for a resource. Contact the academic coordinator to request a change.
      </p>
    </div>
  );
}
