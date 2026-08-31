import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { useToast } from "@/hooks/use-toast";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/api/hooks";
import { apiEnabled } from "@/lib/api";
import { listDepartments, createDepartment, updateDepartment, bulkImportDepartments, exportDepartments, type ApiDepartment } from "@/api/departments";
import { DEMO_DEPARTMENTS } from "@/data/departments";
import { BulkImportExportBar } from "@/components/BulkImportExportBar";

export default function AdminDepartments() {
  const { toast } = useToast();
  const { data: departments, error: loadError, reload } = useApiData<ApiDepartment[]>(() => listDepartments(), DEMO_DEPARTMENTS);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiDepartment | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function openAdd() {
    setEditing(null);
    setName("");
    setDescription("");
    setStatus("active");
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(department: ApiDepartment) {
    setEditing(department);
    setName(department.name);
    setDescription(department.description ?? "");
    setStatus(department.isActive ? "active" : "inactive");
    setError(null);
    setDialogOpen(true);
  }

  async function save() {
    // Checked before the demo-mode short-circuit, same ordering already used on every
    // other admin "add" dialog in this app (Courses, Users, Payment Mapping) — otherwise
    // a blank name closes the dialog with a false success instead of showing the error.
    if (!name.trim()) {
      setError("Department name is required.");
      return;
    }
    if (!apiEnabled()) {
      // Matches Courses/Users/PaymentMapping's own demo-mode messaging — a silent close
      // here reads exactly like the department was actually saved.
      setNotice(editing ? "Demo mode — changes not persisted." : "Demo mode — department not persisted.");
      setDialogOpen(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateDepartment(editing.id, { name: name.trim(), description: description.trim() || undefined, isActive: status === "active" });
      } else {
        await createDepartment({ name: name.trim(), description: description.trim() || undefined, isActive: status === "active" });
      }
      setDialogOpen(false);
      reload();
      toast({ variant: "success", title: editing ? "Department updated" : "Department created" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save the department.";
      setError(message);
      toast({ variant: "error", title: "Couldn't save department", description: message });
    } finally {
      setSaving(false);
    }
  }

  const columns: DataTableColumn<ApiDepartment>[] = [
    {
      key: "name",
      header: "Department",
      render: (d) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </span>
          <span className="font-medium text-foreground">{d.name}</span>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (d) => <span className="text-sm text-muted-foreground">{d.description || "—"}</span>,
    },
    {
      key: "isActive",
      header: "Status",
      render: (d) => (d.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>),
    },
    {
      key: "actions",
      header: "",
      render: (d) => (
        <Button size="sm" variant="ghost" onClick={() => openEdit(d)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Academics"
        title="Departments"
        description="Business departments courses and teachers belong to. Each active department needs its own payment gateway account, set up separately under Payment Gateway Mapping."
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Department
          </Button>
        }
      />

      {apiEnabled() && loadError && (
        <InlineAlert variant="warning" className="mb-4">
          Could not reach the API ({loadError}) — showing demo data.
        </InlineAlert>
      )}

      {notice && (
        <InlineAlert variant="success" className="mb-4">
          {notice}
        </InlineAlert>
      )}

      <DataTable
        data={departments}
        columns={columns}
        rowKey={(d) => d.id}
        searchPlaceholder="Search departments…"
        searchFn={(d, query) => {
          const q = query.toLowerCase();
          return d.name.toLowerCase().includes(q) || (d.description ?? "").toLowerCase().includes(q);
        }}
        emptyTitle="No departments yet"
        emptyDescription="Create a department to group courses and staff, or import a batch using the button above."
        error={apiEnabled() ? loadError : null}
        onRetry={reload}
        toolbar={
          <BulkImportExportBar
            entityLabel="departments"
            templateColumns={["Name", "Description", "IsActive"]}
            onImport={bulkImportDepartments}
            onExport={exportDepartments}
            onImported={reload}
          />
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Add a department"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Renaming or deactivating won't change any course, teacher or invoice already assigned here."
                : "Once added, this department is selectable when creating or editing a course, and when assigning a teacher's primary department."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="dept-name">Name</Label>
              <Input id="dept-name" placeholder="e.g. Hindi, Abacus, Spoken English" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dept-description">Description (optional)</Label>
              <Textarea id="dept-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dept-status-select">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
                <SelectTrigger id="dept-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !name.trim()}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
