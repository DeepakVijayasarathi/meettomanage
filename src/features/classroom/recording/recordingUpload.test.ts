import { describe, expect, it, vi } from "vitest";
import { RecordingUploader, TARGET_PART_BYTES, type RecordingUploadApi } from "./recordingUpload";

const MB = 1024 * 1024;

function fakeApi(overrides: Partial<RecordingUploadApi> = {}) {
  const puts: { partNumber: number; size: number }[] = [];
  const api: RecordingUploadApi & { puts: typeof puts; completed: unknown[]; aborted: number } = {
    puts,
    completed: [],
    aborted: 0,
    start: vi.fn(async () => ({ key: "k.mp4", uploadId: "u1", partSizeBytes: 64 * MB })),
    partUrl: vi.fn(async (_k, _u, n) => `https://store/part-${n}`),
    putPart: vi.fn(async (url: string, blob: Blob) => {
      puts.push({ partNumber: Number(url.split("-").pop()), size: blob.size });
      return `"etag-${url.split("-").pop()}"`;
    }),
    complete: vi.fn(async (_k, _u, parts, seconds) => {
      api.completed.push({ parts, seconds });
    }),
    abort: vi.fn(async () => {
      api.aborted++;
    }),
    ...overrides,
  };
  return api;
}

const chunk = (bytes: number) => new Blob([new Uint8Array(bytes)]);
const noSleep = () => Promise.resolve();

describe("RecordingUploader", () => {
  it("uploads 8 MB parts while recording, then the remainder, and joins them in order", async () => {
    const api = fakeApi();
    const up = new RecordingUploader(api, "video/mp4", {}, noSleep);
    await up.begin();
    for (let i = 0; i < 6; i++) up.push(chunk(3 * MB)); // 18 MB
    expect(await up.finish(3600)).toBe(true);
    expect(api.puts.map((p) => p.size)).toEqual([TARGET_PART_BYTES, TARGET_PART_BYTES, 18 * MB - 2 * TARGET_PART_BYTES]);
    expect(api.completed).toEqual([
      { parts: [{ partNumber: 1, eTag: '"etag-1"' }, { partNumber: 2, eTag: '"etag-2"' }, { partNumber: 3, eTag: '"etag-3"' }], seconds: 3600 },
    ]);
  });

  it("retries a failed part before giving up", async () => {
    let fails = 2;
    const api = fakeApi();
    const realPut = api.putPart;
    api.putPart = vi.fn(async (url: string, blob: Blob) => {
      if (fails-- > 0) throw new Error("network");
      return realPut(url, blob);
    });
    const up = new RecordingUploader(api, "video/mp4", {}, noSleep);
    await up.begin();
    up.push(chunk(9 * MB));
    expect(await up.finish(10)).toBe(true);
    expect(api.putPart).toHaveBeenCalledTimes(4); // part 1: two failures + success; part 2: success
  });

  it("reports a part that keeps failing, and finish then throws", async () => {
    const onFailure = vi.fn();
    const api = fakeApi({ putPart: vi.fn(async () => { throw new Error("storage down"); }) });
    const up = new RecordingUploader(api, "video/mp4", { onFailure }, noSleep);
    await up.begin();
    up.push(chunk(8 * MB));
    await expect(up.finish(5)).rejects.toThrow("storage down");
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(api.complete).not.toHaveBeenCalled();
  });

  it("discards an empty recording instead of saving nothing", async () => {
    const api = fakeApi();
    const up = new RecordingUploader(api, "video/webm", {}, noSleep);
    await up.begin();
    expect(await up.finish(0)).toBe(false);
    expect(api.aborted).toBe(1);
    expect(api.complete).not.toHaveBeenCalled();
  });

  it("never uses parts bigger than the server allows or below storage's 5 MB minimum", async () => {
    const api = fakeApi({ start: vi.fn(async () => ({ key: "k", uploadId: "u", partSizeBytes: 1 * MB })) });
    const up = new RecordingUploader(api, "video/mp4", {}, noSleep);
    await up.begin();
    up.push(chunk(11 * MB));
    await up.finish(1);
    expect(api.puts[0].size).toBe(5 * MB);
  });
});
