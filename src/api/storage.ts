import { apiFetch } from "@/lib/api";

/** Progress of copying every uploaded file between S3 and the server's own disk. */
export interface ApiStorageSync {
  /** "local" = S3 → server disk, "s3" = server disk → S3. */
  to: "local" | "s3";
  running: boolean;
  total: number;
  copied: number;
  skipped: number;
  failed: number;
  copiedBytes: number;
  startedAtUtc: string | null;
  finishedAtUtc: string | null;
  error: string | null;
  failedFiles: string[];
}

export interface ApiStorageStatus {
  /** Where uploads are stored and read from right now. */
  provider: "S3" | "Local";
  s3Configured: boolean;
  localPath: string;
  localFileCount: number;
  localBytes: number;
  sync: ApiStorageSync | null;
}

export async function getStorageStatus(): Promise<ApiStorageStatus> {
  return apiFetch<ApiStorageStatus>("/api/storage/status");
}

export async function startStorageSync(to: "local" | "s3"): Promise<ApiStorageSync> {
  return apiFetch<ApiStorageSync>("/api/storage/sync", { method: "POST", body: JSON.stringify({ to }) });
}
