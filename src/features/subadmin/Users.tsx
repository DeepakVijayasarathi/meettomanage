import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { useToast } from "@/hooks/use-toast";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { UserStatusBadge } from "@/components/StatusBadge";
import { useApiData } from "@/api/hooks";
import { apiEnabled } from "@/lib/api";
import { useSession } from "@/state/session";
import { formatDate } from "@/lib/utils";
import { createUser, deleteUser, listUsers, toAppUser, updateUser } from "@/api/users";
import { PARENTS, TEACHERS, ADMISSION_TEAM, SUB_ADMINS } from "@/data/users";
import type { AppUser } from "@/types";
import type { ApiRole } from "@/api/types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

const ROLE_LABELS: Record<AppUser["role"], string> = {
  admin: "Admin",
  subadmin: "Relationship Manager",
  admission: "Admission Team",
  teacher: "Teacher",
  parent: "Parent",
  student: "Student",
  coordinator: "Coordinator",
  management: "Management",
};

const DEMO_USERS: AppUser[] = [...PARENTS, ...TEACHERS, ...ADMISSION_TEAM, ...SUB_ADMINS];

// The 4 account types this page can create directly. Custom role presets (Academic
// Coordinator, Management, etc.) and role-switching on an existing account are
// deliberately left out here — that machinery (src/api/roles.ts, applyRoleToUser) is
// entangled with admin-only department/preset management and isn't worth porting into
// every delegated RM portal just to unblock plain user CRUD. Admin's Users page remains
// the place to assign a named preset.
const ADD_USER_ROLES: { key: string; label: string; apiRole: ApiRole }[] = [
  { key: "parent", label: "Parent", apiRole: "Parent" },
  { key: "teacher", label: "Teacher", apiRole: "Teacher" },
  { key: "admission", label: "Admission Team", apiRole: "AdmissionTeam" },
  { key: "subadmin", label: "Parent Relationship Manager", apiRole: "SubAdmin" },
];

export default function SubAdminUsers() {
  const { toast } = useToast();
  const { hasPermission } = useSession();
  // Mirrors the backend's [HasPermission(UserManagement, ...)] gates on UsersController:
  // Create -> POST /api/users, Edit -> PUT /api/users/{id}, Delete -> DELETE /api/users/{id}.
  // A role holding only View keeps the old read-only behavior; these flags are what makes
  // the page not read-only once a grant actually includes Create/Edit/Delete.
  const canCreate = !apiEnabled() || hasPermission("UserManagement", "Create");
  const canEdit = !apiEnabled() || hasPermission("UserManagement", "Edit");
  const canDelete = !apiEnabled() || hasPermission("UserManagement", "Delete");
  const canManage = canCreate || canEdit || canDelete;

  const { data: users, error, reload } = useApiData(
    () => listUsers({ pageSize: 200 }).then((r) => r.items.map(toAppUser)),
    DEMO_USERS
  );

  const [detailUser, setDetailUser] = useState<AppUser | null>(null);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  // Add User
  const [addOpen, setAddOpen] = useState(false);
  const [addRole, setAddRole] = useState("parent");
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  function openAddUser() {
    setAddRole("parent");
    setAddName("");
    setAddEmail("");
    setAddPhone("");
    setAddError(null);
    setAddOpen(true);
  }

  async function handleCreateUser() {
    const [firstName, ...rest] = addName.trim().split(/\s+/);
    if (!firstName || !addEmail.trim()) {
      setAddError("Name and email are required.");
      return;
    }
    const roleOption = ADD_USER_ROLES.find((o) => o.key === addRole);
    if (!roleOption) {
      setAddError("Pick a role.");
      return;
    }
    if (!apiEnabled()) {
      setBanner({ ok: true, text: "Demo mode — no account actually created." });
      setAddOpen(false);
      return;
    }
    setAddSubmitting(true);
    setAddError(null);
    try {
      await createUser({
        email: addEmail.trim(),
        firstName,
        lastName: rest.join(" "),
        phone: addPhone.trim() || undefined,
        role: roleOption.apiRole,
      });
      setAddOpen(false);
      reload();
      toast({ variant: "success", title: "User created" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create the user.";
      setAddError(message);
      toast({ variant: "error", title: "Couldn't create user", description: message });
    } finally {
      setAddSubmitting(false);
    }
  }

  // Edit User — scoped down to the fields that are safe to change without the
  // admin-only role-preset/department reassignment machinery in features/admin/Users.tsx
  // (that flow calls changeUserRole + applyRoleToUser + department switching together, and
  // porting it partially risks leaving an account in a half-migrated state). Name and phone
  // cover the common "fix a typo" / "update contact number" request this page needs to serve.
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEdit(u: AppUser) {
    const [firstName, ...rest] = u.name.trim().split(/\s+/);
    setEditForm({ firstName: firstName ?? "", lastName: rest.join(" "), phone: u.phone === "—" ? "" : u.phone });
    setEditError(null);
    setEditUser(u);
    setDetailUser(null);
  }

  async function handleUpdateUser() {
    if (!editUser) return;
    if (!editForm.firstName.trim()) {
      setEditError("First name is required.");
      return;
    }
    if (!apiEnabled()) {
      setBanner({ ok: true, text: "Demo mode — no account actually updated." });
      setEditUser(null);
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await updateUser(editUser.id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim() || undefined,
      });
      setEditUser(null);
      reload();
      toast({ variant: "success", title: "Profile updated" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update the profile.";
      setEditError(message);
      toast({ variant: "error", title: "Couldn't update profile", description: message });
    } finally {
      setEditSaving(false);
    }
  }

  // Delete User
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    if (!apiEnabled()) {
      setBanner({ ok: true, text: "Demo mode — no account actually deleted." });
      setDetailUser(null);
      return;
    }
    await deleteUser(deleteTarget.id);
    setBanner({ ok: true, text: `${deleteTarget.name}'s account was deleted.` });
    setDetailUser(null);
    reload();
    toast({ variant: "success", title: "Account deleted", description: `${deleteTarget.name}'s account was removed.` });
  }

  const columns: DataTableColumn<AppUser>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        sortable: true,
        accessor: (row) => row.name,
        render: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback style={{ backgroundColor: `${row.avatarColor}22`, color: row.avatarColor }}>
                {getInitials(row.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{row.name}</p>
              <p className="text-xs text-muted-foreground">{row.email}</p>
            </div>
          </div>
        ),
      },
      { key: "phone", header: "Phone", render: (row) => <span className="text-sm text-muted-foreground">{row.phone}</span> },
      {
        key: "role",
        header: "Role",
        sortable: true,
        accessor: (row) => row.role,
        render: (row) => <Badge variant="outline">{ROLE_LABELS[row.role]}</Badge>,
      },
      {
        key: "department",
        header: "Department",
        render: (row) => (row.department ? <span className="text-sm">{row.department}</span> : <span className="text-muted-foreground">—</span>),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (row) => row.status,
        render: (row) => <UserStatusBadge status={row.status} />,
      },
      {
        key: "joinedOn",
        header: "Joined",
        sortable: true,
        accessor: (row) => row.joinedOn,
        render: (row) => <span className="text-sm text-muted-foreground">{formatDate(row.joinedOn)}</span>,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        eyebrow="Delegated Work"
        title="Users"
        description={
          canManage
            ? "Directory of parents, students' guardians, teachers and staff — add, edit or remove accounts here per your account's grants."
            : "Read-only directory of parents, students' guardians, teachers and staff — reach out to Admin to change an account."
        }
        actions={
          canCreate ? (
            <Button onClick={openAddUser}>
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          ) : undefined
        }
      />

      {apiEnabled() && error && (
        <InlineAlert variant="warning" className="mb-4">
          Could not reach the API ({error}) — showing demo data.
        </InlineAlert>
      )}

      {banner && (
        <InlineAlert variant={banner.ok ? "success" : "warning"} className="mb-4">
          {banner.text}
        </InlineAlert>
      )}

      <DataTable
        data={users}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search users by name or email…"
        emptyTitle="No users yet"
        emptyDescription="Accounts will appear here once they're created."
        error={apiEnabled() ? error : null}
        onRetry={reload}
        onRowClick={canManage ? (row) => setDetailUser(row) : undefined}
      />

      {/* User detail dialog — only reachable when the account can act on it. */}
      <Dialog open={!!detailUser} onOpenChange={(open) => !open && setDetailUser(null)}>
        <DialogContent>
          {detailUser && (
            <>
              <DialogHeader>
                <DialogTitle>{detailUser.name}</DialogTitle>
                <DialogDescription>{detailUser.email}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</p>
                  <p className="mt-1 font-medium text-foreground">{detailUser.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</p>
                  <p className="mt-1 font-medium text-foreground">{ROLE_LABELS[detailUser.role]}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <UserStatusBadge status={detailUser.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Joined</p>
                  <p className="mt-1 font-medium text-foreground">{formatDate(detailUser.joinedOn, "long")}</p>
                </div>
                {detailUser.department && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Department</p>
                    <p className="mt-1 font-medium text-foreground">{detailUser.department}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="sm:justify-between">
                {canDelete ? (
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(detailUser)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Account
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDetailUser(null)}>
                    Close
                  </Button>
                  {canEdit && <Button onClick={() => openEdit(detailUser)}>Edit Profile</Button>}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this account?"
        description={deleteTarget ? `${deleteTarget.name}'s account will be removed. This can't be undone from the UI.` : undefined}
        confirmLabel="Delete Account"
        destructive
        onConfirm={handleDeleteUser}
      />

      {/* Edit profile dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>{editUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-first">First name</Label>
                <Input
                  id="edit-first"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="e.g. Simran"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-last">Last name</Label>
                <Input
                  id="edit-last"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="e.g. Kaur"
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                placeholder="+91 90000 00000"
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          {editError && <p className="text-sm font-medium text-destructive">{editError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={editSaving}>
              {editSaving ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add user dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              {apiEnabled()
                ? "Create a parent, teacher or staff account. Login credentials are emailed automatically."
                : "Create a parent, teacher or staff account. This is a mock form — no data is persisted."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="add-name">Full name</Label>
              <Input id="add-name" placeholder="e.g. Simran Kaur" value={addName} onChange={(e) => setAddName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-email">Email</Label>
              <Input id="add-email" type="email" placeholder="name@example.com" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-phone">Phone</Label>
              <Input id="add-phone" placeholder="+91 90000 00000" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-role-select">Role</Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger id="add-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADD_USER_ROLES.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addRole === "teacher" && (
                <p className="text-xs text-muted-foreground">
                  Department can be assigned afterwards from Departments — this form creates the account without one.
                </p>
              )}
            </div>
          </div>
          {addError && <p className="text-sm font-medium text-destructive">{addError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={addSubmitting}>
              {addSubmitting ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
