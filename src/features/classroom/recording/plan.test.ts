import { describe, expect, it } from "vitest";
import { fallbackPlace, parseRecordingMode, pickRecordingMimeType, planRecording } from "./plan";

const desktop = { supported: true, handheld: false };
const tablet = { supported: true, handheld: true };
const unsupported = { supported: false, handheld: false };

describe("recording plan", () => {
  it("reads the academy setting, defaulting to the server", () => {
    expect(parseRecordingMode("smart")).toBe("smart");
    expect(parseRecordingMode("browser")).toBe("browser");
    expect(parseRecordingMode(undefined)).toBe("server");
    expect(parseRecordingMode("cloud")).toBe("server");
  });

  it("server mode always uses the server", () => {
    expect(planRecording("server", { nativeEngine: true, capability: desktop })).toBe("server");
  });

  it("browser mode uses the browser when it can, the server when it can't", () => {
    expect(planRecording("browser", { nativeEngine: true, capability: desktop })).toBe("browser");
    expect(planRecording("browser", { nativeEngine: true, capability: tablet })).toBe("browser");
    expect(planRecording("browser", { nativeEngine: false, capability: desktop })).toBe("server");
    expect(planRecording("browser", { nativeEngine: true, capability: unsupported })).toBe("server");
  });

  it("smart mode prefers a computer's browser and keeps phones and tablets on the server", () => {
    expect(planRecording("smart", { nativeEngine: true, capability: desktop })).toBe("browser");
    expect(planRecording("smart", { nativeEngine: true, capability: tablet })).toBe("server");
    expect(planRecording("smart", { nativeEngine: false, capability: desktop })).toBe("server");
  });

  it("only smart mode falls back, and only to somewhere that can record", () => {
    expect(fallbackPlace("smart", "server", { nativeEngine: true, capability: desktop })).toBe("browser");
    expect(fallbackPlace("smart", "server", { nativeEngine: false, capability: desktop })).toBeNull();
    expect(fallbackPlace("smart", "browser", { nativeEngine: true, capability: desktop })).toBe("server");
    expect(fallbackPlace("server", "server", { nativeEngine: true, capability: desktop })).toBeNull();
    expect(fallbackPlace("browser", "browser", { nativeEngine: true, capability: desktop })).toBeNull();
  });

  it("prefers MP4 (plays on iPhones too) and falls back to WebM", () => {
    expect(pickRecordingMimeType((t) => t.startsWith("video/mp4"))).toMatch(/^video\/mp4/);
    expect(pickRecordingMimeType((t) => t === "video/webm;codecs=vp8,opus")).toBe("video/webm;codecs=vp8,opus");
    expect(pickRecordingMimeType(() => false)).toBeNull();
  });
});
