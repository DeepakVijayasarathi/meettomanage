import { useEffect, useRef, useState } from "react";
import { Download, Maximize, Minimize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const PLAYBACK_SPEEDS = [0.5, 1, 1.25, 1.5, 2, 3];

export interface VideoPlayerProps {
  src: string;
  className?: string;
  /** RecordingsDialog's "Play" toggle mounts this already-expecting-to-play, matching the
   *  native-`<video autoPlay>` behavior it's replacing there. */
  autoPlay?: boolean;
  /** Shows a Download control. Off by default: only Admin and Management / Founder may
   *  download class recordings (see lib/recordingAccess.ts); everyone else can only watch,
   *  so the element also opts out of the browser's own save/download affordances. */
  downloadable?: boolean;
  /** Suggested file name for the download. */
  downloadName?: string;
}

/**
 * Custom-styled replacement for a bare `<video controls>` — the recording preview across
 * Admin/Teacher/Parent Recordings and RecordingsDialog was the one place in the app still
 * falling back to the browser's own OS-themed play/seek/volume/fullscreen chrome, visibly
 * inconsistent with everything else here being custom-built to this app's design tokens.
 * `controls={false}` on the underlying element; every control below is our own.
 */
export function VideoPlayer({ src, className, autoPlay, downloadable = false, downloadName }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    function onFullscreenChange() {
      setFullscreen(document.fullscreenElement === containerRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  function seek(next: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = next;
    setCurrentTime(next);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  function changeVolume(next: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = next;
    video.muted = next === 0;
    setVolume(next);
    setMuted(next === 0);
  }

  /** Cycles through PLAYBACK_SPEEDS — a single button works on touch without needing a popover.
   *  defaultPlaybackRate is set too, since loading a new src resets playbackRate to it. */
  function cycleSpeed() {
    const video = videoRef.current;
    if (!video) return;
    const next = PLAYBACK_SPEEDS[(PLAYBACK_SPEEDS.indexOf(speed) + 1) % PLAYBACK_SPEEDS.length];
    video.defaultPlaybackRate = next;
    video.playbackRate = next;
    setSpeed(next);
  }

  async function toggleFullscreen() {
    if (!containerRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await containerRef.current.requestFullscreen();
  }

  return (
    <div
      ref={containerRef}
      className={cn("group relative aspect-video w-full overflow-hidden rounded-xl bg-black", fullscreen && "aspect-auto", className)}
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        controlsList={downloadable ? undefined : "nodownload"}
        onContextMenu={downloadable ? undefined : (e) => e.preventDefault()}
        className="h-full w-full cursor-pointer"
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
      />

      {/* Center play button — shown at rest and while paused, mirrors the paused state of
          most video players so it's obvious the frame is clickable, not a static thumbnail. */}
      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition-transform hover:scale-105">
            <Play className="ml-1 h-7 w-7 fill-current" />
          </span>
        </button>
      )}

      {/* Always visible rather than hover-to-reveal-then-fade — a timed auto-hide needs an
          idle timer and reliably fails on touch devices (no hover state to reveal it again
          without a second tap landing on the video itself, toggling play unintentionally). */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/85 via-black/60 to-transparent px-3 pb-2 pt-6 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
        </button>

        <span className="shrink-0 font-mono text-xs tabular-nums text-white/90">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>

        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Seek"
          className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/25 accent-primary"
        />

        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:flex"
        >
          {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={(e) => changeVolume(Number(e.target.value))}
          aria-label="Volume"
          className="hidden h-1.5 w-16 shrink-0 cursor-pointer appearance-none rounded-full bg-white/25 accent-primary sm:block"
        />

        {/* Mobile keeps a bare mute toggle in place of the volume slider — matches how
            Resources.tsx-style compact controls already collapse on narrow viewports
            elsewhere in the app, not a one-off pattern. */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:hidden"
        >
          {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={cycleSpeed}
          aria-label={`Playback speed ${speed}x, click to change`}
          title="Playback speed"
          className="flex h-8 min-w-10 shrink-0 items-center justify-center rounded-full px-2 font-mono text-xs tabular-nums text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {speed}x
        </button>

        {downloadable && (
          <a
            href={src}
            download={downloadName ?? true}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download recording"
            title="Download recording"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <Download className="h-4 w-4" />
          </a>
        )}

        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
