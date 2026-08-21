/**
 * Recognition sound effects synthesized with WebAudio — no audio assets to load.
 * Safe everywhere: failures (autoplay policy, no AudioContext) are swallowed.
 */

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

const MUTE_KEY = "readernest.classroom.soundsMuted";

export function isSoundMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, String(muted));
  } catch {
    /* private browsing / storage disabled — mute just won't persist across reloads */
  }
}

/** One clap: a short burst of filtered noise. */
function clapAt(ctx: AudioContext, at: number) {
  const duration = 0.12;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length / 6));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  const gain = ctx.createGain();
  gain.gain.value = 0.5;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(at);
}

/** One dhol beat: a pitch-dropping sine thump. */
function dholAt(ctx: AudioContext, at: number, high: boolean) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(high ? 260 : 140, at);
  osc.frequency.exponentialRampToValueAtTime(high ? 120 : 55, at + 0.18);
  gain.gain.setValueAtTime(0.6, at);
  gain.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
  osc.connect(gain).connect(ctx.destination);
  osc.start(at);
  osc.stop(at + 0.3);
}

export function playClapping() {
  if (isSoundMuted()) return;
  const ctx = getContext();
  if (!ctx) return;
  const start = ctx.currentTime + 0.02;
  for (let i = 0; i < 7; i++) clapAt(ctx, start + i * 0.14 + Math.random() * 0.03);
}

export function playDhol() {
  if (isSoundMuted()) return;
  const ctx = getContext();
  if (!ctx) return;
  const start = ctx.currentTime + 0.02;
  const pattern: Array<[number, boolean]> = [
    [0, false], [0.22, true], [0.44, false], [0.58, false], [0.8, true], [1.02, false],
  ];
  for (const [offset, high] of pattern) dholAt(ctx, start + offset, high);
}

/** Celebration moment: dhol roll + clapping together. */
export function playCelebration() {
  if (isSoundMuted()) return;
  playDhol();
  setTimeout(playClapping, 200);
}

let unlocked = false;

/**
 * Browsers only let an AudioContext actually produce sound after a user gesture
 * on the page — `resume()` on its own is not enough without one. A celebration is
 * broadcast over the hub and can land on a student who has only ever watched, never
 * clicked anything, so without this their very first celebration sound is silently
 * dropped (the AudioContext stays "suspended" forever, and playCelebration()'s
 * try/catch never reports it). Call this once on mount to unlock audio on whatever
 * gesture the student makes first — joining the call, clicking a tab, anything —
 * well before the first celebration has a chance to fire.
 */
export function primeAudioUnlock(): () => void {
  if (unlocked) return () => undefined;
  const unlock = () => {
    if (unlocked) return;
    const ctx = getContext();
    if (ctx && ctx.state !== "suspended") unlocked = true;
  };
  const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart"];
  events.forEach((event) => window.addEventListener(event, unlock, { passive: true }));
  return () => events.forEach((event) => window.removeEventListener(event, unlock));
}
