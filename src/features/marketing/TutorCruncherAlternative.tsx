import { Link } from "react-router-dom";
import { PageShell } from "./PageShell";
import { WalkthroughCta } from "./WalkthroughCta";

const LINK = "font-semibold text-[#C2410C] underline underline-offset-4";

/** Every item is a shipped capability of Meet to Manage. Nothing is claimed about TutorCruncher: its features could not be verified from its own site, so the page gives buyers questions to check instead. */
const INCLUDED = [
  { title: "Academy management from day one", body: "Enquiries, demo bookings, enrolments, class scheduling, attendance, fees and parent communication — all in one system instead of separate spreadsheets and tools." },
  { title: "Live classes with interactive tools", body: "Video, whiteboard, screen sharing, live quizzes and class recordings. Run your classes without switching to a separate video platform." },
  { title: "Fee collection built in", body: "Invoices, automatic payment reminders, online payment through Razorpay or Cashfree. Pause class access for overdue fees automatically." },
  { title: "Admissions CRM", body: "Track every enquiry, schedule demo classes, collect feedback and convert families — all with a visual pipeline board." },
  { title: "Parent app and communication", body: "Parents join classes with one tap, view the schedule, check recordings, pay fees and message teachers — all from one branded app." },
  { title: "Team roles for the whole centre", body: "Admin, teacher, parent, admissions staff and management portals with permissions you control at every level." },
];

const CHECKLIST = [
  "Does the product cover the full lifecycle — enquiry, demo, enrolment, classes, fees — in one system?",
  "Can parents pay fees online and receive automatic reminders when payment is due?",
  "Is attendance recorded automatically during class, or must a teacher mark it manually?",
  "Does the platform support live classes with whiteboard, screen sharing and recordings?",
  "Can you pause class access for unpaid fees automatically without manual follow-up?",
  "What happens to your student data, class recordings and teaching materials if you leave the platform?",
  "How does pricing change as you add students, tutors and branches?",
  "Can you try the full workflow live before you commit to a contract?",
];

const FAQ = [
  { q: "Who is Meet to Manage for?", a: "Online coaching centres, tuition academies, schools and individual tutors who want live classes, admissions, fees and a parent app in one system." },
  { q: "Can I try it before paying?", a: "Yes. Start a free trial or book a free walkthrough from this page." },
  { q: "Does it replace separate tools like Zoom and spreadsheets?", a: "Yes. Classes run in the built-in live classroom, and attendance, fees, schedules and parent communication all live in the same system." },
];

export default function TutorCruncherAlternative() {
  return (
    <PageShell
      eyebrow="Alternatives"
      title="A TutorCruncher alternative for coaching centres."
      sub="Exploring TutorCruncher for your coaching centre? Here is what Meet to Manage includes, and the questions to ask before you choose any platform."
      seo={{
        title: "TutorCruncher Alternative for Coaching Centres | Meet to Manage",
        description: "Comparing TutorCruncher for your coaching centre? See what Meet to Manage includes: live classes, attendance, fees, admissions and a parent app in one platform.",
        path: "/alternatives/tutorcruncher-alternative-for-coaching-centres",
      }}
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "TutorCruncher alternative for coaching centres",
          url: "https://meettomanage.cloud/alternatives/tutorcruncher-alternative-for-coaching-centres",
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
          <p className="mt-3 text-[15px] leading-relaxed text-[#57534E]">Use this list with TutorCruncher, with us and with anyone else you are considering. Check each answer on the vendor's own site or in a demo.</p>
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
            <Link to="/solutions/fee-management-software-for-coaching-centres" className={LINK}>fee management</Link>, compare <Link to="/compare" className={LINK}>all plans</Link>, or see <Link to="/pricing" className={LINK}>pricing</Link>. TutorCruncher is a trademark of its owner and is not affiliated with Meet to Manage.
          </p>
          <WalkthroughCta className="mt-6" />
        </div>
      </section>
    </PageShell>
  );
}
