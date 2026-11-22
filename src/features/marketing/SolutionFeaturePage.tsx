import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Video, CreditCard, UserCheck, GraduationCap, Music, Palette, Code2, Calculator } from "lucide-react";
import { PageShell } from "./PageShell";
import { WalkthroughCta } from "./WalkthroughCta";
import { cn } from "@/lib/utils";

export interface SolutionFeature { title: string; body: string }

interface Props {
  eyebrow: string;
  title: string;
  sub: string;
  seo: { title: string; description: string; path: string };
  /** schema.org name of the WebPage. */
  name: string;
  features: SolutionFeature[];
  closingHeading: string;
  /** Paragraph with the page's internal links. */
  closing: ReactNode;
  /** Buyer questions rendered on-page and emitted as matching FAQ structured data. */
  faq?: readonly (readonly [question: string, answer: string])[];
  /** Slug of this page, used to exclude it from related suggestions. */
  selfSlug?: string;
}

/** Related pages shown at the bottom of every solution/niche page. */
function RelatedPages({ selfSlug }: { selfSlug?: string }) {
  const RELATED = [
    { to: "/solutions/live-class-software-for-institutes", label: "Live class software", icon: Video },
    { to: "/solutions/online-attendance-software-for-institutes", label: "Online attendance software", icon: UserCheck },
    { to: "/solutions/fee-management-software-for-coaching-centres", label: "Fee management software", icon: CreditCard },
    { to: "/solutions/english-grammar-class-software", label: "English grammar class software", icon: BookOpen },
    { to: "/solutions/music-class-software", label: "Music class software", icon: Music },
    { to: "/solutions/dance-class-software", label: "Dance class software", icon: Palette },
    { to: "/solutions/coding-class-software", label: "Coding class software", icon: Code2 },
    { to: "/solutions/art-class-software", label: "Art class software", icon: Palette },
    { to: "/solutions/yoga-class-software", label: "Yoga class software", icon: GraduationCap },
    { to: "/solutions/abacus-class-software", label: "Abacus class software", icon: Calculator },
  ];

  const filtered = selfSlug ? RELATED.filter(r => r.to !== `/solutions/${selfSlug}`) : RELATED;

  return (
    <section className="mx-auto mt-16 max-w-[1000px] px-5" aria-labelledby="related-heading">
      <h2 id="related-heading" className="font-display text-2xl font-extrabold tracking-[-0.02em]">Explore other solutions</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {filtered.map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.to}
              to={r.to}
              className={cn(
                "flex items-center gap-3 rounded-2xl border border-[#EFE3D7] bg-white p-5 transition-colors hover:border-[#F2B98A] hover:bg-[#FFFBF7]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]"
              )}
            >
              <Icon className="h-5 w-5 shrink-0 text-[#C2410C]" />
              <span className="text-sm font-semibold text-[#1C1917]">{r.label}</span>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-[#C2410C]" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// Need Calculator import - already imported above

/** Shared layout for the /solutions pages: a grid of feature cards, then a short closing paragraph, pricing link and demo button. */
export function SolutionFeaturePage({ eyebrow, title, sub, seo, name, features, closingHeading, closing, faq = [], selfSlug }: Props) {
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    url: `https://meettomanage.cloud${seo.path}`,
    about: { "@id": "https://meettomanage.cloud/#software" },
  };
  return (
    <PageShell
      eyebrow={eyebrow}
      title={title}
      sub={sub}
      seo={seo}
      jsonLd={faq.length ? [webPageSchema, {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map(([question, answer]) => ({
          "@type": "Question", name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      }] : webPageSchema}
    >
      <section className="bg-white pb-[clamp(64px,7vw,104px)]">
        <ul className="mx-auto grid max-w-[1000px] gap-5 px-5 md:grid-cols-2">
          {features.map((f) => (
            <li key={f.title} className="rounded-2xl border border-[#EFE3D7] bg-white p-7">
              <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">{f.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#57534E]">{f.body}</p>
            </li>
          ))}
        </ul>
        <div className="mx-auto mt-10 max-w-[1000px] px-5">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">{closingHeading}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#57534E]">{closing}</p>
          <WalkthroughCta className="mt-6" />
        </div>
        {faq.length > 0 && <section className="mx-auto mt-14 max-w-[1000px] px-5" aria-labelledby="solution-faq-heading">
          <h2 id="solution-faq-heading" className="font-display text-2xl font-extrabold tracking-[-0.02em]">Questions coaching centre owners ask</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {faq.map(([question, answer]) => <article key={question} className="rounded-2xl border border-[#EFE3D7] bg-[#FFFDFC] p-6">
              <h3 className="font-bold text-[#1C1917]">{question}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#57534E]">{answer}</p>
            </article>)}
          </div>
        </section>}
        <RelatedPages selfSlug={selfSlug} />
      </section>
    </PageShell>
  );
}
