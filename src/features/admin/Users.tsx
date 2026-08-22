import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, GraduationCap, HeartHandshake, KeyRound, Loader2, Mail, Mic, MessageCircle, Plus, ShieldCheck, Sparkles, Trash2, UserCog, Users as UsersIcon, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { UserStatusBadge, FeeStatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { PARENTS, TEACHERS, ADMISSION_TEAM, SUB_ADMINS, getParentById } from "@/data/users";
import { CHILDREN } from "@/data/children";
import { getCourseById } from "@/data/courses";
import { DEMO_DEPARTMENTS } from "@/data/departments";
import type { AppUser, Child } from "@/types";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { changeUserRole, createUser, deleteUser, getCredentialChannels, listStudents, listUsers, resendCredentials, resetPin, toAppUser, updateStudentNotes, updateUser, type StudentRow } from "@/api/users";
import { getStudentAnalytics, type ApiStudentAnalytics } from "@/api/reports";
import type { ApiRole } from "@/api/types";
import { applyRoleToUser, listRoles, type ApiRole as ApiRolePreset } from "@/api/roles";
import { listDepartments, type ApiDepartment } from "@/api/departments";

function UserAvatar({ name, color }: { name: string; color: string }) {
  return (
    <Avatar className="h-9 w-9">
      <AvatarFallback style={{ backgroundColor: `${color}22`, color }}>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}

interface AddUserRoleOption {
  key: string;
  label: string;
  apiRole: ApiRole;
  roleDefinitionId?: string;
  /** The preset's slug name, used by the "apply role to an existing user" endpoint (which takes a name, not an id). */
  presetName?: string;
}

const BASE_ADD_USER_ROLES: AddUserRoleOption[] = [
  { key: "parent", label: "Parent", apiRole: "Parent" },
  { key: "teacher", label: "Teacher", apiRole: "Teacher" },
  { key: "admission", label: "Admission Team", apiRole: "AdmissionTeam" },
  { key: "subadmin", label: "Parent Relationship Manager", apiRole: "SubAdmin" },
];

// These preset names already have a dedicated base option above (or, for "admin", can
// never be self-service created) — skip them so the flattened list has no look-alike
// duplicates. "student" is also skipped: it's a real system RoleDefinition (0 permissions,
// DefaultRoute "/student"), but it exists only to back the Parent's own "Student View"
// preview — assigning it to a staff account grants nothing useful and shows up as a
// confusing "Student" badge on what's actually a Sub Admin account.
const ROLE_PRESET_NAMES_TO_SKIP = new Set(["admin", "teacher", "parent", "admission", "sub-admin", "student"]);

const FRONTEND_ROLE_TO_API: Record<string, ApiRole> = {
  parent: "Parent",
  teacher: "Teacher",
  admission: "AdmissionTeam",
  subadmin: "SubAdmin",
  admin: "Admin",
};

export default function AdminUsers() {
  const {
    data: parents,
    error: parentsError,
    reload: reloadParents,
  } = useApiData(() => listUsers({ role: "Parent" }).then((r) => r.items.map(toAppUser)), PARENTS);
  const { data: teachers, reload: reloadTeachers } = useApiData(
    () => listUsers({ role: "Teacher" }).then((r) => r.items.map(toAppUser)),
    TEACHERS
  );
  const { data: staff, reload: reloadStaff } = useApiData(
    async () => {
      const [admission, subAdmins] = await Promise.all([
        listUsers({ role: "AdmissionTeam" }),
        listUsers({ role: "SubAdmin" }),
      ]);
      return [...admission.items, ...subAdmins.items].map(toAppUser);
    },
    [...ADMISSION_TEAM, ...SUB_ADMINS]
  );
  const { data: students } = useApiData<StudentRow[]>(listStudents, CHILDREN);
  const { data: departments } = useApiData<ApiDepartment[]>(() => listDepartments(false), DEMO_DEPARTMENTS);

  const [detailUser, setDetailUser] = useState<AppUser | null>(null);
  const [detailChild, setDetailChild] = useState<Child | null>(null);
  // RM special enrolment notes for the open child profile.
  const [childNotes, setChildNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  useEffect(() => {
    setChildNotes((detailChild as StudentRow | null)?.rmNotes ?? "");
  }, [detailChild]);
  // Engagement/AI analytics for the open child profile — fetched on open rather than
  // eagerly for the whole list, since it's a per-student aggregation query.
  const [analytics, setAnalytics] = useState<ApiStudentAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  useEffect(() => {
    if (!detailChild || !apiEnabled()) {
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
  }, [detailChild]);
  // Edit-profile dialog (name + phone + role) for any user account.
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [editRole, setEditRole] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Opens the Add User dialog on a blank form. Reopening used to show whatever was typed
  // the last time it was cancelled (and any error from that attempt), so a second "add"
  // started half-filled with a previous person's details.
  function openAddUser() {
    setAddName("");
    setAddEmail("");
    setAddPhone("");
    setAddDepartment(departments[0]?.id ?? "");
    setAddError(null);
    setAddOpen(true);
  }

  function openEdit(u: AppUser) {
    const [firstName, ...rest] = u.name.trim().split(/\s+/);
    setEditForm({ firstName: firstName ?? "", lastName: rest.join(" "), phone: u.phone === "—" ? "" : u.phone });
    setEditError(null);
    const currentOption = u.roleDefinitionId
      ? addUserRoleOptions.find((o) => o.roleDefinitionId === u.roleDefinitionId)
      : undefined;
    setEditRole(currentOption?.key ?? u.role);
    setEditDepartment(u.departmentId ?? departments[0]?.id ?? "");
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
      // Editing a teacher's own department (no role change) needs to reach this same call,
      // since a role SWITCH to Teacher below fires before TeacherProfile even exists yet.
      const editingTeacherInPlace = editUser.role === "teacher" && editRole === "teacher";
      await updateUser(editUser.id, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: editForm.phone.trim() || undefined,
        departmentId: editingTeacherInPlace ? editDepartment : undefined,
      });

      // Admin accounts are untouchable through this action — the Role field is hidden for them.
      if (editUser.role !== "admin") {
        const selected = addUserRoleOptions.find((o) => o.key === editRole);
        const originalApiRole = FRONTEND_ROLE_TO_API[editUser.role];
        if (selected && selected.apiRole !== originalApiRole) {
          await changeUserRole(editUser.id, selected.apiRole);
          // Switching TO Teacher creates a fresh TeacherProfile with no department yet —
          // this second call is what actually sets it, now that the profile exists.
          if (selected.apiRole === "Teacher") {
            await updateUser(editUser.id, {
              firstName: editForm.firstName.trim(),
              lastName: editForm.lastName.trim(),
              phone: editForm.phone.trim() || undefined,
              departmentId: editDepartment,
            });
          }
        }
        if (selected?.apiRole === "SubAdmin" && selected.presetName && selected.roleDefinitionId !== editUser.roleDefinitionId) {
          await applyRoleToUser(editUser.id, selected.presetName);
        }
      }

      setEditUser(null);
      reloadParents();
      reloadTeachers();
      reloadStaff();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not update the profile.");
    } finally {
      setEditSaving(false);
    }
  }
  // Delete-account confirmation from the user detail dialog.
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    if (!apiEnabled()) {
      setBanner({ ok: true, text: "Demo mode — no account actually deleted." });
      setDetailUser(null);
      return;
    }
    try {
      await deleteUser(deleteTarget.id);
      setBanner({ ok: true, text: `${deleteTarget.name}'s account was deleted.` });
      setDetailUser(null);
      reloadParents();
      reloadTeachers();
      reloadStaff();
    } catch (err) {
      setBanner({ ok: false, text: err instanceof Error ? err.message : "Could not delete the account." });
    }
  }

  // Onboarding credential (re)send from the user detail dialog.
  const [sending, setSending] = useState<"Email" | "WhatsApp" | "Sms" | null>(null);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);
  // Which delivery channels are switched on in Settings → Integrations (is_enabled).
  // Demo mode shows both; with the API, only enabled channels get a button.
  const [channels, setChannels] = useState<{ email: boolean; whatsApp: boolean; sms: boolean }>(() =>
    apiEnabled() ? { email: false, whatsApp: false, sms: false } : { email: true, whatsApp: true, sms: true }
  );

  // Reset PIN: generates a fresh PIN and shows it here instead of sending it anywhere —
  // for when the admin wants to relay it themselves rather than rely on a delivery channel.
  const [resettingPin, setResettingPin] = useState(false);
  const [pinResult, setPinResult] = useState<{ ok: true; pin: string } | { ok: false; message: string } | null>(null);
  const [pinCopied, setPinCopied] = useState(false);

  async function handleResetPin() {
    if (!detailUser) return;
    setPinResult(null);
    setPinCopied(false);
    if (!apiEnabled()) {
      // A plausible-looking demo PIN, not a real credential — this account's real PIN
      // (if any) is untouched.
      setPinResult({ ok: true, pin: String(Math.floor(1000 + Math.random() * 9000)) });
      return;
    }
    setResettingPin(true);
    try {
      const pin = await resetPin(detailUser.id);
      setPinResult({ ok: true, pin });
    } catch (err) {
      setPinResult({ ok: false, message: err instanceof Error ? err.message : "Could not reset the PIN." });
    } finally {
      setResettingPin(false);
    }
  }

  async function handleCopyPin(pin: string) {
    await navigator.clipboard?.writeText(pin).catch(() => undefined);
    setPinCopied(true);
    setTimeout(() => setPinCopied(false), 2000);
  }

  const [addOpen, setAddOpen] = useState(false);
  const [addRole, setAddRole] = useState("parent");
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addDepartment, setAddDepartment] = useState("");
  const [rolePresets, setRolePresets] = useState<ApiRolePreset[]>([]);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Flattened Role list: the 4 base account types plus every named role from the
  // roles API (Academic Coordinator, Management, Student, any custom ones), so picking
  // one directly creates that account — no separate "assign role" step needed.
  const addUserRoleOptions = useMemo<AddUserRoleOption[]>(() => {
    // The base "Parent Relationship Manager" option is skipped from extraPresets below
    // (it already has its own entry) — but wire it to the real "sub-admin" system preset
    // once loaded, so re-selecting it on an existing user actually re-applies that preset
    // instead of being a silent no-op. Without this, a Sub Admin whose RoleDefinitionId
    // got stamped onto the wrong preset (e.g. by hand-editing the API) could never be
    // reset back to the plain PRM default from this dialog.
    const subAdminPreset = rolePresets.find((role) => role.name === "sub-admin");
    const baseRoles = subAdminPreset
      ? BASE_ADD_USER_ROLES.map((option) =>
          option.key === "subadmin"
            ? { ...option, roleDefinitionId: subAdminPreset.id, presetName: subAdminPreset.name }
            : option
        )
      : BASE_ADD_USER_ROLES;
    const extraPresets = rolePresets
      .filter((role) => !ROLE_PRESET_NAMES_TO_SKIP.has(role.name))
      .map((role) => ({
        key: role.id,
        label: role.displayName,
        apiRole: "SubAdmin" as ApiRole,
        roleDefinitionId: role.id,
        presetName: role.name,
      }));
    return [...baseRoles, ...extraPresets];
  }, [rolePresets]);

  useEffect(() => {
    if (!apiEnabled()) return;
    listRoles()
      .then(setRolePresets)
      .catch(() => {
        /* role dropdown just stays empty */
      });
    getCredentialChannels()
      .then(setChannels)
      .catch(() => {
        /* leave both hidden if we can't tell */
      });
  }, []);

  // Clear any previous send/reset result whenever a different user's dialog opens — a
  // revealed PIN especially must not linger onto the next account viewed.
  useEffect(() => {
    setSendResult(null);
    setPinResult(null);
  }, [detailUser]);

  // Bulk resend — shared by the Parents and Teachers tabs (both list AppUser rows).
  const [selectedParentIds, setSelectedParentIds] = useState<Set<string>>(new Set());
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  const [bulkConfirmIds, setBulkConfirmIds] = useState<string[] | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  async function handleBulkResend(ids: string[]) {
    if (!apiEnabled()) {
      setBulkResult(`Demo mode — no email actually sent to ${ids.length} user(s).`);
      return;
    }
    setBulkSending(true);
    setBulkResult(null);
    let succeeded = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await resendCredentials(id, "Email");
        succeeded++;
      } catch {
        failed++;
      }
    }
    setBulkResult(failed === 0 ? `Sent to all ${succeeded} selected user(s).` : `Sent to ${succeeded}, failed for ${failed}.`);
    setBulkSending(false);
    setSelectedParentIds(new Set());
    setSelectedTeacherIds(new Set());
  }

  async function handleResend(channel: "Email" | "WhatsApp" | "Sms") {
    if (!detailUser) return;
    if (!apiEnabled()) {
      setSendResult({ ok: true, message: `Demo mode — no ${channel} actually sent.` });
      return;
    }
    setSending(channel);
    setSendResult(null);
    try {
      await resendCredentials(detailUser.id, channel);
      setSendResult({
        ok: true,
        message: channel === "Email"
          ? `Welcome email with a new temporary PIN sent to ${detailUser.email}.`
          : `Welcome ${channel === "Sms" ? "SMS" : "WhatsApp"} with a new temporary PIN sent to ${detailUser.phone}.`,
      });
    } catch (err) {
      setSendResult({ ok: false, message: err instanceof Error ? err.message : `Could not send the ${channel} message.` });
    } finally {
      setSending(null);
    }
  }

  async function handleCreateUser() {
    // Validated before the demo-mode short-circuit (as handleUpdateUser above already
    // does): checking it after meant an entirely blank form still closed the dialog with
    // a green "Demo mode — no account actually created" line, which reads as a success.
    const [firstName, ...rest] = addName.trim().split(/\s+/);
    if (!firstName || !addEmail.trim()) {
      setAddError("Name and email are required.");
      return;
    }

    const roleOption = addUserRoleOptions.find((o) => o.key === addRole);
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
        departmentId: roleOption.apiRole === "Teacher" ? addDepartment : undefined,
        roleDefinitionId: roleOption.roleDefinitionId,
      });
      setAddOpen(false);
      setAddName("");
      setAddEmail("");
      setAddPhone("");
      reloadParents();
      reloadTeachers();
      reloadStaff();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not create the user.");
    } finally {
      setAddSubmitting(false);
    }
  }

  const userColumns: DataTableColumn<AppUser>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Name",
        sortable: true,
        accessor: (row) => row.name,
        render: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar name={row.name} color={row.avatarColor} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{row.name}</p>
              <p className="text-xs text-muted-foreground">{row.email}</p>
            </div>
          </div>
        ),
      },
      { key: "phone", header: "Phone", render: (row) => <span className="text-sm text-muted-foreground">{row.phone}</span> },
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
            <UserAvatar name={row.name} color={row.avatarColor} />
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
        accessor: (row) => row.attendancePercent,
        render: (row) => (
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

  const staffColumns: DataTableColumn<AppUser>[] = useMemo(
    () => [
      ...userColumns.slice(0, 1),
      { key: "phone", header: "Phone", render: (row) => <span className="text-sm text-muted-foreground">{row.phone}</span> },
      {
        key: "role",
        header: "Role",
        render: (row) => {
          // A SubAdmin account may have a named preset applied (Management, Coordinator,
          // etc.) — show that instead of the generic base-role label whenever one's set.
          // A roleDefinitionId that doesn't resolve (e.g. a preset since excluded from this
          // list, like "student") must NOT silently fall back to the generic label — that
          // would misreport a zero-permission account as a full Parent Relationship Manager.
          const preset = row.roleDefinitionId
            ? addUserRoleOptions.find((o) => o.roleDefinitionId === row.roleDefinitionId)
            : undefined;
          const label =
            row.role === "admission"
              ? "Admission Team"
              : row.roleDefinitionId && !preset
                ? "Custom preset"
                : (preset?.label ?? "Parent Relationship Manager");
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold capitalize text-foreground/80">
              {label}
            </span>
          );
        },
      },
      { ...userColumns[3] },
      { ...userColumns[4] },
    ],
    [userColumns, addUserRoleOptions]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Directory"
        title="Users"
        description="Manage parents, students, teachers, admission team and relationship managers across the platform."
        actions={
          <Button onClick={openAddUser}>
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        }
      />

      {apiEnabled() && parentsError && (
        <p role="alert" className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-sm font-medium text-warning-foreground">
          Could not reach the API ({parentsError}) — showing demo data.
        </p>
      )}

      {banner && (
        <p
          role={banner.ok ? "status" : "alert"}
          className={cn(
            "mb-4 flex items-start gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
            banner.ok ? "bg-success/10 text-success" : "bg-warning/10 text-warning-foreground"
          )}
        >
          {banner.ok && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          {banner.text}
        </p>
      )}

      {bulkResult && (
        <p role="status" className="mb-4 flex items-start gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-sm font-medium text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {bulkResult}
        </p>
      )}

      <Tabs defaultValue="parents">
        <TabsList>
          <TabsTrigger value="parents" className="gap-1.5">
            <UsersIcon className="h-4 w-4" /> Parents
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5">
            <GraduationCap className="h-4 w-4" /> Students
          </TabsTrigger>
          <TabsTrigger value="teachers" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Teachers
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5">
            <UserCog className="h-4 w-4" /> Admission &amp; Sub-admins
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parents">
          <DataTable
            data={parents}
            columns={userColumns}
            rowKey={(row) => row.id}
            searchPlaceholder="Search parents by name or email…"
            onRowClick={(row) => setDetailUser(row)}
            selectable
            selectedKeys={selectedParentIds}
            onSelectionChange={setSelectedParentIds}
            bulkActions={
              <Button size="sm" className="h-7 px-2 text-xs" disabled={bulkSending} onClick={() => setBulkConfirmIds([...selectedParentIds])}>
                <Mail className="h-3 w-3" /> Resend credentials
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="students">
          <DataTable
            data={students}
            columns={studentColumns}
            rowKey={(row) => row.id}
            searchPlaceholder="Search students by name…"
            onRowClick={(row) => setDetailChild(row)}
          />
        </TabsContent>

        <TabsContent value="teachers">
          <DataTable
            data={teachers}
            columns={userColumns}
            rowKey={(row) => row.id}
            searchPlaceholder="Search teachers by name or email…"
            onRowClick={(row) => setDetailUser(row)}
            selectable
            selectedKeys={selectedTeacherIds}
            onSelectionChange={setSelectedTeacherIds}
            bulkActions={
              <Button size="sm" className="h-7 px-2 text-xs" disabled={bulkSending} onClick={() => setBulkConfirmIds([...selectedTeacherIds])}>
                <Mail className="h-3 w-3" /> Resend credentials
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="staff">
          <DataTable
            data={staff}
            columns={staffColumns}
            rowKey={(row) => row.id}
            searchPlaceholder="Search staff by name…"
            onRowClick={(row) => setDetailUser(row)}
          />
        </TabsContent>
      </Tabs>

      {/* User detail dialog */}
      <Dialog open={!!detailUser} onOpenChange={(open) => !open && setDetailUser(null)}>
        <DialogContent>
          {detailUser && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <UserAvatar name={detailUser.name} color={detailUser.avatarColor} />
                  <div>
                    <DialogTitle>{detailUser.name}</DialogTitle>
                    <DialogDescription>{detailUser.email}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</p>
                  <p className="mt-1 font-medium text-foreground">{detailUser.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</p>
                  <p className="mt-1 font-medium capitalize text-foreground">{detailUser.role}</p>
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

              {/* Onboarding: (re)send the welcome message + a fresh temporary PIN.
                  Each button appears only when its channel is switched on in Settings → Integrations. */}
              <div className="mt-2 rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">Onboarding &amp; access</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Send this {detailUser.role === "parent" ? "parent" : "user"} their login and a new temporary PIN so they can sign in
                  {detailUser.role === "parent" ? " and enrol their child." : "."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {channels.email && (
                    <Button size="sm" onClick={() => handleResend("Email")} disabled={sending !== null}>
                      {sending === "Email" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                      Send Welcome Email
                    </Button>
                  )}
                  {channels.whatsApp && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResend("WhatsApp")}
                      disabled={sending !== null || detailUser.phone === "—" || !detailUser.phone}
                      title={detailUser.phone === "—" || !detailUser.phone ? "No phone number on file" : undefined}
                    >
                      {sending === "WhatsApp" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                      Send WhatsApp
                    </Button>
                  )}
                  {channels.sms && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResend("Sms")}
                      disabled={sending !== null || detailUser.phone === "—" || !detailUser.phone}
                      title={detailUser.phone === "—" || !detailUser.phone ? "No phone number on file" : undefined}
                    >
                      {sending === "Sms" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                      Send SMS
                    </Button>
                  )}
                  {/* Doesn't depend on a delivery channel being configured — generates a new
                      PIN and shows it here for the admin to relay themselves. */}
                  <Button size="sm" variant="outline" onClick={handleResetPin} disabled={resettingPin}>
                    {resettingPin ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                    Reset PIN
                  </Button>
                </div>
                {!(channels.email || channels.whatsApp || channels.sms) && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    No delivery channel is enabled, so Reset PIN is the only way to issue new access right now —
                    turn on Email, WhatsApp or SMS in Settings &rarr; Integrations to send credentials directly.
                  </p>
                )}
                {pinResult && (
                  pinResult.ok ? (
                    <div className="mt-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5">
                      <p className="text-xs font-medium text-success">
                        New temporary PIN for {detailUser.name} — share it with them yourself:
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="rounded-md bg-card px-2.5 py-1 font-mono text-lg font-bold tracking-[0.3em] text-foreground">
                          {pinResult.pin}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => handleCopyPin(pinResult.pin)}>
                          {pinCopied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {pinCopied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <p className="mt-1.5 text-xs text-success/80">
                        This replaces their old PIN immediately — it won&apos;t work again.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">
                      {pinResult.message}
                    </p>
                  )
                )}
                {sendResult && (
                  <p
                    className={cn(
                      "mt-3 flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
                      sendResult.ok ? "bg-success/10 text-success" : "bg-warning/10 text-warning-foreground"
                    )}
                  >
                    {sendResult.ok && <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                    {sendResult.message}
                  </p>
                )}
              </div>

              <DialogFooter className="sm:justify-between">
                <Button
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(detailUser)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Account
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDetailUser(null)}>
                    Close
                  </Button>
                  <Button onClick={() => openEdit(detailUser)}>Edit Profile</Button>
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
        description={
          deleteTarget
            ? `${deleteTarget.name}'s account will be removed from Reader Nest. This can't be undone from the UI.`
            : undefined
        }
        confirmLabel="Delete Account"
        destructive
        onConfirm={handleDeleteUser}
      />

      <ConfirmDialog
        open={!!bulkConfirmIds}
        onOpenChange={(open) => !open && setBulkConfirmIds(null)}
        title={`Resend credentials to ${bulkConfirmIds?.length ?? 0} user(s)?`}
        description="Each person gets a new temporary PIN and their previous one stops working. Use this for a batch of accounts that all need a credentials reset — not routinely."
        confirmLabel="Send"
        onConfirm={() => {
          if (!bulkConfirmIds) return;
          return handleBulkResend(bulkConfirmIds).then(() => setBulkConfirmIds(null));
        }}
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
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-last">Last name</Label>
                <Input
                  id="edit-last"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
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
            {editUser?.role !== "admin" && (
              <div className="grid gap-1.5">
                <Label htmlFor="edit-role-select">Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger id="edit-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {addUserRoleOptions.map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Changing the account type only works while there&rsquo;s no history behind it yet (e.g. a parent with no
                  children, a teacher with no classes).
                </p>
              </div>
            )}
            {editRole === "teacher" && (
              <div className="grid gap-1.5">
                <Label htmlFor="edit-department-select">Department</Label>
                <Select value={editDepartment} onValueChange={setEditDepartment}>
                  <SelectTrigger id="edit-department-select">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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

      {/* Student detail dialog */}
      <Dialog open={!!detailChild} onOpenChange={(open) => !open && setDetailChild(null)}>
        <DialogContent>
          {detailChild && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <UserAvatar name={detailChild.name} color={detailChild.avatarColor} />
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
                  <p className="mt-1 font-medium text-foreground">{detailChild.attendancePercent}%</p>
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
                  insights. Built server-side but never surfaced anywhere until now. */}
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

              {/* RM special enrolment notes — visible on the profile to whoever is the RM. */}
              <div className="mt-2 flex flex-col gap-1.5">
                <Label htmlFor="rm-notes">Relationship Manager notes</Label>
                <Textarea
                  id="rm-notes"
                  placeholder="e.g. Enrolled during the discount window; services begin after 4 months."
                  value={childNotes}
                  onChange={(e) => setChildNotes(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Shown on this child's profile to the current RM and admins.</p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailChild(null)}>
                  Close
                </Button>
                <Button
                  disabled={savingNotes}
                  onClick={async () => {
                    if (!detailChild) return;
                    // Matches handleUpdateUser/handleCreateUser's pattern elsewhere on this
                    // page: stay clickable in demo mode and say so via the shared banner,
                    // rather than silently greying out with no explanation.
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
                  {savingNotes ? "Saving…" : "Save notes"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add user dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${CHART_PALETTE[4]}1A`, color: CHART_PALETTE[4] }}
            >
              <HeartHandshake className="h-5 w-5" />
            </span>
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
                  {addUserRoleOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {addRole === "teacher" && (
              <div className="grid gap-1.5">
                <Label htmlFor="add-department-select">Department</Label>
                <Select value={addDepartment} onValueChange={setAddDepartment}>
                  <SelectTrigger id="add-department-select">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
