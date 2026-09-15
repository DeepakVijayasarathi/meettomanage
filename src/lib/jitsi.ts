/**
 * Builds a URL to the raw hosted Jitsi web client for links opened directly in a new tab
 * (not the embedded classroom, which passes the same information to the Jitsi IFrame API's
 * own `jwt`/`userInfo`/`configOverwrite` options instead — see JitsiLive.tsx). The IFrame
 * API path is the only place that was suppressing Jitsi's own prejoin name prompt; a link
 * opened this way needs the same config carried via URL hash params instead, or Jitsi stops
 * to ask the caller to type their name before joining.
 *
 * `displayName` is only worth passing (and prejoin only worth skipping) when the caller's
 * own identity is known and it's really them joining right now — never bake a name into a
 * link meant to be shared with someone else, since whoever actually opens it may not be
 * that person.
 */
export function buildJitsiJoinUrl(domain: string, room: string, token?: string | null, displayName?: string): string {
  const hashParts = [
    token ? `jwt=${token}` : null,
    displayName ? "config.prejoinConfig.enabled=false" : null,
    displayName ? `userInfo.displayName=${encodeURIComponent(JSON.stringify(displayName))}` : null,
  ].filter((part): part is string => part !== null);
  return `https://${domain}/${room}${hashParts.length ? `#${hashParts.join("&")}` : ""}`;
}

// Repeated live report: a parent granted the site's own camera/mic permission (visibly
// "Allow" in the browser) and it still didn't work, unlike Zoom/Meet. The one class of
// browser this is a known, well-documented dead end for is an in-app "mini browser" --
// WhatsApp, Instagram, Facebook, Line and similar apps open links in their own stripped-
// down WebView instead of the phone's real browser, and that WebView is well known to
// silently break getUserMedia (camera/mic) for video calls even when the page-level
// permission looks granted -- there's no code-level fix for this, since it's the host
// app's own WebView implementation making the call, not anything a website can detect and
// route around. The one thing a website *can* do reliably is detect it and tell the user
// to open the link in their actual browser instead. User-agent sniffing is normally to be
// avoided, but this is the one legitimate, narrow use for it: there's no feature-detection
// substitute for "which app's WebView is this."
const IN_APP_BROWSER_UA_MARKERS = [
  "WhatsApp",
  "FBAN", // Facebook app (iOS)
  "FBAV", // Facebook app (Android)
  "Instagram",
  "Line/", // LINE messenger
  "MicroMessenger", // WeChat
];

export function isLikelyInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return IN_APP_BROWSER_UA_MARKERS.some((marker) => ua.includes(marker));
}
