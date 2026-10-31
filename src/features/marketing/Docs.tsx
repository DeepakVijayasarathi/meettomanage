import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DOC_GROUPS, type DocGroup } from "./docsContent";
import { PageShell } from "./PageShell";
import { ProductTour } from "./ProductTour";
import { DOC_SECTIONS } from "./docsContent";

export default function Docs() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const groups = useMemo<DocGroup[]>(() => {
    if (!q) return DOC_GROUPS;
    return DOC_GROUPS.map((g) => ({
      ...g,
      sections: g.sections
        .map((s) => ({
          ...s,
          items: s.items.filter((i) => `${s.title} ${i.title} ${i.body}`.toLowerCase().includes(q)),
        }))
        .filter((s) => s.items.length > 0),
    })).filter((g) => g.sections.length > 0);
  }, [q]);

  return (
    <PageShell
      eyebrow="Documentation"
      title="Everything Meet to Manage does, end to end."
      sub="A guide to every portal, the live classroom, fees, scheduling and the platform console."
      seo={{
        title: "Documentation — Meet to Manage",
        description: "Complete feature documentation for Meet to Manage: every portal, the live classroom, billing and payments, scheduling, admissions and the platform console.",
        path: "/docs",
      }}
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: "Meet to Manage documentation",
        url: "https://meettomanage.cloud/docs",
        about: { "@type": "SoftwareApplication", name: "Meet to Manage", applicationCategory: "EducationalApplication" },
      }}
    >
      <div className="mx-auto grid max-w-[1180px] gap-10 px-5 pb-[clamp(64px,7vw,104px)] lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <label className="relative block">
            <span className="sr-only">Search the documentation</span>
            <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78716C]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search features"
              className="w-full rounded-xl border border-[#EFE3D7] bg-white py-2.5 pe-3 ps-9 text-sm outline-none focus:border-[#C2410C]"
            />
          </label>
          {!q && <a href="#product-tour" className="mt-4 flex items-center justify-center rounded-xl bg-[#C2410C] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#9A3412]">Take the product tour</a>}
          <nav aria-label="Documentation sections" className="mt-5 flex flex-col gap-5 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto lg:pe-2 [scrollbar-color:#E7D5C3_transparent] [scrollbar-width:thin]">
            {groups.map((g) => (
              <div key={g.title}>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#C2410C]">{g.title}</p>
                <ul className="mt-2 flex flex-col border-s border-[#EFE3D7]">
                  {g.sections.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="-ms-px block border-s border-transparent py-1.5 ps-3 text-sm text-[#57534E] hover:border-[#C2410C] hover:text-[#1C1917]">{s.title}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          {!q && (
            <>
              <ul className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[[String(DOC_SECTIONS.length), "areas covered"], [String(DOC_SECTIONS.reduce((n, s) => n + s.items.length, 0)), "features explained"], ["11", "role portals"], ["1", "live classroom"]].map(([n, l]) => (
                  <li key={l} className="rounded-2xl border border-[#EFE3D7] bg-[#FFF6EE] px-4 py-3">
                    <p className="font-display text-2xl font-extrabold tracking-[-0.03em] text-[#C2410C]">{n}</p>
                    <p className="text-xs font-semibold text-[#57534E]">{l}</p>
                  </li>
                ))}
              </ul>
              <div className="mb-12"><ProductTour /></div>
            </>
          )}
          {groups.length === 0 && <p className="text-[#57534E]">No features match “{query}”.</p>}
          {groups.map((g) => g.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 border-b border-[#EFE3D7] pb-10 pt-2 first:pt-0 [&:not(:first-child)]:mt-10">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#C2410C]">{g.title}</p>
              <h2 className="font-display mt-2 text-[clamp(1.4rem,2.5vw,1.85rem)] font-extrabold tracking-[-0.03em]">{s.title}</h2>
              <p className="mt-3 max-w-[720px] text-[15px] leading-relaxed text-[#57534E]">{s.intro}</p>
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {s.items.map((i) => (
                  <li key={i.title} className="rounded-2xl border border-[#EFE3D7] bg-white p-5">
                    <h3 className="font-display text-base font-extrabold tracking-[-0.01em]">{i.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-[#57534E]">{i.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          )))}
        </div>
      </div>
    </PageShell>
  );
}
