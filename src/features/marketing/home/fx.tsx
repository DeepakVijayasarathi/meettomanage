import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";


/** Fades and lifts its children in once they scroll into view, staggered by `delay` ms. */
export function Reveal({ children, delay = 0, className, as: Tag = "div" }: { children: ReactNode; delay?: number; className?: string; as?: ElementType }) {
  const { ref, inView } = useInView<HTMLElement>(0.15);
  return (
    <Tag
      ref={ref}
      className={cn("motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out", inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0", className)}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/** Counts up to `to` when scrolled into view. Shows the final value straight away under reduced motion. */
export function CountUp({ to, prefix = "", suffix = "", duration = 1400, locale = "en-IN" }: { to: number; prefix?: string; suffix?: string; duration?: number; locale?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4);
  const [value, setValue] = useState(0);
  const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(to);
      return;
    }
    let raf = 0;
    const begin = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - begin) / duration);
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, to, duration]);

  return (
    <span ref={ref}>
      <span className="sr-only">{prefix}{to.toLocaleString(locale)}{suffix}</span>
      <span aria-hidden="true">{prefix}{value.toLocaleString(locale)}{suffix}</span>
    </span>
  );
}

/** A card with a soft orange spotlight that follows the pointer. */
export function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }
  return (
    <div ref={ref} onMouseMove={onMove} className={cn("group relative overflow-hidden border border-[#E2E8F0] bg-white transition-shadow duration-300 hover:shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)]", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "radial-gradient(380px circle at var(--mx, 50%) var(--my, 50%), rgba(249,115,22,0.13), transparent 60%)" }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
