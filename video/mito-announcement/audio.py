"""Synthesised sound design for the Mito announcement: riser, impact, whooshes, typing clicks, dings, chimes,
a celebratory 'tada', and an upbeat music bed. Everything is generated with numpy, so there are no samples to license."""
import numpy as np
from scipy import signal

SR = 44100
rng = np.random.default_rng(7)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def env_exp(n, decay):
    return np.exp(-np.arange(n) / SR * decay)


def fade(x, a=0.005, b=0.02):
    n = len(x)
    fa, fb = min(int(a * SR), n), min(int(b * SR), n)
    if fa: x[:fa] *= np.linspace(0, 1, fa)
    if fb: x[-fb:] *= np.linspace(1, 0, fb)
    return x


def lowpass(x, hz, order=4):
    return signal.sosfilt(signal.butter(order, hz, "low", fs=SR, output="sos"), x)


def highpass(x, hz, order=4):
    return signal.sosfilt(signal.butter(order, hz, "high", fs=SR, output="sos"), x)


def bandpass_sweep(dur, f0, f1, q=2.0):
    """White noise through a band-pass whose centre glides f0 -> f1 (block-wise): the classic whoosh / riser."""
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    blocks = 64
    edges = np.linspace(0, n, blocks + 1, dtype=int)
    zi = None
    for i in range(blocks):
        f = f0 * (f1 / f0) ** ((i + 0.5) / blocks)
        lo, hi = max(40, f / (1 + 1 / q)), min(SR / 2 - 100, f * (1 + 1 / q))
        sos = signal.butter(2, [lo, hi], "band", fs=SR, output="sos")
        seg = signal.sosfilt(sos, noise[edges[i]:edges[i + 1]])
        out[edges[i]:edges[i + 1]] = seg
    return out / (np.max(np.abs(out)) + 1e-9)


def stereo(x, pan=0.0):
    l = x * np.sqrt((1 - pan) / 2) * 1.0
    r = x * np.sqrt((1 + pan) / 2) * 1.0
    return np.stack([l, r], axis=1)


def whoosh(dur=0.6, up=True, gain=0.5):
    x = bandpass_sweep(dur, 400 if up else 5000, 5000 if up else 400, q=1.2)
    x *= np.sin(np.linspace(0, np.pi, len(x))) ** 1.5
    return stereo(x * gain)


def riser(dur=2.9, gain=0.55):
    n = int(dur * SR)
    x = bandpass_sweep(dur, 200, 9000, q=1.0)
    tone = np.sin(2 * np.pi * np.cumsum(np.linspace(180, 1400, n)) / SR) * 0.35
    x = (x + tone) * (np.linspace(0, 1, n) ** 2.2)
    return stereo(fade(x, 0.01, 0.01) * gain)


def impact(gain=0.9):
    dur = 1.6
    n = int(dur * SR)
    t = t_axis(dur)
    f = 110 * np.exp(-t * 5) + 38
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 3.2)
    crack = lowpass(rng.standard_normal(n), 6000) * env_exp(n, 24) * 0.6
    shimmer = highpass(rng.standard_normal(n), 3000) * env_exp(n, 5) * 0.12
    x = boom + crack + shimmer
    return stereo(np.tanh(x * 1.6) * gain)


def click(gain=0.35):
    dur = 0.05
    n = int(dur * SR)
    x = highpass(rng.standard_normal(n), 1800) * env_exp(n, 140)
    x += np.sin(2 * np.pi * rng.uniform(900, 1500) * t_axis(dur)) * env_exp(n, 220) * 0.4
    return stereo(x * gain, pan=rng.uniform(-0.2, 0.2))


def typing(dur, cps=24.0, gain=0.3):
    n = int((dur + 0.2) * SR)
    out = np.zeros((n, 2))
    t = 0.0
    while t < dur:
        c = click(gain * rng.uniform(0.6, 1.1))
        i = int(t * SR)
        out[i:i + len(c)] += c[: n - i]
        t += rng.uniform(0.7, 1.3) / cps
    return out


def bell(freq, dur=0.9, gain=0.4):
    t = t_axis(dur)
    x = sum(np.sin(2 * np.pi * freq * r * t) * a for r, a in [(1, 1), (2.76, 0.4), (5.4, 0.15)]) * env_exp(len(t), 5.5)
    return stereo(fade(x, 0.002, 0.05) * gain)


def ding(gain=0.45):
    a, b = bell(1318.5, 0.9, gain), bell(1975.5, 1.1, gain * 0.7)
    out = np.zeros((len(b) + int(0.09 * SR), 2))
    out[: len(a)] += a
    out[int(0.09 * SR):] += b
    return out


def pop(gain=0.5):
    dur = 0.18
    t = t_axis(dur)
    f = 900 * np.exp(-t * 18) + 200
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(len(t), 22)
    return stereo(x * gain)


def chime_up(gain=0.45):
    notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
    parts = [bell(f, 0.8, gain) for f in notes]
    step = int(0.075 * SR)
    out = np.zeros((step * len(notes) + len(parts[-1]), 2))
    for i, p in enumerate(parts):
        out[i * step:i * step + len(p)] += p
    return out


def tada(gain=0.7):
    dur = 2.2
    t = t_axis(dur)
    out = np.zeros(len(t))
    for f in [261.63, 329.63, 392.0, 523.25, 659.25]:  # bright C major stab, saw-ish brass
        saw = signal.sawtooth(2 * np.pi * f * t) * 0.5 + np.sin(2 * np.pi * f * t) * 0.5
        out += saw
    out = lowpass(out, 3200) * np.minimum(1, t / 0.01) * env_exp(len(t), 1.6) * 0.22
    sparkle = highpass(rng.standard_normal(len(t)), 5000) * env_exp(len(t), 3.5) * 0.08
    return stereo(fade(out + sparkle, 0.002, 0.2) * gain)


def confetti_pop(gain=0.55):
    n = int(0.5 * SR)
    return stereo(highpass(rng.standard_normal(n), 800) * env_exp(n, 14) * gain)


# ---------------- music bed ----------------
def music(dur, bpm=124, start=0.0, gain=1.0):
    """Four-on-the-floor bright pop loop in C major: C - G - Am - F. Returns stereo array of length dur."""
    n = int(dur * SR)
    out = np.zeros((n, 2))
    beat = 60.0 / bpm
    bar = beat * 4
    prog = [(130.81, [261.63, 329.63, 392.0]), (98.0, [196.0, 293.66, 392.0]), (110.0, [220.0, 261.63, 329.63]), (87.31, [174.61, 261.63, 349.23])]

    def place(x, at):
        i = int(at * SR)
        if i >= n or i < 0: return
        m = min(len(x), n - i)
        out[i:i + m] += x[:m] if x.ndim == 2 else np.stack([x[:m]] * 2, 1)

    def kick():
        t = t_axis(0.35)
        f = 120 * np.exp(-t * 28) + 45
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(len(t), 11) * 0.9

    def hat(open_=False):
        d = 0.18 if open_ else 0.05
        return highpass(rng.standard_normal(int(d * SR)), 7000) * env_exp(int(d * SR), 30 if not open_ else 16) * 0.22

    def clap():
        d = 0.22
        nn = int(d * SR)
        x = bandpass_sweep(d, 1500, 1500, q=0.9)[:nn] * env_exp(nn, 20) * 0.5
        return x

    def pluck(f, d=0.28):
        t = t_axis(d)
        x = (signal.sawtooth(2 * np.pi * f * t) * 0.6 + np.sin(2 * np.pi * f * 2 * t) * 0.3) * env_exp(len(t), 11)
        return lowpass(x, 5200) * 0.16

    def bass(f, d):
        t = t_axis(d)
        x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)
        return x * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.03) * 0.32

    def pad(freqs, d):
        t = t_axis(d)
        x = sum(signal.sawtooth(2 * np.pi * f * t * (1 + 0.003 * k)) for k, f in enumerate(freqs * 2)) / 6
        x = lowpass(x, 1800)
        a = np.minimum(1, t / 0.25) * np.minimum(1, (d - t) / 0.4)
        return x * a * 0.18

    bars = int(np.ceil((dur - start) / bar))
    for b in range(bars):
        root, chord = prog[b % 4]
        t0 = start + b * bar
        place(pad(chord, bar), t0)
        for q in range(4):  # kick every beat, clap on 2 & 4, hats on the off-beats
            tb = t0 + q * beat
            place(kick(), tb)
            if q in (1, 3): place(clap(), tb)
            place(hat(), tb + beat / 2)
            if q == 3: place(hat(True), tb + beat * 0.75)
        for e in range(8):  # driving bass on 8ths, pluck arpeggio on 16ths
            place(bass(root, beat / 2 * 0.9), t0 + e * beat / 2)
        arp = chord + [chord[0] * 2]
        for s in range(16):
            place(pluck(arp[s % 4] * 2), t0 + s * beat / 4)
    # master touch: gentle low-pass, fade in/out
    out = np.stack([lowpass(out[:, 0], 9000, 2), lowpass(out[:, 1], 9000, 2)], 1)
    fi, fo = int(0.5 * SR), int(1.5 * SR)
    out[:fi] *= np.linspace(0, 1, fi)[:, None]
    out[-fo:] *= np.linspace(1, 0, fo)[:, None]
    return out * gain
