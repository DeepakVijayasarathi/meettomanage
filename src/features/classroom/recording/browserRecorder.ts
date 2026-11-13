import type { JitsiTrack } from "../native/libJitsi";
import type { NativeJitsiApi, NativeParticipant } from "../native/NativeJitsiApi";
import { bestColumns } from "../native/stageLayout";
import type { RecordingUploader } from "./recordingUpload";
import { featuredSurface, type FeaturedSurface } from "./surfaces";

/**
 * Records a class in the teacher's own browser: everyone's video is drawn onto one 720p canvas
 * (a shared screen fills it with the speaker in a corner; otherwise a grid of faces), everyone's
 * audio is mixed together, and MediaRecorder encodes the result in small chunks that the uploader
 * streams to storage as the class goes. Needs the native call engine, which holds every track.
 */

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 15;
const MAX_TILES = 6;
const BG = "#111827";
const TILE_BG = "#1f2937";
const PALETTE = ["#F26B1D", "#2F80ED", "#27AE60", "#9B51E0", "#EB5757", "#00A3A3", "#D97706", "#DB2777"];

type TrackWithMedia = JitsiTrack & { getTrack?: () => MediaStreamTrack; getOriginalStream?: () => MediaStream; stream?: MediaStream | null };

function mediaTrackOf(track: JitsiTrack, kind: "audio" | "video"): MediaStreamTrack | null {
  const t = track as TrackWithMedia;
  const direct = t.getTrack?.();
  if (direct) return direct;
  const stream = t.getOriginalStream?.() ?? t.stream ?? null;
  return (kind === "audio" ? stream?.getAudioTracks()[0] : stream?.getVideoTracks()[0]) ?? null;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/**
 * A timer in a worker: page timers and animation frames are throttled to about once a second
 * when the tab is in the background (a teacher switching to PowerPoint), which would freeze the
 * recording. Worker timers keep their pace.
 */
function createTicker(fps: number, onTick: () => void): () => void {
  try {
    const src = `setInterval(() => postMessage(0), ${Math.round(1000 / fps)});`;
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const worker = new Worker(url);
    worker.onmessage = onTick;
    return () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  } catch {
    const id = window.setInterval(onTick, Math.round(1000 / fps));
    return () => window.clearInterval(id);
  }
}

interface Tile {
  participant: NativeParticipant;
  screen: boolean;
}

export interface BrowserRecorderOptions {
  mimeType: string;
  onError: (err: Error) => void;
}

export class BrowserRecorder {
  private canvas = document.createElement("canvas");
  private ctx: CanvasRenderingContext2D;
  private host = document.createElement("div");
  private videos = new Map<JitsiTrack, HTMLVideoElement>();
  private audioCtx: AudioContext;
  private audioDest: MediaStreamAudioDestinationNode;
  private audioSources = new Map<MediaStreamTrack, MediaStreamAudioSourceNode>();
  private recorder: MediaRecorder | null = null;
  private stopTicker: (() => void) | null = null;
  private unsubscribe: (() => void) | null = null;
  private startedAt = 0;
  private stopped: Promise<void> | null = null;
  private removeWake: (() => void) | null = null;

  constructor(private source: NativeJitsiApi, private uploader: RecordingUploader, private opts: BrowserRecorderOptions) {
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.ctx = this.canvas.getContext("2d")!;
    // Video elements decode most reliably when they're in the document (kept invisible).
    Object.assign(this.host.style, { position: "fixed", left: "-10000px", top: "0", width: "2px", height: "2px", opacity: "0", pointerEvents: "none" });
    this.host.setAttribute("aria-hidden", "true");
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new Ctx();
    this.audioDest = this.audioCtx.createMediaStreamDestination();
  }

  get durationSeconds() {
    return this.startedAt ? (Date.now() - this.startedAt) / 1000 : 0;
  }

  /** After a reconnect the call engine is re-created; keep recording from the new one. */
  attach(api: NativeJitsiApi) {
    this.unsubscribe?.();
    this.source = api;
    this.unsubscribe = api.subscribe(() => this.syncMedia());
    this.syncMedia();
  }

  async start() {
    document.body.appendChild(this.host);
    void this.audioCtx.resume?.();
    // Browsers may start audio paused until the page is touched; without this the recording
    // would be silent. Resume on the next click or key press.
    if (this.audioCtx.state === "suspended") {
      const wake = () => {
        void this.audioCtx.resume?.();
        if (this.audioCtx.state !== "suspended") {
          window.removeEventListener("pointerdown", wake);
          window.removeEventListener("keydown", wake);
        }
      };
      window.addEventListener("pointerdown", wake);
      window.addEventListener("keydown", wake);
      this.removeWake = () => {
        window.removeEventListener("pointerdown", wake);
        window.removeEventListener("keydown", wake);
      };
    }
    this.attach(this.source);
    this.draw();
    const video = (this.canvas as HTMLCanvasElement & { captureStream(fps: number): MediaStream }).captureStream(FPS);
    const stream = new MediaStream([...video.getVideoTracks(), ...this.audioDest.stream.getAudioTracks()]);
    const recorder = new MediaRecorder(stream, { mimeType: this.opts.mimeType, videoBitsPerSecond: 1_000_000, audioBitsPerSecond: 64_000 });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.uploader.push(e.data);
    };
    recorder.onerror = (e) => this.opts.onError(new Error((e as unknown as { error?: Error }).error?.message ?? "The browser stopped recording."));
    this.recorder = recorder;
    recorder.start(4000);
    this.startedAt = Date.now();
    this.stopTicker = createTicker(FPS, () => this.draw());
  }

  /** Stops recording; resolves once the last chunk has been handed to the uploader. */
  stop(): Promise<void> {
    if (this.stopped) return this.stopped;
    this.stopped = new Promise<void>((resolve) => {
      const recorder = this.recorder;
      const done = () => {
        this.cleanup();
        resolve();
      };
      if (!recorder || recorder.state === "inactive") return done();
      recorder.addEventListener("stop", done, { once: true });
      try {
        recorder.stop();
      } catch {
        done();
      }
    });
    return this.stopped;
  }

  private cleanup() {
    this.stopTicker?.();
    this.removeWake?.();
    this.unsubscribe?.();
    for (const [track, el] of this.videos) {
      try { track.detach(el); } catch { /* already gone */ }
    }
    this.videos.clear();
    this.audioSources.forEach((node) => node.disconnect());
    this.audioSources.clear();
    void this.audioCtx.close().catch(() => undefined);
    this.host.remove();
  }

  /** Keeps one video element per visible track and one mixer input per audio track. */
  private syncMedia() {
    const people = this.source.getSnapshot().participants;
    const wanted = new Set<JitsiTrack>();
    for (const p of people) {
      if (p.videoTrack && !p.videoMuted) wanted.add(p.videoTrack);
      if (p.desktopTrack) wanted.add(p.desktopTrack);
    }
    for (const [track, el] of this.videos) {
      if (wanted.has(track)) continue;
      try { track.detach(el); } catch { /* gone */ }
      el.remove();
      this.videos.delete(track);
    }
    for (const track of wanted) {
      if (this.videos.has(track)) continue;
      const el = document.createElement("video");
      el.muted = true;
      el.playsInline = true;
      el.autoplay = true;
      this.host.appendChild(el);
      track.attach(el);
      el.play().catch(() => undefined);
      this.videos.set(track, el);
    }

    const audio = new Set<MediaStreamTrack>();
    for (const p of people) {
      const mst = p.audioTrack ? mediaTrackOf(p.audioTrack, "audio") : null;
      if (mst) audio.add(mst);
    }
    for (const [mst, node] of this.audioSources) {
      if (audio.has(mst)) continue;
      node.disconnect();
      this.audioSources.delete(mst);
    }
    for (const mst of audio) {
      if (this.audioSources.has(mst)) continue;
      try {
        const node = this.audioCtx.createMediaStreamSource(new MediaStream([mst]));
        node.connect(this.audioDest);
        this.audioSources.set(mst, node);
      } catch {
        /* a track that ended between the snapshot and now */
      }
    }
  }

  private tiles(): { stage: Tile | null; grid: Tile[]; corner: Tile | null; surface: FeaturedSurface | null } {
    const snap = this.source.getSnapshot();
    const people = snap.participants;
    const sharer = people.find((p) => p.desktopTrack && p.isLocal) ?? people.find((p) => p.desktopTrack);
    const speaker = people.find((p) => p.id === snap.dominantId) ?? people.find((p) => p.isLocal) ?? people[0];
    if (sharer) {
      const cornerPerson = speaker && (speaker.videoTrack && !speaker.videoMuted) ? speaker : people.find((p) => p.isLocal);
      return { stage: { participant: sharer, screen: true }, grid: [], corner: cornerPerson ? { participant: cornerPerson, screen: false } : null, surface: null };
    }
    // The teacher has the whiteboard or slides maximized: that's what the class is looking at.
    const surface = featuredSurface();
    if (surface) {
      const me = people.find((p) => p.isLocal);
      const cornerPerson = me && me.videoTrack && !me.videoMuted ? me : speaker;
      return { stage: null, grid: [], corner: cornerPerson ? { participant: cornerPerson, screen: false } : null, surface };
    }
    // The teacher, whoever is talking, then cameras that are on, then everyone else.
    const ordered = [...people].sort((a, b) => score(b, snap.dominantId) - score(a, snap.dominantId));
    return { stage: null, grid: ordered.slice(0, MAX_TILES).map((p) => ({ participant: p, screen: false })), corner: null, surface: null };
  }

  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const { stage, grid, corner, surface } = this.tiles();
    if (stage || surface) {
      if (stage) this.drawTile(stage, 0, 0, WIDTH, HEIGHT, true);
      else this.drawSurface(surface!);
      if (corner) {
        const w = 256;
        const h = 144;
        this.drawTile(corner, WIDTH - w - 16, HEIGHT - h - 16, w, h, false, true);
      }
      return;
    }
    const gap = 8;
    const cols = bestColumns(grid.length, WIDTH - 16, HEIGHT - 16, gap);
    const rows = Math.max(1, Math.ceil(grid.length / cols));
    const tileW = Math.min((WIDTH - 16 - gap * (cols - 1)) / cols, (((HEIGHT - 16 - gap * (rows - 1)) / rows) * 16) / 9);
    const tileH = (tileW * 9) / 16;
    const totalH = rows * tileH + (rows - 1) * gap;
    grid.forEach((tile, i) => {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, grid.length - row * cols);
      const rowW = inRow * tileW + (inRow - 1) * gap;
      const x = (WIDTH - rowW) / 2 + (i % cols) * (tileW + gap);
      const y = (HEIGHT - totalH) / 2 + row * (tileH + gap);
      this.drawTile(tile, x, y, tileW, tileH, false);
    });
  }

  private drawSurface(surface: FeaturedSurface) {
    const base = surface.layers[0];
    const scale = Math.min(WIDTH / base.width, HEIGHT / base.height);
    const w = base.width * scale;
    const h = base.height * scale;
    const x = (WIDTH - w) / 2;
    const y = (HEIGHT - h) / 2;
    this.ctx.fillStyle = surface.background;
    this.ctx.fillRect(x, y, w, h);
    for (const layer of surface.layers) {
      try {
        this.ctx.drawImage(layer, x, y, w, h);
      } catch {
        /* a canvas resized mid-frame */
      }
    }
  }

  private drawTile(tile: Tile, x: number, y: number, w: number, h: number, contain: boolean, framed = false) {
    const ctx = this.ctx;
    const p = tile.participant;
    const track = tile.screen ? p.desktopTrack : p.videoMuted ? undefined : p.videoTrack;
    const el = track ? this.videos.get(track) : undefined;
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, tile.screen && contain ? 0 : 12);
    else ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = tile.screen ? "#000" : TILE_BG;
    ctx.fillRect(x, y, w, h);
    if (el && el.videoWidth > 0) {
      const vw = el.videoWidth;
      const vh = el.videoHeight;
      const scale = contain ? Math.min(w / vw, h / vh) : Math.max(w / vw, h / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const mirror = p.isLocal && !tile.screen;
      if (mirror) {
        ctx.translate(x + w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(el, (w - dw) / 2, y + (h - dh) / 2, dw, dh);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        ctx.drawImage(el, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
      }
    } else if (!tile.screen) {
      const r = Math.min(w, h) * 0.18;
      ctx.fillStyle = colorFor(p.id + p.name);
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `600 ${Math.round(r * 0.8)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initials(p.name), x + w / 2, y + h / 2);
    }
    if (!tile.screen) {
      const label = p.role === "moderator" ? `${p.name} · Teacher` : p.name;
      const size = Math.max(12, Math.min(18, Math.round(h / 14)));
      ctx.font = `600 ${size}px system-ui, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const tw = Math.min(ctx.measureText(label).width, w - 32);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x + 8, y + h - size - 18, tw + 16, size + 10);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + 16, y + h - size / 2 - 13, w - 32);
    }
    ctx.restore();
    if (framed) {
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    }
  }
}

function score(p: NativeParticipant, dominantId: string | null) {
  return (p.role === "moderator" ? 8 : 0) + (p.id === dominantId ? 4 : 0) + (p.videoTrack && !p.videoMuted ? 2 : 0) + (p.lastSpokeAt ? 1 : 0);
}
