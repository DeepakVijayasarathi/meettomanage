import { useEffect, useState, type DependencyList, type RefObject } from "react";

export interface FixedButtonCollision {
  /** Text, or an interactive control, is currently rendering under the button. */
  coversContent: boolean;
  /**
   * Specifically an interactive control (a table's pagination arrow, a row's own button,
   * a link) — not just plain text. Fading the floating button doesn't help here: it's
   * still `position: fixed` on top and still swallows the click meant for whatever's
   * underneath, at any opacity. A pagination "next page" chevron (icon-only, no text)
   * wasn't even detected as "covered" at all before this — collision checking only ever
   * looked for text — so on any page whose table pagination lands at the bottom-right,
   * this button sat there at full opacity, permanently blocking it. Callers should drop
   * pointer-events while this is true so the click reaches the real control instead.
   */
  coversInteractive: boolean;
}

const INTERACTIVE_SELECTOR =
  "button, a[href], input, select, textarea, [role='button'], [role='link'], [tabindex]:not([tabindex='-1'])";

/**
 * Detects whether a fixed-position floating button (bottom-corner widget launcher) is
 * currently sitting on top of real page content, so the caller can back off toward
 * transparent instead of fully covering it — and, when what's underneath is itself
 * interactive, stop intercepting clicks entirely so that control stays usable. Shared by
 * FloatingNotes and DoubtChatbot — factored out after confirming live that no static
 * amount of page padding can protect content that isn't at the very end of the page (see
 * FloatingNotes' original comment): whatever a page's own layout happens to put there
 * gets visually covered regardless, at every scroll position, on every viewport size.
 *
 * `recheckDeps` mirrors the caller's own recompute triggers (e.g. `[enabled, open]`) —
 * whenever one changes, an immediate recheck runs instead of waiting for the next
 * scroll/resize.
 */
export function useFixedButtonCollision(buttonRef: RefObject<HTMLElement | null>, recheckDeps: DependencyList): FixedButtonCollision {
  const [result, setResult] = useState<FixedButtonCollision>({ coversContent: false, coversInteractive: false });

  useEffect(() => {
    let frame: number | null = null;

    // A leaf element with its own direct text is a reasonable stand-in for "real content"
    // (a date, a figure, a label) without needing to know any given page's structure —
    // generic layout wrappers (main, page/card containers) never carry text directly, only
    // through further-nested children.
    function hasOwnText(el: Element): boolean {
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) return true;
      }
      // A chart's axis/tick labels (recharts, and SVG text generally) nest their actual
      // text a level deeper — <text><tspan>₹10k</tspan></text> — so the direct-child check
      // above never sees it: elementsFromPoint only ever returns the outer <text>/<svg>
      // node, never the inner <tspan>. Confirmed live: a dashboard's revenue chart sat
      // under this button at full opacity because of exactly this gap.
      if ((el.tagName === "text" || el.tagName === "tspan") && el.textContent?.trim()) return true;
      // An icon badge (a KpiCard/StatCard's colored circular icon chip, a list row's leading
      // icon) carries no text at all, so the checks above never flag it — confirmed live: the
      // "Payout This Month" KPI card's wallet icon sat completely eclipsed behind this button
      // at full opacity, because elementsFromPoint only ever saw the icon's own <svg>/<path>,
      // none of which have text content. Visually it's still a designed, meaningful piece of
      // the UI (not inert page background) — a second icon rendered directly on top of it
      // reads as broken, not just "content-free padding underneath."
      if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) return true;
      return false;
    }

    function pointCollision(x: number, y: number, button: HTMLElement): { text: boolean; interactive: boolean } {
      const stack = document.elementsFromPoint(x, y);
      let text = false;
      let interactive = false;
      for (const el of stack) {
        if (el === button || button.contains(el)) continue;
        if (!text && hasOwnText(el)) text = true;
        if (!interactive && el.closest(INTERACTIVE_SELECTOR)) interactive = true;
        if (text && interactive) break;
      }
      return { text, interactive };
    }

    function checkCollision() {
      frame = null;
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      // Sample several points across the button's footprint, not just its exact center —
      // on a 48x48 button the center pixel can land on padding/whitespace inside a card
      // (e.g. the gap between a "Phone" row and a "Department" row) while the rest of the
      // button still visually sits on top of that row's text. The four quadrant midpoints
      // catch most cases, but a status pill sitting right at the button's edge (its own
      // bottom-left corner just clipping one letter of a badge, confirmed live on a
      // parent's "Recent Activity" list) can miss a purely interior 3x3-minus-edges grid
      // entirely — the true corners and edge midpoints below close that gap.
      const points: Array<[number, number]> = [
        [0.5, 0.5],
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
        [0.5, 0],
        [0.5, 1],
        [0, 0.5],
        [1, 0.5],
      ];
      let text = false;
      let interactive = false;
      for (const [fx, fy] of points) {
        const hit = pointCollision(rect.left + rect.width * fx, rect.top + rect.height * fy, button);
        if (hit.text) text = true;
        if (hit.interactive) interactive = true;
        if (text && interactive) break;
      }
      setResult({ coversContent: text || interactive, coversInteractive: interactive });
    }

    function scheduleCheck() {
      if (frame !== null) return;
      frame = requestAnimationFrame(checkCollision);
    }

    scheduleCheck();
    // capture: true — scroll doesn't bubble, but a capturing listener on window still fires
    // for scroll events on any descendant scrollable region (a dialog's own overflow-y-auto
    // panel, a Kanban column, etc.), not just the page/window scroll itself.
    window.addEventListener("scroll", scheduleCheck, { capture: true, passive: true });
    window.addEventListener("resize", scheduleCheck);

    // Confirmed live: the very first check (the scheduleCheck() call above, right after
    // mount) can run before the page has actually finished laying out — a parent
    // dashboard's "Recent Activity" list, present in the DOM from the first render, still
    // shifted into its final position ~1s later (web font swap reflowing every card),
    // after which this button sat squarely over a status badge at full opacity with
    // nothing left to trigger a recheck (scroll/resize deps hadn't changed). A
    // ResizeObserver on <body> catches that class of "content resized/reflowed without a
    // scroll or window resize" change generically, instead of guessing a fixed delay.
    // Guarded — jsdom (this hook's own test environment, via any component that mounts
    // FloatingNotes/DoubtChatbot) has no ResizeObserver global at all.
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleCheck) : null;
    resizeObserver?.observe(document.body);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleCheck, { capture: true });
      window.removeEventListener("resize", scheduleCheck);
      resizeObserver?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, recheckDeps);

  return result;
}
