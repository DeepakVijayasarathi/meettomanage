import { useEffect, useState, type DependencyList, type RefObject } from "react";

/**
 * Detects whether a fixed-position floating button (bottom-corner widget launcher) is
 * currently sitting on top of real page content, so the caller can back off toward
 * transparent instead of fully covering it. Shared by FloatingNotes and DoubtChatbot —
 * factored out after confirming live that no static amount of page padding can protect
 * content that isn't at the very end of the page (see FloatingNotes' original comment):
 * whatever a page's own layout happens to put there gets visually covered regardless,
 * at every scroll position, on every viewport size.
 *
 * `recheckDeps` mirrors the caller's own recompute triggers (e.g. `[enabled, open]`) —
 * whenever one changes, an immediate recheck runs instead of waiting for the next
 * scroll/resize.
 */
export function useFixedButtonCollision(buttonRef: RefObject<HTMLElement | null>, recheckDeps: DependencyList): boolean {
  const [coversContent, setCoversContent] = useState(false);

  useEffect(() => {
    let frame: number | null = null;

    function checkCollision() {
      frame = null;
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const stack = document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);

      // A leaf element with its own direct text is a reasonable stand-in for "real content"
      // (a date, a figure, a label) without needing to know any given page's structure —
      // generic layout wrappers (main, page/card containers) never carry text directly, only
      // through further-nested children.
      const covering = stack.some((el) => {
        if (el === button || button.contains(el)) return false;
        for (const node of el.childNodes) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) return true;
        }
        return false;
      });
      setCoversContent(covering);
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
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleCheck, { capture: true });
      window.removeEventListener("resize", scheduleCheck);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, recheckDeps);

  return coversContent;
}
