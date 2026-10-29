import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useBrand } from "@/lib/branding";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { COPY } from "./home/copy";
import { useScrolled } from "./home/fxCore";

/** Primary action: white on #C2410C is 5.2:1, which clears AA for body-size text. */
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#C2410C] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#9A3412] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]";

/** The site-wide header: sticky, gains a shadow once scrolled, and collapses to a menu on phones.
 *  On the home page the section links are in-page anchors; elsewhere they go back to the home page. */
export function MarketingNav({ home = false }: { home?: boolean }) {
  const brand = useBrand();
  const [lang] = useLang();
  const c = COPY[lang];
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const base = home ? "" : "/";
  const links = [
    { label: c.nav.features, href: `${base}#features` },
    { label: c.nav.classroom, href: `${base}#classroom` },
    { label: c.nav.app, href: `${base}#app` },
    { label: c.nav.customers, href: "/customers", route: true },
    { label: c.nav.pricing, href: "/pricing", route: true },
    { label: c.nav.blog, href: "/blog", route: true },
  ];

  const linkClass = "text-sm font-semibold text-[#57534E] transition-colors hover:text-[#1C1917] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]";

  return (
    <header className={cn("sticky top-0 z-40 border-b bg-white transition-shadow", scrolled ? "border-[#EFE3D7] shadow-[0_8px_30px_-20px_rgba(28,25,23,0.3)]" : "border-transparent")}>
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between gap-4 px-5">
        <Link to="/" aria-label={`${brand.name} home`} className="shrink-0">
          <img src="/logo-full.webp" alt={brand.name} width={420} height={150} className="h-12 w-auto object-contain mix-blend-multiply sm:h-14" />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 whitespace-nowrap lg:flex">
          {links.map((l) => (l.route ? <Link key={l.href} to={l.href} className={linkClass}>{l.label}</Link> : <a key={l.href} href={l.href} className={linkClass}>{l.label}</a>))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle className="hidden sm:inline-flex" />
          <Link to="/login" className="hidden whitespace-nowrap px-3 py-2 text-sm font-semibold text-[#1C1917] hover:text-[#C2410C] sm:inline-flex">{c.nav.signIn}</Link>
          <Link to="/get-started" className={cn(BTN_PRIMARY, "hidden whitespace-nowrap sm:inline-flex")}>
            {c.nav.demo} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center border border-[#D9C9BA] text-[#1C1917] lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? c.nav.closeMenu : c.nav.menu}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-[#E2E8F0] bg-white lg:hidden">
          <nav aria-label="Mobile" className="mx-auto flex max-w-[1200px] flex-col px-5 py-3">
            {links.map((l) => {
              const cls = "border-b border-[#EEF2F7] py-3.5 text-base font-semibold text-[#1C1917]";
              return l.route ? (
                <Link key={l.href} to={l.href} className={cls} onClick={() => setOpen(false)}>{l.label}</Link>
              ) : (
                <a key={l.href} href={l.href} className={cls} onClick={() => setOpen(false)}>{l.label}</a>
              );
            })}
            <div className="flex flex-col gap-3 py-4">
              <Link to="/get-started" className={BTN_PRIMARY} onClick={() => setOpen(false)}>{c.nav.demo}</Link>
              <Link to="/login" className="inline-flex justify-center border border-[#D9C9BA] py-3.5 text-sm font-bold text-[#1C1917]" onClick={() => setOpen(false)}>{c.nav.signIn}</Link>
              <LanguageToggle className="sm:hidden" />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
