import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Floating "mini window" of the live class, Google Meet style: the call keeps showing in an
 * always-on-top picture-in-picture window while the teacher is in PowerPoint (or any other
 * app/tab) changing slides.
 *
 * Why it works this way: the call is Jitsi's cross-origin iframe, so this app can't reach its
 * <video> elements, and Jitsi's own built-in PiP (the `pip` config / showPiP command) is
 * hard-gated to its Electron desktop app — confirmed in the deployed external_api.js and
 * app.bundle, both check navigator.userAgent.includes("Electron"). Instead this captures just
 * the call's own box out of this same tab (getDisplayMedia + Element Capture, or the older
 * Region Capture crop) and plays that local stream in a normal PiP video window. Nothing is
 * sent anywhere -- the stream never leaves this browser, students see nothing different.
 *
 * Chrome/Edge on a computer only (Element Capture: 132+, Region Capture: 104+). Firefox and
 * Safari have neither, so `toggle` reports "unsupported" there.
 */

type CaptureTargetCtor = { fromElement(element: Element): Promise<unknown> };
type CapturableTrack = MediaStreamTrack & {
  restrictTo?: (target: unknown) => Promise<void>;
  cropTo?: (target: unknown) => Promise<void>;
};

declare global {
  interface Window {
    RestrictionTarget?: CaptureTargetCtor;
    CropTarget?: CaptureTargetCtor;
  }
}

export type MeetingPipState = "idle" | "starting" | "ready" | "open";
/** ok: window is open. closed: it was open and is now closed. needs-click: the capture is
 *  running but the browser wanted a fresh click to open the window (the share prompt can use
 *  up the first click's permission). cancelled: the teacher said no to the browser prompt. */
export type MeetingPipResult = "ok" | "closed" | "needs-click" | "cancelled" | "unsupported" | "failed";

export function isMeetingPipSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window.RestrictionTarget || window.CropTarget) &&
    !!navigator.mediaDevices?.getDisplayMedia &&
    "pictureInPictureEnabled" in document &&
    document.pictureInPictureEnabled
  );
}

// Chrome shows mic/camera buttons inside the PiP window when these Media Session actions have
// handlers. Not in TypeScript's DOM lib yet, hence the loose typing.
type LooseMediaSession = {
  setActionHandler: (action: string, handler: (() => void) | null) => void;
  setMicrophoneActive?: (active: boolean) => void;
  setCameraActive?: (active: boolean) => void;
};
function mediaSession(): LooseMediaSession | null {
  return "mediaSession" in navigator ? (navigator.mediaSession as unknown as LooseMediaSession) : null;
}
function setAction(action: string, handler: (() => void) | null) {
  try {
    mediaSession()?.setActionHandler(action, handler);
  } catch {
    // Older browsers throw on action names they don't know -- the buttons just don't show.
  }
}

export function useMeetingPip(options: {
  getTarget: () => HTMLElement | null;
  onToggleMic: () => void;
  onToggleCamera: () => void;
}) {
  const [state, setState] = useState<MeetingPipState>("idle");
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const micActiveRef = useRef(true);
  const cameraActiveRef = useRef(true);

  const syncMediaSession = useCallback(() => {
    const ms = mediaSession();
    try {
      ms?.setMicrophoneActive?.(micActiveRef.current);
      ms?.setCameraActive?.(cameraActiveRef.current);
    } catch {
      // Same as setAction: unsupported just means no button state.
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) {
      if (document.pictureInPictureElement === video) document.exitPictureInPicture().catch(() => {});
      video.srcObject = null;
      video.remove();
      videoRef.current = null;
    }
    setAction("togglemicrophone", null);
    setAction("togglecamera", null);
    setState("idle");
  }, []);

  useEffect(() => stop, [stop]);

  const openWindow = useCallback(async (): Promise<MeetingPipResult> => {
    const video = videoRef.current;
    if (!video) return "failed";
    try {
      await video.requestPictureInPicture();
      return "ok";
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setState("ready");
        return "needs-click";
      }
      stop();
      return "failed";
    }
  }, [stop]);

  const toggle = useCallback(async (): Promise<MeetingPipResult> => {
    if (state === "open") {
      stop();
      return "closed";
    }
    if (state === "starting") return "failed";
    if (state === "ready" && videoRef.current) return openWindow();
    if (!isMeetingPipSupported()) return "unsupported";
    const target = optionsRef.current.getTarget();
    if (!target) return "failed";

    setState("starting");
    let stream: MediaStream | null = null;
    try {
      const Ctor = window.RestrictionTarget ?? window.CropTarget!;
      const captureTarget = await Ctor.fromElement(target);
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 15 } },
        audio: false,
        // Offer only "this tab" -- the one surface the crop below can apply to.
        preferCurrentTab: true,
        selfBrowserSurface: "include",
        surfaceSwitching: "exclude",
        monitorTypeSurfaces: "exclude",
      } as DisplayMediaStreamOptions);
      const track = stream.getVideoTracks()[0] as CapturableTrack | undefined;
      if (!track) throw new Error("no video track");
      if (window.RestrictionTarget && track.restrictTo) await track.restrictTo(captureTarget);
      else if (track.cropTo) await track.cropTo(captureTarget);
      else throw new Error("crop not supported");
      // The teacher clicked the browser's own "Stop sharing" bar.
      track.addEventListener("ended", stop);
    } catch (err) {
      stream?.getTracks().forEach((t) => t.stop());
      setState("idle");
      return err instanceof DOMException && err.name === "NotAllowedError" ? "cancelled" : "failed";
    }

    streamRef.current = stream;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    // Must be in the document for PiP, but never visible in the page itself.
    video.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;bottom:0;right:0;";
    video.srcObject = stream;
    video.addEventListener("enterpictureinpicture", () => setState("open"));
    // Closing the mini window (its own ✕, or "back to tab") ends the capture too, so no
    // "sharing this tab" indicator lingers after it's gone.
    video.addEventListener("leavepictureinpicture", stop);
    document.body.appendChild(video);
    videoRef.current = video;

    setAction("togglemicrophone", () => optionsRef.current.onToggleMic());
    setAction("togglecamera", () => optionsRef.current.onToggleCamera());
    syncMediaSession();

    try {
      await video.play();
      if (video.readyState < 1) await new Promise((r) => video.addEventListener("loadedmetadata", r, { once: true }));
    } catch {
      // Muted autoplay is always allowed; requestPictureInPicture below reports any real problem.
    }
    return openWindow();
  }, [state, stop, openWindow, syncMediaSession]);

  const setMicMuted = useCallback(
    (muted: boolean) => {
      micActiveRef.current = !muted;
      if (streamRef.current) syncMediaSession();
    },
    [syncMediaSession]
  );
  const setCameraMuted = useCallback(
    (muted: boolean) => {
      cameraActiveRef.current = !muted;
      if (streamRef.current) syncMediaSession();
    },
    [syncMediaSession]
  );

  return { state, toggle, setMicMuted, setCameraMuted };
}
