import { Link } from "react-router-dom";
import { PageShell } from "./PageShell";
import { WalkthroughCta } from "./WalkthroughCta";

const LINK = "font-semibold text-[#C2410C] underline";

/** Every item is a shipped capability of Meet to Manage. Nothing is claimed about Classplus: its features could not be verified from its own site, so the page gives buyers questions to check instead. */
const INCLUDED = [
  { title: "A live classroom built in", body: "Video, a shared whiteboard, live quizzes, screen sharing and recordings, so classes do not need a separate video tool." },
  { title: "Attendance without a register", body: "Attendance is recorded when a student opens their class link, and parents see an attendance percentage." },
  { title: "Fees that collect themselves", body: "Invoices and reminders are created automatically, families pay online through Razorpay or Cashfree, and class access can pause automatically for overdue fees." },
  { title: "Admissions in the same system", body: "Demo bookings, teacher assignment, feedback and a conversion board take a family from first enquiry to enrolment." },
  { title: "A parent app for every family", body: "Parents see the schedule, join a class with one tap, watch recordings, pay fees and raise support tickets." },
  { title: "Roles for your whole team", body: "Separate portals for admin, teachers, parents, admissions, coordinators and management, with permissions you control." },
];

const CHECKLIST = [
  "Do live classes run inside the product, or do you need Zoom or Meet alongside it?",
  "Is attendance recorded automatically, and can parents see it?",
  "Can parents pay fees online, and are invoices and reminders automatic?",
  "Can you pause class access for unpaid fees without doing it by hand?",
  "Does it cover admissions and demo classes, or only teaching?",
  "Is there a parent app, and is it branded for your centre?",
  "How much does it cost per month once your students and teachers are added?",
  "Can you try it free before you commit?",
];

const FAQ = [
  { q: "Who is Meet to Manage for?", a: "Online coaching centres, tutoring academies, schools and individual coaches who want live classes, admissions, fees and a parent app in one system." },
  { q: "Can I try it before paying?", a: "Yes. You can start a free trial or book a free walkthrough from this page." },
  { q: "Does it replace Zoom and spreadsheets?", a: "Yes. Classes run in the built-in live classroom, and attendance, fees and schedules live in the same system, so there are no separate spreadsheets." },
];

export default function ClassplusAlternative() {
  return (
    <PageShell
      eyebrow="Alternatives"
      title="A Classplus alternative for coaching centres."
      sub="Looking at tools for your coaching centre? Here is what Meet to Manage includes, and the questions to ask before you choose any platform."
      seo={{
        title: "Classplus Alternative for Coaching Centres | Meet to Manage",
        description: "Comparing Classplus for your coaching centre? See what Meet to Manage includes: live classes, attendance, fees, admissions and a parent app in one platform.",
        path: "/alternatives/classplus-alternative-for-coaching-centres",
      }}
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Classplus alternative for coaching centres",
          url: "https://meettomanage.cloud/alternatives/classplus-alternative-for-coaching-centres",
          about: { "@type": "SoftwareApplication", name: "Meet to Manage", applicationCategory: "EducationalApplication" },
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
          <p className="mt-3 text-[15px] leading-relaxed text-[#57534E]">Use this list with Classplus, with us and with anyone else you are considering. Check each answer on the vendor's own site or in a demo.</p>
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
            <Link to="/solutions/fee-management-software-for-coaching-centres" className={LINK}>fee management</Link>, or see <Link to="/pricing" className={LINK}>pricing</Link>. Classplus is a trademark of its owner and is not affiliated with Meet to Manage.
          </p>
          <WalkthroughCta className="mt-6" />
        </div>
      </section>
    </PageShell>
  );
}
