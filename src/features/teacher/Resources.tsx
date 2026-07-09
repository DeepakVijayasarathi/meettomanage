import { useEffect, useState } from "react";
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
import type { Resource } from "@/types";

const TEACHER_ID = "t-1";

const TYPE_META: Record<Resource["type"], { label: string; icon: typeof BookOpen; hex: string }> = {
  book: { label: "Book", icon: BookOpen, hex: CHART_PALETTE[0] },
  worksheet: { label: "Worksheet", icon: FileText, hex: CHART_PALETTE[3] },
  recording: { label: "Recording", icon: Video, hex: CHART_PALETTE[4] },
};

export default function TeacherResources() {
  const teacherBatches = BATCHES.filter((b) => b.teacherId === TEACHER_ID);
  const teacherBatchIds = teacherBatches.map((b) => b.id);

  const [resources, setResources] = useState<Resource[]>(() => RESOURCES.filter((r) => r.batchId && teacherBatchIds.includes(r.batchId)));
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<Resource["type"]>("worksheet");
  const [batchId, setBatchId] = useState<string>(teacherBatchIds[0] ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmation) return;
    const timer = setTimeout(() => setConfirmation(null), 5000);
    return () => clearTimeout(timer);
  }, [confirmation]);

  function resetUploadForm() {
    setTitle("");
    setType("worksheet");
    setBatchId(teacherBatchIds[0] ?? "");
    setFileName(null);
  }

  function handleUpload() {
    if (!title.trim() || !batchId) return;
    const newResource: Resource = {
      id: `r-new-${Date.now()}`,
      title: title.trim(),
      type,
      courseCategory: "Phonics",
      batchId,
      uploadedOn: "2026-07-09",
      downloadable: type !== "recording",
      visibleToParents: false,
      sizeLabel: fileName ? "New upload" : undefined,
    };
    setResources((prev) => [newResource, ...prev]);
    setConfirmation(`"${newResource.title}" uploaded — pending admin visibility review. (Demo only — not persisted.)`);
    setUploadOpen(false);
    resetUploadForm();
  }

  function handleDownload(resource: Resource) {
    setDownloadingId(resource.id);
    setTimeout(() => setDownloadingId(null), 1600);
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
            <Button
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="h-4 w-4" /> Upload resource
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload a resource</DialogTitle>
                <DialogDescription>Share a book, worksheet or recording with one of your batches. Visibility to parents is admin-controlled.</DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                <FileDropzone label="Drag & drop or click to upload" hint="PDF, PNG, JPG, MP4 up to 25MB" onFile={(f) => setFileName(f.name)} />

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
                    <Label>Batch</Label>
                    <Select value={batchId} onValueChange={setBatchId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {teacherBatches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadOpen(false)}>
                  Cancel
                </Button>
                <Button disabled={!title.trim() || !batchId} onClick={handleUpload}>
                  Upload
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

      {resources.length === 0 ? (
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
            const batch = resource.batchId ? getBatchById(resource.batchId) : undefined;
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
                    <p className="mt-1 text-xs text-muted-foreground">{batch?.name ?? "General"}</p>
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
                      {downloadingId === resource.id ? "Downloading… (demo)" : "Download"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="w-full" disabled>
                      {resource.type === "recording" ? "Preview unavailable in demo" : "View only"}
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
