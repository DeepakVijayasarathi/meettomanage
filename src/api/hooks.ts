import { useCallback, useEffect, useState } from "react";
import { apiEnabled } from "@/lib/api";

/**
 * Fetches from the API when it is configured, otherwise serves the mock
 * fallback — screens are wired progressively without breaking demo mode.
 *
 * In API mode the mock fallback is never rendered: screens start from an
 * empty value (and stay empty if the request fails) so a real login can
 * never see demo data. Array fallbacks empty to []; other shapes should
 * pass an explicit `emptyValue`.
 */
export function useApiData<T>(fetcher: () => Promise<T>, fallback: T, emptyValue?: T): {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const [data, setData] = useState<T>(() => {
    if (!apiEnabled()) return fallback;
    if (emptyValue !== undefined) return emptyValue;
    return Array.isArray(fallback) ? ([] as unknown as T) : fallback;
  });
  const [loading, setLoading] = useState(apiEnabled());
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!apiEnabled()) return;

    let cancelled = false;
    setLoading(true);
    fetcher()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Request failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return { data, loading, error, reload };
}
