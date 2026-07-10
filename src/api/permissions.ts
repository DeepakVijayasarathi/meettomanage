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
] as const;

export type PermissionModuleName = (typeof PERMISSION_MODULES)[number]["value"];

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
