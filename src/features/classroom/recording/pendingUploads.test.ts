import { afterEach, describe, expect, it, vi } from "vitest";
import { listPendingRecordings, recoverInterruptedRecordings, removePendingRecording, savePendingRecording, touchPendingRecording } from "./pendingUploads";

const MIN = 60_000;
const rec = (key: string, parts: number, updatedAt: number) => ({
  sessionId: "s1",
  key,
  uploadId: `u-${key}`,
  parts: Array.from({ length: parts }, (_, i) => ({ partNumber: i + 1, eTag: `e${i + 1}` })),
  startedAt: updatedAt - 30 * MIN,
  updatedAt,
});

describe("interrupted browser recordings", () => {
  afterEach(() => window.localStorage.clear());

  it("saves what was uploaded once the recording has stopped being refreshed", async () => {
    const now = Date.now();
    savePendingRecording(rec("crashed", 3, now - 10 * MIN));
    savePendingRecording(rec("running", 2, now - 10_000)); // still being refreshed (another tab)
    savePendingRecording(rec("nothing", 0, now - 10 * MIN));
    const api = { complete: vi.fn(async () => undefined), abort: vi.fn(async () => undefined) };

    expect(await recoverInterruptedRecordings(api, now)).toBe(1);
    expect(api.complete).toHaveBeenCalledWith("s1", "crashed", "u-crashed", rec("crashed", 3, 0).parts, 30 * 60);
    expect(api.abort).toHaveBeenCalledWith("s1", "nothing", "u-nothing");
    expect(listPendingRecordings().map((r) => r.key)).toEqual(["running"]);
  });

  it("keeps a recording to retry after a network error, drops one the server refuses", async () => {
    const now = Date.now();
    savePendingRecording(rec("offline", 1, now - 10 * MIN));
    savePendingRecording(rec("refused", 1, now - 10 * MIN));
    const api = {
      complete: vi.fn(async (_s: string, key: string) => {
        if (key === "offline") throw new TypeError("Failed to fetch");
        throw Object.assign(new Error("not yours"), { status: 400 });
      }),
      abort: vi.fn(async () => undefined),
    };
    expect(await recoverInterruptedRecordings(api, now)).toBe(0);
    expect(listPendingRecordings().map((r) => r.key)).toEqual(["offline"]);
  });

  it("refreshes and removes records", () => {
    savePendingRecording(rec("a", 1, 1000));
    touchPendingRecording("a", 5000);
    expect(listPendingRecordings()[0].updatedAt).toBe(5000);
    removePendingRecording("a");
    expect(listPendingRecordings()).toEqual([]);
  });
});
