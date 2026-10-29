import { ArrowRight, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { CAREERS_EMAIL, OPEN_ROLES } from "./careerRoles";
import { BTN_PRIMARY } from "./MarketingNav";
import { PageShell } from "./PageShell";

const WORK = [
  { title: "Software for real classrooms", body: "We build the tools online coaching centres use every day: the live classroom, scheduling, fees and the parent app." },
  { title: "Children and families first", body: "Our users include children and their parents, so privacy, safety and clarity shape what we ship." },
  { title: "Ship and learn", body: "Small changes go live often, and we listen to the centres that use them." },
];

export default function Careers() {
  const jsonLd = OPEN_ROLES.map((r) => ({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: r.title,
    description: `${r.summary} ${r.requirements.join(". ")}`,
    datePosted: r.postedOn,
    employmentType: r.type.toUpperCase().replace("-", "_"),
    hiringOrganization: { "@type": "Organization", name: "Infinity Uniquers", sameAs: "https://meettomanage.cloud/" },
    jobLocation: { "@type": "Place", address: r.location },
  }));

  return (
    <PageShell
      eyebrow="Careers"
      title="Help online coaching centres run on autopilot."
      sub="Meet to Manage is built by Infinity Uniquers. If you like building useful software for teachers and families, we would like to hear from you."
      seo={{
        title: "Careers — Meet to Manage",
        description: "Work on the platform online coaching centres use for live classes, fees and parent apps. See open roles or send an open application.",
        path: "/careers",
      }}
      jsonLd={jsonLd.length > 0 ? jsonLd : undefined}
    >
      <section className="bg-white pb-[clamp(40px,5vw,72px)]">
        <ul className="mx-auto grid max-w-[1000px] gap-4 px-5 md:grid-cols-3">
          {WORK.map((w) => (
            <li key={w.title} className="rounded-2xl border border-[#EFE3D7] bg-white p-6">
              <h2 className="font-display text-lg font-extrabold tracking-[-0.01em]">{w.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#57534E]">{w.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="roles" className="bg-[#FFF6EE] py-[clamp(56px,6vw,96px)]">
        <div className="mx-auto max-w-[860px] px-5">
          <h2 className="font-display text-[clamp(1.4rem,2.5vw,1.85rem)] font-extrabold tracking-[-0.03em]">Open roles</h2>
          {OPEN_ROLES.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-[#EBD9C8] bg-white p-7">
              <p className="text-lg font-bold text-[#1C1917]">We are not hiring for a specific role right now.</p>
              <p className="mt-2 text-[15px] leading-relaxed text-[#57534E]">If you think you could help, send us a short note about what you would like to build, with a CV or a link to your work. We read every message and keep promising ones on file.</p>
              <a href={`mailto:${CAREERS_EMAIL}?subject=Open%20application`} className={cn(BTN_PRIMARY, "mt-5")}><Mail className="h-4 w-4" /> Send an open application</a>
            </div>
          ) : (
            <ul className="mt-6 flex flex-col gap-4">
              {OPEN_ROLES.map((r) => (
                <li key={r.id} className="rounded-2xl border border-[#EBD9C8] bg-white p-7">
                  <h3 className="font-display text-xl font-extrabold tracking-[-0.02em]">{r.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-[#6B6560]">{r.department} · {r.location} · {r.type}</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#57534E]">{r.summary}</p>
                  <ul className="mt-3 list-disc ps-5 text-[15px] leading-relaxed text-[#57534E]">{r.requirements.map((q) => <li key={q}>{q}</li>)}</ul>
                  <a href={`mailto:${CAREERS_EMAIL}?subject=${encodeURIComponent(r.title)}`} className={cn(BTN_PRIMARY, "mt-5")}>Apply <ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PageShell>
  );
}
