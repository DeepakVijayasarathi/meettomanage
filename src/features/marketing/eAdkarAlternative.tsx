import { Link } from "react-router-dom";
import { PageShell } from "./PageShell";
import { WalkthroughCta } from "./WalkthroughCta";

const LINK = "font-semibold text-[#C2410C] underline underline-offset-4";

/** Every item is a shipped capability of Meet to Manage. Nothing is claimed about eAdkar: its features could not be verified from its own site, so the page gives buyers questions to check instead. */
const INCLUDED = [
  { title: "Everything in one platform", body: "Live classroom, attendance, fee collection, admissions CRM, homework, parent app and analytics — no need to juggle multiple tools." },
  { title: "Native live classes", body: "Video, shared whiteboard, screen sharing, live quizzes and recordings built in. Switching between apps mid-lesson is a thing of the past." },
  { title: "Automated fee workflows", body: "Create invoices, send automatic reminders, accept online payments. Pause class access for overdue fees without manual work." },
  { title: "Admissions from enquiry to enrolment", body: "Track demo bookings, teacher assignments, follow-up feedback and conversion rates — all in one pipeline." },
  { title: "Branded parent experience", body: "Every centre gets its own branded portal and parent app with schedules, payments, recordings and messages under your academy's name." },
  { title: "Granular team permissions", body: "Admin, teacher, parent, admissions coordinator and management portals — each seeing only the data they need." },
];

const CHECKLIST = [
  "Does the product cover everything you need — live classes, fees, attendance, admissions — in one system?",
  "Can parents pay fees online, and are automatic reminders sent when a payment is due?",
  "Is attendance recorded automatically, or does a teacher manually mark it each class?",
  "Does the platform support demo booking, follow-up sequences and a conversion pipeline?",
  "Can you pause class access for unpaid fees automatically without manual intervention?",
  "What happens to your content, student data and recordings if you switch platforms?",
  "How does pricing scale as you add students, teachers and branches?",
  "Can you test the full workflow live before committing to a subscription?",
];

const FAQ = [
  { q: "Who is Meet to Manage for?", a: "Online coaching centres, tuition academies, schools and individual coaches who want live classes, admissions, fees and a parent app in one system." },
  { q: "Can I try it before paying?", a: "Yes. Start a free trial or book a free walkthrough from this page." },
  { q: "Does it replace Zoom, spreadsheets and separate apps?", a: "Yes. Classes run in the built-in live classroom, and attendance, fees, schedules and parent communication all live in the same system." },
];

export default function eAdkarAlternative() {
  return (
    <PageShell
      eyebrow="Alternatives"
      title="An eAdkar alternative for coaching centres."
      sub="Exploring eAdkar for your coaching centre? Here is what Meet to Manage includes, and the questions to ask before you choose any platform."
      seo={{
        title: "eAdkar Alternative for Coaching Centres | Meet to Manage",
        description: "Comparing eAdkar for your coaching centre? See what Meet to Manage includes: live classes, attendance, fees, admissions and a parent app in one platform.",
        path: "/alternatives/eaddkar-alternative-for-coaching-centres",
      }}
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "eAdkar alternative for coaching centres",
          url: "https://meettomanage.cloud/alternatives/eaddkar-alternative-for-coaching-centres",
          about: { "@id": "https://meettomanage.cloud/#software" },
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        },
      ]}
    >
      <section className="bg-white pb-[clamp(64px,7vw,104px)]">
        <div className="mx-auto max-w-[1000px] px-5">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">What Meet to Manage includes</h2>
          <ul className="mt-5 grid gap-5 md:grid-cols-2">
            {INCLUDED.map((f) => (
              <li key={f.title} className="rounded-2xl border border-[#EFE3D7] bg-white p-7">
                <h3 className="font-display text-xl font-extrabold tracking-[-0.02em]">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#57534E]">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto mt-14 max-w-[1000px] px-5">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Eight questions to ask any platform</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#57534E]">Use this list with eAdkar, with us and with anyone else you are considering. Check each answer on the vendor's own site or in a demo.</p>
          <ol className="mt-5 grid gap-3">
            {CHECKLIST.map((c, i) => (
              <li key={c} className="flex gap-3 rounded-xl bg-[#FFF6EE] p-4 text-[15px] text-[#1C1917]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#C2410C] text-xs font-bold text-white">{i + 1}</span>
                {c}
              </li>
            ))}
          </ol>
        </div>

        <div className="mx-auto mt-14 max-w-[1000px] px-5">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Common questions</h2>
          <dl className="mt-5 divide-y divide-[#EFE3D7] rounded-2xl border border-[#EFE3D7]">
            {FAQ.map((f) => (
              <div key={f.q} className="p-6">
                <dt className="font-display text-base font-extrabold">{f.q}</dt>
                <dd className="mt-1.5 text-[15px] leading-relaxed text-[#57534E]">{f.a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-[15px] leading-relaxed text-[#57534E]">
            Explore <Link to="/solutions/live-class-software-for-institutes" className={LINK}>live class software</Link>, <Link to="/solutions/online-attendance-software-for-institutes" className={LINK}>online attendance</Link> and{" "}
            <Link to="/solutions/fee-management-software-for-coaching-centres" className={LINK}>fee management</Link>, compare <Link to="/compare" className={LINK}>all plans</Link>, or see <Link to="/pricing" className={LINK}>pricing</Link>. eAdkar is a trademark of its owner and is not affiliated with Meet to Manage.
          </p>
          <WalkthroughCta className="mt-6" />
        </div>
      </section>
    </PageShell>
  );
}
