import { useEffect, useState } from "react";

/** Keyframes for the whole home page. Everything animated is registered only when the visitor
 *  hasn't asked for reduced motion, and every element's un-animated state is its finished look,
 *  so reduced-motion visitors get a complete static page rather than a half-built one. */
export { default as FX_CSS } from "./fx.css?inline";

/** True once the page has scrolled past `offset` px — drives the nav's shadow. */
export function useScrolled(offset = 8): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return scrolled;
}
