import { useMemo, useState } from "react";
import { BookOpen, ClipboardList, Upload, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { FileDropzone } from "@/components/FileDropzone";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import type { Resource } from "@/types";
import { formatDate } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";

const TYPE_META: Record<Resource["type"], { icon: typeof BookOpen; color: string; label: string }> = {
  book: { icon: BookOpen, color: CHART_PALETTE[0], label: "Book" },
  worksheet: { icon: ClipboardList, color: CHART_PALETTE[3], label: "Worksheet" },
  recording: { icon: Video, color: CHART_PALETTE[4], label: "Recording" },
};

export default function AdminResources() {
  const [resources, setResources] = useState<Resource[]>(RESOURCES);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCourse, setUploadCourse] = useState<Resource["courseCategory"]>("Phonics");
  const [uploadBatch, setUploadBatch] = useState<string>(BATCHES[0].id);
  const [pendingFile, setPendingFile] = useState<string | null>(null);

  function toggleField(id: string, field: "downloadable" | "visibleToParents") {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: !r[field] } : r)));
  }

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
          <Switch checked={row.downloadable} onCheckedChange={() => toggleField(row.id, "downloadable")} />
        ),
      },
      {
        key: "visibleToParents",
        header: "Visible to Parents",
        render: (row) => (
          <Switch checked={row.visibleToParents} onCheckedChange={() => toggleField(row.id, "visibleToParents")} />
        ),
      },
    ],
    []
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
          if (!open) setPendingFile(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Resource</DialogTitle>
            <DialogDescription>Add a book, worksheet or recording to the content library. This is a mock upload — no file is transferred.</DialogDescription>
          </DialogHeader>

          <FileDropzone
            label="Drag & drop a file or click to browse"
            hint="PDF, DOCX, MP4 up to 50MB"
            onFile={(file) => setPendingFile(file.name)}
          />

          <div className="grid grid-cols-2 gap-4">
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BATCHES.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!pendingFile} onClick={() => setUploadOpen(false)}>
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
