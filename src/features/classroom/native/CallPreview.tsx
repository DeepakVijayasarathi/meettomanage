import { useEffect, useState } from "react";
import NativeStage from "./NativeStage";
import { NativeJitsiApi } from "./NativeJitsiApi";
import { createFakeLib, EVENTS, type FakeConference } from "./fakeLibJitsi";

/**
 * Development-only preview of the native call screen, driven by the in-memory lib-jitsi-meet stand-in.
 * Query: ?n=<students> &role=student &share=1 &knock=<n> &hands=<n> &chat=1 &late=1 &react=1 &spot=<id> &askunmute=1 &weak=1 &prejoin=1 (dev builds only, see App.tsx).
 */

const PALETTE = ["#334155", "#3f3f46", "#1e3a5f", "#3b2f2f", "#2f3b2f", "#3a2f45"];

/** An animated canvas "camera": a dark backdrop, a moving circle and the person's name. */
function fakeCamera(label: string, desktop = false): MediaStream | null {
  const canvas = document.createElement("canvas");
  canvas.width = desktop ? 1280 : 640;
  canvas.height = desktop ? 720 : 360;
  const ctx = canvas.getContext("2d");
  if (!ctx || !("captureStream" in canvas)) return null;
  const bg = PALETTE[label.length % PALETTE.length];
  let t = Math.random() * 10;
  const draw = () => {
    t += 0.03;
    if (desktop) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#F26B1D";
      ctx.fillRect(0, 0, canvas.width, 90);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 40px sans-serif";
      ctx.fillText("Phonics · Lesson 19: Long vowels", 40, 60);
      ctx.fillStyle = "#1f2937";
      ctx.font = "32px sans-serif";
      ["a_e  → cake, lake, name", "i_e  → bike, kite, time", "o_e  → bone, home, rope"].forEach((line, i) => ctx.fillText(line, 60, 200 + i * 70));
    } else {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.arc(320 + Math.sin(t) * 20, 170 + Math.cos(t * 0.7) * 6, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(220, 260, 200, 120);
    }
    requestAnimationFrame(draw);
  };
  draw();
  return (canvas as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(15);
}

const NAMES = ["Aarav Kapoor", "Diya Sharma", "Kabir Singh", "Myra Joshi", "Ishaan Rao", "Anaya Gupta", "Vivaan Mehta", "Sara Khan", "Reyansh Iyer", "Zara Nair", "Arjun Das", "Kiara Bose", "Advik Menon", "Pari Shah", "Rohan Pillai", "Tara Reddy", "Neel Verma", "Ira Kulkarni", "Dev Malhotra", "Meera Bhat"];

export default function CallPreview() {
  const [api, setApi] = useState<NativeJitsiApi | null>(null);
  const q = new URLSearchParams(window.location.search);
  const role = q.get("role") === "student" ? "student" : "teacher";

  useEffect(() => {
    const n = Math.min(Number(q.get("n") ?? 6), NAMES.length);
    const fake = createFakeLib({
      moderator: role === "teacher",
      makeStream: (kind, label) => (kind === "audio" ? null : fakeCamera(label, kind === "desktop")),
    });
    window.JitsiMeetJS = fake;
    window.config = { hosts: { domain: "meet.test", muc: "conference.meet.test" }, websocket: "wss://meet.test/xmpp-websocket" };
    let created: NativeJitsiApi | null = null;
    let disposed = false;
    const timers: number[] = [];
    void NativeJitsiApi.create("meet.test", {
      roomName: "preview",
      jwt: "preview",
      userInfo: { displayName: role === "teacher" ? "Karan Mehta" : "Aarav Kapoor" },
      configOverwrite: { startWithAudioMuted: role === "student" },
      prejoin: q.get("prejoin") === "1",
    }).then((a) => {
      if (disposed) return a.dispose();
      created = a;
      a.join();
      setApi(a);
      (window as unknown as { __call?: NativeJitsiApi }).__call = a; // dev-only handle for debugging the preview
      // Dev-only: record a few seconds of this call with the browser recorder and return the file.
      (window as unknown as { __recordTest?: (ms: number) => Promise<Blob> }).__recordTest = async (ms: number) => {
        const { BrowserRecorder } = await import("../recording/browserRecorder");
        const { pickRecordingMimeType } = await import("../recording/plan");
        const chunks: Blob[] = [];
        const sink = { push: (b: Blob) => chunks.push(b) } as unknown as import("../recording/recordingUpload").RecordingUploader;
        const mimeType = pickRecordingMimeType()!;
        const rec = new BrowserRecorder(a, sink, { mimeType, onError: (e) => console.error(e) });
        await rec.start();
        await new Promise((r) => setTimeout(r, ms));
        await rec.stop();
        return new Blob(chunks, { type: mimeType.split(";")[0] });
      };
      // A fake microphone has no sound; drive the level meter so it can be seen moving.
      const levelTimer = window.setInterval(() => {
        const snap = a.getSnapshot();
        const mic = (snap.preview?.audioTrack ?? snap.participants.find((p) => p.isLocal)?.audioTrack) as { fire?: (e: string, l: number) => void } | undefined;
        mic?.fire?.(EVENTS.track.TRACK_AUDIO_LEVEL_CHANGED, Math.abs(Math.sin(Date.now() / 300)) * 0.8);
      }, 120);
      timers.push(levelTimer);
      // With ?prejoin=1 nothing connects until "Join now", so the class fills in after that.
      const whenJoined = (fn: () => void) => {
        if (a.getSnapshot().phase === "joined") return fn();
        const stop = a.subscribe(() => {
          if (a.getSnapshot().phase !== "joined") return;
          stop();
          fn();
        });
      };
      whenJoined(() => timers.push(window.setTimeout(() => {
        const conf = fake.lastConference as FakeConference;
        NAMES.slice(role === "student" ? 1 : 0, n + (role === "student" ? 1 : 0)).forEach((name, i) =>
          conf.remoteJoin(`p${i}`, name, { camera: i % 4 !== 3, mic: true, role: role === "student" && i === 0 ? "moderator" : "participant" })
        );
        // Half the class on this call screen, half on Jitsi's embedded page (as in a mixed rollout).
        for (const [id, p] of conf.participants) {
          if (Number(id.slice(1)) % 2 === 0) {
            p.props.m2mNative = "1";
            conf.emit(EVENTS.conference.PARTICIPANT_PROPERTY_CHANGED, p, "m2mNative", "", "1");
          }
        }
        // Some students muted, a few hands up, someone talking.
        for (let i = 1; i < n; i += 2) {
          const p = conf.participants.get(`p${i}`);
          const audio = p?.tracks.find((t) => t.getType() === "audio");
          if (audio) { audio.muted = true; conf.emit(EVENTS.conference.TRACK_MUTE_CHANGED, audio); }
        }
        const hands = Number(q.get("hands") ?? 2);
        for (let i = 0; i < Math.min(hands, n); i++) {
          const p = conf.participants.get(`p${i * 2 + 1}`);
          if (p) {
            p.props.raisedHand = String(Date.now() - (hands - i) * 30000);
            conf.emit(EVENTS.conference.PARTICIPANT_PROPERTY_CHANGED, p, "raisedHand", "", p.props.raisedHand);
          }
        }
        conf.emit(EVENTS.conference.DOMINANT_SPEAKER_CHANGED, "p0");
        if (q.get("share") === "1") conf.remoteShare("p0");
        for (let k = 0; k < Number(q.get("knock") ?? 0); k++) conf.emit(EVENTS.conference.LOBBY_USER_JOINED, `w${k}`, ["Aarav's Parent", "Guest Observer", "Neha Rao"][k % 3]);
        // Signals from the (simulated) teacher p0 in the student view, or from students in the teacher view.
        if (q.get("react") === "1") {
          ["👏", "🎉", "❤️", "😂", "👍"].forEach((emoji, k) =>
            timers.push(window.setTimeout(() => conf.remoteSignal(`p${k % n}`, { m2m: 1, type: "reaction", emoji }), 500 + k * 350)));
        }
        if (q.get("spot")) {
          if (role === "teacher") a.executeCommand("setSpotlight", q.get("spot"));
          else conf.remoteSignal("p0", { m2m: 1, type: "spotlight", id: q.get("spot") });
        }
        if (q.get("askunmute") === "1" && role === "student") {
          // Students join muted; the (simulated) teacher asks once the call has settled.
          timers.push(window.setTimeout(() => conf.remoteSignal("p0", { m2m: 1, type: "askUnmute", id: conf.myId }), 2000));
        }
        if (q.get("late") === "1") {
          timers.push(window.setTimeout(() => {
            const late = conf.remoteJoin("late1", "Neha Rao");
            late.props.raisedHand = String(Date.now());
            conf.emit(EVENTS.conference.PARTICIPANT_PROPERTY_CHANGED, late, "raisedHand", "", late.props.raisedHand);
          }, 5000));
        }
        if (q.get("weak") === "1") {
          conf.emit(EVENTS.connectionQuality.REMOTE_STATS_UPDATED, "p2", { connectionQuality: 15 });
          conf.emit(EVENTS.connectionQuality.REMOTE_STATS_UPDATED, "p4", { connectionQuality: 45 });
        }
        if (q.get("chat") === "1") {
          conf.emit(EVENTS.conference.MESSAGE_RECEIVED, "p0", "Good morning ma'am!", Date.now());
          conf.emit(EVENTS.conference.MESSAGE_RECEIVED, "p2", "Can you repeat the last word?", Date.now() + 1);
        }
      }, 300)));
    });
    return () => {
      disposed = true;
      timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
      created?.dispose();
      delete window.JitsiMeetJS;
      delete window.config;
    };
    // The query string is read once; reload the page to change it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="h-dvh w-screen bg-call-bg">
      {api && <NativeStage api={api} mode={role} canShareScreen title="Phonics-A1 · Session 19" onLeave={() => window.alert("Leave dialog (handled by JitsiLive)")} />}
    </div>
  );
}
