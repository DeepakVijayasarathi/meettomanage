// Loads Jitsi's external_api.js for a domain, shared by every JitsiLive mount (see the
// cache note below). Kept in its own file so the retry behaviour can be unit-tested.

const scriptPromises = new Map<string, Promise<void>>();

// Bug fixed 2026-09-16: this cache is module-level, so it outlives every unmount/remount of
// JitsiLive across the whole SPA session. A stale entry here reproduced exactly as "host
// clicks Start Class repeatedly, same stuck screen every time" -- one transient script-load
// failure (or a request that never fires onload/onerror at all, e.g. a flaky network hiccup)
// used to leave a dead/never-settling promise permanently cached for that domain, so every
// later click just re-awaited the same broken promise forever instead of retrying the actual
// <script> load. Now a failed or timed-out attempt removes its own cache entry so the next
// click gets a fresh load.
/** Shown when the video script can't be loaded even after retrying -- almost always the
 *  family's own connection (live, 4 Nov 2026: the request never reached the video server). */
export const JITSI_SLOW_NETWORK_MESSAGE =
  "Your internet is slow to reach the class right now. Please check your Wi-Fi or mobile data, then tap Try again.";

function loadJitsiScriptOnce(domain: string, timeoutMs: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://${domain}/external_api.js`;
    script.async = true;
    const timeout = setTimeout(() => {
      script.remove();
      reject(new Error(JITSI_SLOW_NETWORK_MESSAGE));
    }, timeoutMs);
    script.onload = () => {
      clearTimeout(timeout);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error(JITSI_SLOW_NETWORK_MESSAGE));
    };
    document.head.appendChild(script);
  });
}

// Live, 4 Nov 2026: one 15-second attempt on a weak phone connection ended the join with
// "Timed out loading the Jitsi Meet API" and the child sat on that screen (the teacher saw them
// stuck on "Joining…"). Now up to 3 attempts of 30 seconds each before giving up.
const JITSI_SCRIPT_ATTEMPTS = 3;
const JITSI_SCRIPT_TIMEOUT_MS = 30_000;

export function loadJitsiScript(
  domain: string,
  attempts: number = JITSI_SCRIPT_ATTEMPTS,
  timeoutMs: number = JITSI_SCRIPT_TIMEOUT_MS,
): Promise<void> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  let promise = scriptPromises.get(domain);
  if (!promise) {
    promise = (async () => {
      let lastError: unknown;
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          await loadJitsiScriptOnce(domain, timeoutMs);
          return;
        } catch (err) {
          lastError = err;
          if (window.JitsiMeetExternalAPI) return;
        }
      }
      throw lastError;
    })().catch((err) => {
      scriptPromises.delete(domain);
      throw err;
    });
    scriptPromises.set(domain, promise);
  }
  return promise;
}
