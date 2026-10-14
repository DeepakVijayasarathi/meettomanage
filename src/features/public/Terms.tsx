import { Logo } from "@/components/Logo";
import { useLightBrandScope } from "@/lib/theme";
import { TERMS_CONTACT, TERMS_EMAILS, TERMS_INTRO, TERMS_SECTIONS } from "@/content/terms";

// Same headline face as Login.tsx / AdmissionPayment.tsx (scoped to this page only).
const HEADLINE_FONT = "'Fredoka', ui-rounded, 'Segoe UI', sans-serif";

/**
 * Public Terms & Conditions and Refund Policy page (/terms) — the full text parents accept before
 * their first payment. Every payment screen links here; no login needed so a parent can read it
 * from the payment link itself.
 */
export default function Terms() {
  useLightBrandScope();

  return (
    <div className="theme-light-scope min-h-screen bg-brand-cream px-4 py-10">
      <article className="mx-auto w-full max-w-3xl rounded-3xl bg-white p-6 shadow-[0_24px_70px_-24px_rgba(43,32,20,0.22)] ring-1 ring-brand-ink/[0.04] sm:p-10">
        <Logo className="mb-6 justify-center" />
        <h1 style={{ fontFamily: HEADLINE_FONT }} className="text-center text-2xl font-semibold tracking-tight text-brand-ink sm:text-3xl">
          Terms &amp; Conditions and Refund Policy
        </h1>

        <div className="mt-6 space-y-3 text-sm leading-relaxed text-brand-ink/80">
          {TERMS_INTRO.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <ol className="mt-8 space-y-7">
          {TERMS_SECTIONS.map((section, index) => (
            <li key={section.title}>
              <h2 style={{ fontFamily: HEADLINE_FONT }} className="text-lg font-semibold text-brand-ink">
                {index + 1}. {section.title}
              </h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-brand-ink/80">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              {section.sub && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-brand-ink">{section.sub.title}</h3>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-brand-ink/80">
                    {section.sub.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ol>

        <section className="mt-10 rounded-2xl bg-brand-cream/60 p-5 text-sm leading-relaxed text-brand-ink/80">
          <h2 style={{ fontFamily: HEADLINE_FONT }} className="text-lg font-semibold text-brand-ink">
            Contact
          </h2>
          {TERMS_CONTACT.map((line) => (
            <p key={line} className="mt-2">
              {line}
            </p>
          ))}
          <p className="mt-2">
            Official email:{" "}
            {TERMS_EMAILS.map((email, i) => (
              <span key={email}>
                {i > 0 && ", "}
                <a href={`mailto:${email}`} className="font-semibold text-primary underline underline-offset-2">
                  {email}
                </a>
              </span>
            ))}
          </p>
          <p className="mt-4 font-medium text-brand-ink">
            Welcome to The Reader Nest — where every child learns, grows, and becomes a confident reader.
          </p>
        </section>
      </article>
    </div>
  );
}
