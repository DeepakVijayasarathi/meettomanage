/**
 * Streams a recording to object storage while it is still being recorded: the recorder's chunks
 * are collected into parts and each part is PUT straight to storage (multipart upload through
 * short-lived presigned URLs), so only a few seconds of video are ever waiting in the browser and
 * the end of class only has to send the last small part.
 */

export interface RecordingUploadApi {
  start(contentType: string): Promise<{ key: string; uploadId: string; partSizeBytes: number }>;
  partUrl(key: string, uploadId: string, partNumber: number): Promise<string>;
  putPart(url: string, blob: Blob): Promise<string>;
  complete(key: string, uploadId: string, parts: { partNumber: number; eTag: string }[], durationSeconds: number): Promise<void>;
  abort(key: string, uploadId: string): Promise<void>;
}

export interface UploadProgress {
  uploadedBytes: number;
  /** Recorded but not yet stored. */
  pendingBytes: number;
  parts: number;
}

/** Storage's minimum part size is 5 MB; 8 MB keeps the unsent tail small (about a minute of class). */
export const TARGET_PART_BYTES = 8 * 1024 * 1024;
const RETRY_DELAYS_MS = [2000, 5000, 10000, 20000];

export class RecordingUploader {
  private key = "";
  private uploadId = "";
  private partSize = TARGET_PART_BYTES;
  private pending: Blob[] = [];
  private pendingBytes = 0;
  private inFlightBytes = 0;
  private uploadedBytes = 0;
  private nextPart = 1;
  private parts: { partNumber: number; eTag: string }[] = [];
  private queue: Promise<void> = Promise.resolve();
  private failure: Error | null = null;
  private closed = false;

  constructor(
    private api: RecordingUploadApi,
    private contentType: string,
    private hooks: { onProgress?: (p: UploadProgress) => void; onFailure?: (err: Error) => void } = {},
    private sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))
  ) {}

  async begin() {
    const started = await this.api.start(this.contentType);
    this.key = started.key;
    this.uploadId = started.uploadId;
    // Never larger than the server's agreed part size; never below storage's 5 MB minimum.
    this.partSize = Math.max(5 * 1024 * 1024, Math.min(started.partSizeBytes || TARGET_PART_BYTES, TARGET_PART_BYTES));
  }

  get failed() {
    return this.failure;
  }

  push(chunk: Blob) {
    if (this.closed || this.failure || chunk.size === 0) return;
    this.pending.push(chunk);
    this.pendingBytes += chunk.size;
    while (this.pendingBytes >= this.partSize) {
      const all = new Blob(this.pending);
      this.enqueue(all.slice(0, this.partSize));
      const rest = all.slice(this.partSize);
      this.pending = rest.size ? [rest] : [];
      this.pendingBytes = rest.size;
    }
    this.report();
  }

  /** Sends what's left and joins the parts into the finished file. Returns false if nothing was recorded. */
  async finish(durationSeconds: number): Promise<boolean> {
    this.closed = true;
    if (this.pendingBytes > 0) {
      this.enqueue(new Blob(this.pending));
      this.pending = [];
      this.pendingBytes = 0;
    }
    await this.queue;
    if (this.failure) throw this.failure;
    if (this.parts.length === 0) {
      await this.abort();
      return false;
    }
    await this.api.complete(this.key, this.uploadId, [...this.parts].sort((a, b) => a.partNumber - b.partNumber), Math.max(0, Math.round(durationSeconds)));
    return true;
  }

  async abort() {
    this.closed = true;
    this.pending = [];
    if (this.key) await this.api.abort(this.key, this.uploadId).catch(() => undefined);
  }

  progress(): UploadProgress {
    return { uploadedBytes: this.uploadedBytes, pendingBytes: this.pendingBytes + this.inFlightBytes, parts: this.parts.length };
  }

  private report() {
    this.hooks.onProgress?.(this.progress());
  }

  private enqueue(blob: Blob) {
    const partNumber = this.nextPart++;
    this.inFlightBytes += blob.size;
    this.queue = this.queue.then(async () => {
      if (this.failure) return;
      for (let attempt = 0; ; attempt++) {
        try {
          const url = await this.api.partUrl(this.key, this.uploadId, partNumber);
          const eTag = await this.api.putPart(url, blob);
          this.parts.push({ partNumber, eTag });
          this.uploadedBytes += blob.size;
          break;
        } catch (err) {
          if (attempt >= RETRY_DELAYS_MS.length) {
            this.failure = err instanceof Error ? err : new Error("The recording upload failed.");
            this.hooks.onFailure?.(this.failure);
            break;
          }
          await this.sleep(RETRY_DELAYS_MS[attempt]);
        }
      }
      this.inFlightBytes -= blob.size;
      this.report();
    });
  }
}
