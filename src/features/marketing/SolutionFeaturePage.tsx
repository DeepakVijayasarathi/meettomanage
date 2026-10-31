import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "./PageShell";
import { WalkthroughCta } from "./WalkthroughCta";

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
}

/** Shared layout for the /solutions pages: a grid of feature cards, then a short closing paragraph, pricing link and demo button. */
export function SolutionFeaturePage({ eyebrow, title, sub, seo, name, features, closingHeading, closing }: Props) {
  return (
    <PageShell
      eyebrow={eyebrow}
      title={title}
      sub={sub}
      seo={seo}
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        name,
        url: `https://meettomanage.cloud${seo.path}`,
        about: { "@type": "SoftwareApplication", name: "Meet to Manage", applicationCategory: "EducationalApplication" },
      }}
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
      </section>
    </PageShell>
  );
}
