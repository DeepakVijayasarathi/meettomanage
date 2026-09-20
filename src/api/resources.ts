import { ApiError, apiFetch, getAccessToken, readProblemMessage } from "@/lib/api";
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
  folderId: string | null;
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
    courseId: resource.courseId ?? undefined,
    folderId: resource.folderId ?? undefined,
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
  if (!response.ok) throw new ApiError(response.status, await readProblemMessage(response));

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
    folderId?: string;
    isDownloadable?: boolean;
    description?: string;
  }
): Promise<ApiResource> {
  const form = new FormData();
  form.set("file", file);
  form.set("Title", metadata.title);
  form.set("Type", metadata.type);
  if (metadata.folderId) form.set("FolderId", metadata.folderId);
  if (metadata.courseId) form.set("CourseId", metadata.courseId);
  if (metadata.batchId) form.set("BatchId", metadata.batchId);
  form.set("IsDownloadable", String(metadata.isDownloadable ?? false));
  if (metadata.description) form.set("Description", metadata.description);
  return apiFetch<ApiResource>("/api/resources", { method: "POST", body: form });
}

/** Files above this go straight from the browser to storage in parts instead of through the API (which caps uploads at 100 MB). */
export const LARGE_UPLOAD_THRESHOLD_BYTES = 90 * 1024 * 1024;

export const needsLargeUpload = (file: File) => file.size > LARGE_UPLOAD_THRESHOLD_BYTES;

interface StartedLargeUpload {
  key: string;
  uploadId: string;
  partSizeBytes: number;
  totalParts: number;
}

const PART_URL_BATCH = 20;
const PARALLEL_PARTS = 3;
const PART_ATTEMPTS = 3;

/** PUTs one part to its presigned URL (XHR, not fetch, for upload progress) and returns the ETag storage assigns it. */
function putPart(url: string, blob: Blob, onLoaded: (loadedBytes: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => onLoaded(e.loaded);
    xhr.onerror = () => reject(new Error("The upload connection failed."));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Storage rejected part of the upload (HTTP ${xhr.status}).`));
        return;
      }
      const eTag = xhr.getResponseHeader("ETag");
      if (!eTag) {
        // Uploaded fine, but the browser isn't allowed to read the ETag back -- a bucket CORS setting.
        reject(new Error("Storage isn't set up to accept uploads from this site yet (CORS must expose the ETag header)."));
        return;
      }
      resolve(eTag);
    };
    xhr.send(blob);
  });
}

/**
 * Multi-GB upload: the file is cut into 64 MB parts and each is PUT directly to object storage via a
 * short-lived presigned URL (three at a time, each retried), so nothing large passes through the API.
 * Then the server stitches the parts together and creates the resource. `onProgress` gets 0..1.
 */
export async function uploadLargeResource(
  file: File,
  metadata: {
    title: string;
    type: ApiResourceType;
    courseId?: string;
    batchId?: string;
    folderId?: string;
    isDownloadable?: boolean;
    description?: string;
  },
  onProgress?: (fraction: number) => void
): Promise<ApiResource> {
  const started = await apiFetch<StartedLargeUpload>("/api/resources/uploads", {
    method: "POST",
    body: JSON.stringify({ fileName: file.name, contentType: file.type || null, sizeBytes: file.size }),
  });

  const loadedByPart = new Map<number, number>();
  const report = () => {
    let total = 0;
    loadedByPart.forEach((v) => (total += v));
    onProgress?.(Math.min(1, total / file.size));
  };
  const parts: { partNumber: number; eTag: string }[] = [];

  try {
    for (let first = 1; first <= started.totalParts; first += PART_URL_BATCH) {
      const numbers = Array.from({ length: Math.min(PART_URL_BATCH, started.totalParts - first + 1) }, (_, i) => first + i);
      const urls = await apiFetch<{ partNumber: number; url: string }[]>("/api/resources/uploads/parts", {
        method: "POST",
        body: JSON.stringify({ key: started.key, uploadId: started.uploadId, partNumbers: numbers }),
      });

      const queue = [...urls];
      const worker = async () => {
        for (let next = queue.shift(); next; next = queue.shift()) {
          const begin = (next.partNumber - 1) * started.partSizeBytes;
          const blob = file.slice(begin, Math.min(begin + started.partSizeBytes, file.size));
          let lastError: unknown;
          for (let attempt = 1; attempt <= PART_ATTEMPTS; attempt++) {
            try {
              const eTag = await putPart(next.url, blob, (loaded) => {
                loadedByPart.set(next!.partNumber, loaded);
                report();
              });
              loadedByPart.set(next.partNumber, blob.size);
              report();
              parts.push({ partNumber: next.partNumber, eTag });
              lastError = undefined;
              break;
            } catch (err) {
              lastError = err;
              loadedByPart.set(next.partNumber, 0);
            }
          }
          if (lastError) throw lastError;
        }
      };
      await Promise.all(Array.from({ length: Math.min(PARALLEL_PARTS, urls.length) }, worker));
    }

    return await apiFetch<ApiResource>("/api/resources/uploads/complete", {
      method: "POST",
      body: JSON.stringify({
        ...metadata,
        contentType: file.type || null,
        key: started.key,
        uploadId: started.uploadId,
        parts,
      }),
    });
  } catch (err) {
    // Leave no orphaned parts (which storage would keep billing for).
    await apiFetch<void>("/api/resources/uploads/abort", {
      method: "POST",
      body: JSON.stringify({ key: started.key, uploadId: started.uploadId }),
    }).catch(() => undefined);
    throw err;
  }
}

/** Fetches the file with the bearer token (a plain <a href> cannot carry it) and saves it. */
export async function downloadResource(id: string, fallbackName: string): Promise<void> {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const token = getAccessToken();
  const response = await fetch(`${baseUrl}/api/resources/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) throw new ApiError(response.status, await readProblemMessage(response));

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
