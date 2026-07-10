import { useMemo, useState } from "react";
import { GraduationCap, HeartHandshake, Plus, ShieldCheck, UserCog, Users as UsersIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { UserStatusBadge, FeeStatusBadge } from "@/components/StatusBadge";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { PARENTS, TEACHERS, ADMISSION_TEAM, SUB_ADMINS, getParentById } from "@/data/users";
import { CHILDREN } from "@/data/children";
import { getCourseById } from "@/data/courses";
import type { AppUser, Child } from "@/types";
import { formatDate, getInitials } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { createUser, listUsers, toAppUser } from "@/api/users";
import type { ApiRole } from "@/api/types";

function UserAvatar({ name, color }: { name: string; color: string }) {
  return (
    <Avatar className="h-9 w-9">
      <AvatarFallback style={{ backgroundColor: `${color}22`, color }}>{getInitials(name)}</AvatarFallback>
    </Avatar>
  );
}

const ADD_ROLE_TO_API: Record<string, ApiRole> = {
  parent: "Parent",
  teacher: "Teacher",
  admission: "AdmissionTeam",
  subadmin: "SubAdmin",
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

  const [detailUser, setDetailUser] = useState<AppUser | null>(null);
  const [detailChild, setDetailChild] = useState<Child | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addRole, setAddRole] = useState("parent");
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);

  async function handleCreateUser() {
    if (!apiEnabled()) {
      setAddOpen(false);
      return;
    }

    const [firstName, ...rest] = addName.trim().split(/\s+/);
    if (!firstName || !addEmail.trim()) {
      setAddError("Name and email are required.");
      return;
    }

    setAddSubmitting(true);
    setAddError(null);
    try {
      await createUser({
        email: addEmail.trim(),
        firstName,
        lastName: rest.join(" ") || firstName,
        phone: addPhone.trim() || undefined,
        role: ADD_ROLE_TO_API[addRole],
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
          <div className="flex items-center gap-3">
            <UserAvatar name={row.name} color={row.avatarColor} />
            <div>
              <p className="font-semibold text-foreground">{row.name}</p>
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

  const studentColumns: DataTableColumn<Child>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Student",
        sortable: true,
        accessor: (row) => row.name,
        render: (row) => (
          <div className="flex items-center gap-3">
            <UserAvatar name={row.name} color={row.avatarColor} />
            <div>
              <p className="font-semibold text-foreground">{row.name}</p>
              <p className="text-xs text-muted-foreground">
                {row.grade} · Age {row.age}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "parent",
        header: "Parent",
        accessor: (row) => getParentById(row.parentId)?.name ?? "",
        render: (row) => <span className="text-sm">{getParentById(row.parentId)?.name ?? "—"}</span>,
      },
      {
        key: "course",
        header: "Course",
        render: (row) => <span className="text-sm text-muted-foreground">{getCourseById(row.courseId)?.name ?? "—"}</span>,
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
        render: (row) => (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold capitalize text-foreground/80">
            {row.role === "admission" ? "Admission Team" : "Sub Admin"}
          </span>
        ),
      },
      { ...userColumns[3] },
      { ...userColumns[4] },
    ],
    [userColumns]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Directory"
        title="Users"
        description="Manage parents, students, teachers, admission team and sub-admins across the platform."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        }
      />

      {apiEnabled() && parentsError && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          Could not reach the API ({parentsError}) — showing demo data.
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
          />
        </TabsContent>

        <TabsContent value="students">
          <DataTable
            data={CHILDREN}
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
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailUser(null)}>
                  Close
                </Button>
                <Button>Edit Profile</Button>
              </DialogFooter>
            </>
          )}
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
                      {detailChild.grade} · Age {detailChild.age}
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
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailChild(null)}>
                  Close
                </Button>
                <Button>Edit Profile</Button>
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
              <Label>Role</Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admission">Admission Team</SelectItem>
                  <SelectItem value="subadmin">Sub Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {addError && <p className="text-sm font-medium text-red-600">{addError}</p>}
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
