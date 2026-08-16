import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, ClipboardList, Upload, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
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
import { apiEnabled } from "@/lib/api";
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

export default function AdminResources() {
  const { data: apiResources, reload } = useApiData(
    () => listResources().then((items) => items.map(toFrontendResource)),
    RESOURCES
  );
  // Access toggles stay client-side until per-resource flags land in the API
  const [resources, setResources] = useState<Resource[]>(RESOURCES);
  useEffect(() => setResources(apiResources), [apiResources]);
  // Real batches for the upload dialog — the old mock BATCHES ids don't exist in the live
  // DB, so picking one and sending it as BatchId would have targeted a batch that isn't there.
  const { data: apiBatches } = useApiData(() => listBatches(), []);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCourse, setUploadCourse] = useState<Resource["courseCategory"]>("Phonics");
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
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not upload the file.");
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
        setToggleError(err instanceof Error ? err.message : "Could not update this resource.");
      } finally {
        setDownloadBusyId(null);
      }
    },
    [reload]
  );

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
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <div>
                <p className="font-semibold text-foreground">{row.title}</p>
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
        key: "courseCategory",
        header: "Course",
        sortable: true,
        accessor: (row) => row.courseCategory,
        render: (row) => <span className="text-sm">{row.courseCategory}</span>,
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
    [downloadBusyId, toggleDownloadable]
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

      <DataTable
        data={resources}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search resources by title…"
      />

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
            hint="PDF, DOCX, MP4 up to 50MB"
            onFile={(file) => setPendingFile(file)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Course category</Label>
              <Select value={uploadCourse} onValueChange={(v) => setUploadCourse(v as Resource["courseCategory"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Phonics">Phonics</SelectItem>
                  <SelectItem value="Maths">Maths</SelectItem>
                  <SelectItem value="Reading">Reading</SelectItem>
                  <SelectItem value="Writing">Writing</SelectItem>
                  <SelectItem value="Speaking">Speaking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Batch</Label>
              <Select value={uploadBatch} onValueChange={setUploadBatch}>
                <SelectTrigger>
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
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
