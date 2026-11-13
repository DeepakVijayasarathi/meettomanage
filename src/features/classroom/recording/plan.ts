/**
 * Where a class recording is made.
 *
 * - "server": the video server's recorder (Jibri). Best quality, independent of the teacher's
 *   computer, but every recording occupies a recording server for the whole class.
 * - "browser": the teacher's own browser composes the class into one video and uploads it while
 *   it records. No recording-server cost; needs a desktop browser and the tab kept open.
 * - "smart": the browser where the teacher's computer can do it, the server otherwise, and each
 *   one covers for the other when it can't start (no server capacity, or the browser recorder fails).
 */
export type RecordingMode = "server" | "browser" | "smart";
export type RecordingPlace = "server" | "browser";

export function parseRecordingMode(value: unknown): RecordingMode {
  return value === "browser" || value === "smart" ? value : "server";
}

/** Container types the browser recorder can produce, best first (MP4 plays everywhere, iPhones included). */
const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01F,mp4a.40.2",
  "video/mp4;codecs=avc1,opus",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export function pickRecordingMimeType(isSupported: (type: string) => boolean = defaultIsSupported): string | null {
  return MIME_CANDIDATES.find((t) => isSupported(t)) ?? null;
}

function defaultIsSupported(type: string) {
  try {
    return typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type);
  } catch {
    return false;
  }
}

export interface BrowserCapability {
  /** MediaRecorder, canvas capture and Web Audio all available, with a usable format. */
  supported: boolean;
  /** A phone or tablet: technically possible but it drains battery and heats up — smart mode avoids it. */
  handheld: boolean;
  /**
   * Can produce MP4. Firefox only records WebM, which many iPhones can't play, so smart mode
   * leaves those browsers on the server (an explicit "browser" setting still uses WebM).
   */
  mp4: boolean;
}

export function browserRecordingCapability(): BrowserCapability {
  if (typeof window === "undefined") return { supported: false, handheld: false, mp4: false };
  const supported =
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined" &&
    "captureStream" in HTMLCanvasElement.prototype &&
    typeof (window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext) !== "undefined" &&
    pickRecordingMimeType() !== null;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const handheld = coarse && Math.min(window.screen?.width ?? 9999, window.screen?.height ?? 9999) < 900;
  return { supported, handheld, mp4: supported && (pickRecordingMimeType() ?? "").startsWith("video/mp4") };
}

/**
 * The place to record a class, given the academy's mode. Browser recording also needs this app's
 * own call screen (the native engine), which is what gives it access to everyone's video and audio.
 */
export function planRecording(mode: RecordingMode, ctx: { nativeEngine: boolean; capability: BrowserCapability }): RecordingPlace {
  const browserPossible = ctx.nativeEngine && ctx.capability.supported;
  if (mode === "server") return "server";
  if (mode === "browser") return browserPossible ? "browser" : "server";
  return browserPossible && !ctx.capability.handheld && ctx.capability.mp4 ? "browser" : "server";
}

/** In smart mode, the other place to try when one can't record. Null when there's no fallback. */
export function fallbackPlace(mode: RecordingMode, failed: RecordingPlace, ctx: { nativeEngine: boolean; capability: BrowserCapability }): RecordingPlace | null {
  if (mode !== "smart") return null;
  if (failed === "browser") return "server";
  return ctx.nativeEngine && ctx.capability.supported ? "browser" : null;
}
