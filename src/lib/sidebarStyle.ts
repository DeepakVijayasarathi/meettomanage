import { useSyncExternalStore } from "react";

export type SidebarStyle = "classic" | "floating" | "brand" | "slate";

export const SIDEBAR_STYLES: { id: SidebarStyle; label: string; hint: string }[] = [
  { id: "classic", label: "Classic", hint: "Light rail with a coloured edge on the active page" },
  { id: "floating", label: "Floating", hint: "Rounded card that floats off the edge, soft active pill" },
  { id: "brand", label: "Brand", hint: "Warm orange tint from the Meet to Manage logo, soft active pill" },
  { id: "slate", label: "Slate", hint: "Cool blue-grey tint, soft active pill" },
];

const KEY = "m2m.sidebarStyle";
const EVENT = "m2m:sidebar-style";
const IDS = SIDEBAR_STYLES.map((s) => s.id);

export function getSidebarStyle(): SidebarStyle {
  try {
    const v = localStorage.getItem(KEY);
    return IDS.includes(v as SidebarStyle) ? (v as SidebarStyle) : "classic";
  } catch {
    return "classic"; // storage blocked: fall back to the default look
  }
}

export function setSidebarStyle(style: SidebarStyle): void {
  try {
    localStorage.setItem(KEY, style);
  } catch {
    /* storage blocked: applies for this session only */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb); // another tab changed it
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The user's chosen sidebar design, remembered per browser/desktop profile. */
export function useSidebarStyle(): SidebarStyle {
  return useSyncExternalStore(subscribe, getSidebarStyle, () => "classic");
}
