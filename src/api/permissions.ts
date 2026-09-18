import { apiFetch } from "@/lib/api";

/**
 * Demo-mode-only fallback (no backend to fetch the real catalog from). In API mode the
 * module list is entirely DB-driven — see api/permissionModules.ts's listPermissionModules()
 * — since an Admin can define custom modules beyond these 12 built-ins from the UI.
 */
export const DEMO_PERMISSION_MODULES = [
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
  { value: "ClassSessionLogs", label: "Class Session Logs" },
] as const;

/** A module's key — a built-in enum name or an Admin-defined custom module's Key. Not a
 *  fixed union: the real catalog is fetched at runtime (see listPermissionModules()). */
export type PermissionModuleName = string;

export interface PermissionModuleOption {
  value: PermissionModuleName;
  label: string;
}

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

/** Every module, every action false — a fresh, no-grant starting point. */
export function emptyPermissions(modules: readonly PermissionModuleOption[]): ApiPermission[] {
  return modules.map((m) => ({
    module: m.value,
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canApprove: false,
  }));
}

/** Aligns a role/user's sparse permission rows onto the full module list for editing. */
export function expandPermissions(permissions: ApiPermission[], modules: readonly PermissionModuleOption[]): ApiPermission[] {
  return modules.map((m) => {
    const grant = permissions.find((p) => p.module === m.value);
    return grant ? { ...grant } : { module: m.value, canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false };
  });
}
