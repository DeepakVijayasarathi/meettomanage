import { Languages } from "lucide-react";
import { MARKETING_LOCALES, useMarketingLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** EN/AR switcher for the marketing site's header — same pill-toggle visual pattern as
 *  Pricing.tsx's currency/cycle ToggleGroup, pulled out standalone since every marketing
 *  page wants it in its header, not just Pricing. Flipping it re-renders every page that
 *  reads useLang() and flips <html dir> site-wide (see lib/i18n.ts) — not scoped to
 *  whichever page happened to render this control. */
export function LanguageToggle({ className }: { className?: string }) {
  const [locale, setLocale] = useMarketingLocale();
  return (
    <label className={cn("inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[#F5F6F9] px-2", className)}>
      <Languages className="h-3.5 w-3.5 text-[#EA580C]" aria-hidden />
      <span className="sr-only">Language</span>
      <select
        aria-label="Language"
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        className="max-w-32 cursor-pointer bg-transparent py-2 text-xs font-semibold text-[#171B22] outline-none"
      >
        {MARKETING_LOCALES.map((item) => <option key={item.code} value={item.code}>{item.nativeLabel}</option>)}
      </select>
    </label>
  );
}
