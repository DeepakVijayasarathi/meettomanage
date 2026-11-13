import { useEffect, useState } from "react";
import { CircleDot, Cloud, Laptop, Loader2, Square } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { RecordingPlace } from "./plan";
import { BEHIND_BYTES } from "./recordingUpload";

export interface BrowserRecordingState {
  status: "starting" | "recording" | "saving" | "saved" | "failed";
  startedAt: number;
  uploadedBytes: number;
  pendingBytes: number;
  message?: string;
}

interface Props {
  /** Server (Jibri) recording is running. */
  serverOn: boolean;
  /** A server recording has been asked for and isn't confirmed yet. */
  serverStarting: boolean;
  browser: BrowserRecordingState | null;
  canChoose: boolean;
  /** Null when recording on this computer is possible; otherwise why not. */
  browserUnavailableReason: string | null;
  /** Where a new recording would go if the teacher just presses Record. */
  defaultPlace: RecordingPlace;
  onStart: (place: RecordingPlace) => void;
  onStop: () => void;
}

function formatBytes(n: number) {
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
  return `${Math.max(0, Math.round(n / 1024 / 1024))} MB`;
}

function useElapsed(since: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [since]);
  if (since === null) return "";
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

const PLACES: { value: RecordingPlace; title: string; detail: string; cost: string; icon: typeof Cloud }[] = [
  { value: "server", title: "On the server", detail: "Best quality. Keeps recording even if this computer is slow or the tab is closed.", cost: "Uses recording-server time", icon: Cloud },
  { value: "browser", title: "On this computer", detail: "Recorded here and uploaded as the class goes. Keep this tab open until it says saved.", cost: "No server cost", icon: Laptop },
];

/** The teacher's REC control in the class header: what is recording, where, and a switch between the two. */
export default function RecordingControl({ serverOn, serverStarting, browser, canChoose, browserUnavailableReason, defaultPlace, onStart, onStop }: Props) {
  const browserOn = browser?.status === "recording";
  const active: RecordingPlace | null = browserOn ? "browser" : serverOn ? "server" : null;
  const busy = serverStarting || browser?.status === "starting" || browser?.status === "saving";
  const elapsed = useElapsed(browserOn ? browser!.startedAt : null);
  const [choice, setChoice] = useState<RecordingPlace>(defaultPlace);
  useEffect(() => setChoice(active ?? defaultPlace), [active, defaultPlace]);

  const label = active === "browser" ? `Rec · This computer ${elapsed}` : active === "server" ? "Rec · Server" : busy ? "Starting…" : "Record";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset transition-colors",
            active ? "bg-destructive/15 text-call-danger-ink ring-destructive/25 hover:bg-destructive/25" : "bg-call-ink/5 text-call-ink/80 ring-call-ink/15 hover:bg-call-ink/10"
          )}
          aria-label={active ? `Recording ${active === "browser" ? "on this computer" : "on the server"}. Recording options` : "Recording options"}
        >
          {busy && !active ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className={cn("h-1.5 w-1.5 rounded-full", browserOn && browser!.pendingBytes > BEHIND_BYTES ? "bg-amber-400" : active ? "animate-pulse bg-red-400" : "bg-call-ink/50")} />
          )}
          <span className="tabular-nums">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3 p-4">
        <div>
          <p className="text-sm font-semibold">Recording</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {active === "browser" && browser && `Recording on this computer · ${elapsed} · ${formatBytes(browser.uploadedBytes)} uploaded`}
            {active === "server" && "Recording on the server. Students are told the class is recorded."}
            {!active && browser?.status === "saving" && `Saving the recording… ${formatBytes(browser.pendingBytes)} left to upload`}
            {!active && browser?.status === "saved" && "The last recording was saved. It appears under Recordings shortly."}
            {!active && browser?.status === "failed" && (browser.message ?? "The recording on this computer stopped.")}
            {!active && !browser && !busy && "This class isn't being recorded."}
            {!active && serverStarting && "Starting the server recording…"}
          </p>
        </div>

        {browserOn && browser!.pendingBytes > BEHIND_BYTES && (
          <p role="status" className="rounded-md bg-amber-500/10 px-2.5 py-2 text-xs text-amber-800 dark:text-amber-300">
            The upload is behind ({formatBytes(browser!.pendingBytes)} waiting) because the internet is slow. Recording continues and will
            catch up; keep this tab open.
          </p>
        )}

        {canChoose && (
          <div role="radiogroup" aria-label="Where to record" className="grid gap-2">
            {PLACES.map(({ value, title, detail, cost, icon: Icon }) => {
              const unavailable = value === "browser" ? browserUnavailableReason : null;
              const selected = choice === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!!unavailable || busy}
                  onClick={() => setChoice(value)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {title}
                      {active === value && <span className="rounded-full bg-destructive/15 px-1.5 text-[10px] font-bold uppercase text-call-danger-ink">Live</span>}
                    </span>
                    <span className="block text-xs text-muted-foreground">{unavailable ?? detail}</span>
                    {!unavailable && <span className={cn("mt-1 block text-[11px] font-medium", value === "browser" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>{cost}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end gap-2">
          {active && (
            <button type="button" onClick={onStop} className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
              <Square className="h-3.5 w-3.5" /> Stop
            </button>
          )}
          {active && canChoose && choice !== active && (
            <button type="button" disabled={busy} onClick={() => onStart(choice)} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              Switch to {choice === "browser" ? "this computer" : "the server"}
            </button>
          )}
          {!active && (
            <button
              type="button"
              disabled={busy || (choice === "browser" && !!browserUnavailableReason)}
              onClick={() => onStart(canChoose ? choice : defaultPlace)}
              className="flex items-center gap-1.5 rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
            >
              <CircleDot className="h-3.5 w-3.5" /> Start recording
            </button>
          )}
        </div>
        {active && canChoose && choice !== active && (
          <p className="text-[11px] text-muted-foreground">Switching saves what's recorded so far as its own recording, then continues in the new place.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
