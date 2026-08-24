import { apiFetch } from "@/lib/api";

/** Backend PermissionModule enum names with display labels. */
export const PERMISSION_MODULES = [
  { value: "UserManagement", label: "User Management" },
  { value: "CourseBatchManagement", label: "Courses & Batches" },
  { value: "SessionCalendarManagement", label: "Sessions & Calendar" },
  { value: "ContentAccessManagement", label: "Content & Resources" },
  { value: "BillingFinance", label: "Billing & Finance" },
  { value: "Payouts", label: "Payouts" },
  { value: "ReportsAnalytics", label: "Reports & Analytics" },
  { value: "Admission", label: "Admission" },
  { value: "LeaveManagement", label: "Leave Management" },
  { value: "Communication", label: "Communication" },
  { value: "Settings", label: "Settings" },
  { value: "SystemMonitoring", label: "Server Monitoring" },
] as const;

export type PermissionModuleName = (typeof PERMISSION_MODULES)[number]["value"];

/** Backend PermissionAction enum names, in claim-string form ("Module:Action"). */
export const PERMISSION_ACTIONS_LABELS = ["View", "Create", "Edit", "Delete", "Approve"] as const;

export interface ApiPermission {
  module: PermissionModuleName;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export async function getPermissions(userId: string): Promise<ApiPermission[]> {
  return apiFetch<ApiPermission[]>(`/api/users/${userId}/permissions`);
}

export async function setPermissions(userId: string, permissions: ApiPermission[]): Promise<void> {
  await apiFetch<void>(`/api/users/${userId}/permissions`, {
    method: "PUT",
    body: JSON.stringify(permissions),
  });
}

/** All 11 modules, every action false — a fresh, no-grant starting point. */
export function emptyPermissions(): ApiPermission[] {
  return PERMISSION_MODULES.map((m) => ({
    module: m.value,
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canApprove: false,
  }));
}

/** Aligns a role/user's sparse permission rows onto the full module list for editing. */
export function expandPermissions(permissions: ApiPermission[]): ApiPermission[] {
  return PERMISSION_MODULES.map((m) => {
    const grant = permissions.find((p) => p.module === m.value);
    return grant ? { ...grant } : { module: m.value, canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false };
  });
}
