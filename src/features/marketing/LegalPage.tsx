import { Seo } from "@/components/Seo";
import { useLightBrandScope } from "@/lib/theme";
import { MarketingHero } from "./MarketingHero";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";

export type LegalBlock = { p: string } | { ul: string[] };
export interface LegalSection {
  h2: string;
  blocks: LegalBlock[];
}

/** Shared shell for the platform's long-form legal pages (Terms of Service, Privacy Policy):
 *  the marketing header and hero, a numbered-section article, and a cross-link footer. */
export function LegalPage({ title, description, path, updated, intro, sections }: {
  title: string;
  description: string;
  path: string;
  updated: string;
  intro: string[];
  sections: LegalSection[];
}) {
  useLightBrandScope();
  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-white text-[#171B22]">
      <Seo title={`${title} — Meet to Manage`} description={description} path={path} />

      <MarketingNav />

      <MarketingHero eyebrow={`Last updated: ${updated}`} title={title} />

      <article className="mx-auto max-w-[760px] px-5 py-[clamp(48px,6vw,88px)]">
        <div className="flex flex-col gap-4 text-base leading-relaxed text-[#333]">
          {intro.map((line) => <p key={line}>{line}</p>)}
        </div>

        <div className="mt-10 flex flex-col gap-4">
          {sections.map((section) => (
            <section key={section.h2}>
              <h2 className="font-display mt-8 text-[clamp(1.375rem,2vw,1.75rem)] font-extrabold leading-tight tracking-[-0.02em] text-[#111]">{section.h2}</h2>
              <div className="mt-3 flex flex-col gap-3">
                {section.blocks.map((block, i) =>
                  "ul" in block ? (
                    <ul key={i} className="flex flex-col gap-1.5 ps-1">
                      {block.ul.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-base leading-relaxed text-[#333]">
                          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F97316]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i} className="text-base leading-relaxed text-[#333]">{block.p}</p>
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      </article>

      <MarketingFooter />
    </div>
  );
}
