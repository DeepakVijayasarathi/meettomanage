import { ArrowDownToLine, ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { PageShell } from "../PageShell";
import { WalkthroughCta } from "../WalkthroughCta";
import { RESOURCE_GUIDES } from "./content";
import { ResourceShare } from "./ResourceShare";
import NotFound from "@/features/auth/NotFound";

const SITE = "https://meettomanage.cloud";
const LINK = "font-semibold text-[#C2410C] underline decoration-[#EAC1A3] underline-offset-4 hover:decoration-[#C2410C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]";
const H2 = "font-display text-2xl font-extrabold leading-tight tracking-[-0.025em] text-[#1C1917]";

function recordDownload(slug: string, filename: string) {
  // Use the site's existing analytics setup; downloading never depends on it.
  try { window.gtag?.("event", "resource_download", { resource_slug: slug, file_name: filename }); } catch { /* Analytics must not block the file. */ }
}

function Breadcrumbs({ title, path }: { title?: string; path?: string }) {
  return <nav aria-label="Breadcrumb" className="mx-auto mb-7 max-w-[1100px] px-5 text-xs text-[#786B60]">
    <ol className="flex flex-wrap items-center gap-2">
      <li><Link to="/" className="hover:text-[#C2410C]">Home</Link></li>
      <li aria-hidden="true">/</li>
      <li>{path ? <Link to="/resources" className="hover:text-[#C2410C]">Free resources</Link> : <span aria-current="page">Free resources</span>}</li>
      {title && <><li aria-hidden="true">/</li><li aria-current="page">{title}</li></>}
    </ol>
  </nav>;
}

function breadcrumbData(title?: string, path?: string) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE+"/" },
    { "@type": "ListItem", position: 2, name: "Free resources", item: SITE+"/resources" },
    ...(title && path ? [{ "@type": "ListItem", position: 3, name: title, item: SITE+path }] : []),
  ] };
}

export function ResourceLibrary() {
  return <PageShell eyebrow="Free resources" title="Practical templates for running your coaching centre."
    sub="Download a fee tracker or teacher-handover checklist, with worked examples and clear instructions. No account or email required."
    seo={{ title: "Free Coaching Centre Templates | Meet to Manage", description: "Download free coaching centre templates: a fee tracker CSV and teacher-handover checklist. Worked examples, setup instructions and no signup required.", path: "/resources" }}
    jsonLd={[breadcrumbData(), { "@context": "https://schema.org", "@type": "CollectionPage", name: "Free coaching centre templates", url: SITE+"/resources", hasPart: RESOURCE_GUIDES.map(g => ({ "@type": "WebPage", name: g.title, url: SITE+"/resources/"+g.slug })) }]}>
    <section className="pb-20">
      <Breadcrumbs />
      <div className="mx-auto grid max-w-[1100px] gap-6 px-5 md:grid-cols-2">
        {RESOURCE_GUIDES.map((guide, i) => {
          const Icon = i === 0 ? FileSpreadsheet : ClipboardList;
          return <article key={guide.slug} className="flex flex-col rounded-3xl border border-[#EEDACB] bg-white p-7 shadow-[0_14px_40px_-30px_rgba(194,65,12,0.3)] sm:p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0E3] text-[#C2410C]"><Icon aria-hidden="true" className="h-6 w-6" /></span>
            <p className="mt-6 text-xs font-bold uppercase tracking-wider text-[#A4431B]">{guide.category} · {guide.download.format}</p>
            <h2 className={H2+" mt-3"}><Link to={"/resources/"+guide.slug} className="hover:text-[#C2410C]">{guide.title}</Link></h2>
            <p className="mt-4 flex-1 text-[15px] leading-relaxed text-[#625A53]">{guide.description}</p>
            <Link to={"/resources/"+guide.slug} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#C2410C]">View template and instructions <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </article>;
        })}
      </div>
      <div className="mx-auto mt-12 max-w-[1100px] px-5">
        <div className="rounded-3xl bg-[#FFF6EE] p-7 sm:p-9">
          <h2 className={H2}>Start with a clear process. Connect it when you need to.</h2>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[#625A53]">These files help a small team keep consistent records. They are manual templates: they do not create invoices, send reminders or change class schedules. Read the worked examples before replacing the fictional rows with your own records.</p>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[#625A53]">If you need classes, attendance, fees and parent access connected, explore <Link to="/solutions/fee-management-software-for-coaching-centres" className={LINK}>fee management</Link>, the <Link to="/solutions/live-class-software-for-institutes" className={LINK}>live classroom</Link> and <Link to="/pricing" className={LINK}>plans</Link>. Our <Link to="/blog" className={LINK}>academy operations blog</Link> explains the wider workflows.</p>
        </div>
      </div>
    </section>
  </PageShell>;
}

export function ResourceGuidePage({ slug }: { slug: string }) {
  const guide = RESOURCE_GUIDES.find(g => g.slug === slug);
  if (!guide) return <NotFound />;
  const path = "/resources/"+guide.slug;
  return <PageShell eyebrow={guide.category} title={guide.title} sub={guide.description}
    seo={{ title: guide.seoTitle, description: guide.description, path, type: "article" }}
    jsonLd={[breadcrumbData(guide.title, path), {
      "@context": "https://schema.org", "@type": "Article", headline: guide.title, description: guide.description,
      mainEntityOfPage: SITE+path, url: SITE+path, author: { "@type": "Organization", name: "Meet to Manage", url: SITE+"/" },
      publisher: { "@type": "Organization", name: "Meet to Manage", url: SITE+"/", logo: { "@type": "ImageObject", url: SITE+"/logo-icon.png" } },
      associatedMedia: { "@type": "MediaObject", name: guide.download.label, contentUrl: SITE+guide.download.href, encodingFormat: guide.download.format === "CSV" ? "text/csv" : "text/plain" },
    }]}>
    <article className="pb-20">
      <Breadcrumbs title={guide.title} path={path} />
      <div className="mx-auto grid max-w-[1100px] items-start gap-10 px-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
        <aside className="rounded-2xl border border-[#EEDACB] bg-[#FFF6EE] p-6 lg:sticky lg:top-28">
          <p className="text-xs font-bold uppercase tracking-wider text-[#A4431B]">Free {guide.download.format} download</p>
          <p className="mt-3 text-sm leading-relaxed text-[#625A53]">Keep your own copy. No account or email required.</p>
          <a href={guide.download.href} download={guide.download.filename} onClick={() => recordDownload(guide.slug, guide.download.filename)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#C2410C] px-4 py-3 text-sm font-bold text-white hover:bg-[#9A3412] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]"><ArrowDownToLine aria-hidden="true" className="h-4 w-4 shrink-0" />Download template</a>
          <ResourceShare key={guide.slug} title={guide.title} slug={guide.slug} />
          <nav aria-label="On this page" className="mt-7 border-t border-[#EEDACB] pt-5">
            <p className="text-xs font-bold text-[#4F453D]">On this page</p>
            <ul className="mt-3 space-y-3 text-sm text-[#786B60]">{guide.sections.map(s => <li key={s.id}><a href={"#"+s.id} className="hover:text-[#C2410C]">{s.title}</a></li>)}</ul>
          </nav>
        </aside>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#8A7768]">By the Meet to Manage team</p>
          {guide.intro.map(p => <p key={p} className="mt-5 text-base leading-[1.85] text-[#625A53]">{p}</p>)}
          {guide.table && <figure className="mt-8 overflow-hidden rounded-2xl border border-[#EEDACB]">
            <figcaption id="worked-example-caption" className="bg-[#FFF6EE] px-5 py-4 text-xs font-semibold leading-relaxed text-[#786B60]">{guide.table.caption}<span className="mt-2 block font-normal sm:hidden">Swipe or scroll to see all columns.</span></figcaption>
            <div className="overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C2410C]" tabIndex={0} role="region" aria-label="Worked example table">
            <table aria-describedby="worked-example-caption" className="w-full text-start text-sm">
              <thead className="bg-[#FFFBF7]"><tr>{guide.table.columns.map(col => <th key={col} scope="col" className="whitespace-nowrap px-4 py-3 text-start text-xs font-bold text-[#4F453D]">{col}</th>)}</tr></thead>
              <tbody>{guide.table.rows.map((row, i) => <tr key={i} className="border-t border-[#EFE3D7]">{row.map((cell, j) => <td key={j} className="whitespace-nowrap px-4 py-3 text-[#625A53]">{cell}</td>)}</tr>)}</tbody>
            </table>
            </div>
          </figure>}
          {guide.sections.map(section => <section key={section.id} aria-labelledby={section.id} className="mt-10 border-t border-[#EFE3D7] pt-8">
            <h2 id={section.id} className={H2+" scroll-mt-28"}>{section.title}</h2>
            {section.paragraphs.map(p => <p key={p} className="mt-4 text-[15px] leading-[1.85] text-[#625A53]">{p}</p>)}
            {section.bullets && <ul className="mt-5 space-y-3">{section.bullets.map(b => <li key={b} className="flex items-start gap-3 text-[15px] leading-relaxed text-[#625A53]"><CheckCircle2 aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#C2410C]" /><span>{b}</span></li>)}</ul>}
          </section>)}
          <section className="mt-10 border-t border-[#EFE3D7] pt-8" aria-labelledby="template-questions">
            <h2 id="template-questions" className={H2}>Template questions</h2>
            <dl className="mt-5 divide-y divide-[#EFE3D7]">{guide.faq.map(f => <div key={f.q} className="py-5"><dt className="font-bold text-[#332C24]">{f.q}</dt><dd className="mt-2 text-[15px] leading-relaxed text-[#625A53]">{f.a}</dd></div>)}</dl>
          </section>
          <section className="mt-8 rounded-2xl bg-[#FFF6EE] p-6" aria-labelledby="connected-workflow">
            <h2 id="connected-workflow" className={H2}>When you need a connected workflow</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[#625A53]">Explore the product details and discuss your actual records and class setup during a free walkthrough.</p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm">{guide.related.map(r => <li key={r.to}><Link to={r.to} className={LINK}>{r.label}</Link></li>)}</ul>
            <WalkthroughCta className="mt-6" />
          </section>
          <Link to="/resources" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#C2410C]"><ArrowLeft aria-hidden="true" className="h-4 w-4" />All free resources</Link>
        </div>
      </div>
    </article>
  </PageShell>;
}

export function FeeTrackerGuide() { return <ResourceGuidePage slug="coaching-centre-fee-tracker" />; }
export function TeacherHandoverGuide() { return <ResourceGuidePage slug="teacher-handover-checklist" />; }
