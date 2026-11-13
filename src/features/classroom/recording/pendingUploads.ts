/**
 * Crash safety for browser recordings. While a class records, the upload's id and the parts
 * already stored are kept in this browser; if the tab crashes, the laptop dies or the teacher
 * closes the window, the next visit to the app joins those parts into the recording instead of
 * losing the whole class. (At most the last unsent part, about a minute, is missing.)
 */

const STORAGE_KEY = "trn.pendingRecordings";
/** A record not refreshed for this long belongs to a recording that is no longer running. */
const STALE_AFTER_MS = 2 * 60 * 1000;
/** Storage may have discarded an upload this old; stop trying. */
const GIVE_UP_AFTER_MS = 6 * 24 * 60 * 60 * 1000;

export interface PendingRecording {
  sessionId: string;
  key: string;
  uploadId: string;
  parts: { partNumber: number; eTag: string }[];
  startedAt: number;
  updatedAt: number;
}

function read(): PendingRecording[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as PendingRecording[]).filter((r) => r && typeof r.key === "string" && Array.isArray(r.parts)) : [];
  } catch {
    return [];
  }
}

function write(list: PendingRecording[]) {
  try {
    if (list.length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage full or blocked: recovery just isn't available */
  }
}

export function savePendingRecording(rec: PendingRecording) {
  write([...read().filter((r) => r.key !== rec.key), rec]);
}

/** Marks a running recording as alive (called on a timer while it records). */
export function touchPendingRecording(key: string, now = Date.now()) {
  const list = read();
  const rec = list.find((r) => r.key === key);
  if (!rec) return;
  rec.updatedAt = now;
  write(list);
}

export function removePendingRecording(key: string) {
  write(read().filter((r) => r.key !== key));
}

export function listPendingRecordings() {
  return read();
}

export interface RecoveryApi {
  complete(sessionId: string, key: string, uploadId: string, parts: { partNumber: number; eTag: string }[], durationSeconds: number): Promise<unknown>;
  abort(sessionId: string, key: string, uploadId: string): Promise<unknown>;
}

let recovering = false;

/**
 * Finishes recordings whose recorder stopped without saving. Returns how many were saved.
 * Skips anything still being refreshed (a recording running in another tab).
 */
export async function recoverInterruptedRecordings(api: RecoveryApi, now = Date.now()): Promise<number> {
  if (recovering) return 0;
  recovering = true;
  let saved = 0;
  try {
    for (const rec of read()) {
      if (now - rec.updatedAt < STALE_AFTER_MS) continue;
      if (now - rec.updatedAt > GIVE_UP_AFTER_MS) {
        removePendingRecording(rec.key);
        continue;
      }
      try {
        if (rec.parts.length > 0) {
          const parts = [...rec.parts].sort((a, b) => a.partNumber - b.partNumber);
          await api.complete(rec.sessionId, rec.key, rec.uploadId, parts, Math.max(0, Math.round((rec.updatedAt - rec.startedAt) / 1000)));
          saved++;
        } else {
          await api.abort(rec.sessionId, rec.key, rec.uploadId);
        }
        removePendingRecording(rec.key);
      } catch (err) {
        // The server answered "no" (already saved, upload expired, not allowed): nothing more to do.
        // A network error keeps the record for the next visit.
        const status = (err as { status?: number })?.status;
        if (typeof status === "number" && status >= 400 && status < 500) removePendingRecording(rec.key);
      }
    }
  } finally {
    recovering = false;
  }
  return saved;
}
