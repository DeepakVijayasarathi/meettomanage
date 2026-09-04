import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** EN/AR switcher for the marketing site's header — same pill-toggle visual pattern as
 *  Pricing.tsx's currency/cycle ToggleGroup, pulled out standalone since every marketing
 *  page wants it in its header, not just Pricing. Flipping it re-renders every page that
 *  reads useLang() and flips <html dir> site-wide (see lib/i18n.ts) — not scoped to
 *  whichever page happened to render this control. */
export function LanguageToggle({ className }: { className?: string }) {
  const [lang, setLang] = useLang();
  return (
    <div role="tablist" aria-label="Language" className={cn("inline-flex gap-1 rounded-full border border-black/10 bg-[#F5F6F9] p-1", className)}>
      {(["en", "ar"] as const).map((l) => {
        const active = l === lang;
        return (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setLang(l)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              active ? "bg-[#F97316] text-[#171B22]" : "text-[#5B6472] hover:text-[#171B22]"
            )}
          >
            {l === "en" ? "🇬🇧 EN" : "🇦🇪 AR"}
          </button>
        );
      })}
    </div>
  );
}
