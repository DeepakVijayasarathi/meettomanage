export const OPEN_COMMAND_PALETTE_EVENT = "m2m:open-command-palette";

/**
 * Scores how well `query` matches `text`: whole-word prefix beats substring beats in-order letters
 * ("hw" finds "Homework"). Returns 0 for no match.
 */
export function matchScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  if (t.startsWith(q)) return 100;
  if (t.split(/[\s&/-]+/).some((word) => word.startsWith(q))) return 80;
  if (t.includes(q)) return 60;
  let i = 0;
  for (const ch of t) if (ch === q[i]) i++;
  return i === q.length ? 20 : 0;
}
