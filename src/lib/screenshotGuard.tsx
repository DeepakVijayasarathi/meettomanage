import { useEffect, useState } from "react";
import { apiEnabled } from "@/lib/api";
import { getPublicSettings } from "@/api/settings";

/** Academy setting (Admin → Settings → Security). Stored as a public setting so every portal can read it. */
export const SCREENSHOT_SETTING_KEY = "security.screenshotProtection";
const LOCAL_KEY = "m2m-screenshot-protection";
const CHANGED = "m2m:screenshot-protection-changed";

export function readLocalScreenshotProtection(): boolean {
  try { return localStorage.getItem(LOCAL_KEY) !== "off"; } catch { return true; }
}

/** Called after the setting is saved so open portals pick it up without a reload. */
export function announceScreenshotProtection(enabled: boolean) {
  try { localStorage.setItem(LOCAL_KEY, enabled ? "on" : "off"); } catch { /* the saved setting still applies after a reload */ }
  window.dispatchEvent(new CustomEvent(CHANGED, { detail: enabled }));
}

/** Deters casual screen capture while a portal is open: the page blurs when the tab is hidden or a Print Screen or
 *  snipping shortcut is pressed, the context menu is blocked on images and video, and printing is disabled. No web page
 *  can stop an OS-level screenshot or a phone camera; this only raises the effort. */
export function ScreenshotGuard() {
  const [enabled, setEnabled] = useState(readLocalScreenshotProtection);

  useEffect(() => {
    if (apiEnabled()) {
      getPublicSettings()
        .then((rows) => {
          const row = rows.find((r) => r.key === SCREENSHOT_SETTING_KEY);
          if (row && row.value != null) setEnabled(row.value !== "false");
        })
        .catch(() => { /* keep the last known value */ });
    }
    const onChanged = (e: Event) => setEnabled(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener(CHANGED, onChanged);
    return () => window.removeEventListener(CHANGED, onChanged);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!enabled) { root.classList.remove("shot-guard", "shot-hidden"); return; }
    root.classList.add("shot-guard");
    let timer: number | undefined;
    const hideBriefly = () => { root.classList.add("shot-hidden"); window.clearTimeout(timer); timer = window.setTimeout(sync, 1500); };
    const sync = () => root.classList.toggle("shot-hidden", document.visibilityState !== "visible");
    const onKey = (e: KeyboardEvent) => {
      const snip = e.shiftKey && (e.metaKey || e.ctrlKey) && ["s", "S", "3", "4", "5"].includes(e.key);
      if (e.key === "PrintScreen" || snip) {
        hideBriefly();
        if (e.key === "PrintScreen") void navigator.clipboard?.writeText("").catch(() => {});
      }
    };
    const onMenu = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest("img, video, canvas")) e.preventDefault();
    };
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("beforeprint", hideBriefly);
    document.addEventListener("contextmenu", onMenu);
    return () => {
      window.clearTimeout(timer);
      root.classList.remove("shot-guard", "shot-hidden");
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("beforeprint", hideBriefly);
      document.removeEventListener("contextmenu", onMenu);
    };
  }, [enabled]);

  return null;
}
