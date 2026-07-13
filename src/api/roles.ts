import { apiFetch } from "@/lib/api";
import type { ApiPermission } from "@/api/permissions";

export interface ApiRole {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  permissions: ApiPermission[];
}

export interface SaveRoleRequest {
  name: string;
  displayName: string;
  description: string | null;
  permissions: ApiPermission[];
}

export async function listRoles(): Promise<ApiRole[]> {
  return apiFetch<ApiRole[]>("/api/roles");
}

export async function createRole(request: SaveRoleRequest): Promise<ApiRole> {
  return apiFetch<ApiRole>("/api/roles", { method: "POST", body: JSON.stringify(request) });
}

export async function updateRole(id: string, request: SaveRoleRequest): Promise<ApiRole> {
  return apiFetch<ApiRole>(`/api/roles/${id}`, { method: "PUT", body: JSON.stringify(request) });
}

export async function deleteRole(id: string): Promise<void> {
  await apiFetch<void>(`/api/roles/${id}`, { method: "DELETE" });
}

/** Replaces a Sub Admin's grants with the named role's matrix. */
export async function applyRoleToUser(userId: string, roleName: string): Promise<void> {
  await apiFetch<void>(`/api/users/${userId}/permissions/preset/${encodeURIComponent(roleName)}`, {
    method: "PUT",
  });
}
