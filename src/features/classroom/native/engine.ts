export type ClassroomEngine = "iframe" | "native";

const STORAGE_KEY = "trn.classroomEngine";
/** Set for the rest of the tab when the native engine couldn't start, so retries use the iframe. */
const FALLBACK_KEY = "trn.classroomEngine.fallback";

/**
 * Which video engine a live class uses.
 *
 * - Teachers get the native lib-jitsi-meet engine (Meet-style screen) by default; students and
 *   parents stay on Jitsi's embedded page until the native one has more real-device mileage.
 * - `?engine=native` / `?engine=iframe` on any class link overrides this per browser (remembered).
 * - VITE_CLASSROOM_ENGINE=native|iframe sets the default for everyone in a deployment, e.g.
 *   `iframe` as a kill switch.
 * - If the native engine fails to start in this tab, the iframe is used for the rest of it.
 */
export function classroomEngine(mode: "teacher" | "student" = "student"): ClassroomEngine {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("engine");
    if (fromUrl === "native" || fromUrl === "iframe") {
      window.localStorage.setItem(STORAGE_KEY, fromUrl);
      if (fromUrl === "native") window.sessionStorage.removeItem(FALLBACK_KEY);
      return fromUrl;
    }
    if (window.sessionStorage.getItem(FALLBACK_KEY) === "iframe") return "iframe";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "native" || stored === "iframe") return stored;
  } catch {
    /* storage unavailable — fall through to the defaults */
  }
  const env = import.meta.env.VITE_CLASSROOM_ENGINE;
  if (env === "native" || env === "iframe") return env;
  return mode === "teacher" ? "native" : "iframe";
}

/** The native engine couldn't start (library didn't load, etc.): use the iframe for this tab. */
export function markNativeEngineFailed() {
  try {
    window.sessionStorage.setItem(FALLBACK_KEY, "iframe");
  } catch {
    /* the caller switches engine for this mount anyway */
  }
}
