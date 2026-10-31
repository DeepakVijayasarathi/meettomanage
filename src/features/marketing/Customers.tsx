import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY } from "./MarketingNav";
import { PageShell } from "./PageShell";

/** Customer stories. Only stories a customer has agreed to, and facts we can stand behind, belong here. */
const STORIES = [
  {
    slug: "the-reader-nest",
    name: "The Reader Nest",
    logo: "/clients/thereader.png",
    image: "/clients/reader-nest/reading-photo.webp",
    teaser: "Every great classroom has a story behind it. Discover how The Reader Nest partnered with MeetToManage to build a learning platform around educators, students and parents.",
    tags: ["Phonics", "Public speaking", "One-to-one and group classes"],
  },
];

/** Customers without a published story yet: logo and what they teach only, nothing we can't stand behind. */
const CLIENTS = [
  { name: "Alphabet", logo: "/clients/alphabet.webp", line: "Jolly Phonics & Storytelling", tags: ["Jolly Phonics", "Storytelling"] },
];

export default function Customers() {
  return (
    <PageShell
      eyebrow="Customers"
      title="Online coaching centres run on Meet to Manage."
      sub="See how centres use one platform for live classes, enrolment, fees and the parent app."
      seo={{
        title: "Customers and Case Studies — Meet to Manage",
        description: "How online coaching centres use Meet to Manage for live classes, enrolment, fee collection and a parent app.",
        path: "/customers",
      }}
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Meet to Manage customers",
        url: "https://meettomanage.cloud/customers",
        hasPart: STORIES.map((s) => ({ "@type": "Article", name: `${s.name} on Meet to Manage`, url: `https://meettomanage.cloud/customers/${s.slug}` })),
      }}
    >
      <section className="bg-white pb-[clamp(64px,7vw,104px)]">
        <ul className="mx-auto grid max-w-[1000px] gap-5 px-5 md:grid-cols-2">
          {STORIES.map((s) => (
            <li key={s.slug}>
              <Link to={`/customers/${s.slug}`} className="group flex h-full flex-col rounded-2xl border border-[#EFE3D7] bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#F2B98A] hover:shadow-[0_24px_50px_-28px_rgba(194,65,12,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]">
                <img src={s.image} alt="AI-generated illustrative scene of a mother helping a child read" width={1536} height={1024} loading="lazy" className="mb-6 aspect-[16/10] w-full rounded-xl object-cover object-[center_40%]" />
                <img src={s.logo} alt={`${s.name} logo`} width={56} height={56} loading="lazy" className="h-14 w-14 rounded-full object-cover ring-1 ring-black/10" />
                <h2 className="font-display mt-5 text-xl font-extrabold tracking-[-0.02em]">{s.name}</h2>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[#57534E]">{s.teaser}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {s.tags.map((t) => <li key={t} className="rounded-full bg-[#FFEBDD] px-3 py-1 text-xs font-semibold text-[#9A3412]">{t}</li>)}
                </ul>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#C2410C]">Read the story <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100" /></span>
              </Link>
            </li>
          ))}
          {CLIENTS.map((c) => (
            <li key={c.name} className="flex h-full flex-col rounded-2xl border border-[#EFE3D7] bg-white p-7">
              <div className="mb-6 flex aspect-[16/10] w-full items-center justify-center rounded-xl bg-white ring-1 ring-black/5">
                <img src={c.logo} alt={`${c.name} — ${c.line} logo`} width={800} height={400} loading="lazy" className="h-auto w-4/5 object-contain" />
              </div>
              <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">{c.name}</h2>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[#57534E]">{c.line}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {c.tags.map((t) => <li key={t} className="rounded-full bg-[#FFEBDD] px-3 py-1 text-xs font-semibold text-[#9A3412]">{t}</li>)}
              </ul>
            </li>
          ))}
          <li className="flex flex-col justify-center rounded-2xl border border-dashed border-[#E0CBB8] bg-[#FFF6EE] p-7">
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Your centre could be next.</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-[#57534E]">Book a free platform walkthrough and see how your batches, fees and parent app can run in one place.</p>
            <Link to="/get-started" className={cn(BTN_PRIMARY, "mt-5 w-fit")}>Book free walkthrough <ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></Link>
          </li>
        </ul>
      </section>
    </PageShell>
  );
}
