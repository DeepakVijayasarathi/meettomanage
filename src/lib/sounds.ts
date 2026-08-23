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

/**
 * One clap: a short burst of filtered noise. freqScale/gainScale vary per-hit so a
 * whole round of applause isn't the exact same sound repeated — real hands landing
 * at slightly different distances/angles each time is what a crowd actually sounds
 * like, a single clap tone looped is what a sound effect sounds like.
 */
function clapAt(ctx: AudioContext, at: number, freqScale = 1, gainScale = 1) {
  const duration = 0.1 + Math.random() * 0.04;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length / 6));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = (1500 + Math.random() * 700) * freqScale;
  filter.Q.value = 0.8 + Math.random() * 0.6;
  const gain = ctx.createGain();
  gain.gain.value = (0.35 + Math.random() * 0.3) * gainScale;
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

/**
 * A round of applause, not seven isolated claps: ~45 hits over 2 seconds, several
 * "hands" clapping independently (each with its own slightly-off tempo and gain
 * scale) rather than one metronomic sequence, following a real crowd's actual
 * shape — quick ragged onset as people join in, a dense overlapping peak, then a
 * gradual thin-out as it trails off instead of stopping dead.
 */
export function playClapping() {
  if (isSoundMuted()) return;
  const ctx = getContext();
  if (!ctx) return;
  const start = ctx.currentTime + 0.02;
  const totalDuration = 2.0;
  const hitCount = 46;

  // A handful of independent "clappers", each with a personal tempo/gain/pitch bias —
  // this is what keeps 46 hits from sounding like one clap sample fired on a grid.
  const clappers = Array.from({ length: 6 }, () => ({
    phase: Math.random() * 0.1,
    intervalBase: 0.09 + Math.random() * 0.05,
    gainScale: 0.7 + Math.random() * 0.6,
    freqScale: 0.85 + Math.random() * 0.3,
  }));

  for (let i = 0; i < hitCount; i++) {
    const clapper = clappers[i % clappers.length];
    // Density envelope: sparse at the very start and end, packed in the middle —
    // an easeInOut-shaped progress curve, not a linear one, spreads hits toward
    // the edges less and the peak more, matching how applause actually swells.
    const progress = i / hitCount;
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    const at = start + clapper.phase + eased * totalDuration + (Math.random() - 0.5) * clapper.intervalBase;
    // Overall envelope: ramps in over the first 15%, holds, fades over the last 35%.
    const envelope = progress < 0.15 ? progress / 0.15 : progress > 0.65 ? Math.max(0.15, 1 - (progress - 0.65) / 0.35) : 1;
    clapAt(ctx, Math.max(start, at), clapper.freqScale, clapper.gainScale * envelope);
  }
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

/**
 * One bell-like note: a handful of decaying sine harmonics stacked together, instead of
 * a single flat tone — this is what actually reads as "bell" rather than "beep" to the
 * ear, since a real bell's sound is inherently that stack of overtones decaying at
 * slightly different rates.
 */
function bellAt(ctx: AudioContext, at: number, freq: number, gainScale: number) {
  const partials: Array<[number, number, number]> = [
    [1, 0.5, 1.1],
    [2.4, 0.28, 0.8],
    [3.9, 0.16, 0.55],
    [5.2, 0.09, 0.4],
  ];
  for (const [ratio, gainAmt, decay] of partials) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * ratio, at);
    gain.gain.setValueAtTime(gainAmt * gainScale, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + decay);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }
}

/** A quick rising arpeggio ("ta-da!") — the actual musical payoff of the celebration. */
function chimeAt(ctx: AudioContext, at: number) {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 — a bright major chord climbing
  notes.forEach((freq, i) => bellAt(ctx, at + i * 0.09, freq, 0.7));
}

/** A short upward noise sweep just before the chime — the "whoosh" that sells the payoff as a single event, not four unrelated sounds landing at once. */
function whooshAt(ctx: AudioContext, at: number) {
  const duration = 0.35;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (i / data.length);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 0.7;
  filter.frequency.setValueAtTime(400, at);
  filter.frequency.exponentialRampToValueAtTime(4000, at + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.25, at);
  gain.gain.linearRampToValueAtTime(0, at + duration);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(at);
}

/**
 * Celebration moment: whoosh → chime → dhol roll, with clapping trailing underneath —
 * four layers instead of the original two, timed as one event building to a payoff
 * rather than a drum hit and a clap batch landing side by side.
 */
export function playCelebration() {
  if (isSoundMuted()) return;
  const ctx = getContext();
  if (!ctx) return;
  const start = ctx.currentTime + 0.02;
  whooshAt(ctx, start);
  chimeAt(ctx, start + 0.28);
  playDhol();
  setTimeout(playClapping, 260);
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
