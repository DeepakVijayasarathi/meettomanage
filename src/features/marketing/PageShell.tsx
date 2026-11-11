import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
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
  const pageName = seo.title.replace(/\s+(?:\||—|-)+\s+Meet to Manage.*$/i, "");
  const parent = seo.path.startsWith("/customers/") ? { name: "Customers", path: "/customers" }
    : seo.path.startsWith("/resources/") ? { name: "Resources", path: "/resources" }
      : seo.path.startsWith("/free-games/") ? { name: "Free games", path: "/free-games" }
        : null;
  const breadcrumbItems = [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://meettomanage.cloud/" },
    ...(parent ? [{ "@type": "ListItem", position: 2, name: parent.name, item: `https://meettomanage.cloud${parent.path}` }] : []),
    { "@type": "ListItem", position: parent ? 3 : 2, name: pageName, item: `https://meettomanage.cloud${seo.path}` },
  ];
  const suppliedSchemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  const hasBreadcrumbSchema = suppliedSchemas.some((schema) => (schema as Record<string, unknown>)["@type"] === "BreadcrumbList");
  const schemas = hasBreadcrumbSchema ? suppliedSchemas : [...suppliedSchemas, {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  }];
  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-white text-[#1C1917]">
      <Seo title={seo.title} description={seo.description} path={seo.path} type={seo.type} />
      <Helmet><script type="application/ld+json">{JSON.stringify(schemas)}</script></Helmet>
      <a href="#main" className="sr-only z-50 bg-white px-4 py-3 text-sm font-bold text-[#1C1917] focus:not-sr-only focus:fixed focus:start-3 focus:top-3">Skip to main content</a>
      <MarketingNav />
      <main id="main">
        {hero ?? <section className="relative overflow-hidden bg-white pb-[clamp(40px,5vw,72px)] pt-[clamp(48px,6vw,96px)]">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_80%_at_50%_0%,#FFE6D0,transparent)]" />
          <div className="relative mx-auto max-w-[860px] px-5 text-center">
            <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-[#786B60]">
              <Link to="/" className="rounded-sm underline-offset-4 hover:text-[#9A3412] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]">Home</Link>
              {parent && <><span aria-hidden="true">/</span><Link to={parent.path} className="rounded-sm underline-offset-4 hover:text-[#9A3412] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]">{parent.name}</Link></>}
              <span aria-hidden="true">/</span><span aria-current="page" className="max-w-[min(70vw,32rem)] truncate text-[#57534E]">{pageName}</span>
            </nav>
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
