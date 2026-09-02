#!/usr/bin/env python
"""Split the continuous recording at measured beat offsets, pad/trim each segment to
its exact VO duration + a small hold buffer (never speeding up narration), mux VO on,
then crossfade all beats together (instead of hard cuts) for a livelier final edit.
Mirrors the per-beat pipeline in references/editing-ffmpeg.md, adapted for a single
continuous take (measured real offsets, not per-beat webm files) plus xfade/acrossfade
transitions."""
import json
import os
import subprocess
import textwrap

# Not on PATH in this shell -- winget installed it under WinGet\Packages, not a PATH dir.
_FFDIR = (
    r"C:\Users\dvijayasarathi\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-full_build\bin"
)
FFMPEG = os.path.join(_FFDIR, "ffmpeg.exe")
FFPROBE = os.path.join(_FFDIR, "ffprobe.exe")

# Measured real elapsed ms from recording start (screencast start) to each beat's
# visual becoming active, captured via the beatLog return value from record.js (pulled
# out afterward with `playwright-cli localstorage-get mtm_beatlog` — see record.js's
# closing comment). Full-portal-tour v7: onboarding tour of all 8 role portals + the
# live classroom, chapter cards now finished design-mockup images (video/beat image/).
BEAT_OFFSETS_MS = {
    "01_hook": 1299,
    "02_one_login": 9558,
    "03_admin": 21995,
    "04_teacher": 36154,
    "05_classroom": 44823,
    "06_student": 61341,
    "07_parent": 73436,
    "08_coordinator": 85941,
    "09_admission": 99035,
    "10_subadmin": 111881,
    "11_management": 125968,
    "12_differentiator": 135060,
    "13_cta": 143596,
}
BEAT_ORDER = list(BEAT_OFFSETS_MS.keys())

# Extra breathing room held on screen after each beat's narration finishes, before
# crossfading to the next beat. Re-tuned again after slowing the VO rate a second time
# (-4% -> -9%, even longer clips): 04_teacher and 11_management now have VO that
# outruns their own recorded footage regardless of buffer (0 slack or worse) -- those
# get the XFADE_S floor and an unavoidable pad; every other beat gets a comfortable
# hold sized to its actual slack. CTA still holds >=3s per brand-tone.md regardless.
#
# BUG FIX (audio/video desync): every buffer here MUST be >= XFADE_S -- see git history
# / prior version of this comment for the full explanation. Enforced below by the
# _short check.
BUFFER_S = {
    "01_hook": 1.5,
    "02_one_login": 2.5,
    "03_admin": 1.2,
    "04_teacher": 0.4,
    "05_classroom": 2.5,
    "06_student": 0.6,
    "07_parent": 1.0,
    "08_coordinator": 1.0,
    "09_admission": 1.0,
    "10_subadmin": 1.8,
    "11_management": 0.4,
    "12_differentiator": 1.5,
    "13_cta": 3.0,
}

XFADE_S = 0.4  # crossfade duration between consecutive beats

# See the BUG FIX note above BUFFER_S -- a buffer shorter than XFADE_S makes the
# crossfade dip into live narration instead of silence. Fail fast instead of
# re-shipping that desync bug silently.
_short = {b: v for b, v in BUFFER_S.items() if v < XFADE_S}
if _short:
    raise ValueError(
        f"BUFFER_S values below XFADE_S ({XFADE_S}) will crossfade into live "
        f"narration, not silence: {_short}"
    )

RECORDING = "recordings/full-take.webm"
VO_DIR = "voiceover"
WORK = "build"
BEATS_DIR = os.path.join(WORK, "beats")


def ffprobe_duration(path):
    out = subprocess.check_output([
        FFPROBE, "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", path,
    ])
    return float(out.strip())


def main():
    os.makedirs(BEATS_DIR, exist_ok=True)

    with open(os.path.join(VO_DIR, "manifest.json"), encoding="utf-8") as f:
        manifest = json.load(f)
    vo_durations = {b["id"]: b["duration_s"] for b in manifest["beats"]}

    recording_total = ffprobe_duration(RECORDING)

    plan = []
    for i, beat_id in enumerate(BEAT_ORDER):
        start_s = BEAT_OFFSETS_MS[beat_id] / 1000.0
        if i + 1 < len(BEAT_ORDER):
            next_start_s = BEAT_OFFSETS_MS[BEAT_ORDER[i + 1]] / 1000.0
        else:
            next_start_s = recording_total
        available_s = next_start_s - start_s

        vo_dur = vo_durations[beat_id]
        target_s = vo_dur + BUFFER_S[beat_id]
        plan.append((beat_id, start_s, available_s, vo_dur, target_s))

    print(f"{'beat':<20}{'avail':>8}{'vo':>8}{'target':>8}{'action':>10}")
    for beat_id, start_s, available_s, vo_dur, target_s in plan:
        action = "pad" if target_s > available_s else "trim"
        print(f"{beat_id:<20}{available_s:8.2f}{vo_dur:8.2f}{target_s:8.2f}{action:>10}")

    raw_total = sum(t for _, _, _, _, t in plan)
    xfade_total = raw_total - XFADE_S * (len(plan) - 1)
    print(f"\nSum of beat lengths: {raw_total:.2f}s -> after {len(plan)-1} crossfades: {xfade_total:.2f}s\n")

    # 1. Per-beat: extract, pad/trim to target_s, mux with VO (no -shortest — video is
    #    intentionally >= audio length; the trailing buffer is meant to hold silently).
    beat_files = []
    for beat_id, start_s, available_s, vo_dur, target_s in plan:
        raw_path = os.path.join(BEATS_DIR, f"{beat_id}_raw.mp4")
        video_path = os.path.join(BEATS_DIR, f"{beat_id}_video.mp4")
        muxed_path = os.path.join(BEATS_DIR, f"{beat_id}.mp4")
        vo_path = os.path.join(VO_DIR, f"{beat_id}.mp3")

        extract_len = min(available_s, target_s)
        subprocess.run([
            FFMPEG, "-y", "-v", "error",
            "-i", RECORDING,
            "-ss", f"{start_s:.3f}", "-t", f"{extract_len:.3f}",
            "-an", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
            raw_path,
        ], check=True)

        if target_s > available_s:
            pad = target_s - available_s
            subprocess.run([
                FFMPEG, "-y", "-v", "error",
                "-i", raw_path,
                "-vf", f"tpad=stop_mode=clone:stop_duration={pad:.3f}",
                "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
                video_path,
            ], check=True)
        else:
            video_path = raw_path

        # BUG FIX (audio/video desync, part 2): acrossfade has no offset parameter --
        # unlike xfade, it just crossfades based on each input's own stream length. The
        # video track here is target_s long (padded/trimmed) but without this apad the
        # audio track would stay at vo_dur (its raw TTS length), shorter by this beat's
        # buffer. Chained across 13 beats those per-beat shortfalls accumulate into the
        # audio finishing ~18s before the video -- apad to target_s so every beat's
        # audio and video are the same length, keeping the acrossfade chain aligned
        # with the xfade chain all the way to the end.
        subprocess.run([
            FFMPEG, "-y", "-v", "error",
            "-i", video_path, "-i", vo_path,
            "-af", f"apad=whole_dur={target_s:.3f}",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
            muxed_path,
        ], check=True)

        beat_files.append(muxed_path)
        print(f"[{beat_id}] target={target_s:.2f}s -> {muxed_path}")

    # 2. Crossfade all beats together (video: xfade, audio: acrossfade) instead of a
    #    hard-cut concat, for smoother beat-to-beat transitions.
    inputs = []
    for bf in beat_files:
        inputs += ["-i", bf]

    durations = [t for _, _, _, _, t in plan]
    filters = []
    prev_v = "0:v"
    prev_a = "0:a"
    acc = durations[0]
    for i in range(1, len(beat_files)):
        offset = acc - XFADE_S
        vlabel = f"vx{i}"
        alabel = f"ax{i}"
        filters.append(f"[{prev_v}][{i}:v]xfade=transition=fade:duration={XFADE_S}:offset={offset:.3f}[{vlabel}]")
        filters.append(f"[{prev_a}][{i}:a]acrossfade=d={XFADE_S}[{alabel}]")
        prev_v, prev_a = vlabel, alabel
        acc = acc + durations[i] - XFADE_S

    filter_complex = ";".join(filters)
    assembled = os.path.join(WORK, "assembled.mp4")
    cmd = [FFMPEG, "-y", "-v", "error", *inputs,
           "-filter_complex", filter_complex,
           "-map", f"[{prev_v}]", "-map", f"[{prev_a}]",
           "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k",
           assembled]
    subprocess.run(cmd, check=True)
    print(f"\nAssembled (crossfaded): {assembled}")
    print(f"Final duration: {ffprobe_duration(assembled):.2f}s")

    # 3. Cumulative-timestamp SRT captions from the VO text (storyboard), offset by the
    #    crossfade overlap eaten out of each beat boundary.
    with open("storyboard.json", encoding="utf-8") as f:
        storyboard = json.load(f)
    beat_vo_text = {b["id"]: b["vo"] for b in storyboard["beats"]}

    def fmt(t):
        h = int(t // 3600)
        m = int((t % 3600) // 60)
        s = int(t % 60)
        ms = int(round((t - int(t)) * 1000))
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    t = 0.0
    srt_lines = []
    n = 1
    for beat_id, _, _, vo_dur, target_s in plan:
        # Pre-wrap into short, deliberate lines (max ~2) instead of leaving one long
        # logical line for libass to auto-wrap — auto-wrap vs. the forced box width
        # mismatched and left ghosted glyph edges peeking past the box in testing.
        wrapped = "\n".join(textwrap.wrap(beat_vo_text[beat_id], width=42))
        srt_lines.append(f"{n}\n{fmt(t)} --> {fmt(t + vo_dur)}\n{wrapped}\n")
        n += 1
        # Each beat's own clip is target_s long, but the next one starts fading in
        # XFADE_S before this one ends (xfade overlap) — same offset math as above.
        t += target_s - XFADE_S

    with open(os.path.join(WORK, "captions.srt"), "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))
    print(f"Captions: {os.path.join(WORK, 'captions.srt')}")


if __name__ == "__main__":
    main()
