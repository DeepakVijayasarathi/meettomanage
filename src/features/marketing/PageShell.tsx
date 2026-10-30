import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Seo } from "@/components/Seo";
import { useLightBrandScope } from "@/lib/theme";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";

/** The shared frame for the marketing sub-pages (customers, case studies, careers): site header and footer, a warm
 *  page hero, the page's SEO tags and optional structured data. */
export function PageShell({ eyebrow, title, sub, seo, jsonLd, hero, children }: {
  eyebrow: string;
  title: string;
  sub?: string;
  seo: { title: string; description: string; path: string; type?: "website" | "article" };
  jsonLd?: object | object[];
  hero?: ReactNode;
  children: ReactNode;
}) {
  useLightBrandScope();
  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-white text-[#1C1917]">
      <Seo title={seo.title} description={seo.description} path={seo.path} type={seo.type} />
      {jsonLd && <Helmet><script type="application/ld+json">{JSON.stringify(jsonLd)}</script></Helmet>}
      <a href="#main" className="sr-only z-50 bg-white px-4 py-3 text-sm font-bold text-[#1C1917] focus:not-sr-only focus:fixed focus:start-3 focus:top-3">Skip to main content</a>
      <MarketingNav />
      <main id="main">
        {hero ?? <section className="relative overflow-hidden bg-white pb-[clamp(40px,5vw,72px)] pt-[clamp(48px,6vw,96px)]">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_80%_at_50%_0%,#FFE6D0,transparent)]" />
          <div className="relative mx-auto max-w-[860px] px-5 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#C2410C]">{eyebrow}</p>
            <h1 className="font-display mt-4 text-[clamp(1.9rem,3.6vw,2.9rem)] font-extrabold leading-[1.06] tracking-[-0.035em] text-[#1C1917]">{title}</h1>
            {sub && <p className="mx-auto mt-5 max-w-[640px] text-lg leading-relaxed text-[#57534E]">{sub}</p>}
          </div>
        </section>}
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
