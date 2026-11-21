"""Builds the Mito announcement video: announcer voice-over (edge-tts), synthesised sound design + music,
animated title/safety/CTA cards, and the real screen recording from raw/.   python video/mito-announcement/build.py"""
import asyncio, json, math, shutil, subprocess, sys, wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
from scipy.io import wavfile
from scipy import signal

import audio as A

ROOT = Path(__file__).parent
REPO = ROOT.parents[1]
RAW, WORK, OUT = ROOT / "raw", ROOT / "work", ROOT / "out"
for d in (WORK, OUT, WORK / "vo", WORK / "scenes"):
    d.mkdir(parents=True, exist_ok=True)

FFMPEG = shutil.which("ffmpeg") or r"C:\ffmpeg-8.1-essentials_build\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
W, H, FPS, SR = 1920, 1080, 30, A.SR
VOICE, RATE, PITCH, VOL = "en-US-GuyNeural", "+10%", "+3Hz", "+8%"

ORANGE, ORANGE2, CREAM, CREAM2 = (242, 92, 5), (255, 138, 31), (255, 244, 232), (255, 224, 194)
NAVY, SLATE = (16, 24, 40), (71, 84, 103)

F_BLACK, F_BOLD, F_REG = "C:/Windows/Fonts/seguibl.ttf", "C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/segoeui.ttf"
for f in (F_BLACK, F_BOLD, F_REG):
    if not Path(f).exists():
        F_BLACK = F_BOLD = F_REG = "C:/Windows/Fonts/arialbd.ttf"
        break
_fc = {}


def font(path, size):
    k = (path, size)
    if k not in _fc:
        _fc[k] = ImageFont.truetype(path, size)
    return _fc[k]


facts = {"students": 446, "batches": 253, "courses": 57}
if (ROOT / "facts.json").exists():
    facts.update(json.loads((ROOT / "facts.json").read_text(encoding="utf8")))

# "Mee-toh" so the voice says it like the brand does. Numbers are spoken from what Mito actually answered on screen.
LINES = {
    "intro": "Introducing...",
    "mito": "Mee-toh!",
    "tag": "The A.I. assistant, built right into Meet to Manage.",
    "ask1": "Just ask. Mee-toh reads your live academy data, and answers in seconds.",
    "ask2": f"{facts['students']} students. {facts['batches']} active batches. {facts['courses']} courses. Instantly!",
    "chart1": "Want a chart?",
    "chart2": "Mee-toh draws it, straight from your data.",
    "plan": "Need a lesson plan? Done, in seconds.",
    "quiz1": "Or a quiz!",
    "quiz2": "Interactive, and it scores itself.",
    "safe": "And it's safe. In read-only mode, Mee-toh can look, but never touch.",
    "cta": "Meet Mee-toh. Now in the Meet to Manage desktop app!",
}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-1500:])
        raise SystemExit(f"command failed: {cmd[:3]}")
    return r


def wav_load(p):
    with wave.open(str(p)) as w:
        n, ch = w.getnframes(), w.getnchannels()
        x = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
        if ch == 2: x = x.reshape(-1, 2).mean(1)
        return x, w.getframerate()


# ---------------------------------------------------------------- voice-over
async def _tts(text, path):
    import edge_tts
    for attempt in range(3):
        try:
            await edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH, volume=VOL).save(str(path))
            return
        except Exception as e:  # network blips
            if attempt == 2: raise
            print("tts retry:", e)
            await asyncio.sleep(2)


def make_vo():
    vo = {}
    for k, text in LINES.items():
        wavp = WORK / "vo" / f"{k}.wav"
        sig = WORK / "vo" / f"{k}.txt"
        if not wavp.exists() or not sig.exists() or sig.read_text(encoding="utf8") != text + VOICE + RATE + PITCH:
            mp3 = WORK / "vo" / f"{k}.mp3"
            asyncio.run(_tts(text, mp3))
            run([FFMPEG, "-y", "-i", str(mp3), "-ar", str(SR), "-ac", "1", "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse", str(wavp)])
            sig.write_text(text + VOICE + RATE + PITCH, encoding="utf8")
        x, sr = wav_load(wavp)
        x = x / (np.max(np.abs(x)) + 1e-9) * 0.92
        vo[k] = x
        print(f"  vo {k}: {len(x)/SR:.2f}s")
    return vo


# ---------------------------------------------------------------- drawing helpers
def ease_out_back(x, s=1.9):
    x = min(max(x, 0), 1) - 1
    return 1 + x * x * ((s + 1) * x + s)


def ease_out(x):
    x = min(max(x, 0), 1)
    return 1 - (1 - x) ** 3


def clamp01(x): return min(max(x, 0.0), 1.0)


def gradient(c1, c2, diag=True):
    yy, xx = np.mgrid[0:H, 0:W]
    k = ((xx / W) * 0.45 + (yy / H) * 0.55) if diag else (yy / H)
    img = np.zeros((H, W, 3), np.float32)
    for i in range(3):
        img[..., i] = c1[i] + (c2[i] - c1[i]) * k
    return Image.fromarray(img.astype(np.uint8))


BG_ORANGE, BG_CREAM = gradient(ORANGE2, ORANGE), gradient(CREAM, CREAM2)


def text_layer(txt, fnt, fill, tracking=0, shadow=None):
    """RGBA layer with the text (optionally letter-spaced and with a soft shadow), tightly cropped."""
    widths = [fnt.getlength(c) for c in txt]
    total = int(sum(widths) + tracking * (len(txt) - 1)) + 80
    hgt = int(fnt.size * 1.5) + 80
    lay = Image.new("RGBA", (total, hgt), (0, 0, 0, 0))
    if shadow:
        sh = Image.new("RGBA", lay.size, (0, 0, 0, 0))
        sd = ImageDraw.Draw(sh)
        x = 40
        for c, w in zip(txt, widths):
            sd.text((x + shadow[0], 40 + shadow[1]), c, font=fnt, fill=shadow[3])
            x += w + tracking
        lay = Image.alpha_composite(lay, sh.filter(ImageFilter.GaussianBlur(shadow[2])))
    d = ImageDraw.Draw(lay)
    x = 40
    for c, w in zip(txt, widths):
        d.text((x, 40), c, font=fnt, fill=fill)
        x += w + tracking
    return lay


def paste_center(im, lay, cx, cy, scale=1.0, alpha=1.0):
    if alpha <= 0 or scale <= 0: return
    if scale != 1.0:
        lay = lay.resize((max(1, int(lay.width * scale)), max(1, int(lay.height * scale))), Image.LANCZOS)
    if alpha < 1.0:
        a = lay.getchannel("A").point(lambda v: int(v * alpha))
        lay = lay.copy(); lay.putalpha(a)
    im.alpha_composite(lay, (int(cx - lay.width / 2), int(cy - lay.height / 2)))


def disc_robot(size):
    src = Image.open(REPO / "public/product/mito-robot.webp").convert("RGBA")
    s = min(src.size)
    src = src.crop(((src.width - s) // 2, (src.height - s) // 2, (src.width + s) // 2, (src.height + s) // 2)).resize((size, size), Image.LANCZOS)
    base = Image.new("RGBA", (size, size), (255, 235, 221, 255))
    base.alpha_composite(src)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask)
    return out


def ring(im, cx, cy, r, width, color, alpha):
    if alpha <= 0: return
    lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).ellipse((cx - r, cy - r, cx + r, cy + r), outline=color + (int(255 * alpha),), width=width)
    im.alpha_composite(lay)


def pipe_scene(path, dur, draw):
    n = int(round(dur * FPS))
    p = subprocess.Popen([FFMPEG, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", str(path)], stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
    for i in range(n):
        im = draw(i / FPS).convert("RGB")
        p.stdin.write(im.tobytes())
    p.stdin.close()
    p.wait()


# ---------------------------------------------------------------- animated scenes
def scene_cold(path, dur):
    rng = np.random.default_rng(3)
    spark = [(rng.uniform(0, W), rng.uniform(0, H), rng.uniform(0.5, 1.5)) for _ in range(40)]
    big = text_layer("MITO", font(F_BLACK, 430), (255, 255, 255, 255), tracking=10, shadow=(0, 14, 18, (150, 40, 0, 150)))
    intro = text_layer("INTRODUCING", font(F_BOLD, 74), (255, 255, 255, 235), tracking=1)

    def draw(t):
        im = BG_ORANGE.copy().convert("RGBA")
        d = ImageDraw.Draw(im, "RGBA")
        for k in range(28):  # rotating light rays
            a = (k / 28) * math.tau + t * 0.25
            x2, y2 = W / 2 + math.cos(a) * 2200, H / 2 + math.sin(a) * 2200
            d.polygon([(W / 2, H / 2), (x2, y2), (W / 2 + math.cos(a + 0.07) * 2200, H / 2 + math.sin(a + 0.07) * 2200)], fill=(255, 255, 255, 16))
        shake = (math.sin(t * 90) * 7 * clamp01((t - 1.9) / 1.0) if t < 3.0 else math.sin(t * 70) * 14 * max(0, 1 - (t - 3.0) / 0.35)) if t < 3.5 else 0
        if t < 3.0:
            a = ease_out(t / 0.8)
            tr = 40 - 36 * ease_out(t / 2.6)
            lay = text_layer("INTRODUCING", font(F_BOLD, 74), (255, 255, 255, 255), tracking=tr)
            paste_center(im, lay, W / 2 + shake, H / 2, 1.0 + 0.06 * t / 3, a)
            w = ease_out(t / 2.8) * 640
            d.rounded_rectangle((W / 2 - w / 2, H / 2 + 80, W / 2 + w / 2, H / 2 + 86), 3, fill=(255, 255, 255, 220))
        else:
            u = t - 3.0
            ring(im, W / 2, H / 2, int(120 + u * 1900), 18, (255, 255, 255), max(0, 1 - u / 0.9))
            ring(im, W / 2, H / 2, int(60 + u * 1300), 10, (255, 230, 200), max(0, 1 - u / 0.7))
            s = ease_out_back(u / 0.5) * 0.98 + 0.02
            paste_center(im, big, W / 2 + shake, H / 2 - 10, s, clamp01(u / 0.08))
            for x, y, sp in spark:
                a = clamp01(1 - u / 1.0)
                r = 5 * sp
                px, py = x + (x - W / 2) * u * 0.6, y + (y - H / 2) * u * 0.6
                d.ellipse((px - r, py - r, px + r, py + r), fill=(255, 255, 255, int(220 * a)))
            if u < 0.12:
                im.alpha_composite(Image.new("RGBA", im.size, (255, 255, 255, int(255 * (1 - u / 0.12)))))
        return im

    pipe_scene(path, dur, draw)


def scene_reveal(path, dur):
    robot = disc_robot(700)
    logo = Image.open(REPO / "public/logo-full.png").convert("RGB")
    logo = logo.resize((520, int(logo.height * 520 / logo.width)), Image.LANCZOS)
    t_meet = text_layer("Meet", font(F_BOLD, 120), ORANGE + (255,))
    t_mito = text_layer("Mito", font(F_BLACK, 330), NAVY + (255,), shadow=(0, 10, 14, (242, 92, 5, 70)))
    t_tag = [text_layer("The AI assistant inside", font(F_REG, 56), SLATE + (255,)), text_layer("Meet to Manage", font(F_BOLD, 64), ORANGE + (255,))]

    def draw(t):
        im = BG_CREAM.copy()
        lg = Image.new("RGB", im.size, (255, 255, 255)); lg.paste(logo, (90, 60))
        im = ImageChops.multiply(im, lg).convert("RGBA")
        cx, cy = 600, 560
        for k in range(3):  # pulsing rings behind the robot
            u = ((t * 0.7 + k / 3) % 1.0)
            ring(im, cx, cy, int(380 + u * 330), 6, ORANGE2, 0.5 * (1 - u) * ease_out(t / 0.5))
        glow = Image.new("RGBA", im.size, (0, 0, 0, 0))
        ImageDraw.Draw(glow).ellipse((cx - 400, cy - 400, cx + 400, cy + 400), fill=ORANGE2 + (70,))
        im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(40)))
        e = ease_out_back((t - 0.1) / 0.7)
        bob = math.sin(t * 2.4) * 10
        paste_center(im, robot, cx, cy + (1 - clamp01(e)) * 520 + bob, max(0.01, min(e, 1.04)), clamp01((t - 0.1) / 0.2))
        e2 = ease_out((t - 0.5) / 0.5)
        paste_center(im, t_meet, 1290 + (1 - e2) * 120, 420, 1.0, e2)
        e3 = ease_out_back((t - 0.7) / 0.6)
        paste_center(im, t_mito, 1300, 600, max(0.01, e3), clamp01((t - 0.7) / 0.15))
        for i, lay in enumerate(t_tag):
            ee = ease_out((t - 1.5 - i * 0.35) / 0.5)
            paste_center(im, lay, 1290 + (1 - ee) * 80, 800 + i * 90, 1.0, ee)
        return im

    pipe_scene(path, dur, draw)


def scene_safe(path, dur):
    title = text_layer("Read-only. By design.", font(F_BLACK, 130), NAVY + (255,))
    sub = text_layer("Mito can look at your data. It can never change it.", font(F_REG, 56), SLATE + (255,))
    chips = [("READS LIVE DATA", (22, 163, 74)), ("WRITES BLOCKED", ORANGE), ("ONLY YOUR LOGIN", (37, 99, 235))]

    def shield(im, cx, cy, s, a):
        lay = Image.new("RGBA", im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        pts = [(cx, cy - 170 * s), (cx + 140 * s, cy - 115 * s), (cx + 140 * s, cy + 10 * s), (cx, cy + 175 * s), (cx - 140 * s, cy + 10 * s), (cx - 140 * s, cy - 115 * s)]
        d.polygon(pts, fill=ORANGE + (int(255 * a),))
        inner = [(cx, cy - 135 * s), (cx + 108 * s, cy - 92 * s), (cx + 108 * s, cy + 4 * s), (cx, cy + 138 * s), (cx - 108 * s, cy + 4 * s), (cx - 108 * s, cy - 92 * s)]
        d.polygon(inner, fill=ORANGE2 + (int(255 * a),))
        d.line([(cx - 55 * s, cy + 2 * s), (cx - 12 * s, cy + 48 * s), (cx + 62 * s, cy - 48 * s)], fill=(255, 255, 255, int(255 * a)), width=max(2, int(26 * s)), joint="curve")
        im.alpha_composite(lay)

    def draw(t):
        im = BG_CREAM.copy().convert("RGBA")
        e = ease_out_back(t / 0.6)
        cx, cy = 560, 520
        ring(im, cx, cy, int(260 + (t * 140) % 160), 5, ORANGE2, 0.45 * (1 - ((t * 140) % 160) / 160))
        shield(im, cx, cy + math.sin(t * 2.2) * 8, max(0.01, e * 1.45), clamp01(t / 0.2))
        e1 = ease_out((t - 0.35) / 0.5)
        paste_center(im, title, 1240 + (1 - e1) * 140, 400, 1.0, e1)
        e2 = ease_out((t - 0.8) / 0.5)
        paste_center(im, sub, 1240 + (1 - e2) * 100, 520, 1.0, e2)
        for i, (label, col) in enumerate(chips):
            ee = ease_out_back((t - 1.3 - i * 0.28) / 0.45)
            if ee <= 0: continue
            lay = text_layer(label, font(F_BOLD, 40), (255, 255, 255, 255), tracking=2)
            pill = Image.new("RGBA", (lay.width, 110), (0, 0, 0, 0))
            ImageDraw.Draw(pill).rounded_rectangle((10, 10, pill.width - 10, 100), 45, fill=col + (255,))
            pill.alpha_composite(lay, (0, 110 // 2 - lay.height // 2))
            paste_center(im, pill, 880 + i * 410 + 120, 700, max(0.01, min(ee, 1.05)), clamp01((t - 1.3 - i * 0.28) / 0.1))
        return im

    pipe_scene(path, dur, draw)


def scene_cta(path, dur):
    robot = disc_robot(620)
    logo = Image.open(REPO / "public/logo-full.png").convert("RGBA")
    logo = logo.resize((560, int(logo.height * 560 / logo.width)), Image.LANCZOS)
    card = Image.new("RGBA", (logo.width + 90, logo.height + 60), (0, 0, 0, 0))
    ImageDraw.Draw(card).rounded_rectangle((0, 0, card.width - 1, card.height - 1), 34, fill=(255, 255, 255, 255))
    card.alpha_composite(logo, (45, 30))
    t1 = text_layer("Mito is here.", font(F_BLACK, 170), (255, 255, 255, 255), shadow=(0, 10, 14, (150, 40, 0, 130)))
    t2 = text_layer("Now in the Meet to Manage", font(F_BOLD, 62), (255, 255, 255, 255))
    t3 = text_layer("desktop app", font(F_BOLD, 62), (255, 255, 255, 255))
    rng = np.random.default_rng(11)
    conf = [(rng.uniform(0, W), rng.uniform(-H, 0), rng.uniform(220, 520), rng.uniform(-3, 3), rng.choice([0, 1, 2, 3]), rng.uniform(14, 30)) for _ in range(120)]
    cols = [(255, 255, 255), (255, 214, 170), (16, 24, 40), (255, 240, 220)]

    def draw(t):
        im = BG_ORANGE.copy().convert("RGBA")
        d = ImageDraw.Draw(im, "RGBA")
        for k in range(22):
            a = (k / 22) * math.tau - t * 0.18
            d.polygon([(W / 2, H / 2), (W / 2 + math.cos(a) * 2200, H / 2 + math.sin(a) * 2200), (W / 2 + math.cos(a + 0.08) * 2200, H / 2 + math.sin(a + 0.08) * 2200)], fill=(255, 255, 255, 14))
        e = ease_out_back(t / 0.7)
        paste_center(im, robot, 560, 560 + math.sin(t * 2.6) * 12, max(0.01, min(e, 1.04)), clamp01(t / 0.15))
        e1 = ease_out_back((t - 0.4) / 0.6)
        paste_center(im, t1, 1330, 400, max(0.01, e1), clamp01((t - 0.4) / 0.12))
        for i, lay in enumerate((t2, t3)):
            ee = ease_out((t - 1.0 - i * 0.25) / 0.45)
            paste_center(im, lay, 1330 + (1 - ee) * 90, 560 + i * 78, 1.0, ee)
        e4 = ease_out_back((t - 1.7) / 0.6)
        paste_center(im, card, 1330, 800, max(0.01, min(e4, 1.04)), clamp01((t - 1.7) / 0.15))
        for x, y0, v, drift, c, s in conf:  # confetti burst
            y = y0 + (t * v) + 0.0
            if y < -40 or y > H + 40: continue
            ang = t * drift * 3 + x
            cx, cy = x + math.sin(t * 2 + x) * 40, y
            pts = [(cx + math.cos(ang + k * math.pi / 2) * s, cy + math.sin(ang + k * math.pi / 2) * s * 0.5) for k in range(4)]
            d.polygon(pts, fill=cols[c] + (235,))
        return im

    pipe_scene(path, dur, draw)


# ---------------------------------------------------------------- footage scenes
def caption_png(text, path):
    lay = text_layer(text, font(F_BOLD, 50), (255, 255, 255, 255))
    pad = 34
    pill = Image.new("RGBA", (lay.width + pad * 2, 112), (0, 0, 0, 0))
    sh = Image.new("RGBA", pill.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((8, 14, pill.width - 8, 106), 46, fill=(120, 40, 0, 110))
    pill.alpha_composite(sh.filter(ImageFilter.GaussianBlur(10)))
    ImageDraw.Draw(pill).rounded_rectangle((8, 8, pill.width - 8, 98), 46, fill=ORANGE + (255,))
    pill.alpha_composite(lay, (pad, 56 - lay.height // 2 + 4))
    full = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    full.alpha_composite(pill, ((W - pill.width) // 2, 34))
    full.save(path)


SPECS = {  # segment boundaries are recorded marks; max_out caps the on-screen length of slow waits (sped up, never narration)
    "ask": ["START", ("typing", 1.2), ("send", None), ("answer", 2.4), ("done", 6.0), ("END", 2.2)],
    "chart": ["START", ("typing", 1.0), ("send", None), ("answer", 2.4), ("done", 6.0), ("END", 2.6)],
    "plan": ["START", ("click", 1.0), ("answer", 2.2), ("done", 5.5), ("END", 2.2)],
    "quiz": ["START", ("click", 1.0), ("answer", 2.2), ("done", 4.0), ("answered", 7.5), ("checked", None), ("END", 2.6)],
}


def build_footage(name, caption, min_len, out_path):
    meta = json.loads((RAW / name / "frames.json").read_text(encoding="utf8"))
    frames, marks = meta["frames"], meta["marks"]
    t0, t_end = frames[0]["t"], frames[-1]["t"] + 0.6
    spec = SPECS[name]
    bounds = [t0] + [marks[k] if k in marks else t_end for k, _ in spec[1:-1]] + [t_end]
    caps = [c for _, c in spec[1:]]  # max output length of segment i (None = real time)
    sp = []
    for i in range(len(bounds) - 1):
        real = max(bounds[i + 1] - bounds[i], 1e-3)
        cap = caps[i]
        sp.append(max(1.0, real / cap) if cap else 1.0)
    lines, out_t, mark_out, seg_i = [], 0.0, {}, 0
    keys = [k for k, _ in spec[1:-1]]
    for i, fr in enumerate(frames):
        while seg_i < len(sp) - 1 and fr["t"] >= bounds[seg_i + 1]:
            seg_i += 1
            if seg_i - 1 < len(keys): mark_out[keys[seg_i - 1]] = out_t
        nxt = frames[i + 1]["t"] if i + 1 < len(frames) else t_end
        dur = max((nxt - fr["t"]) / sp[seg_i], 1 / 120)
        lines.append((str((RAW / name / fr["f"]).as_posix()), dur))
        out_t += dur
    clip_dur = out_t
    L = max(clip_dur, min_len)
    lst = WORK / f"{name}.txt"
    lst.write_text("".join(f"file '{p}'\nduration {d:.5f}\n" for p, d in lines) + f"file '{lines[-1][0]}'\n", encoding="utf8")
    cap_png = WORK / f"{name}_cap.png"
    caption_png(caption, cap_png)
    pad = max(0.0, L - clip_dur)
    # Cover the signed-in Claude email (sidebar rail, bottom-left) and the transient "Slow network" pill (top bar) so neither is published.
    mask = "drawbox=x=436:y=1034:w=236:h=34:color=white:t=fill,drawbox=x=1512:y=10:w=184:h=48:color=white:t=fill"
    fc = (f"[0:v]fps={FPS},scale={W}:{H}:flags=lanczos,{mask},fade=t=in:st=0:d=0.16:color=white,tpad=stop_mode=clone:stop_duration={pad:.3f}[v];"
          f"[1:v]format=rgba,fade=t=in:st=0.3:d=0.35:alpha=1,fade=t=out:st={L - 0.55:.2f}:d=0.4:alpha=1[c];[v][c]overlay=0:0,format=yuv420p[o]")
    run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-loop", "1", "-t", f"{L:.3f}", "-i", str(cap_png), "-filter_complex", fc, "-map", "[o]", "-t", f"{L:.3f}", "-r", str(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "17", str(out_path)])
    return L, clip_dur, mark_out, marks and (marks.get("send", 0) and 0)


# ---------------------------------------------------------------- main
def main():
    print("voice-over...")
    vo = make_vo()
    dur = {k: len(v) / SR for k, v in vo.items()}

    events = []   # (abs_time, stereo array)
    vo_track_events = []  # (abs_time, mono array) for ducking

    def sfx(t, x, g=1.0): events.append((t, x * g))
    def say(t, k):
        vo_track_events.append((t, vo[k]))
        return t + dur[k]

    scenes, cursor = [], 0.0

    # --- 1. cold open
    p = WORK / "scenes" / "s0_cold.mp4"; D = 4.3
    scene_cold(p, D)
    sfx(0.0, A.riser(2.95, 0.7)); sfx(3.0, A.impact(1.0))
    say(0.85, "intro"); say(3.04, "mito")
    scenes.append((p, D)); music_start = 3.0
    cursor += D

    # --- 2. reveal
    p = WORK / "scenes" / "s1_reveal.mp4"; D = max(dur["tag"] + 1.4, 5.4)
    scene_reveal(p, D)
    sfx(cursor, A.whoosh(0.7, True, 0.55)); sfx(cursor + 0.35, A.pop(0.6)); sfx(cursor + 0.75, A.pop(0.5))
    say(cursor + 0.55, "tag")
    scenes.append((p, D)); cursor += D

    # --- 3. ask
    p = WORK / "scenes" / "s2_ask.mp4"
    meta = json.loads((RAW / "ask" / "frames.json").read_text(encoding="utf8"))
    L, clip, mo, _ = build_footage("ask", "Ask in plain English", 6.0, p)
    t_type = 1.1  # START segment output length is capped to this by SPECS (typing begins right after it)
    send_out, ans_out = mo.get("send", 4.0), mo.get("answer", 7.0)
    sfx(cursor, A.whoosh(0.5, True, 0.5))
    sfx(cursor + mo.get("typing", 1.2), A.typing(max(0.5, send_out - mo.get("typing", 1.2)), 24, 0.3))
    sfx(cursor + send_out, A.whoosh(0.4, True, 0.4)); sfx(cursor + send_out, A.pop(0.4))
    e1 = say(cursor + 0.35, "ask1")
    t2 = max(cursor + ans_out + 0.3, e1 + 0.35)
    e2 = say(t2, "ask2")
    for k, off in enumerate((0.0, 0.95, 1.85)): sfx(t2 + off + 0.05, A.ding(0.4))
    sfx(cursor + ans_out, A.pop(0.5))
    L = max(L, e2 + 0.9 - cursor)
    if L > clip + 0.01: build_footage("ask", "Ask in plain English", L, p)
    scenes.append((p, L)); cursor += L

    # --- 4. chart
    p = WORK / "scenes" / "s3_chart.mp4"
    L, clip, mo, _ = build_footage("chart", "Live charts from your data", 5.0, p)
    send_out, ans_out = mo.get("send", 3.8), mo.get("answer", 6.5)
    sfx(cursor, A.whoosh(0.5, True, 0.5))
    sfx(cursor + mo.get("typing", 1.0), A.typing(max(0.5, send_out - mo.get("typing", 1.0)), 24, 0.3))
    sfx(cursor + send_out, A.pop(0.4))
    e1 = say(cursor + 0.3, "chart1")
    t2 = max(cursor + ans_out + 0.2, e1 + 0.4)
    e2 = say(t2, "chart2")
    sfx(t2 - 0.05, A.whoosh(0.5, True, 0.4)); sfx(t2, A.pop(0.6)); sfx(t2 + 0.15, A.ding(0.35))
    L = max(L, e2 + 1.0 - cursor)
    if L > clip + 0.01: build_footage("chart", "Live charts from your data", L, p)
    scenes.append((p, L)); cursor += L

    # --- 5. class plan
    p = WORK / "scenes" / "s4_plan.mp4"
    L, clip, mo, _ = build_footage("plan", "Class plans in seconds", 5.0, p)
    sfx(cursor, A.whoosh(0.5, True, 0.5)); sfx(cursor + mo.get("click", 1.0), A.click(0.7)); sfx(cursor + mo.get("click", 1.0) + 0.05, A.pop(0.35))
    e1 = say(cursor + 0.4, "plan")
    sfx(cursor + mo.get("answer", 3.2), A.pop(0.5)); sfx(cursor + mo.get("answer", 3.2) + 0.1, A.ding(0.3))
    L = max(L, e1 + 1.2 - cursor)
    if L > clip + 0.01: build_footage("plan", "Class plans in seconds", L, p)
    scenes.append((p, L)); cursor += L

    # --- 6. quiz
    p = WORK / "scenes" / "s5_quiz.mp4"
    L, clip, mo, _ = build_footage("quiz", "Quizzes that score themselves", 6.0, p)
    sfx(cursor, A.whoosh(0.5, True, 0.5)); sfx(cursor + mo.get("click", 1.0), A.click(0.7)); sfx(cursor + mo.get("click", 1.0), A.pop(0.35))
    e1 = say(cursor + 0.4, "quiz1")
    done, answered, checked = mo.get("done", 5.0), mo.get("answered", 9.0), mo.get("checked", 10.0)
    nQ = 5
    for i in range(nQ):  # one click per question while the quiz is being answered
        sfx(cursor + done + 0.6 + (answered - done - 0.8) * i / nQ, A.click(0.6))
    t2 = max(cursor + done + 0.3, e1 + 0.3)
    e2 = say(t2, "quiz2")
    sfx(cursor + checked, A.chime_up(0.55)); sfx(cursor + checked + 0.05, A.pop(0.4))
    L = max(L, e2 + 0.8 - cursor, checked + 1.8)
    if L > clip + 0.01: build_footage("quiz", "Quizzes that score themselves", L, p)
    scenes.append((p, L)); cursor += L

    # --- 7. safe
    p = WORK / "scenes" / "s6_safe.mp4"; D = max(dur["safe"] + 1.1, 5.2)
    scene_safe(p, D)
    sfx(cursor, A.whoosh(0.5, True, 0.5)); sfx(cursor + 0.25, A.pop(0.5))
    for i in range(3): sfx(cursor + 1.3 + i * 0.28, A.pop(0.4))
    say(cursor + 0.45, "safe")
    scenes.append((p, D)); cursor += D

    # --- 8. CTA
    p = WORK / "scenes" / "s7_cta.mp4"; D = max(dur["cta"] + 3.3, 6.6)
    scene_cta(p, D)
    sfx(cursor, A.whoosh(0.5, True, 0.6)); sfx(cursor + 0.05, A.tada(0.85)); sfx(cursor + 0.1, A.whoosh(0.9, False, 0.4))
    say(cursor + 0.55, "cta")
    scenes.append((p, D)); cursor += D
    total = cursor
    print(f"timeline {total:.1f}s")

    # --- stitch video
    lst = WORK / "scenes.txt"
    lst.write_text("".join(f"file '{p.as_posix()}'\n" for p, _ in scenes), encoding="utf8")
    silent = WORK / "silent.mp4"
    run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-r", str(FPS), str(silent)])

    # --- audio mix
    N = int((total + 1.0) * SR)
    voice = np.zeros(N)
    for t, x in vo_track_events:
        i = int(t * SR); voice[i:i + len(x)] += x[: N - i]
    sfx_bus = np.zeros((N, 2))
    for t, x in events:
        i = int(t * SR)
        if i < N: sfx_bus[i:i + len(x)] += x[: N - i]
    mus = A.music(total + 1.0 - music_start, 124)
    music_bus = np.zeros((N, 2)); i0 = int(music_start * SR); music_bus[i0:i0 + len(mus)] = mus[: N - i0]
    # duck the music under the narration
    active = (np.abs(voice) > 0.02).astype(float)
    active = signal.sosfilt(signal.butter(2, 5, "low", fs=SR, output="sos"), np.convolve(active, np.ones(int(0.25 * SR)) / (0.25 * SR), "same"))
    duck = 1 - 0.68 * np.clip(active * 1.4, 0, 1)
    music_bus *= duck[:, None]
    mix = voice[:, None] * 1.0 + sfx_bus * 0.9 + music_bus * 0.55
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    mix = mix / max(1e-9, np.max(np.abs(mix))) * 0.95
    wav = WORK / "mix.wav"
    wavfile.write(str(wav), SR, (mix * 32767).astype(np.int16))

    final = OUT / "mito-announcement.mp4"
    OUT.mkdir(exist_ok=True)
    run([FFMPEG, "-y", "-i", str(silent), "-i", str(wav), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.3f}", "-movflags", "+faststart", str(final)])
    print("done:", final)


if __name__ == "__main__":
    main()
