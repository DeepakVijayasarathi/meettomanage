import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Opens every new page at the top. React Router swaps the page without a reload, so the
 * browser otherwise keeps the old scroll position (a footer link opened the next page at
 * its bottom). Back/forward ("POP") is left to the browser so it restores where the visitor
 * was, and a "#section" link scrolls to that section instead.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === "POP") return;
    if (hash) {
      // The section may belong to a lazily loaded page, so give it a few frames to appear.
      let tries = 0;
      const find = () => {
        const target = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
        else if (tries++ < 20) requestAnimationFrame(find);
      };
      find();
      return;
    }
    // "instant" overrides the site-wide `scroll-behavior: smooth`, which would otherwise
    // animate the jump from the bottom of the old page.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, navigationType]);

  return null;
}
