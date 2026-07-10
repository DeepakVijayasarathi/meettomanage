import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useSession } from "@/state/session";

// Loaded from the Jitsi deployment at runtime (see docs/JITSI_ARCHITECTURE.md);
// meet.jit.si for development, the self-hosted domain in production.
const JITSI_DOMAIN = (import.meta.env.VITE_JITSI_DOMAIN as string | undefined) ?? "meet.jit.si";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => {
      dispose: () => void;
      addListener: (event: string, listener: () => void) => void;
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
}: {
  room: string;
  title?: string;
  mode: "teacher" | "student";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { userName } = useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let api:
      | {
          dispose: () => void;
          addListener: (event: string, listener: () => void) => void;
          executeCommand: (command: string, ...args: unknown[]) => void;
        }
      | undefined;
    let cancelled = false;

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
        if (mode === "teacher") {
          // Auto session recording: starts when the host joins; requires Jibri
          // on the Jitsi deployment (no-op on deployments without it).
          api.addListener("videoConferenceJoined", () => {
            api?.executeCommand("startRecording", { mode: "file" });
          });
        }
      })
      .catch((err: Error) => setError(err.message));

    return () => {
      cancelled = true;
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
