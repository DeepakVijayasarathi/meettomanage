import { apiFetch } from "@/lib/api";

/**
 * Business departments (Phonics, Maths, and any admin-added ones) — used to be a fixed
 * "Phonics" | "Maths" string union baked into the frontend to match the backend's old
 * 2-value enum. The backend now exposes a real, admin-managed departments table
 * (GET/POST/PUT /api/departments); this file is the one place that talks to it.
 */
export interface ApiDepartment {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export async function listDepartments(includeInactive = true): Promise<ApiDepartment[]> {
  return apiFetch<ApiDepartment[]>(`/api/departments?includeInactive=${includeInactive}`);
}

export async function createDepartment(input: {
  name: string;
  description?: string;
  isActive?: boolean;
}): Promise<ApiDepartment> {
  return apiFetch<ApiDepartment>("/api/departments", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
    }),
  });
}

export async function updateDepartment(
  id: string,
  input: { name: string; description?: string; isActive: boolean }
): Promise<ApiDepartment> {
  return apiFetch<ApiDepartment>(`/api/departments/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: input.name,
      description: input.description ?? null,
      isActive: input.isActive,
    }),
  });
}
