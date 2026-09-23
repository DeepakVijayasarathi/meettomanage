import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  Eye,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  LayoutList,
  Loader2,
  Pencil,
  Share2,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { FileDropzone } from "@/components/FileDropzone";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ShareFolderDialog } from "@/components/ShareFolderDialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RESOURCES } from "@/data/resources";
import { BATCHES } from "@/data/batches";
import { apiEnabled, userMessage } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  listResources,
  needsLargeUpload,
  openResourceInNewTab,
  deleteResource,
  toFrontendResource,
  updateResource,
  uploadLargeResource,
  uploadResource,
  type ApiResourceType,
} from "@/api/resources";
import {
  createResourceFolder,
  deleteResourceFolder,
  listResourceFolders,
  moveResource,
  updateResourceFolder,
  type ApiResourceFolder,
} from "@/api/resourceFolders";
import { listBatches } from "@/api/batches";
import { useSession } from "@/state/session";
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

/** Radix Select can't hold an empty value, so the top level gets a sentinel. */
const ROOT = "__root";

/** A folder in the grid: click to open; share / rename / delete sit in the corner for staff allowed to. */
function FolderCard({
  folder,
  onOpen,
  onShare,
  onRename,
  onDelete,
}: {
  folder: ApiResourceFolder;
  onOpen: () => void;
  onShare?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  const detail = [
    `${folder.fileCount} ${folder.fileCount === 1 ? "file" : "files"}`,
    folder.subfolderCount > 0 ? `${folder.subfolderCount} ${folder.subfolderCount === 1 ? "folder" : "folders"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const icon = "h-8 w-8 text-muted-foreground hover:text-foreground";
  return (
    <div className="group relative rounded-xl border bg-card transition-colors hover:border-primary/50 hover:bg-accent/40">
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 p-4 pr-24 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Folder className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-semibold text-foreground">{folder.name}</span>
          <span className="block text-xs text-muted-foreground">{detail}</span>
          {(folder.sharedBatchCount > 0 || folder.sharedParentCount > 0) && (
            <span className="mt-0.5 block text-xs font-medium text-primary">
              Shared with{" "}
              {[
                folder.sharedBatchCount > 0 ? `${folder.sharedBatchCount} batch${folder.sharedBatchCount === 1 ? "" : "es"}` : null,
                folder.sharedParentCount > 0 ? `${folder.sharedParentCount} parent${folder.sharedParentCount === 1 ? "" : "s"}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          )}
        </span>
      </button>
      <div className="absolute right-1.5 top-1.5 flex opacity-70 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {onShare && (
          <Button size="icon" variant="ghost" className={icon} onClick={onShare} aria-label={`Share ${folder.name}`} title="Share with parents">
            <Share2 className="h-4 w-4" />
          </Button>
        )}
        {onRename && (
          <Button size="icon" variant="ghost" className={icon} onClick={onRename} aria-label={`Rename ${folder.name}`} title="Rename">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button size="icon" variant="ghost" className={`${icon} hover:text-destructive`} onClick={onDelete} aria-label={`Delete ${folder.name}`} title="Delete (must be empty)">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AdminResources() {
  const { toast } = useToast();
  const { hasPermission } = useSession();
  const canCreate = hasPermission("ContentAccessManagement", "Create");
  const canEdit = hasPermission("ContentAccessManagement", "Edit");
  const canDelete = hasPermission("ContentAccessManagement", "Delete");

  const { data: apiResources, error: resourcesError, reload } = useApiData(
    () => listResources().then((items) => items.map(toFrontendResource)),
    RESOURCES
  );
  // Access toggles stay client-side until per-resource flags land in the API
  const [resources, setResources] = useState<Resource[]>(RESOURCES);
  useEffect(() => setResources(apiResources), [apiResources]);

  // Folders: real (server) in API mode; in demo mode a local, unpersisted list so the screen still works.
  const { data: apiFolders, reload: reloadFolders } = useApiData<ApiResourceFolder[]>(() => listResourceFolders(), []);
  const [demoFolders, setDemoFolders] = useState<ApiResourceFolder[]>([]);
  const folders = apiEnabled() ? apiFolders : demoFolders;
  const reloadAll = useCallback(() => {
    reload();
    reloadFolders();
  }, [reload, reloadFolders]);

  // Real batches for the upload dialog — the old mock BATCHES ids don't exist in the live
  // DB, so picking one and sending it as BatchId would have targeted a batch that isn't there.
  const { data: apiBatches } = useApiData(() => listBatches(), [], undefined, { cacheKey: "batches" });

  const [viewMode, setViewMode] = useState<"folders" | "all">("folders");
  const [currentId, setCurrentId] = useState<string | null>(null);

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);
  // If the open folder disappears (deleted elsewhere), fall back to the top level.
  useEffect(() => {
    if (currentId && !folderById.has(currentId)) setCurrentId(null);
  }, [currentId, folderById]);

  /** Root → … → folder chain, for the breadcrumb and for "Parent / Child" labels in pickers. */
  const chainOf = useCallback(
    (id: string | null): ApiResourceFolder[] => {
      const chain: ApiResourceFolder[] = [];
      let cursor = id ? folderById.get(id) : undefined;
      while (cursor && chain.length < 20) {
        chain.unshift(cursor);
        cursor = cursor.parentFolderId ? folderById.get(cursor.parentFolderId) : undefined;
      }
      return chain;
    },
    [folderById]
  );
  const pathLabel = useCallback((id: string | null) => (id ? chainOf(id).map((f) => f.name).join(" / ") : "Top level"), [chainOf]);
  const folderOptions = useMemo(
    () => folders.map((f) => ({ id: f.id, label: pathLabel(f.id) })).sort((a, b) => a.label.localeCompare(b.label)),
    [folders, pathLabel]
  );

  const subfolders = useMemo(
    () => folders.filter((f) => (f.parentFolderId ?? null) === currentId).sort((a, b) => a.name.localeCompare(b.name)),
    [folders, currentId]
  );
  const visibleFiles = useMemo(
    () => (viewMode === "all" ? resources : resources.filter((r) => (r.folderId ?? null) === currentId)),
    [viewMode, resources, currentId]
  );

  // ---- folder create / rename / delete / share --------------------------------------------
  const [nameDialog, setNameDialog] = useState<{ mode: "create" | "rename"; folder?: ApiResourceFolder } | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderBusy, setFolderBusy] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ApiResourceFolder | null>(null);
  const [deletingFile, setDeletingFile] = useState<Resource | null>(null);
  const [sharing, setSharing] = useState<ApiResourceFolder | null>(null);

  function openNameDialog(mode: "create" | "rename", folder?: ApiResourceFolder) {
    setNameDialog({ mode, folder });
    setFolderName(folder?.name ?? "");
    setFolderError(null);
  }

  async function submitFolderName() {
    if (!nameDialog || !folderName.trim()) return;
    setFolderBusy(true);
    setFolderError(null);
    try {
      const name = folderName.trim();
      if (!apiEnabled()) {
        setDemoFolders((prev) =>
          nameDialog.mode === "create"
            ? [...prev, { id: `demo-${Date.now()}`, name, description: null, parentFolderId: currentId, fileCount: 0, subfolderCount: 0, sharedParentCount: 0, sharedBatchCount: 0, createdAtUtc: new Date().toISOString() }]
            : prev.map((f) => (f.id === nameDialog.folder!.id ? { ...f, name } : f))
        );
      } else if (nameDialog.mode === "create") {
        await createResourceFolder(name, currentId);
        reloadFolders();
      } else {
        await updateResourceFolder(nameDialog.folder!.id, name, nameDialog.folder!.parentFolderId, nameDialog.folder!.description);
        reloadFolders();
      }
      setNameDialog(null);
    } catch (err) {
      setFolderError(userMessage(err, "Could not save the folder."));
    } finally {
      setFolderBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    if (!apiEnabled()) {
      setDemoFolders((prev) => prev.filter((f) => f.id !== deleting.id));
      return;
    }
    await deleteResourceFolder(deleting.id); // rejects (with the reason) if the folder isn't empty; ConfirmDialog shows it
    reloadFolders();
    toast({ variant: "success", title: "Folder deleted" });
  }

  async function confirmDeleteFile() {
    if (!deletingFile) return;
    if (!apiEnabled()) {
      setResources((prev) => prev.filter((r) => r.id !== deletingFile.id));
      return;
    }
    await deleteResource(deletingFile.id);
    reloadAll();
    toast({ variant: "success", title: "File deleted" });
  }

  // ---- upload -----------------------------------------------------------------------------
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadBatch, setUploadBatch] = useState<string>("");
  const [uploadFolder, setUploadFolder] = useState<string>(ROOT);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [progress, setProgress] = useState(0);

  function openUpload() {
    setProgress(0);
    setUploadTitle("");
    setUploadFolder(viewMode === "folders" && currentId ? currentId : ROOT);
    setUploadOpen(true);
  }

  async function handleUpload() {
    if (!pendingFile) return;
    if (!apiEnabled()) {
      setUploadOpen(false);
      return;
    }
    setUploading(true);
    setUploadError(null);
    setProgress(0);
    try {
      const metadata = {
        title: uploadTitle.trim() || pendingFile.name.replace(/\.[^.]+$/, ""),
        type: inferResourceType(pendingFile),
        isDownloadable: inferResourceType(pendingFile) === "Worksheet",
        batchId: uploadBatch || undefined,
        courseId: apiBatches.find((b) => b.id === uploadBatch)?.courseId,
        folderId: uploadFolder === ROOT ? undefined : uploadFolder,
      };
      // Big files (recordings) go straight to storage in parts; everything else through the API as before.
      if (needsLargeUpload(pendingFile)) await uploadLargeResource(pendingFile, metadata, setProgress);
      else await uploadResource(pendingFile, metadata);
      reloadAll();
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

  // ---- move a file ------------------------------------------------------------------------
  const [moving, setMoving] = useState<Resource | null>(null);
  const [moveTarget, setMoveTarget] = useState<string>(ROOT);
  const [moveBusy, setMoveBusy] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  async function submitMove() {
    if (!moving) return;
    setMoveBusy(true);
    setMoveError(null);
    try {
      const folderId = moveTarget === ROOT ? undefined : moveTarget;
      if (apiEnabled()) {
        await moveResource(moving.id, folderId ?? null);
        reloadAll();
      } else {
        setResources((prev) => prev.map((r) => (r.id === moving.id ? { ...r, folderId } : r)));
      }
      setMoving(null);
    } catch (err) {
      setMoveError(userMessage(err, "Could not move the file."));
    } finally {
      setMoveBusy(false);
    }
  }

  const [downloadBusyId, setDownloadBusyId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  /** Demo mode only — a local, unpersisted flip. Live mode's Downloadable column uses toggleDownloadable instead. */
  function toggleField(id: string, field: "downloadable" | "visibleToParents") {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: !r[field] } : r)));
  }

  const [openBusyId, setOpenBusyId] = useState<string | null>(null);

  /** Opens the real file in a new tab so staff can check what they uploaded. Live mode only — demo rows have no file. */
  const openRow = useCallback(async (row: Resource) => {
    setToggleError(null);
    setOpenBusyId(row.id);
    try {
      await openResourceInNewTab(row.id, row.title);
    } catch (err) {
      setToggleError(userMessage(err, `Could not open "${row.title}".`));
    } finally {
      setOpenBusyId(null);
    }
  }, []);

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

  // Same source the upload dialog's own Batch picker uses — one canonical
  // lookup so the table's "Batch" column always reflects real data, in both modes.
  const batchNameById = useMemo(() => {
    const map = new Map<string, string>();
    (apiEnabled() ? apiBatches : BATCHES).forEach((b) => {
      map.set(b.id, "courseName" in b && b.courseName ? `${b.name} · ${b.courseName}` : b.name);
    });
    return map;
  }, [apiBatches]);

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
                {apiEnabled() ? (
                  <button
                    type="button"
                    className="block max-w-full truncate text-left font-semibold text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title="Open this file"
                    onClick={() => void openRow(row)}
                  >
                    {row.title}
                  </button>
                ) : (
                  <p className="truncate font-semibold text-foreground">{row.title}</p>
                )}
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
      ...(viewMode === "all"
        ? [
            {
              key: "folder",
              header: "Folder",
              sortable: true,
              accessor: (row: Resource) => pathLabel(row.folderId ?? null),
              render: (row: Resource) => <span className="text-sm">{pathLabel(row.folderId ?? null)}</span>,
            } satisfies DataTableColumn<Resource>,
          ]
        : []),
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
        render: (row) => <Switch checked={row.downloadable} disabled={downloadBusyId === row.id} onCheckedChange={() => toggleDownloadable(row)} />,
      },
      {
        key: "visibleToParents",
        header: "Visible to Parents",
        render: (row) =>
          apiEnabled() ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground underline decoration-dotted">{row.folderId ? "Via folder" : "Per parent"}</span>
              </TooltipTrigger>
              <TooltipContent>
                {row.folderId
                  ? "Parents see this file through the folder it sits in — use Share on the folder to choose which batches or parents."
                  : "Put this file in a folder and share the folder to give many parents access at once."}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Switch checked={row.visibleToParents ?? false} onCheckedChange={() => toggleField(row.id, "visibleToParents")} />
          ),
      },
      ...(apiEnabled()
        ? [
            {
              key: "open",
              header: "",
              render: (row: Resource) => (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label={`Open ${row.title}`}
                  title="Open"
                  disabled={openBusyId === row.id}
                  onClick={() => void openRow(row)}
                >
                  {openBusyId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                </Button>
              ),
            } satisfies DataTableColumn<Resource>,
          ]
        : []),
      ...(canEdit
        ? [
            {
              key: "move",
              header: "",
              render: (row: Resource) => (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label={`Move ${row.title} to another folder`}
                  title="Move to folder"
                  onClick={() => {
                    setMoving(row);
                    setMoveTarget(row.folderId ?? ROOT);
                    setMoveError(null);
                  }}
                >
                  <FolderInput className="h-4 w-4" />
                </Button>
              ),
            } satisfies DataTableColumn<Resource>,
          ]
        : []),
      ...(canDelete
        ? [
            {
              key: "delete",
              header: "",
              render: (row: Resource) => (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete ${row.title}`}
                  title="Delete file"
                  onClick={() => setDeletingFile(row)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ),
            } satisfies DataTableColumn<Resource>,
          ]
        : []),
    ],
    [downloadBusyId, toggleDownloadable, batchNameById, viewMode, pathLabel, canEdit, canDelete, openBusyId, openRow]
  );

  const chain = chainOf(currentId);
  const hasAnything = folders.length > 0 || resources.length > 0;

  return (
    <div>
      <PageHeader
        eyebrow="Content Library"
        title="Content & Resources"
        description="Upload once into folders, then share a whole folder with as many batches or parents as you need."
        actions={
          <div className="flex flex-wrap gap-2">
            {canCreate && (
              <Button variant="outline" onClick={() => openNameDialog("create")}>
                <FolderPlus className="h-4 w-4" />
                New Folder
              </Button>
            )}
            <Button onClick={openUpload}>
              <Upload className="h-4 w-4" />
              Upload Resource
            </Button>
          </div>
        }
      />

      {toggleError && <p className="mb-4 text-sm font-medium text-destructive">{toggleError}</p>}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Folder path">
          {viewMode === "all" ? (
            <span className="font-medium text-foreground">All files</span>
          ) : (
            <>
              <button
                type="button"
                className={currentId ? "-my-1.5 px-0.5 py-1.5 font-medium text-primary hover:underline" : "font-medium text-foreground"}
                onClick={() => setCurrentId(null)}
              >
                All folders
              </button>
              {chain.map((f, i) => (
                <span key={f.id} className="flex items-center gap-1">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  <button
                    type="button"
                    className={i < chain.length - 1 ? "-my-1.5 px-0.5 py-1.5 font-medium text-primary hover:underline" : "font-medium text-foreground"}
                    onClick={() => setCurrentId(f.id)}
                  >
                    {f.name}
                  </button>
                </span>
              ))}
            </>
          )}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          {apiEnabled() && canEdit && viewMode === "folders" && chain.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setSharing(chain[chain.length - 1])}>
              <Share2 className="h-4 w-4" /> Share this folder
            </Button>
          )}
        <div className="inline-flex rounded-lg border p-0.5">
          <Button size="sm" variant={viewMode === "folders" ? "secondary" : "ghost"} onClick={() => setViewMode("folders")}>
            <FolderOpen className="h-4 w-4" /> Folders
          </Button>
          <Button size="sm" variant={viewMode === "all" ? "secondary" : "ghost"} onClick={() => setViewMode("all")}>
            <LayoutList className="h-4 w-4" /> All files
          </Button>
        </div>
        </div>
      </div>

      {viewMode === "folders" && subfolders.length > 0 && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {subfolders.map((f) => (
            <FolderCard
              key={f.id}
              folder={f}
              onOpen={() => setCurrentId(f.id)}
              onShare={apiEnabled() && canEdit ? () => setSharing(f) : undefined}
              onRename={canEdit ? () => openNameDialog("rename", f) : undefined}
              onDelete={canDelete ? () => setDeleting(f) : undefined}
            />
          ))}
        </div>
      )}

      {viewMode === "folders" && !currentId && !hasAnything ? (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nothing here yet. Create a folder (for example “Jolly Phonics Level 1”), upload your worksheets into it, then share the folder with the parents who should see it.
        </p>
      ) : (
        (viewMode === "all" || currentId || visibleFiles.length > 0) && (
          <DataTable
            data={visibleFiles}
            columns={columns}
            rowKey={(row) => row.id}
            searchPlaceholder="Search resources by title…"
            emptyTitle={viewMode === "all" ? "No resources uploaded yet" : "No files in this folder"}
            emptyDescription={
              viewMode === "all"
                ? "Upload a reading book, worksheet or recording with the button above to make it available to parents and teachers."
                : "Upload a file here with the button at the top, or open a folder above."
            }
            error={apiEnabled() ? resourcesError : null}
            onRetry={reload}
          />
        )
      )}

      {/* New / rename folder */}
      <Dialog open={nameDialog !== null} onOpenChange={(open) => !open && setNameDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{nameDialog?.mode === "rename" ? "Rename folder" : "New folder"}</DialogTitle>
            <DialogDescription>
              {nameDialog?.mode === "rename" ? "Files and sharing stay exactly as they are." : `Created in: ${pathLabel(currentId)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              autoFocus
              maxLength={150}
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submitFolderName()}
              placeholder="e.g. Jolly Phonics Level 1 — Worksheets 1-12"
            />
          </div>
          {folderError && <p className="text-sm font-medium text-destructive">{folderError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNameDialog(null)}>
              Cancel
            </Button>
            <Button disabled={!folderName.trim() || folderBusy} onClick={submitFolderName}>
              {folderBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {nameDialog?.mode === "rename" ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingFile !== null}
        onOpenChange={(open) => !open && setDeletingFile(null)}
        title={`Delete “${deletingFile?.title}”?`}
        description="The file is removed from Content & Resources and every parent or batch that could see it loses access. This can't be undone."
        confirmLabel="Delete file"
        destructive
        onConfirm={confirmDeleteFile}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete “${deleting?.name}”?`}
        description="Only an empty folder can be deleted. Delete or move its files out first (the bin icon on each file). Parents it was shared with lose that access."
        confirmLabel="Delete folder"
        destructive
        onConfirm={confirmDelete}
      />

      {sharing && (
        <ShareFolderDialog
          folderId={sharing.id}
          folderName={sharing.name}
          open
          onOpenChange={(open) => !open && setSharing(null)}
          onSaved={reloadFolders}
        />
      )}

      {/* Move a file */}
      <Dialog open={moving !== null} onOpenChange={(open) => !open && setMoving(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Move to folder</DialogTitle>
            <DialogDescription>{moving?.title}</DialogDescription>
          </DialogHeader>
          <Select value={moveTarget} onValueChange={setMoveTarget}>
            <SelectTrigger aria-label="Destination folder">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ROOT}>Top level</SelectItem>
              {folderOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {moveError && <p className="text-sm font-medium text-destructive">{moveError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoving(null)}>
              Cancel
            </Button>
            <Button disabled={moveBusy} onClick={submitMove}>
              {moveBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          if (uploading) return; // closing mid-upload would leave a half-sent file
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
              Upload once, then share the folder with as many parents as you like.
              {!apiEnabled() && " This is a mock upload — no file is transferred."}
            </DialogDescription>
          </DialogHeader>

          <FileDropzone
            label="Drag & drop a file or click to browse"
            hint="PDF, Word, PowerPoint, Excel, images, audio, ZIP or video (MP4/WEBM/MOV). Files over 100MB (up to 20GB, e.g. recordings) upload in parts, so keep this tab open."
            onFile={(file) => {
              setPendingFile(file);
              setUploadTitle(file.name.replace(/\.[^.]+$/, ""));
            }}
          />
          {pendingFile && (
            <div className="grid gap-1.5">
              <Label htmlFor="resource-upload-title">Title</Label>
              <Input id="resource-upload-title" maxLength={200} value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} disabled={uploading} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="resource-upload-folder-select">Folder</Label>
              <Select value={uploadFolder} onValueChange={setUploadFolder}>
                <SelectTrigger id="resource-upload-folder-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROOT}>Top level (no folder)</SelectItem>
                  {folderOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Optional: tying a file to a batch also shows it to that batch's teacher and enrolled parents,
                independently of folder sharing. The course follows from the batch. */}
            <div className="grid gap-1.5">
              <Label htmlFor="resource-upload-batch-select">Batch (optional)</Label>
              <Select value={uploadBatch} onValueChange={setUploadBatch}>
                <SelectTrigger id="resource-upload-batch-select">
                  <SelectValue placeholder="No batch" />
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

          {uploading && pendingFile && needsLargeUpload(pendingFile) && (
            <div className="grid gap-1.5">
              <Progress value={Math.round(progress * 100)} aria-label="Upload progress" />
              <p className="text-xs text-muted-foreground">{Math.round(progress * 100)}% uploaded. Keep this tab open until it finishes.</p>
            </div>
          )}

          {uploadError && <p className="text-sm font-medium text-destructive">{uploadError}</p>}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
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
