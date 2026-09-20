import { apiFetch } from "@/lib/api";
import type { ApiResource } from "@/api/resources";

export interface ApiResourceFolder {
  id: string;
  name: string;
  description: string | null;
  parentFolderId: string | null;
  /** Files directly in this folder (not counting subfolders). */
  fileCount: number;
  subfolderCount: number;
  /** Parents this folder is shared with directly. */
  sharedParentCount: number;
  createdAtUtc: string;
}

export interface ApiFolderAccess {
  parentProfileId: string;
  parentName: string;
  parentEmail: string;
  childNames: string;
  sharedAtUtc: string;
}

export const listResourceFolders = () => apiFetch<ApiResourceFolder[]>("/api/resource-folders");

export const createResourceFolder = (name: string, parentFolderId: string | null, description?: string) =>
  apiFetch<ApiResourceFolder>("/api/resource-folders", {
    method: "POST",
    body: JSON.stringify({ name, parentFolderId, description: description || null }),
  });

/** Rename and/or move (parentFolderId null = top level). */
export const updateResourceFolder = (id: string, name: string, parentFolderId: string | null, description?: string | null) =>
  apiFetch<ApiResourceFolder>(`/api/resource-folders/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name, parentFolderId, description: description ?? null }),
  });

export const deleteResourceFolder = (id: string) => apiFetch<void>(`/api/resource-folders/${id}`, { method: "DELETE" });

export const listFolderAccess = (id: string) => apiFetch<ApiFolderAccess[]>(`/api/resource-folders/${id}/access`);

/** Shares with / unshares from any number of parents in one call; returns who has access afterwards. */
export const setFolderAccess = (id: string, addParentProfileIds: string[], removeParentProfileIds: string[]) =>
  apiFetch<ApiFolderAccess[]>(`/api/resource-folders/${id}/access`, {
    method: "PUT",
    body: JSON.stringify({ addParentProfileIds, removeParentProfileIds }),
  });

/** Moves a file into a folder (null = top level). */
export const moveResource = (resourceId: string, folderId: string | null) =>
  apiFetch<ApiResource>(`/api/resources/${resourceId}/move`, { method: "POST", body: JSON.stringify({ folderId }) });
