import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { apiEnabled } from "@/lib/api";
import { cn } from "@/lib/utils";

type Status = "online" | "slow" | "offline";

const PING_INTERVAL_MS = 30_000;
const SLOW_MS = 1500;
const TIMEOUT_MS = 8000;

/** Browser connectivity plus, in API mode, a round-trip to the backend's /health so "Online" means the server is reachable too. */
function useNetworkStatus() {
  const [status, setStatus] = useState<Status>(navigator.onLine ? "online" : "offline");
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

    async function check() {
      if (!navigator.onLine) {
        setStatus("offline");
        setLatency(null);
        return;
      }
      if (!apiEnabled()) {
        setStatus("online");
        return;
      }
      const started = performance.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        // no-cors: we only care that the server answered, not about reading the body
        await fetch(`${baseUrl}/health`, { mode: "no-cors", cache: "no-store", signal: controller.signal });
        if (cancelled) return;
        const ms = Math.round(performance.now() - started);
        setLatency(ms);
        setStatus(ms > SLOW_MS ? "slow" : "online");
      } catch {
        if (cancelled) return;
        setLatency(null);
        setStatus("offline");
      } finally {
        clearTimeout(timer);
      }
    }

    check();
    const interval = setInterval(check, PING_INTERVAL_MS);
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, []);

  return { status, latency };
}

const META: Record<Status, { label: string; dot: string; text: string }> = {
  online: { label: "Online", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  slow: { label: "Slow network", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  offline: { label: "Offline", dot: "bg-red-500", text: "text-red-700 dark:text-red-400" },
};

export function NetworkStatus() {
  const { status, latency } = useNetworkStatus();
  const meta = META[status];
  const Icon = status === "offline" ? WifiOff : Wifi;

  return (
    <div
      role="status"
      aria-live="polite"
      title={latency != null ? `${meta.label} · ${latency} ms to server` : meta.label}
      className={cn("flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium", meta.text)}
    >
      <span className={cn("h-2 w-2 rounded-full", meta.dot, status !== "online" && "animate-pulse")} />
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{meta.label}</span>
    </div>
  );
}
