/**
 * Turns Jitsi's `micError` event into what the person should do. Live, 10 Nov 2026: a demo parent
 * on an Android phone "unmuted" over and over, rejoined ten times, and nobody could hear them --
 * the microphone never started and nothing on screen said so.
 */
export type MicErrorAction = { kind: "blocked" } | { kind: "banner"; message: string };

export function micErrorAction(type: string | undefined): MicErrorAction {
  const t = (type ?? "").toLowerCase();
  if (t.includes("permission")) return { kind: "blocked" };
  if (t.includes("not_found")) {
    return { kind: "banner", message: "No microphone was found on this device, so nobody can hear you. Connect one, or join from a phone." };
  }
  return {
    kind: "banner",
    message:
      "Your microphone didn't start, so nobody can hear you. Close other apps or tabs using the mic (WhatsApp call, Zoom, another class tab), then refresh this page.",
  };
}
