import { useCallback, useEffect, useRef, useState } from "react";
import { apiEnabled, userMessage } from "@/lib/api";

interface CacheEntry {
  data: unknown;
  expiresAtMs: number;
}

// Shared across every useApiData caller in the app. Several screens (e.g. Admin/Subadmin
// Batches, Sessions, Availability, Resources, DemoScheduling, Calendar) independently fetch
// the same near-static reference data (teacher list, batch list) on every mount with no
// cache — this was a real duplicate-request bottleneck. Opt-in via `cacheKey` so existing
// callers are unaffected; a fresh mount within the TTL reuses the last result instead of
// re-fetching, and concurrent mounts for the same key share a single in-flight request.
const dataCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const DEFAULT_TTL_MS = 60_000;

/** Drops a cached entry (and any in-flight request for it) so the next mount/read fetches fresh. Call after a mutation that invalidates the cached data. */
export function invalidateApiDataCache(cacheKey: string): void {
  dataCache.delete(cacheKey);
  inFlightRequests.delete(cacheKey);
}

/**
 * Fetches from the API when it is configured, otherwise serves the mock
 * fallback — screens are wired progressively without breaking demo mode.
 *
 * In API mode the mock fallback is never rendered: screens start from an
 * empty value (and stay empty if the request fails) so a real login can
 * never see demo data. Array fallbacks empty to []; other shapes should
 * pass an explicit `emptyValue`.
 *
 * Pass `options.cacheKey` for near-static reference data (teacher/batch lists, menus,
 * course catalog) that many screens fetch independently — it dedupes concurrent
 * requests and reuses the last result for `options.ttlMs` (default 60s) instead of
 * re-fetching on every mount. Omit it for anything that must always be fresh.
 */
export function useApiData<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  emptyValue?: T,
  options?: { cacheKey?: string; ttlMs?: number },
): {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const cacheKey = options?.cacheKey;
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;

  const getCached = (): T | undefined => {
    if (!cacheKey) return undefined;
    const entry = dataCache.get(cacheKey);
    if (entry && entry.expiresAtMs > Date.now()) return entry.data as T;
    return undefined;
  };

  const [data, setData] = useState<T>(() => {
    if (!apiEnabled()) return fallback;
    const cached = getCached();
    if (cached !== undefined) return cached;
    if (emptyValue !== undefined) return emptyValue;
    return Array.isArray(fallback) ? ([] as unknown as T) : fallback;
  });
  const [loading, setLoading] = useState(apiEnabled() && getCached() === undefined);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const reload = useCallback(() => {
    if (cacheKey) invalidateApiDataCache(cacheKey);
    setVersion((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  useEffect(() => {
    if (!apiEnabled()) return;

    const cached = version === 0 ? getCached() : undefined;
    if (cached !== undefined) {
      setData(cached);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const run = (): Promise<T> => {
      if (!cacheKey) return fetcherRef.current();
      const existing = inFlightRequests.get(cacheKey) as Promise<T> | undefined;
      if (existing) return existing;
      const promise = fetcherRef.current()
        .then((result) => {
          dataCache.set(cacheKey, { data: result, expiresAtMs: Date.now() + ttlMs });
          return result;
        })
        .finally(() => {
          inFlightRequests.delete(cacheKey);
        });
      inFlightRequests.set(cacheKey, promise);
      return promise;
    };

    run()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(userMessage(err, "Request failed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, cacheKey]);

  return { data, loading, error, reload };
}
