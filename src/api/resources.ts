import { apiFetch, getAccessToken } from "@/lib/api";
import type { Resource } from "@/types";

export type ApiResourceType = "ReadingBook" | "Worksheet" | "Other";

export interface ApiResource {
  id: string;
  title: string;
  type: ApiResourceType;
  mimeType: string | null;
  fileSizeBytes: number | null;
  courseId: string | null;
  batchId: string | null;
  batchName: string | null;
  isDownloadable: boolean;
  description: string | null;
  createdAtUtc: string;
}

const TYPE_FROM_API: Record<ApiResourceType, Resource["type"]> = {
  ReadingBook: "book",
  Worksheet: "worksheet",
  // Recordings live in SessionRecordings; generic uploads render with the recording icon
  Other: "recording",
};

function formatSize(bytes: number | null): string | undefined {
  if (bytes == null) return undefined;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function toFrontendResource(resource: ApiResource): Resource {
  return {
    id: resource.id,
    title: resource.title,
    type: TYPE_FROM_API[resource.type],
    // No per-resource category in the live API — batchName (below) is what's actually
    // real and displayed instead; courseCategory stays undefined here rather than a lie.
    batchId: resource.batchId ?? undefined,
    batchName: resource.batchName ?? undefined,
    uploadedOn: resource.createdAtUtc.slice(0, 10),
    downloadable: resource.isDownloadable,
    // Real visibility is per-parent (ResourceAccess grants), not one flag on the
    // resource — leaving this undefined rather than claiming a value we don't have.
    visibleToParents: undefined,
    sizeLabel: formatSize(resource.fileSizeBytes),
  };
}

export async function listResources(type?: ApiResourceType): Promise<ApiResource[]> {
  const query = type ? `?type=${type}` : "";
  return apiFetch<ApiResource[]>(`/api/resources${query}`);
}

/** Teacher portal: resources tied to the signed-in teacher's own batches. */
export async function listMyResources(type?: ApiResourceType): Promise<ApiResource[]> {
  const query = type ? `?type=${type}` : "";
  return apiFetch<ApiResource[]>(`/api/resources/mine${query}`);
}

/** Teacher portal: upload a resource to one of the teacher's own batches. */
export async function uploadMyResource(
  file: File,
  metadata: { title: string; type: ApiResourceType; batchIds: string[]; isDownloadable?: boolean; description?: string }
): Promise<ApiResource> {
  const form = new FormData();
  form.set("file", file);
  form.set("Title", metadata.title);
  form.set("Type", metadata.type);
  // Multi-batch visibility: the teacher chooses which batch(es) see the material.
  metadata.batchIds.forEach((id) => form.append("BatchIds", id));
  if (metadata.batchIds[0]) form.set("BatchId", metadata.batchIds[0]);
  form.set("IsDownloadable", String(metadata.isDownloadable ?? false));
  if (metadata.description) form.set("Description", metadata.description);
  return apiFetch<ApiResource>("/api/resources/mine", { method: "POST", body: form });
}

/** Teacher portal: download a resource the teacher owns. */
export async function downloadMyResource(id: string, fallbackName: string): Promise<void> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const token = getAccessToken();
  const response = await fetch(`${baseUrl}/api/resources/${id}/mine/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fallbackName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function uploadResource(
  file: File,
  metadata: {
    title: string;
    type: ApiResourceType;
    courseId?: string;
    batchId?: string;
    isDownloadable?: boolean;
    description?: string;
  }
): Promise<ApiResource> {
  const form = new FormData();
  form.set("file", file);
  form.set("Title", metadata.title);
  form.set("Type", metadata.type);
  if (metadata.courseId) form.set("CourseId", metadata.courseId);
  if (metadata.batchId) form.set("BatchId", metadata.batchId);
  form.set("IsDownloadable", String(metadata.isDownloadable ?? false));
  if (metadata.description) form.set("Description", metadata.description);
  return apiFetch<ApiResource>("/api/resources", { method: "POST", body: form });
}

/** Fetches the file with the bearer token (a plain <a href> cannot carry it) and saves it. */
export async function downloadResource(id: string, fallbackName: string): Promise<void> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const token = getAccessToken();
  const response = await fetch(`${baseUrl}/api/resources/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fallbackName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Admin console: toggle whether a resource is downloadable (books stay view-only server-side regardless). */
export async function updateResource(id: string, isDownloadable: boolean): Promise<ApiResource> {
  return apiFetch<ApiResource>(`/api/resources/${id}`, {
    method: "PUT",
    body: JSON.stringify({ isDownloadable }),
  });
}

export async function grantResourceAccess(
  id: string,
  parentProfileIds: string[],
  visibleOnDashboard = true
): Promise<void> {
  await apiFetch<void>(`/api/resources/${id}/grants`, {
    method: "POST",
    body: JSON.stringify({ parentProfileIds, visibleOnDashboard }),
  });
}
