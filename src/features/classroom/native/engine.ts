export type ClassroomEngine = "iframe" | "native";

const STORAGE_KEY = "trn.classroomEngine";

/**
 * Which video engine a live class uses. "iframe" (Jitsi's embedded page) stays the default until
 * the native lib-jitsi-meet engine has been proven on real devices. Testers opt in per browser by
 * opening any class link with `?engine=native` (remembered; `?engine=iframe` switches back), or a
 * deployment can flip the default with VITE_CLASSROOM_ENGINE=native.
 */
export function classroomEngine(): ClassroomEngine {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("engine");
    if (fromUrl === "native" || fromUrl === "iframe") {
      window.localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "native" || stored === "iframe") return stored;
  } catch {
    /* storage unavailable — fall through to the build default */
  }
  return import.meta.env.VITE_CLASSROOM_ENGINE === "native" ? "native" : "iframe";
}
