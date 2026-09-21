/**
 * Step-by-step help for re-allowing the camera and microphone after the browser (or the device) blocked
 * them. Browsers never ask again once a site is blocked, so the only way back is the person changing a
 * setting -- and where that setting lives depends on the device. The dialog used to show laptop-only
 * steps ("Windows Settings -> Privacy"), which left a parent on an Android tablet with nowhere to go.
 */
export type MediaDevicePlatform = "android" | "ios" | "desktop";

export interface MediaHelp {
  platform: MediaDevicePlatform;
  /** Numbered steps, in order. Plain text; the last step is always "come back and try again". */
  steps: string[];
  /** One extra line for when the site setting is already Allow but it still doesn't work. */
  stillStuck: string;
}

export function detectPlatform(userAgent: string, maxTouchPoints = 0): MediaDevicePlatform {
  if (/android/i.test(userAgent)) return "android";
  // iPadOS 13+ reports itself as a Mac; a touch screen is what gives it away.
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) return "ios";
  return "desktop";
}

export function getMediaHelp(platform: MediaDevicePlatform): MediaHelp {
  const back = "Come back to this page and tap Try again.";
  if (platform === "android") {
    return {
      platform,
      steps: [
        "Tap the lock (or settings) icon at the left of the address bar, then tap Permissions.",
        "Turn Camera and Microphone on (Allow).",
        back,
      ],
      stillStuck:
        "Still blocked? Open the phone or tablet's Settings → Apps → Chrome → Permissions, and allow Camera and Microphone there. Also close any other app that may be using the camera.",
    };
  }
  if (platform === "ios") {
    return {
      platform,
      steps: [
        "Tap the aA icon at the left of the address bar, then Website Settings.",
        "Set Camera and Microphone to Allow.",
        back,
      ],
      stillStuck:
        "Still blocked? Open the device's Settings → Safari (or Chrome) → Camera and Microphone, and choose Ask or Allow.",
    };
  }
  return {
    platform,
    steps: [
      "Click the camera or lock icon at the left of the address bar.",
      "Set Camera and Microphone to Allow.",
      back,
    ],
    stillStuck:
      "Still stuck? Check Windows Settings → Privacy → Camera / Microphone (or Mac System Settings → Privacy & Security), and close any other app using the camera.",
  };
}
