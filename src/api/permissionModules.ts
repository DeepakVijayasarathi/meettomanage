import { apiFetch } from "@/lib/api";

export interface ApiPermissionModule {
  id: string;
  key: string;
  label: string;
  description: string | null;
  isSystem: boolean;
  sortOrder: number;
}

export interface SavePermissionModuleRequest {
  key: string;
  label: string;
  description?: string | null;
}

export async function listPermissionModules(): Promise<ApiPermissionModule[]> {
  return apiFetch<ApiPermissionModule[]>("/api/permission-modules");
}

export async function createPermissionModule(request: SavePermissionModuleRequest): Promise<ApiPermissionModule> {
  return apiFetch<ApiPermissionModule>("/api/permission-modules", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function deletePermissionModule(id: string): Promise<void> {
  await apiFetch<void>(`/api/permission-modules/${id}`, { method: "DELETE" });
}
