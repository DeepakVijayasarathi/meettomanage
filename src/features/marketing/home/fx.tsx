import { useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
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

/** A stable metric for crawlers, assistive technology and no-JavaScript visitors. */
export function CountUp({ to, prefix = "", suffix = "", locale = "en-IN" }: { to: number; prefix?: string; suffix?: string; locale?: string }) {
  return <span>{prefix}{to.toLocaleString(locale)}{suffix}</span>;
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
