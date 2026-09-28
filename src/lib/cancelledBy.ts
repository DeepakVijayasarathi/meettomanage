/**
 * Splits a cancelled class's reason into who cancelled it and the details. The server writes
 * "Cancelled by {name} ({role}): {details}" (CancelledBy.cs); older classes cancelled before that
 * only have a free-text reason, which is returned as the details with no "who".
 */
export function parseCancellation(reason: string | null | undefined): { who: string | null; details: string } {
  const text = (reason ?? "").trim();
  const prefix = "Cancelled by ";
  if (!text.startsWith(prefix)) return { who: null, details: text };
  const rest = text.slice(prefix.length);
  const sep = rest.indexOf(": ");
  return sep === -1 ? { who: rest, details: "" } : { who: rest.slice(0, sep), details: rest.slice(sep + 2) };
}
