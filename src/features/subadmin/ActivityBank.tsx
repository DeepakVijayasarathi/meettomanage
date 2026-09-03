import { useMemo, useState } from "react";
import { Plus, PencilRuler, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { InlineAlert } from "@/components/InlineAlert";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmojiPickerField } from "@/components/EmojiPickerField";
import { useApiData } from "@/api/hooks";
import { apiEnabled } from "@/lib/api";
import { useSession } from "@/state/session";
import { listDepartments, type ApiDepartment } from "@/api/departments";
import { listCourses, type ApiCourse } from "@/api/courses";
import {
  listWhiteboardActivities,
  createWhiteboardActivity,
  updateWhiteboardActivity,
  deleteWhiteboardActivity,
  type ApiWhiteboardActivity,
  type WhiteboardActivityMode,
} from "@/api/whiteboardActivities";

/** One editable item row in the dialog — a fresh id per row (not persisted) just keys the list. */
interface DraftItem {
  key: string;
  emoji: string;
  label: string;
  isTarget: boolean;
}

const EMPTY_ITEMS: DraftItem[] = [
  { key: "i-1", emoji: "", label: "", isTarget: false },
  { key: "i-2", emoji: "", label: "", isTarget: false },
];

const MODE_OPTIONS: { value: WhiteboardActivityMode; label: string; description: string }[] = [
  { value: "DragDrop", label: "Drag & Drop", description: "Drag each piece onto its matching label." },
  { value: "TagMatch", label: "Tag & Match", description: "Tap a piece, then tap its matching label." },
  { value: "Hotspot", label: "Hotspot", description: "Click every piece marked as a target." },
];

/**
 * Delegated-portal Activity Bank — ported from admin/ActivityBank.tsx.
 * WhiteboardActivitiesController is [HasPermission(PermissionModule.CourseBatchManagement, ...)]
 * throughout (GET is View, POST is Create, PUT is Edit, DELETE is Delete) — the same module
 * Courses/Batches/Quiz Bank use.
 */
export default function SubAdminActivityBank() {
  const { toast } = useToast();
  const { hasPermission } = useSession();
  const canCreate = !apiEnabled() || hasPermission("CourseBatchManagement", "Create");
  const canEdit = !apiEnabled() || hasPermission("CourseBatchManagement", "Edit");
  const canDelete = !apiEnabled() || hasPermission("CourseBatchManagement", "Delete");
  const { data: activities, error: loadError, reload } = useApiData<ApiWhiteboardActivity[]>(() => listWhiteboardActivities(), []);
  const { data: departments } = useApiData<ApiDepartment[]>(() => listDepartments(false), []);
  const { data: courses } = useApiData<ApiCourse[]>(() => listCourses(), []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiWhiteboardActivity | null>(null);
  const [mode, setMode] = useState<WhiteboardActivityMode>("DragDrop");
  const [prompt, setPrompt] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState<string>("__none__");
  const [items, setItems] = useState<DraftItem[]>(EMPTY_ITEMS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiWhiteboardActivity | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isHotspot = mode === "Hotspot";

  const coursesInDepartment = useMemo(
    () => courses.filter((c) => !departmentId || c.departmentId === departmentId),
    [courses, departmentId]
  );

  function openAdd() {
    setEditing(null);
    setMode("DragDrop");
    setPrompt("");
    setDepartmentId(departments[0]?.id ?? "");
    setCourseId("__none__");
    setItems(EMPTY_ITEMS.map((i) => ({ ...i })));
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(activity: ApiWhiteboardActivity) {
    setEditing(activity);
    setMode(activity.mode);
    setPrompt(activity.prompt);
    setDepartmentId(activity.departmentId);
    setCourseId(activity.courseId ?? "__none__");
    setItems(
      activity.items.length > 0
        ? activity.items.map((i, idx) => ({ key: `${activity.id}-${idx}`, emoji: i.emoji, label: i.label ?? "", isTarget: i.isTarget }))
        : EMPTY_ITEMS.map((i) => ({ ...i }))
    );
    setError(null);
    setDialogOpen(true);
  }

  function addItem() {
    if (items.length >= 8) return;
    setItems((prev) => [...prev, { key: `i-${Date.now()}`, emoji: "", label: "", isTarget: false }]);
  }

  function removeItem(key: string) {
    if (items.length <= 2) return;
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function validate(): string | null {
    if (!prompt.trim()) return "Enter the activity's instruction text.";
    if (courseId === "__none__" && !departmentId) return "Choose a department (or a specific course).";
    const filled = items.filter((i) => i.emoji.trim());
    if (filled.length < 2) return "Add at least 2 items.";
    if (filled.some((i) => !i.emoji.trim())) return "Every item needs an emoji.";
    if (isHotspot) {
      if (!filled.some((i) => i.isTarget)) return "Mark at least one item as a target.";
      if (filled.every((i) => i.isTarget)) return "Add at least one non-target (distractor) item.";
    } else {
      if (filled.some((i) => !i.label.trim())) return "Every item needs a match label for this mode.";
      const labels = filled.map((i) => i.label.trim().toLowerCase());
      if (new Set(labels).size !== labels.length) return "Match labels must be unique.";
    }
    return null;
  }

  async function save() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!apiEnabled()) {
      setNotice("Demo mode — changes not persisted.");
      setDialogOpen(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const filled = items.filter((i) => i.emoji.trim());
      const input = {
        departmentId: courseId === "__none__" ? departmentId : undefined,
        courseId: courseId === "__none__" ? undefined : courseId,
        mode,
        prompt: prompt.trim(),
        items: filled.map((i) => ({ emoji: i.emoji.trim(), label: isHotspot ? undefined : i.label.trim(), isTarget: i.isTarget })),
      };
      if (editing) {
        await updateWhiteboardActivity(editing.id, input);
      } else {
        await createWhiteboardActivity(input);
      }
      setDialogOpen(false);
      reload();
      toast({ variant: "success", title: editing ? "Activity updated" : "Activity created" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save the activity.";
      setError(message);
      toast({ variant: "error", title: "Couldn't save activity", description: message });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (!apiEnabled()) {
      setNotice("Demo mode — nothing was actually deleted.");
      setDeleteTarget(null);
      return;
    }
    setDeleting(true);
    try {
      await deleteWhiteboardActivity(deleteTarget.id);
      setDeleteTarget(null);
      reload();
      toast({ variant: "success", title: "Activity deleted" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not delete that activity.";
      setNotice(message);
      toast({ variant: "error", title: "Couldn't delete activity", description: message });
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<ApiWhiteboardActivity>[] = [
    {
      key: "prompt",
      header: "Activity",
      render: (a) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <PencilRuler className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground" title={a.prompt}>{a.prompt}</p>
            <p className="text-xs text-muted-foreground">{a.items.length} items</p>
          </div>
        </div>
      ),
    },
    {
      key: "mode",
      header: "Type",
      render: (a) => <Badge variant="outline">{MODE_OPTIONS.find((m) => m.value === a.mode)?.label ?? a.mode}</Badge>,
    },
    {
      key: "scope",
      header: "Scope",
      render: (a) =>
        a.courseName ? (
          <Badge variant="secondary">{a.courseName}</Badge>
        ) : (
          <Badge variant="outline">{a.departmentName} (all courses)</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (a) => (
        <div className="flex items-center justify-end gap-1">
          {canEdit && (
            <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(a)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Academics"
        title="Activity Bank"
        description="Whiteboard mini-games teachers launch during class — scope one to a specific course, or leave it department-wide to share across every course in that department. A Demo class only ever draws from its department's shared activities."
        actions={
          canCreate ? (
            <Button
              onClick={openAdd}
              disabled={departments.length === 0}
              title={departments.length === 0 ? "Add a department under Academics → Departments first" : undefined}
            >
              <Plus className="h-4 w-4" /> Add Activity
            </Button>
          ) : undefined
        }
      />

      {apiEnabled() && loadError && (
        <InlineAlert variant="warning" className="mb-4">
          Could not reach the API ({loadError}).
        </InlineAlert>
      )}

      {notice && (
        <InlineAlert variant="success" className="mb-4">
          {notice}
        </InlineAlert>
      )}

      {activities.length === 0 && !loadError ? (
        <EmptyState
          icon={PencilRuler}
          title="No activities yet"
          description="Classes opening the whiteboard's Activity panel will see an empty bank until some are added here."
          action={
            canCreate ? (
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add Activity
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          data={activities}
          columns={columns}
          rowKey={(a) => a.id}
          searchPlaceholder="Search activities…"
          searchFn={(a, query) => a.prompt.toLowerCase().includes(query.toLowerCase())}
          error={apiEnabled() ? loadError : null}
          onRetry={reload}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit activity" : "Add a whiteboard activity"}</DialogTitle>
            <DialogDescription>
              Leave course unset to share this activity across every course in the department (and any demo class there).
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
            <div className="grid gap-1.5">
              <Label htmlFor="wa-mode">Type</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as WhiteboardActivityMode)}>
                <SelectTrigger id="wa-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{MODE_OPTIONS.find((m) => m.value === mode)?.description}</p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="wa-prompt">{isHotspot ? "What should students click?" : "Instruction"} <span className="text-destructive">*</span></Label>
              <Input
                id="wa-prompt"
                placeholder={isHotspot ? "e.g. Click everything that starts with the “sh” sound" : "e.g. Drag the fruit to its matching first letter"}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="wa-department">Department <span className="text-destructive">*</span></Label>
                <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setCourseId("__none__"); }}>
                  <SelectTrigger id="wa-department">
                    <SelectValue placeholder="Choose a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="wa-course">Course (optional)</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger id="wa-course">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">All courses in department</SelectItem>
                    {coursesInDepartment.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label id="wa-items-label">
                  Items {isHotspot ? "(mark which ones are correct targets)" : "(emoji + what it matches)"}
                </Label>
                <Button size="sm" variant="ghost" onClick={addItem} disabled={items.length >= 8}>
                  <Plus className="h-3.5 w-3.5" /> Add item
                </Button>
              </div>
              <div role="group" aria-labelledby="wa-items-label" className="grid gap-2">
                {items.map((item, idx) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <EmojiPickerField
                      aria-label={`Item ${idx + 1} emoji`}
                      value={item.emoji}
                      className="w-16"
                      onChange={(emoji) => setItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, emoji } : i)))}
                    />
                    {isHotspot ? (
                      <label className="flex flex-1 items-center gap-2 text-sm text-foreground">
                        <Checkbox
                          checked={item.isTarget}
                          onCheckedChange={(checked) => setItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, isTarget: !!checked } : i)))}
                          aria-label={`Mark item ${idx + 1} as a target`}
                        />
                        Target
                      </label>
                    ) : (
                      <Input
                        placeholder="Matches (e.g. a letter or number)"
                        aria-label={`Item ${idx + 1} match label`}
                        value={item.label}
                        onChange={(e) => setItems((prev) => prev.map((i) => (i.key === item.key ? { ...i, label: e.target.value } : i)))}
                      />
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.key)}
                      disabled={items.length <= 2}
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || (editing ? !canEdit : !canCreate)}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this activity?"
        description={deleteTarget ? `"${deleteTarget.prompt}" will no longer appear in any class's whiteboard activity panel.` : ""}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}
