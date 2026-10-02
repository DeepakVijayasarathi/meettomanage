import { useEffect, useMemo, useState } from "react";
import { ChildSchedulePreferenceSummary } from "@/components/ChildSchedulePreferenceSummary";
import { useSearchParams } from "react-router-dom";
import { GraduationCap, Loader2, Mic, Plus, Sparkles, Trash2, Users as UsersIcon, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { useToast } from "@/hooks/use-toast";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserStatusBadge, FeeStatusBadge } from "@/components/StatusBadge";
import { useApiData } from "@/api/hooks";
import { apiEnabled, userMessage } from "@/lib/api";
import { useSession } from "@/state/session";
import { formatCurrency, formatDate, isValidEmail } from "@/lib/utils";
import {
  createUser,
  deleteStudent,
  deleteUser,
  getParentHardDeletePreview,
  getStudentHardDeletePreview,
  hardDeleteParent,
  hardDeleteStudent,
  listAllUsers,
  listStudents,
  resetPin,
  toAppUser,
  updateStudentNotes,
  updateUser,
  type ApiDataDeletionPreview,
  type StudentRow,
} from "@/api/users";
import { getStudentAnalytics, type ApiStudentAnalytics } from "@/api/reports";
import { PARENTS, TEACHERS, ADMISSION_TEAM, SUB_ADMINS, getParentById } from "@/data/users";
import { CHILDREN } from "@/data/children";
import { getCourseById } from "@/data/courses";
import type { AppUser, Child } from "@/types";
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
  itadmin: "IT Admin",
  executive: "Founder Dashboard",
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
  // GET /api/reports/students/{id}/analytics requires ReportsAnalytics:View — a separate grant
  // from UserManagement. A Coordinator/Management account without it would otherwise 403 every
  // time it opens a student's profile.
  const canSeeAnalytics = !apiEnabled() || hasPermission("ReportsAnalytics", "View");
  const canManage = canCreate || canEdit || canDelete;

  // Fetches every user of each role, not just the newest page — a single listUsers({ pageSize })
  // call silently made anyone outside the first (server-clamped-to-100) page permanently
  // unfindable and un-searchable here, since this page's search box only filters whatever's
  // already been fetched (DataTable has no server-search wiring). Mirrors the same fix applied
  // to features/admin/Users.tsx.
  const { data: users, error, reload } = useApiData(
    () =>
      Promise.all([
        listAllUsers("Parent"),
        listAllUsers("Teacher"),
        listAllUsers("AdmissionTeam"),
        listAllUsers("SubAdmin"),
      ]).then((lists) => lists.flat().map(toAppUser)),
    DEMO_USERS
  );

  // Students directory — mirrors the "Students" tab in features/admin/Users.tsx. Batches are
  // organized by child, not by parent, so staff often need to look a child up directly (their
  // attendance, fee status, RM notes) rather than going through the parent's own account.
  const { data: students, error: studentsError, reload: reloadStudents } = useApiData<StudentRow[]>(listStudents, CHILDREN);

  // Deep link from elsewhere in the app (e.g. a batch's roster, which has no student-detail
  // view of its own — this same dialog is the one place email/parent/login info actually
  // lives) straight to one student's own detail dialog, on the right tab. Mirrors
  // features/admin/Users.tsx.
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkStudentId = searchParams.get("studentId");
  const [activeTab, setActiveTab] = useState(deepLinkStudentId ? "students" : "people");
  const [detailUser, setDetailUser] = useState<AppUser | null>(null);

  // Parent -> their children's names (reported live: an RM couldn't see whose parent an account
  // was). Keyed like features/admin/Users.tsx: parentUserId is the account id in API mode.
  const childrenByParentUserId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of students) {
      const key = s.parentUserId || s.parentId;
      if (!key) continue;
      map.set(key, [...(map.get(key) ?? []), s.name]);
    }
    return map;
  }, [students]);
  const usersWithChildren = useMemo(
    () => users.map((u) => ({ ...u, childrenNames: (childrenByParentUserId.get(u.id) ?? []).join(", ") })),
    [users, childrenByParentUserId]
  );

  // Reset PIN (reported live: missing from the RM portal) -- shows the new PIN here to relay on
  // WhatsApp/phone; POST /api/users/{id}/reset-pin needs UserManagement:Edit, same as Edit Profile.
  const [resettingPin, setResettingPin] = useState(false);
  const [pinResult, setPinResult] = useState<{ ok: true; pin: string } | { ok: false; message: string } | null>(null);
  useEffect(() => setPinResult(null), [detailUser]);

  async function handleResetPin() {
    if (!detailUser) return;
    setPinResult(null);
    if (!apiEnabled()) {
      setPinResult({ ok: true, pin: String(Math.floor(1000 + Math.random() * 9000)) });
      return;
    }
    setResettingPin(true);
    try {
      const pin = await resetPin(detailUser.id);
      setPinResult({ ok: true, pin });
      toast({ variant: "success", title: "PIN reset", description: `A new PIN was generated for ${detailUser.name}.` });
    } catch (err) {
      setPinResult({ ok: false, message: userMessage(err, "Could not reset the PIN.") });
    } finally {
      setResettingPin(false);
    }
  }
  const [detailChild, setDetailChild] = useState<Child | null>(null);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!deepLinkStudentId || students.length === 0) return;
    const match = students.find((s) => s.id === deepLinkStudentId);
    if (match) {
      setDetailChild(match);
      // Consumed — closing the dialog shouldn't reopen it on the next render, and the URL
      // shouldn't keep pointing at a specific student once it's just "the Users page" again.
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("studentId");
        return next;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkStudentId, students]);

  // RM special enrolment notes for the open child profile.
  const [childNotes, setChildNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  useEffect(() => {
    setChildNotes((detailChild as StudentRow | null)?.rmNotes ?? "");
  }, [detailChild]);

  // Engagement/AI analytics for the open child profile — fetched on open rather than eagerly
  // for the whole list, since it's a per-student aggregation query.
  const [analytics, setAnalytics] = useState<ApiStudentAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  useEffect(() => {
    if (!detailChild || !apiEnabled() || !canSeeAnalytics) {
      setAnalytics(null);
      return;
    }
    let cancelled = false;
    setAnalyticsLoading(true);
    getStudentAnalytics(detailChild.id)
      .then((data) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(() => {
        if (!cancelled) setAnalytics(null);
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailChild, canSeeAnalytics]);

  // Delete-child confirmation — separate from deleteTarget since a child isn't an AppUser
  // (it has no login of its own).
  const [deleteChildTarget, setDeleteChildTarget] = useState<Child | null>(null);
  const [deletingChild, setDeletingChild] = useState(false);
  // Set once the plain delete is refused for an active batch enrolment — confirming again from
  // this state withdraws every active enrolment and deletes in the same call.
  const [childDeleteNeedsWithdraw, setChildDeleteNeedsWithdraw] = useState(false);

  async function handleDeleteChild() {
    if (!deleteChildTarget) return;
    if (!apiEnabled()) {
      setBanner({ ok: true, text: "Demo mode — no student actually removed." });
      setDetailChild(null);
      setDeleteChildTarget(null);
      return;
    }
    setDeletingChild(true);
    try {
      await deleteStudent(deleteChildTarget.id, childDeleteNeedsWithdraw);
      setBanner({ ok: true, text: `${deleteChildTarget.name}'s record was removed.` });
      setDetailChild(null);
      setDeleteChildTarget(null);
      setChildDeleteNeedsWithdraw(false);
      reloadStudents();
      toast({ variant: "success", title: "Student removed", description: `${deleteChildTarget.name}'s record was removed.` });
    } catch (err) {
      const message = userMessage(err, "Could not remove this student.");
      // The first refusal for this specific reason offers a one-click fix instead of leaving
      // the RM to separately go find and withdraw the batch enrolment themselves — hitting it
      // a second time (still refused after withdrawing) is a real, different problem, so only
      // flip into "withdraw & retry" mode the first time.
      if (!childDeleteNeedsWithdraw && message.includes("active batch enrolment")) {
        setChildDeleteNeedsWithdraw(true);
      } else {
        setBanner({ ok: false, text: message });
        toast({ variant: "error", title: "Couldn't remove student", description: message });
      }
    } finally {
      setDeletingChild(false);
    }
  }

  // Hard-delete (Student) — a separate, stricter action from deleteChildTarget's soft delete
  // above: permanently removes the record and every mapped row (enrollments, invoices,
  // payments, attendance, engagement, ...), logged first for future reference. Never touches
  // the parent account, siblings, batches or class sessions. Fetches the preview BEFORE opening
  // the confirm dialog so the popup opens already showing exactly what will be removed.
  const [hardDeleteChildTarget, setHardDeleteChildTarget] = useState<Child | null>(null);
  const [hardDeleteChildPreview, setHardDeleteChildPreview] = useState<ApiDataDeletionPreview | null>(null);
  const [loadingHardDeleteChildPreview, setLoadingHardDeleteChildPreview] = useState(false);

  async function openHardDeleteChild(child: Child) {
    if (!apiEnabled()) {
      toast({ variant: "error", title: "Not available in demo mode", description: "Hard delete needs a live backend to compute what it would remove." });
      return;
    }
    setLoadingHardDeleteChildPreview(true);
    try {
      const preview = await getStudentHardDeletePreview(child.id);
      setHardDeleteChildTarget(child);
      setHardDeleteChildPreview(preview);
    } catch (err) {
      const message = userMessage(err, "Could not check what this would delete.");
      toast({ variant: "error", title: "Couldn't open delete preview", description: message });
    } finally {
      setLoadingHardDeleteChildPreview(false);
    }
  }

  async function handleHardDeleteChild() {
    if (!hardDeleteChildTarget) return;
    await hardDeleteStudent(hardDeleteChildTarget.id);
    setBanner({ ok: true, text: `${hardDeleteChildTarget.name}'s record and all mapped data were permanently deleted.` });
    setDetailChild(null);
    setHardDeleteChildTarget(null);
    setHardDeleteChildPreview(null);
    reloadStudents();
    toast({
      variant: "success",
      title: "Student permanently deleted",
      description: `${hardDeleteChildTarget.name}'s record and all mapped data were removed. A copy of everything deleted is kept in the deletion log.`,
    });
  }

  /** Shared confirm-dialog body for both hard-delete flows below — a plain count-per-table list
   *  plus a headline total, so the popup shows exactly what "all mapped data" means before
   *  committing to an action with no undo. */
  function renderHardDeletePreview(preview: ApiDataDeletionPreview | null, targetLabel: string) {
    if (!preview) return null;
    return (
      <div className="space-y-2 text-left">
        <p>
          Permanently deletes {targetLabel} and <strong>{preview.totalRecords}</strong> related record
          {preview.totalRecords === 1 ? "" : "s"} across {preview.items.length} table{preview.items.length === 1 ? "" : "s"}. This
          cannot be undone from the UI — a full copy of every deleted row is kept in the deletion log for future reference.
        </p>
        {preview.items.length > 0 && (
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/40 p-2.5 text-xs">
            {preview.items.map((item) => (
              <li key={item.table} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold text-foreground">{item.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

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
    if (!isValidEmail(addEmail)) {
      setAddError("Enter a valid email address.");
      return;
    }
    const roleOption = ADD_USER_ROLES.find((o) => o.key === addRole);
    if (!roleOption) {
      setAddError("Role is required.");
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
      const message = userMessage(err, "Could not create the user.");
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
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEdit(u: AppUser) {
    const [firstName, ...rest] = u.name.trim().split(/\s+/);
    setEditForm({
      firstName: firstName ?? "",
      lastName: rest.join(" "),
      email: u.email,
      phone: u.phone === "—" ? "" : u.phone,
    });
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
    if (!isValidEmail(editForm.email)) {
      setEditError("Enter a valid email address.");
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
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || undefined,
      });
      setEditUser(null);
      reload();
      toast({ variant: "success", title: "Profile updated" });
    } catch (err) {
      const message = userMessage(err, "Could not update the profile.");
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

  // Hard-delete (Parent) — same idea as the Student flow above: permanently removes the account
  // and every mapped row across every other table (invoices, payments, refunds, enrollments,
  // engagement, ...), logged first for future reference.
  const [hardDeleteUserTarget, setHardDeleteUserTarget] = useState<AppUser | null>(null);
  const [hardDeleteUserPreview, setHardDeleteUserPreview] = useState<ApiDataDeletionPreview | null>(null);
  const [loadingHardDeleteUserPreview, setLoadingHardDeleteUserPreview] = useState(false);

  async function openHardDeleteUser(user: AppUser) {
    if (!apiEnabled()) {
      toast({ variant: "error", title: "Not available in demo mode", description: "Hard delete needs a live backend to compute what it would remove." });
      return;
    }
    setLoadingHardDeleteUserPreview(true);
    try {
      const preview = await getParentHardDeletePreview(user.id);
      setHardDeleteUserTarget(user);
      setHardDeleteUserPreview(preview);
    } catch (err) {
      const message = userMessage(err, "Could not check what this would delete.");
      toast({ variant: "error", title: "Couldn't open delete preview", description: message });
    } finally {
      setLoadingHardDeleteUserPreview(false);
    }
  }

  async function handleHardDeleteUser() {
    if (!hardDeleteUserTarget) return;
    await hardDeleteParent(hardDeleteUserTarget.id);
    setBanner({ ok: true, text: `${hardDeleteUserTarget.name}'s account and all mapped data were permanently deleted.` });
    setDetailUser(null);
    setHardDeleteUserTarget(null);
    setHardDeleteUserPreview(null);
    reload();
    reloadStudents();
    toast({
      variant: "success",
      title: "Account permanently deleted",
      description: `${hardDeleteUserTarget.name}'s account and all mapped data were removed. A copy of everything deleted is kept in the deletion log.`,
    });
  }

  const columns: DataTableColumn<AppUser & { childrenNames: string }>[] = useMemo(
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
        key: "childrenNames",
        header: "Children",
        accessor: (row) => row.childrenNames,
        render: (row) => (row.childrenNames ? <span className="text-sm">{row.childrenNames}</span> : <span className="text-muted-foreground">—</span>),
      },
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

  const studentColumns: DataTableColumn<StudentRow>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Student",
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
              <p className="text-xs text-muted-foreground">
                {[row.grade, row.age ? `Age ${row.age}` : ""].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "parent",
        header: "Parent",
        accessor: (row) => row.parentName ?? getParentById(row.parentId)?.name ?? "",
        render: (row) => <span className="text-sm">{row.parentName ?? getParentById(row.parentId)?.name ?? "—"}</span>,
      },
      {
        key: "course",
        header: "Course",
        render: (row) => <span className="text-sm text-muted-foreground">{row.courseName ?? getCourseById(row.courseId)?.name ?? "—"}</span>,
      },
      {
        key: "attendance",
        header: "Attendance",
        sortable: true,
        accessor: (row) => row.attendancePercent ?? -1,
        render: (row) =>
          row.attendancePercent === undefined ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            <div className="flex items-center gap-2">
              <Progress value={row.attendancePercent} className="h-1.5 w-16" />
              <span className="text-xs font-semibold text-muted-foreground">{row.attendancePercent}%</span>
            </div>
          ),
      },
      {
        key: "feeStatus",
        header: "Fee Status",
        sortable: true,
        accessor: (row) => row.feeStatus,
        render: (row) => <FeeStatusBadge status={row.feeStatus} />,
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="people" className="gap-1.5">
            <UsersIcon className="h-4 w-4" /> People
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5">
            <GraduationCap className="h-4 w-4" /> Students
          </TabsTrigger>
        </TabsList>

        <TabsContent value="people">
          <DataTable
            data={usersWithChildren}
            columns={columns}
            rowKey={(row) => row.id}
            searchPlaceholder="Search users by name, email or child…"
            emptyTitle="No users yet"
            emptyDescription="Accounts will appear here once they're created."
            error={apiEnabled() ? error : null}
            onRetry={reload}
            onRowClick={canManage ? (row) => setDetailUser(row) : undefined}
          />
        </TabsContent>

        <TabsContent value="students">
          <DataTable
            data={students}
            columns={studentColumns}
            rowKey={(row) => row.id}
            searchPlaceholder="Search students by name…"
            onRowClick={(row) => setDetailChild(row)}
            emptyTitle="No students enrolled yet"
            emptyDescription="Students appear here once a parent adds a child."
            error={apiEnabled() ? studentsError : null}
            onRetry={reloadStudents}
          />
        </TabsContent>
      </Tabs>

      {/* User detail dialog — only reachable when the account can act on it. */}
      <Dialog open={!!detailUser} onOpenChange={(open) => !open && setDetailUser(null)}>
        <DialogContent className="max-w-2xl grid-cols-[minmax(0,1fr)]">
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
                {detailUser.role === "parent" && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Children</p>
                    <p className="mt-1 font-medium text-foreground">{(childrenByParentUserId.get(detailUser.id) ?? []).join(", ") || "—"}</p>
                  </div>
                )}
                {detailUser.department && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Department</p>
                    <p className="mt-1 font-medium text-foreground">{detailUser.department}</p>
                  </div>
                )}
              </div>

              {pinResult && (
                <InlineAlert variant={pinResult.ok ? "success" : "error"} className="text-sm">
                  {pinResult.ok ? (
                    <span>
                      New PIN: <strong className="font-mono text-base">{pinResult.pin}</strong> — send it to them (e.g. on WhatsApp). It's shown only now.
                    </span>
                  ) : (
                    pinResult.message
                  )}
                </InlineAlert>
              )}

              <DialogFooter className="border-t border-border pt-4 sm:flex-wrap sm:items-center sm:justify-between">
                {canDelete ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(detailUser)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Account
                    </Button>
                    {/* Hard delete is scoped to Parent accounts only — a Teacher/Admin/Sub Admin's
                        own data (batches, class sessions, payouts) is shared with other families'
                        records in a way a Parent's own data never is. */}
                    {detailUser.role === "parent" && (
                      <Button
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={loadingHardDeleteUserPreview}
                        onClick={() => openHardDeleteUser(detailUser)}
                        title="Permanently deletes this account and every mapped record — invoices, payments, enrollments, engagement, everything. Logged first, but not recoverable from the UI."
                      >
                        {loadingHardDeleteUserPreview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Delete All Data
                      </Button>
                    )}
                  </div>
                ) : (
                  <span />
                )}
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button variant="outline" onClick={() => setDetailUser(null)}>
                    Close
                  </Button>
                  {canEdit && detailUser.role !== "admin" && (
                    <Button variant="outline" disabled={resettingPin} onClick={handleResetPin}>
                      {resettingPin && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Reset PIN
                    </Button>
                  )}
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

      {/* Student detail dialog */}
      <Dialog open={!!detailChild} onOpenChange={(open) => !open && setDetailChild(null)}>
        <DialogContent className="max-w-2xl grid-cols-[minmax(0,1fr)]">
          {detailChild && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback style={{ backgroundColor: `${detailChild.avatarColor}22`, color: detailChild.avatarColor }}>
                      {getInitials(detailChild.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{detailChild.name}</DialogTitle>
                    <DialogDescription>
                      {[detailChild.grade, detailChild.age ? `Age ${detailChild.age}` : ""].filter(Boolean).join(" · ")}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parent</p>
                  <p className="mt-1 font-medium text-foreground">{getParentById(detailChild.parentId)?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Course</p>
                  <p className="mt-1 font-medium text-foreground">{getCourseById(detailChild.courseId)?.name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Classes Completed</p>
                  <p className="mt-1 font-medium text-foreground">{detailChild.classesCompleted}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Classes Remaining</p>
                  <p className="mt-1 font-medium text-foreground">{detailChild.classesRemaining}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attendance</p>
                  <p className="mt-1 font-medium text-foreground">
                    {detailChild.attendancePercent === undefined ? "—" : `${detailChild.attendancePercent}%`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fee Status</p>
                  <div className="mt-1">
                    <FeeStatusBadge status={detailChild.feeStatus} />
                  </div>
                </div>
              </div>

              {/* AI engagement analytics — quiz accuracy, board participation, talk-time and
                  camera attentiveness from live-classroom signals, plus generated narrative
                  insights. */}
              {apiEnabled() && (
                <div className="mt-4 rounded-xl border border-border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Engagement Analytics</p>
                  </div>
                  {analyticsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : !analytics ? (
                    <p className="text-sm text-muted-foreground">No engagement data yet — appears once this student has attended a live class.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div>
                          <p className="text-lg font-bold text-foreground">{analytics.averageEngagementScore}</p>
                          <p className="text-xs text-muted-foreground">Engagement score</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-foreground">
                            {analytics.quizAttempts > 0 ? Math.round((100 * analytics.quizCorrect) / analytics.quizAttempts) : 0}%
                          </p>
                          <p className="text-xs text-muted-foreground">Quiz accuracy ({analytics.quizAttempts} attempts)</p>
                        </div>
                        <div>
                          <p className="flex items-center gap-1 text-lg font-bold text-foreground">
                            <Mic className="h-3.5 w-3.5 text-muted-foreground" /> {Math.round(analytics.talkTimeSeconds / 60)}m
                          </p>
                          <p className="text-xs text-muted-foreground">Talk time</p>
                        </div>
                        <div>
                          <p className="flex items-center gap-1 text-lg font-bold text-foreground">
                            <Video className="h-3.5 w-3.5 text-muted-foreground" /> {Math.round(analytics.cameraOnSeconds / 60)}m
                          </p>
                          <p className="text-xs text-muted-foreground">Camera on</p>
                        </div>
                      </div>
                      {analytics.insights.length > 0 && (
                        <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                          {analytics.insights.map((insight, i) => (
                            <li key={i} className="text-xs text-foreground/90">
                              {insight}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )}

              <ChildSchedulePreferenceSummary preference={(detailChild as StudentRow | null)?.schedulePreference} />

              {/* RM special enrolment notes — gated behind canEdit, same as the onboarding panel
                  above (updateStudentNotes is UserManagement:Edit on the backend). */}
              <div className="mt-2 flex flex-col gap-1.5">
                <Label htmlFor="rm-notes">Relationship Manager notes</Label>
                <Textarea
                  id="rm-notes"
                  placeholder="e.g. Enrolled during the discount window; services begin after 4 months."
                  value={childNotes}
                  onChange={(e) => setChildNotes(e.target.value)}
                  rows={3}
                  disabled={!canEdit}
                />
                <p className="text-xs text-muted-foreground">Shown on this child's profile to the current RM and admins.</p>
              </div>

              <DialogFooter className="border-t border-border pt-4 sm:flex-wrap sm:items-center sm:justify-between">
                {canDelete && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteChildTarget(detailChild)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete Student
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={loadingHardDeleteChildPreview}
                      onClick={() => openHardDeleteChild(detailChild)}
                      title="Permanently deletes this student and every mapped record — enrollments, invoices, payments, attendance, engagement, everything. Logged first, but not recoverable from the UI. Never affects the parent account."
                    >
                      {loadingHardDeleteChildPreview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Delete All Data
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button variant="outline" onClick={() => setDetailChild(null)}>
                    Close
                  </Button>
                  {canEdit && (
                    <Button
                      disabled={savingNotes}
                      onClick={async () => {
                        if (!detailChild) return;
                        if (!apiEnabled()) {
                          setBanner({ ok: true, text: "Demo mode — no notes actually saved." });
                          setDetailChild(null);
                          return;
                        }
                        setSavingNotes(true);
                        try {
                          await updateStudentNotes(detailChild.id, childNotes.trim());
                          setDetailChild(null);
                        } catch {
                          /* keep dialog open on failure */
                        } finally {
                          setSavingNotes(false);
                        }
                      }}
                    >
                      {savingNotes && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {savingNotes ? "Saving…" : "Save notes"}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteChildTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteChildTarget(null);
            setChildDeleteNeedsWithdraw(false);
          }
        }}
        title={childDeleteNeedsWithdraw ? "Withdraw and delete this student record?" : "Delete this student record?"}
        description={
          deleteChildTarget
            ? [
                childDeleteNeedsWithdraw
                  ? `${deleteChildTarget.name} still has an active batch enrolment. Confirming will withdraw them from every batch (freeing their seat) and then remove the record.`
                  : `${deleteChildTarget.name}'s record will be removed. This is blocked if they still have an active batch enrolment or an unpaid invoice — withdraw/settle those first.`,
                (deleteChildTarget as StudentRow).paidInvoiceTotal
                  ? `This student has ${formatCurrency((deleteChildTarget as StudentRow).paidInvoiceTotal!)} in paid invoices. Deleting the record will NOT refund this automatically — process a refund from Billing & Finance → Refunds if one is owed.`
                  : null,
              ]
                .filter(Boolean)
                .join(" ")
            : undefined
        }
        confirmLabel={deletingChild ? "Deleting…" : childDeleteNeedsWithdraw ? "Withdraw & Delete" : "Delete Student"}
        destructive
        onConfirm={handleDeleteChild}
      />

      <ConfirmDialog
        open={!!hardDeleteUserTarget}
        onOpenChange={(open) => {
          if (!open) {
            setHardDeleteUserTarget(null);
            setHardDeleteUserPreview(null);
          }
        }}
        title="Permanently delete all of this account's data?"
        description={hardDeleteUserTarget ? renderHardDeletePreview(hardDeleteUserPreview, `${hardDeleteUserTarget.name}'s account`) : undefined}
        confirmLabel="Delete All Data"
        destructive
        onConfirm={handleHardDeleteUser}
      />

      <ConfirmDialog
        open={!!hardDeleteChildTarget}
        onOpenChange={(open) => {
          if (!open) {
            setHardDeleteChildTarget(null);
            setHardDeleteChildPreview(null);
          }
        }}
        title="Permanently delete all of this student's data?"
        description={hardDeleteChildTarget ? renderHardDeletePreview(hardDeleteChildPreview, `${hardDeleteChildTarget.name}'s record`) : undefined}
        confirmLabel="Delete All Data"
        destructive
        onConfirm={handleHardDeleteChild}
      />

      {/* Edit profile dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="edit-first">First name <span className="text-destructive">*</span></Label>
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
              <Label htmlFor="edit-email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@example.com"
              />
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
              {editSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {editSaving ? "Saving…" : "Save Changes"}
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
              <Label htmlFor="add-name">Full name <span className="text-destructive">*</span></Label>
              <Input id="add-name" placeholder="e.g. Simran Kaur" value={addName} onChange={(e) => setAddName(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-email">Email <span className="text-destructive">*</span></Label>
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
              {addSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {addSubmitting ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
