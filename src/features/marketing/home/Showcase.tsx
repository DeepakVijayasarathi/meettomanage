import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  key: string;
  title: string;
  body: string;
  alt: string;
}

const AUTO_MS = 7000;

/** A tabbed product tour. The selected tab's real screenshot crossfades in; the tabs advance on
 *  their own every few seconds (with a progress line) until the visitor hovers, focuses or picks
 *  one. Auto-advance is off under reduced motion. Below `lg` the tabs sit above the screenshot. */
export function Showcase({ tabs, base = "/product" }: { tabs: Tab[]; base?: string }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    if (paused || reduced.current) return;
    const id = window.setTimeout(() => setActive((i) => (i + 1) % tabs.length), AUTO_MS);
    return () => window.clearTimeout(id);
  }, [active, paused, tabs.length]);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[340px_1fr] lg:gap-12" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div role="tablist" aria-label="Platform tour" aria-orientation="vertical" className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-0 lg:overflow-visible">
        {tabs.map((tab, i) => {
          const on = i === active;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`tour-tab-${tab.key}`}
              aria-selected={on}
              aria-controls={`tour-panel-${tab.key}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "relative shrink-0 border border-[#EFE3D7] bg-white px-5 py-4 text-start transition-colors lg:border-0 lg:border-s-2 lg:bg-transparent lg:py-5",
                on ? "border-[#1C1917] lg:border-s-[#1C1917]" : "text-[#57534E] hover:text-[#1C1917] lg:border-s-[#EFE3D7]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]"
              )}
            >
              <span className={cn("block text-base font-bold", on ? "text-[#1C1917]" : "text-[#44403C]")}>{tab.title}</span>
              <span className={cn("hidden overflow-hidden text-[15px] leading-relaxed text-[#57534E] motion-safe:transition-all motion-safe:duration-500 lg:block", on ? "mt-2 max-h-40 opacity-100" : "max-h-0 opacity-0")}>{tab.body}</span>
              {on && !paused && !reduced.current && (
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden lg:inset-y-0 lg:start-[-2px] lg:h-auto lg:w-0.5">
                  <span key={`${active}-${paused}`} className="mx-progress block h-full w-full bg-[#C2410C] lg:origin-top" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div>
        <div>
          <div className="relative aspect-[1605/980]">
            {tabs.map((tab, i) => (
              <div
                key={tab.key}
                role="tabpanel"
                id={`tour-panel-${tab.key}`}
                aria-labelledby={`tour-tab-${tab.key}`}
                aria-hidden={i !== active}
                className={cn("absolute inset-0 motion-safe:transition-opacity motion-safe:duration-700", i === active ? "opacity-100" : "pointer-events-none opacity-0")}
              >
                <img src={`${base}/${tab.key}-1312.webp`} srcSet={`${base}/${tab.key}-1312.webp 1312w, ${base}/${tab.key}.webp 1605w`} sizes="(min-width: 1024px) 800px, 100vw" alt={tab.alt} width={1605} height={980} loading="lazy" decoding="async" className="h-full w-full object-contain" />
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-[#57534E] lg:hidden">{tabs[active].body}</p>
      </div>
    </div>
  );
}
