import { useEffect, useRef, useState } from "react";
import type { HomeCopy } from "./copy";

/** The hero picture: a live class of children, the teacher's view and a parent's phone, composed as one image.
 *  It tips back and settles flat as it scrolls into view (one rAF per scroll frame), and stays still when the visitor
 *  prefers reduced motion. */
export function HeroPicture({ c }: { c: HomeCopy["hero"]["room"] }) {
  const ref = useRef<HTMLElement>(null);
  const [p, setP] = useState(() => (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 1 : 0.5));

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      setP(Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.7))));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <figure ref={ref} className="relative mx-auto w-full max-w-[860px]">
      <div style={{ transform: `perspective(1800px) rotateX(${(1 - p) * 6}deg) translateY(${(1 - p) * 26}px) scale(${0.97 + 0.03 * p})`, transformOrigin: "50% 100%" }} className="will-change-transform">
        <img
          src="/product/hero-classroom.webp"
          srcSet="/product/hero-classroom-768.webp 768w, /product/hero-classroom.webp 1536w"
          sizes="(min-width: 1024px) 52vw, 100vw"
          alt={c.alt}
          width={1536}
          height={1024}
          decoding="async"
          fetchPriority="high"
          className="block h-auto w-full rounded-2xl"
        />
      </div>
      <figcaption className="mt-3 text-center text-xs font-medium text-[#6B6560]">{c.caption}</figcaption>
    </figure>
  );
}
