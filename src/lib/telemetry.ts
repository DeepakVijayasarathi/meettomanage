const API_ROOT = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const seen = new Map<string, number>();

function clean(value: string, max: number) {
  return value.replace(/Bearer\s+[\w.-]+/gi, "Bearer [redacted]").slice(0, max);
}

export function reportClientError(error: unknown, kind = "runtime", componentStack?: string) {
  if (!API_ROOT || import.meta.env.DEV) return;
  const err = error instanceof Error ? error : new Error(String(error));
  const key = `${kind}:${err.message}:${window.location.pathname}`;
  const now = Date.now();
  if ((seen.get(key) ?? 0) > now - 60_000) return;
  seen.set(key, now);
  const body = JSON.stringify({
    kind,
    message: clean(err.message || "Unknown browser error", 300),
    path: clean(window.location.pathname, 500),
    stack: clean([err.stack, componentStack].filter(Boolean).join("\n"), 3000),
    release: document.querySelector<HTMLMetaElement>('meta[name="release"]')?.content,
  });
  void fetch(`${API_ROOT}/api/client-errors`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true,
  }).catch(() => undefined);
}

export function installGlobalErrorReporting() {
  window.addEventListener("error", (event) => reportClientError(event.error ?? event.message, "window"));
  window.addEventListener("unhandledrejection", (event) => reportClientError(event.reason, "promise"));
}
