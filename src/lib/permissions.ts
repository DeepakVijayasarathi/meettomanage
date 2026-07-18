import type { Role } from "@/types";
import type { PermissionModuleName } from "@/api/permissions";

export type PermissionAction = "View" | "Create" | "Edit" | "Delete" | "Approve";

/**
 * Mirrors PermissionAuthorizationHandler on the backend: Admin holds every permission
 * implicitly (the login response never carries Admin's claims, same as the JWT), every
 * other role is checked against its "Module:Action" claim strings from login/`/api/auth/me`.
 */
export function checkPermission(
  role: Role | null,
  permissions: string[],
  module: PermissionModuleName,
  action: PermissionAction
): boolean {
  if (role === "admin") return true;
  return permissions.includes(`${module}:${action}`);
}
