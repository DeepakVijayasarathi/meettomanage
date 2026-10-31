import { marketingVisitorId } from "@/lib/analytics";

/**
 * Sticky A/B bucket for this browser. The visitor id is hashed with the experiment name, so the
 * same visitor always sees the same variant and different experiments split independently.
 * `?variant=<name>` in the URL forces a variant, for checking each one by hand.
 */
export function experimentVariant<V extends string>(experiment: string, variants: readonly V[]): V {
  try {
    const forced = new URLSearchParams(window.location.search).get("variant");
    if (forced && (variants as readonly string[]).includes(forced)) return forced as V;
  } catch {
    /* no URL to read */
  }
  const key = `${experiment}:${marketingVisitorId()}`;
  let hash = 2166136261; // FNV-1a
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return variants[(hash >>> 0) % variants.length];
}
