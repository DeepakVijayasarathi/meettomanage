import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronRight, ClipboardList, Folder, FolderOpen, LayoutList, Loader2, Upload, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { FileDropzone } from "@/components/FileDropzone";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RESOURCES } from "@/data/resources";
import { BATCHES } from "@/data/batches";
import { COURSES } from "@/data/courses";
import { apiEnabled, userMessage } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listResources, toFrontendResource, updateResource, uploadResource, type ApiResourceType } from "@/api/resources";
import { listBatches } from "@/api/batches";
import type { Resource } from "@/types";
import { formatDate } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";

const TYPE_META: Record<Resource["type"], { icon: typeof BookOpen; color: string; label: string }> = {
  book: { icon: BookOpen, color: CHART_PALETTE[0], label: "Book" },
  worksheet: { icon: ClipboardList, color: CHART_PALETTE[3], label: "Worksheet" },
  recording: { icon: Video, color: CHART_PALETTE[4], label: "Recording" },
};

/** The dialog has no explicit type field yet; infer worksheet vs. other from the file. */
function inferResourceType(file: File): ApiResourceType {
  if (file.type.startsWith("video/")) return "Other";
  if (file.type === "application/epub+zip") return "ReadingBook";
  return "Worksheet";
}

const NONE = "__none";

type FolderPath = { course?: string; batch?: string };

function FolderCard({ label, count, onOpen }: { label: string; count: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Folder className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {count} {count === 1 ? "file" : "files"}
        </span>
      </span>
    </button>
  );
}

export default function AdminResources() {
  const { toast } = useToast();
  const { data: apiResources, error: resourcesError, reload } = useApiData(
    () => listResources().then((items) => items.map(toFrontendResource)),
    RESOURCES
  );
  // Access toggles stay client-side until per-resource flags land in the API
  const [resources, setResources] = useState<Resource[]>(RESOURCES);
  useEffect(() => setResources(apiResources), [apiResources]);
  // Real batches for the upload dialog — the old mock BATCHES ids don't exist in the live
  // DB, so picking one and sending it as BatchId would have targeted a batch that isn't there.
  const { data: apiBatches } = useApiData(() => listBatches(), [], undefined, { cacheKey: "batches" });
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadBatch, setUploadBatch] = useState<string>("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleUpload() {
    if (!pendingFile) return;
    if (!apiEnabled()) {
      setUploadOpen(false);
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      await uploadResource(pendingFile, {
        title: pendingFile.name.replace(/\.[^.]+$/, ""),
        type: inferResourceType(pendingFile),
        isDownloadable: inferResourceType(pendingFile) === "Worksheet",
        batchId: uploadBatch || undefined,
        courseId: apiBatches.find((b) => b.id === uploadBatch)?.courseId,
      });
      reload();
      setUploadOpen(false);
      setPendingFile(null);
      toast({ variant: "success", title: "Resource uploaded" });
    } catch (err) {
      const message = userMessage(err, "Could not upload the file.");
      setUploadError(message);
      toast({ variant: "error", title: "Couldn't upload resource", description: message });
    } finally {
      setUploading(false);
    }
  }

  const [downloadBusyId, setDownloadBusyId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  /** Demo mode only — a local, unpersisted flip. Live mode's Downloadable column uses toggleDownloadable instead. */
  function toggleField(id: string, field: "downloadable" | "visibleToParents") {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: !r[field] } : r)));
  }

  const toggleDownloadable = useCallback(
    async (row: Resource) => {
      if (!apiEnabled()) {
        toggleField(row.id, "downloadable");
        return;
      }
      setToggleError(null);
      setDownloadBusyId(row.id);
      try {
        await updateResource(row.id, !row.downloadable);
        reload();
      } catch (err) {
        setToggleError(userMessage(err, "Could not update this resource."));
      } finally {
        setDownloadBusyId(null);
      }
    },
    [reload]
  );

  // Same source the upload dialog's own Batch picker uses (line ~253) — one canonical
  // lookup so the table's "Batch" column always reflects real data, in both modes.
  const batchNameById = useMemo(() => {
    const map = new Map<string, string>();
    (apiEnabled() ? apiBatches : BATCHES).forEach((b) => {
      map.set(b.id, "courseName" in b && b.courseName ? `${b.name} · ${b.courseName}` : b.name);
    });
    return map;
  }, [apiBatches]);

  // Folder tree: Course → Batch → files. A batch belongs to exactly one course, so the course
  // is derived from the batch first and only falls back to the resource's own courseId.
  const batchInfo = useMemo(() => {
    const map = new Map<string, { name: string; courseId?: string }>();
    (apiEnabled() ? apiBatches : BATCHES).forEach((b) => map.set(b.id, { name: b.name, courseId: b.courseId }));
    return map;
  }, [apiBatches]);

  const courseNameById = useMemo(() => {
    const map = new Map<string, string>();
    if (apiEnabled()) apiBatches.forEach((b) => b.courseId && b.courseName && map.set(b.courseId, b.courseName));
    else COURSES.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [apiBatches]);

  const [viewMode, setViewMode] = useState<"folders" | "all">("folders");
  const [path, setPath] = useState<FolderPath>({});

  const courseKeyOf = useCallback(
    (r: Resource) => (r.batchId && batchInfo.get(r.batchId)?.courseId) || r.courseId || NONE,
    [batchInfo]
  );
  const courseLabel = useCallback(
    (key: string) => (key === NONE ? "Unassigned" : (courseNameById.get(key) ?? "Course")),
    [courseNameById]
  );
  const batchLabel = useCallback((key: string) => batchInfo.get(key)?.name ?? "Batch", [batchInfo]);

  const courseFolders = useMemo(() => {
    const map = new Map<string, number>();
    resources.forEach((r) => map.set(courseKeyOf(r), (map.get(courseKeyOf(r)) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => courseLabel(a[0]).localeCompare(courseLabel(b[0])));
  }, [resources, courseKeyOf, courseLabel]);

  const inCourse = useMemo(
    () => (path.course ? resources.filter((r) => courseKeyOf(r) === path.course) : []),
    [resources, path.course, courseKeyOf]
  );

  const batchFolders = useMemo(() => {
    const map = new Map<string, number>();
    inCourse.forEach((r) => r.batchId && map.set(r.batchId, (map.get(r.batchId) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => batchLabel(a[0]).localeCompare(batchLabel(b[0])));
  }, [inCourse, batchLabel]);

  const visibleFiles = useMemo(() => {
    if (viewMode === "all") return resources;
    if (!path.course) return [];
    if (path.batch) return inCourse.filter((r) => r.batchId === path.batch);
    return inCourse.filter((r) => !r.batchId); // batch-less files sit directly in the course folder
  }, [viewMode, resources, path, inCourse]);

  const columns: DataTableColumn<Resource>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Resource",
        sortable: true,
        accessor: (row) => row.title,
        render: (row) => {
          const meta = TYPE_META[row.type];
          const Icon = meta.icon;
          return (
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{row.title}</p>
                <p className="text-xs text-muted-foreground">{row.sizeLabel ?? "Streamed content"}</p>
              </div>
            </div>
          );
        },
      },
      {
        key: "type",
        header: "Type",
        sortable: true,
        accessor: (row) => row.type,
        render: (row) => <Badge variant="outline">{TYPE_META[row.type].label}</Badge>,
      },
      {
        key: "batch",
        header: "Batch",
        sortable: true,
        accessor: (row) => batchNameById.get(row.batchId ?? "") ?? "",
        render: (row) => <span className="text-sm">{row.batchId ? (batchNameById.get(row.batchId) ?? "—") : "—"}</span>,
      },
      {
        key: "uploadedOn",
        header: "Uploaded",
        sortable: true,
        accessor: (row) => row.uploadedOn,
        render: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.uploadedOn)}</span>,
      },
      {
        key: "downloadable",
        header: "Downloadable",
        render: (row) => (
          <Switch
            checked={row.downloadable}
            disabled={downloadBusyId === row.id}
            onCheckedChange={() => toggleDownloadable(row)}
          />
        ),
      },
      {
        key: "visibleToParents",
        header: "Visible to Parents",
        render: (row) =>
          apiEnabled() ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground underline decoration-dotted">Per parent</span>
              </TooltipTrigger>
              <TooltipContent>Visibility is granted per parent, not a single on/off for the resource. Per-parent grant management isn't in this screen yet.</TooltipContent>
            </Tooltip>
          ) : (
            <Switch checked={row.visibleToParents ?? false} onCheckedChange={() => toggleField(row.id, "visibleToParents")} />
          ),
      },
    ],
    [downloadBusyId, toggleDownloadable, batchNameById]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Content Library"
        title="Content & Resources"
        description="Manage reading books, worksheets and session recordings, and control parent-facing access."
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" />
            Upload Resource
          </Button>
        }
      />

      {toggleError && <p className="mb-4 text-sm font-medium text-destructive">{toggleError}</p>}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Folder path">
          {viewMode === "all" ? (
            <span className="font-medium text-foreground">All files</span>
          ) : (
            <>
              <button type="button" className="-my-1.5 px-0.5 py-1.5 font-medium text-primary hover:underline" onClick={() => setPath({})}>
                All folders
              </button>
              {path.course && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <button
                    type="button"
                    className={path.batch ? "font-medium text-primary hover:underline" : "font-medium text-foreground"}
                    onClick={() => setPath({ course: path.course })}
                  >
                    {courseLabel(path.course)}
                  </button>
                </>
              )}
              {path.batch && (
                <>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{batchLabel(path.batch)}</span>
                </>
              )}
            </>
          )}
        </nav>
        <div className="inline-flex rounded-lg border p-0.5">
          <Button size="sm" variant={viewMode === "folders" ? "secondary" : "ghost"} onClick={() => setViewMode("folders")}>
            <FolderOpen className="h-4 w-4" /> Folders
          </Button>
          <Button size="sm" variant={viewMode === "all" ? "secondary" : "ghost"} onClick={() => setViewMode("all")}>
            <LayoutList className="h-4 w-4" /> All files
          </Button>
        </div>
      </div>

      {viewMode === "folders" && !path.batch && (path.course ? batchFolders.length > 0 : courseFolders.length > 0) && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {path.course
            ? batchFolders.map(([key, count]) => (
                <FolderCard key={key} label={batchLabel(key)} count={count} onOpen={() => setPath({ course: path.course, batch: key })} />
              ))
            : courseFolders.map(([key, count]) => (
                <FolderCard key={key} label={courseLabel(key)} count={count} onOpen={() => setPath({ course: key })} />
              ))}
        </div>
      )}

      {viewMode === "folders" && !path.course && courseFolders.length === 0 && (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No resources uploaded yet. Use Upload Resource to add a reading book, worksheet or recording.
        </p>
      )}

      {(viewMode === "all" || path.course) && (
        <DataTable
          data={visibleFiles}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search resources by title…"
          emptyTitle={viewMode === "all" ? "No resources uploaded yet" : "No files directly in this folder"}
          emptyDescription={
            viewMode === "all"
              ? "Upload a reading book, worksheet or recording with the button above to make it available to parents and teachers."
              : "Open a sub-folder above, or upload a file with the button at the top."
          }
          error={apiEnabled() ? resourcesError : null}
          onRetry={reload}
        />
      )}

      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) {
            setPendingFile(null);
            setUploadError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Resource</DialogTitle>
            <DialogDescription>
              Add a book, worksheet or recording to the content library.
              {!apiEnabled() && " This is a mock upload — no file is transferred."}
            </DialogDescription>
          </DialogHeader>

          <FileDropzone
            label="Drag & drop a file or click to browse"
            onFile={(file) => setPendingFile(file)}
          />

          {/* The course a resource belongs to is determined entirely by which batch it's
              attached to (handleUpload derives courseId from the selected batch below) —
              there's no separate, independent "category" for a resource to pick, so this
              used to be a second selector with no effect on the actual upload. */}
          <div className="grid grid-cols-1 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="resource-upload-batch-select">Batch</Label>
              <Select value={uploadBatch} onValueChange={setUploadBatch}>
                <SelectTrigger id="resource-upload-batch-select">
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {(apiEnabled() ? apiBatches : BATCHES).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                      {"courseName" in b ? ` · ${b.courseName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {uploadError && <p className="text-sm font-medium text-destructive">{uploadError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!pendingFile || uploading} onClick={handleUpload}>
              {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {uploading ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
