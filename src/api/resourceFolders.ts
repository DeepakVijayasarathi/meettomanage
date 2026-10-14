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
  /** Batches this folder is shared with directly (every enrolled parent in them sees it). */
  sharedBatchCount: number;
  createdAtUtc: string;
}

export interface ApiFolderAccess {
  parentProfileId: string;
  parentName: string;
  parentEmail: string;
  childNames: string;
  sharedAtUtc: string;
}

export interface ApiFolderBatchAccess {
  batchId: string;
  batchName: string;
  courseName: string | null;
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

export const listFolderBatchAccess = (id: string) => apiFetch<ApiFolderBatchAccess[]>(`/api/resource-folders/${id}/batch-access`);

/** Shares with / unshares from any number of batches in one call; returns which batches have access afterwards. */
export const setFolderBatchAccess = (id: string, addBatchIds: string[], removeBatchIds: string[]) =>
  apiFetch<ApiFolderBatchAccess[]>(`/api/resource-folders/${id}/batch-access`, {
    method: "PUT",
    body: JSON.stringify({ addBatchIds, removeBatchIds }),
  });

/** Moves a file into a folder (null = top level). */
export const moveResource = (resourceId: string, folderId: string | null) =>
  apiFetch<ApiResource>(`/api/resources/${resourceId}/move`, { method: "POST", body: JSON.stringify({ folderId }) });
