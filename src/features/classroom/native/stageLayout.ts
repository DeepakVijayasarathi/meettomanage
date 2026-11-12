/** Layout maths for the native call screen, kept separate so it can be unit-tested. */

export type CallLayout = "auto" | "gallery" | "speaker";

/** The column count that gives the largest 16:9 tiles for `count` tiles in a width x height box. */
export function bestColumns(count: number, width: number, height: number, gap: number) {
  let best = { cols: 1, area: 0 };
  for (let cols = 1; cols <= Math.max(1, count); cols++) {
    const rows = Math.ceil(count / cols);
    const tileW = Math.min((width - gap * (cols - 1)) / cols, (((height - gap * (rows - 1)) / rows) * 16) / 9);
    const area = tileW * ((tileW * 9) / 16);
    if (area > best.area) best = { cols, area };
  }
  return best.cols;
}

/** One page of the gallery: at most `maxTiles` items, with the page index clamped to what exists. */
export function galleryPage<T>(items: T[], maxTiles: number, page: number) {
  const size = Math.max(1, maxTiles);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(0, page), pages - 1);
  return { pageItems: items.slice(current * size, current * size + size), pages, page: current };
}

/**
 * Zoom-style ordering for a paged gallery: shared screens, then you, then whoever spoke in the last
 * minute (most recent first), then everyone else in join order. With a single page nothing moves,
 * so tiles don't jump around in a small class.
 */
export function prioritiseSpeakers<T extends { screen: boolean; participant: { isLocal: boolean; lastSpokeAt?: number } }>(
  items: T[],
  pageSize: number,
  now: number,
  windowMs = 60_000
): T[] {
  if (items.length <= pageSize) return items;
  const screens = items.filter((i) => i.screen);
  const self = items.filter((i) => !i.screen && i.participant.isLocal);
  const rest = items.filter((i) => !i.screen && !i.participant.isLocal);
  const recent = rest
    .filter((i) => (i.participant.lastSpokeAt ?? 0) > now - windowMs)
    .sort((a, b) => (b.participant.lastSpokeAt ?? 0) - (a.participant.lastSpokeAt ?? 0));
  const quiet = rest.filter((i) => !recent.includes(i));
  return [...screens, ...self, ...recent, ...quiet];
}
