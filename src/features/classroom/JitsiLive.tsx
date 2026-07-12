import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useSession } from "@/state/session";
import { postEngagement } from "@/api/engagement";

// Loaded from the Jitsi deployment at runtime (see docs/JITSI_ARCHITECTURE.md);
// meet.jit.si for development, the self-hosted domain in production.
const JITSI_DOMAIN = (import.meta.env.VITE_JITSI_DOMAIN as string | undefined) ?? "meet.jit.si";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => {
      dispose: () => void;
      addListener: (event: string, listener: (payload: { id?: string; muted?: boolean }) => void) => void;
      executeCommand: (command: string, ...args: unknown[]) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadJitsiScript(): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the Jitsi Meet API."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * One-click live classroom: embeds the Jitsi room generated for the session.
 * Video/audio, screen share, chat, reactions, raise hand and the tile controls
 * are native Jitsi; whiteboard and gamification layer on top in Sprint 2/3.
 */
export default function JitsiLive({
  room,
  title,
  mode,
  sessionId,
}: {
  room: string;
  title?: string;
  mode: "teacher" | "student";
  sessionId?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { userName } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let api:
      | {
          dispose: () => void;
          addListener: (event: string, listener: (payload: { id?: string; muted?: boolean }) => void) => void;
          executeCommand: (command: string, ...args: unknown[]) => void;
        }
      | undefined;
    let cancelled = false;

    // Talk-time & camera attentiveness: accumulated from Jitsi media signals,
    // flushed as engagement events when the participant leaves.
    const media = {
      selfId: "",
      talkMs: 0,
      talkSince: 0,
      camMs: 0,
      camSince: 0,
    };
    const flushMedia = () => {
      const now = Date.now();
      if (media.talkSince) {
        media.talkMs += now - media.talkSince;
        media.talkSince = 0;
      }
      if (media.camSince) {
        media.camMs += now - media.camSince;
        media.camSince = 0;
      }
      const talkSeconds = Math.round(media.talkMs / 1000);
      const camSeconds = Math.round(media.camMs / 1000);
      if (talkSeconds > 0) postEngagement(sessionId, userName, "TalkTimeSeconds", talkSeconds);
      if (camSeconds > 0) postEngagement(sessionId, userName, "CameraOnSeconds", camSeconds);
      media.talkMs = 0;
      media.camMs = 0;
    };

    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
        api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: room,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName: userName },
          configOverwrite: {
            prejoinConfig: { enabled: false },
            startWithAudioMuted: mode === "student",
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            DEFAULT_REMOTE_DISPLAY_NAME: "Student",
          },
        });
        api.addListener("readyToClose", () => navigate(-1));
        api.addListener("videoConferenceJoined", (payload) => {
          media.selfId = payload?.id ?? "";
          media.camSince = Date.now(); // camera starts unmuted unless Jitsi says otherwise
          if (mode === "teacher") {
            // Auto session recording: starts when the host joins; requires Jibri
            // on the Jitsi deployment (no-op on deployments without it).
            api?.executeCommand("startRecording", { mode: "file" });
          }
        });
        api.addListener("dominantSpeakerChanged", (payload) => {
          const now = Date.now();
          if (payload?.id === media.selfId) {
            media.talkSince ||= now;
          } else if (media.talkSince) {
            media.talkMs += now - media.talkSince;
            media.talkSince = 0;
          }
        });
        api.addListener("videoMuteStatusChanged", (payload) => {
          const now = Date.now();
          if (payload?.muted && media.camSince) {
            media.camMs += now - media.camSince;
            media.camSince = 0;
          } else if (payload?.muted === false) {
            media.camSince ||= now;
          }
        });
        api.addListener("videoConferenceLeft", () => flushMedia());
      })
      .catch((err: Error) => setError(err.message));

    return () => {
      cancelled = true;
      flushMedia();
      api?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, mode]);

  return (
    <div className="flex h-screen flex-col bg-brand-ink">
      <header className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <Logo showWordmark={false} imgClassName="h-8 w-8" />
          <p className="text-sm font-semibold text-white">{title ?? "Live class"}</p>
        </div>
        <Button size="sm" variant="destructive" onClick={() => navigate(-1)}>
          <PhoneOff className="h-4 w-4" />
          Leave
        </Button>
      </header>
      {error ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">{error}</p>
        </div>
      ) : (
        <div ref={containerRef} className="flex-1" />
      )}
    </div>
  );
}
