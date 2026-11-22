import { Link } from "react-router-dom";
import { PageShell } from "./PageShell";
import { WalkthroughCta } from "./WalkthroughCta";

const LINK = "font-semibold text-[#C2410C] underline underline-offset-4";

/** Every item is a shipped capability of Meet to Manage. Nothing is claimed about Topshelf: its features could not be verified from its own site, so the page gives buyers questions to check instead. */
const INCLUDED = [
  { title: "Live classroom inside the product", body: "Video, shared whiteboard, live quizzes, screen sharing and recordings — no need to run a separate video tool alongside your teaching." },
  { title: "Attendance and parent app included", body: "Parents join classes with one tap, see the schedule, watch recordings and check attendance without installing anything extra." },
  { title: "Fee collection built in", body: "Invoices, automatic reminders and online payment through Razorpay or Cashfree. Class access can pause for overdue fees without manual work." },
  { title: "Admissions and demo tracking", body: "From first enquiry to enrolled student, track every step: demo bookings, teacher assignment, feedback and conversion rates." },
  { title: "Team roles with permissions", body: "Separate portals for admin, teachers, parents, admissions staff and management — each seeing only what they need." },
  { title: "No per-student fees", body: "Pricing is based on your plan, not on how many students or teachers you add, so growth doesn't mean higher costs." },
];

const CHECKLIST = [
  "Does the live classroom run inside the product, or do you need Zoom/Meet alongside it?",
  "Can parents pay fees online and see invoices automatically?",
  "Is attendance recorded automatically, not by a manual register?",
  "Are fee reminders sent without someone remembering to write them?",
  "Does it cover admissions and demos, or only teaching and scheduling?",
  "What happens to your data and recordings if you leave the platform?",
  "How much does it cost once you add students, teachers and parents?",
  "Can you try it free before committing to a subscription?",
];

const FAQ = [
  { q: "Who is Meet to Manage for?", a: "Online coaching centres, tutoring academies, schools and individual coaches who want live classes, admissions, fees and a parent app in one system." },
  { q: "Can I try it before paying?", a: "Yes. You can start a free trial or book a free walkthrough from this page." },
  { q: "Does it replace spreadsheets and separate video tools?", a: "Yes. Classes run in the built-in live classroom, and attendance, fees, schedules and parent communication all live in the same system." },
];

export default function TopshelfAlternative() {
  return (
    <PageShell
      eyebrow="Alternatives"
      title="A Topshelf alternative for coaching centres."
      sub="Looking at tools for your coaching centre? Here is what Meet to Manage includes, and the questions to ask before you choose any platform."
      seo={{
        title: "Topshelf Alternative for Coaching Centres | Meet to Manage",
        description: "Comparing Topshelf for your coaching centre? See what Meet to Manage includes: live classes, attendance, fees, admissions and a parent app in one platform.",
        path: "/alternatives/topshelf-alternative-for-coaching-centres",
      }}
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Topshelf alternative for coaching centres",
          url: "https://meettomanage.cloud/alternatives/topshelf-alternative-for-coaching-centres",
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
          <p className="mt-3 text-[15px] leading-relaxed text-[#57534E]">Use this list with Topshelf, with us and with anyone else you are considering. Check each answer on the vendor's own site or in a demo.</p>
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
            <Link to="/solutions/fee-management-software-for-coaching-centres" className={LINK}>fee management</Link>, or see <Link to="/pricing" className={LINK}>pricing</Link>. Topshelf is a trademark of its owner and is not affiliated with Meet to Manage.
          </p>
          <WalkthroughCta className="mt-6" />
        </div>
      </section>
    </PageShell>
  );
}
