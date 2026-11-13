import { useEffect, type RefObject } from "react";

/**
 * Canvases on the teacher's own page that a browser recording can include: the whiteboard and
 * the presentation (with its annotation layer). The server recorder only ever sees the video
 * call, so this is something only browser recording can do.
 *
 * A surface counts as the class's main content while it's on screen and large (the teacher has
 * maximized it); a small board in the side panel is left out so the recording stays on faces.
 */

interface Surface {
  canvas: HTMLCanvasElement;
  /** Canvases in the same group are stacked (e.g. a slide and its annotations). */
  group: string;
  layer: number;
  /** Painted behind the group, for canvases whose background comes from CSS. */
  background?: string;
}

const surfaces = new Set<Surface>();

export function registerRecordingSurface(surface: Surface): () => void {
  surfaces.add(surface);
  return () => {
    surfaces.delete(surface);
  };
}

/** Registers a canvas for as long as the component is mounted. */
export function useRecordingSurface(ref: RefObject<HTMLCanvasElement | null>, group: string, layer = 0, background?: string) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    return registerRecordingSurface({ canvas, group, layer, background: background ?? cssBackground(canvas) });
  }, [ref, group, layer, background]);
}

function cssBackground(canvas: HTMLCanvasElement) {
  for (let el: HTMLElement | null = canvas.parentElement; el; el = el.parentElement) {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== "transparent" && !/rgba\(.*,\s*0\)$/.test(bg)) return bg;
  }
  return "#ffffff";
}

export interface FeaturedSurface {
  /** Bottom layer first. */
  layers: HTMLCanvasElement[];
  background: string;
}

/** Fraction of the window a surface must cover to count as what the class is looking at. */
const FEATURED_SHARE = 0.4;

/** The largest visible surface group, if one covers enough of the window; otherwise null. */
export function featuredSurface(view = { width: window.innerWidth, height: window.innerHeight }): FeaturedSurface | null {
  const groups = new Map<string, Surface[]>();
  for (const s of surfaces) {
    if (!s.canvas.isConnected || s.canvas.width === 0 || s.canvas.height === 0) continue;
    groups.set(s.group, [...(groups.get(s.group) ?? []), s]);
  }
  let best: { area: number; list: Surface[] } | null = null;
  for (const list of groups.values()) {
    const base = [...list].sort((a, b) => a.layer - b.layer)[0];
    const rect = base.canvas.getBoundingClientRect();
    const visibleW = Math.max(0, Math.min(rect.right, view.width) - Math.max(rect.left, 0));
    const visibleH = Math.max(0, Math.min(rect.bottom, view.height) - Math.max(rect.top, 0));
    const area = visibleW * visibleH;
    if (area > (best?.area ?? 0)) best = { area, list };
  }
  if (!best || best.area < view.width * view.height * FEATURED_SHARE) return null;
  const sorted = [...best.list].sort((a, b) => a.layer - b.layer);
  return { layers: sorted.map((s) => s.canvas), background: sorted[0].background ?? "#ffffff" };
}
