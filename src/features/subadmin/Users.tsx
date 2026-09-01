import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserStatusBadge } from "@/components/StatusBadge";
import { useApiData } from "@/api/hooks";
import { apiEnabled } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { listUsers, toAppUser } from "@/api/users";
import { PARENTS, TEACHERS, ADMISSION_TEAM, SUB_ADMINS } from "@/data/users";
import type { AppUser } from "@/types";

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

export default function SubAdminUsers() {
  const { data: users, error, reload } = useApiData(
    () => listUsers({ pageSize: 200 }).then((r) => r.items.map(toAppUser)),
    DEMO_USERS
  );

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
        description="Read-only directory of parents, students' guardians, teachers and staff — reach out to Admin to change an account."
      />

      {apiEnabled() && error && (
        <InlineAlert variant="warning" className="mb-4">
          Could not reach the API ({error}) — showing demo data.
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
      />
    </div>
  );
}
