// Captures RecordingRender.tsx's own rendered tab and publishes it as a video track into the
// Jitsi room, as a silent participant real teachers/students never see. See
// docs/JITSI_ARCHITECTURE.md's recording-render section and the plan this was built from.
//
// The hidden-domain XMPP credential this connects with is deliberately NOT fetched through
// this app's own backend API (RecordingRenderJoinDto carries no Jitsi credential at all) --
// it lives only in the recording-render bot's own server-side environment, and the bot's
// Playwright script injects it into this page via `page.addInitScript()` as
// `window.__recordingRenderXmpp__` *before* navigation, so it never passes through our API,
// our database, or anywhere a real participant's browser could ever read it. If that global
// isn't present (this page loaded outside the bot's own browser context -- a stray direct
// visit, a demo-mode preview, anything other than the real automated flow), capture simply
// never starts rather than failing loudly, since there's nothing for it to publish into.

declare global {
  interface Window {
    __recordingRenderXmpp__?: {
      /** e.g. "hidden.meet.jitsi" -- the XMPP virtual host this connects to, NOT a real
       *  public DNS name (confirmed live: loading a script from it throws
       *  ERR_NAME_NOT_RESOLVED). Used only for hosts.domain/muc in the JitsiConnection
       *  options below -- see webDomain for where the actual served JS lives. */
      domain: string;
      /** e.g. "thereadernest.co.in" -- the real, publicly-resolvable Jitsi web domain that
       *  actually serves /libs/lib-jitsi-meet.min.js. Distinct from `domain` above. */
      webDomain: string;
      /** e.g. "wss://thereadernest.co.in/xmpp-websocket" -- same websocket endpoint everyone else uses. */
      serviceUrl: string;
      username: string;
      password: string;
    };
    JitsiMeetJS?: {
      init: (options: Record<string, unknown>) => void;
      JitsiConnection: new (appId: string | null, token: string | null, options: Record<string, unknown>) => JitsiConnectionLike;
      ConnectionEvents: { CONNECTION_ESTABLISHED: string; CONNECTION_FAILED: string };
    };
  }
}

interface JitsiConnectionLike {
  connect: (options?: { id?: string; password?: string }) => void;
  disconnect: () => void;
  addEventListener: (event: string, handler: (...args: unknown[]) => void) => void;
  initJitsiConference: (room: string, options: Record<string, unknown>) => JitsiConferenceLike;
}

interface JitsiConferenceLike {
  join: () => void;
  leave: () => Promise<void>;
  addTrack: (track: unknown) => Promise<void>;
}

export interface RecordingCaptureHandle {
  dispose: () => void;
}

const NOOP_HANDLE: RecordingCaptureHandle = { dispose: () => undefined };

let scriptPromise: Promise<void> | null = null;

function loadLibJitsiMeet(domain: string): Promise<void> {
  if (window.JitsiMeetJS) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://${domain}/libs/lib-jitsi-meet.min.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load lib-jitsi-meet.min.js"));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * Starts capturing this tab and publishing it into `room` as a silent hidden-domain
 * participant. No-ops (returns an inert handle) when the bot's own XMPP credential global
 * isn't present, or when the browser refuses the tab-capture request -- either way, this must
 * never throw and break the whiteboard/quiz rendering this page exists to show.
 */
export async function startRecordingCapture(room: string): Promise<RecordingCaptureHandle> {
  const xmpp = window.__recordingRenderXmpp__;
  if (!xmpp) {
    return NOOP_HANDLE;
  }

  let stream: MediaStream;
  try {
    // Scoped to "this tab" -- normally requires a user gesture and shows a picker, but the
    // bot's own Playwright launch flags (--auto-select-desktop-capture-source, plus
    // context.grantPermissions) auto-grant this for its own automated browser context, so it
    // never actually prompts here. In any other context (a stray real browser tab) this
    // simply rejects, caught below, and capture never starts.
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 15 },
      audio: false,
      // @ts-expect-error -- preferCurrentTab is Chrome-specific and not yet in lib.dom.d.ts.
      preferCurrentTab: true,
    });
  } catch {
    return NOOP_HANDLE;
  }

  try {
    await loadLibJitsiMeet(xmpp.webDomain);
  } catch {
    stream.getTracks().forEach((t) => t.stop());
    return NOOP_HANDLE;
  }

  const JitsiMeetJS = window.JitsiMeetJS;
  if (!JitsiMeetJS) {
    stream.getTracks().forEach((t) => t.stop());
    return NOOP_HANDLE;
  }

  JitsiMeetJS.init({ disableAudioLevels: true });

  const connection = new JitsiMeetJS.JitsiConnection(null, null, {
    hosts: { domain: xmpp.domain, muc: `conference.${xmpp.domain}` },
    serviceUrl: xmpp.serviceUrl,
  });

  let conference: JitsiConferenceLike | null = null;
  let disposed = false;

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    stream.getTracks().forEach((t) => t.stop());
    conference?.leave().catch(() => undefined);
    connection.disconnect();
  };

  // A real user closing this tab's share ("Stop sharing") should tear the whole connection
  // down rather than silently publish a frozen last frame forever.
  stream.getVideoTracks()[0]?.addEventListener("ended", cleanup);

  connection.addEventListener(JitsiMeetJS.ConnectionEvents.CONNECTION_ESTABLISHED, () => {
    console.log("[recordingCaptureTrack] CONNECTION_ESTABLISHED");
    if (disposed) return;
    conference = connection.initJitsiConference(room, {});
    conference.join();
    // Confirm the exact createLocalTrack construction against the served lib-jitsi-meet
    // build during integration testing -- this is the one piece that couldn't be verified
    // without a live hidden-domain account provisioned yet.
    const track = { getType: () => "video", stream, videoType: "camera" };
    conference.addTrack(track).catch((err) => console.error("[recordingCaptureTrack] addTrack failed", err));
  });
  connection.addEventListener(JitsiMeetJS.ConnectionEvents.CONNECTION_FAILED, (...args: unknown[]) => {
    console.error("[recordingCaptureTrack] CONNECTION_FAILED", ...args);
    cleanup();
  });

  console.log("[recordingCaptureTrack] connecting", { domain: xmpp.domain, serviceUrl: xmpp.serviceUrl });
  connection.connect({ id: xmpp.username, password: xmpp.password });

  return { dispose: cleanup };
}
