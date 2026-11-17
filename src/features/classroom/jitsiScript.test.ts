import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JITSI_SLOW_NETWORK_MESSAGE, loadJitsiScript } from "./jitsiScript";

// jsdom never actually downloads <script src>, so each test decides what happens to every attempt.
type Outcome = "load" | "error" | "hang";
let outcomes: Outcome[];
let appended: HTMLScriptElement[];

beforeEach(() => {
  outcomes = [];
  appended = [];
  delete (window as { JitsiMeetExternalAPI?: unknown }).JitsiMeetExternalAPI;
  vi.spyOn(document.head, "appendChild").mockImplementation(<T extends Node>(node: T): T => {
    const script = node as unknown as HTMLScriptElement;
    appended.push(script);
    const outcome = outcomes.shift() ?? "hang";
    if (outcome !== "hang") setTimeout(() => (outcome === "load" ? script.onload : script.onerror)?.call(script, new Event(outcome)), 0);
    return node;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("loadJitsiScript", () => {
  it("retries after failed attempts and succeeds on the third (weak phone connection, 4 Nov)", async () => {
    outcomes = ["error", "error", "load"];
    await expect(loadJitsiScript("retry.example", 3, 1000)).resolves.toBeUndefined();
    expect(appended).toHaveLength(3);
    expect(appended[0].src).toBe("https://retry.example/external_api.js");
  });

  it("gives up after the last attempt with a plain-language message, and a later click tries again", async () => {
    outcomes = ["error", "error", "error"];
    await expect(loadJitsiScript("down.example", 3, 1000)).rejects.toThrow(JITSI_SLOW_NETWORK_MESSAGE);

    outcomes = ["load"];
    await expect(loadJitsiScript("down.example", 3, 1000)).resolves.toBeUndefined();
    expect(appended).toHaveLength(4);
  });

  it("treats an attempt that never answers as a timeout and retries", async () => {
    vi.useFakeTimers();
    outcomes = ["hang", "load"];
    const pending = loadJitsiScript("slow.example", 3, 30_000);
    await vi.advanceTimersByTimeAsync(30_000);
    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toBeUndefined();
    expect(appended).toHaveLength(2);
  });

  it("does nothing when the API is already loaded", async () => {
    (window as { JitsiMeetExternalAPI?: unknown }).JitsiMeetExternalAPI = function () {};
    await expect(loadJitsiScript("loaded.example")).resolves.toBeUndefined();
    expect(appended).toHaveLength(0);
  });
});
