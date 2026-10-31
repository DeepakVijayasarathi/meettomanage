import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useBrand } from "@/lib/branding";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { trackMarketingEvent } from "@/lib/analytics";
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
  const location = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstMobileLinkRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  const base = home ? "" : "/";
  const links = [
    { label: c.nav.features, href: `${base}#features` },
    { label: c.nav.classroom, href: `${base}#classroom` },
    { label: c.nav.app, href: `${base}#app` },
    { label: c.nav.customers, href: "/customers", route: true },
    { label: c.nav.pricing, href: "/pricing", route: true },
    { label: c.nav.blog, href: "/blog", route: true },
  ];

  // The current page or section is shown in orange with an underline. On the home page the first section link is active until another hash is chosen.
  const isActive = (l: { href: string; route?: boolean }, index: number) =>
    l.route ? location.pathname.startsWith(l.href) : home && location.pathname === "/" && (location.hash ? l.href.endsWith(location.hash) : index === 0);
  const linkClass = (active: boolean) =>
    cn(
      "relative py-1.5 text-sm font-semibold transition-colors hover:text-[#C2410C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]",
      active ? "text-[#C2410C] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-[#C2410C]" : "text-[#1C1917]"
    );

  return (
    <header className={cn("sticky top-0 z-40 border-b bg-white transition-shadow", scrolled ? "border-[#F6E3D3] shadow-[0_14px_34px_-22px_rgba(194,65,12,0.45)]" : "border-transparent")}>
      <div className="mx-auto flex h-[84px] max-w-[1200px] items-center justify-between gap-4 px-5">
        <Link to="/" aria-label={`${brand.name} home`} className="shrink-0">
          <img src="/logo-full.webp" alt={brand.name} width={420} height={150} className="h-14 w-auto object-contain mix-blend-multiply sm:h-[68px]" />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 whitespace-nowrap lg:flex">
          {links.map((l, i) => (l.route ? <Link key={l.href} to={l.href} aria-current={isActive(l, i) ? "page" : undefined} className={linkClass(isActive(l, i))}>{l.label}</Link> : <a key={l.href} href={l.href} aria-current={isActive(l, i) ? "true" : undefined} className={linkClass(isActive(l, i))}>{l.label}</a>))}
        </nav>

        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="me-3 hidden h-8 w-px bg-[#EBD9C8] lg:block" />
          <LanguageToggle className="hidden sm:inline-flex" />
          <Link to="/login" onClick={() => trackMarketingEvent("signin_clicked")} className="hidden whitespace-nowrap px-3 py-2 text-sm font-semibold text-[#1C1917] hover:text-[#C2410C] sm:inline-flex">{c.nav.signIn}</Link>
          <Link to="/get-started" className={cn(BTN_PRIMARY, "hidden whitespace-nowrap !rounded-full bg-gradient-to-r from-[#EA580C] to-[#C2410C] shadow-[0_12px_24px_-12px_rgba(194,65,12,0.8)] hover:from-[#C2410C] hover:to-[#9A3412] sm:inline-flex")}>
            {c.nav.demo} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
          <button
            ref={menuButtonRef}
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
            {links.map((l, index) => {
              const cls = "border-b border-[#EEF2F7] py-3.5 text-base font-semibold text-[#1C1917]";
              return l.route ? (
                <Link ref={index === 0 ? firstMobileLinkRef : undefined} key={l.href} to={l.href} className={cls} onClick={() => setOpen(false)}>{l.label}</Link>
              ) : (
                <a ref={index === 0 ? firstMobileLinkRef : undefined} key={l.href} href={l.href} className={cls} onClick={() => setOpen(false)}>{l.label}</a>
              );
            })}
            <div className="flex flex-col gap-3 py-4">
              <Link to="/get-started" className={BTN_PRIMARY} onClick={() => setOpen(false)}>{c.nav.demo}</Link>
              <Link to="/login" className="inline-flex justify-center border border-[#D9C9BA] py-3.5 text-sm font-bold text-[#1C1917]" onClick={() => { trackMarketingEvent("signin_clicked"); setOpen(false); }}>{c.nav.signIn}</Link>
              <LanguageToggle className="sm:hidden" />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
