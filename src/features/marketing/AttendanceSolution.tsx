import { Link } from "react-router-dom";
import { PageShell } from "./PageShell";
import { WalkthroughCta } from "./WalkthroughCta";

const LINK = "font-semibold text-[#C2410C] underline";

/** Only claims the product actually supports belong here: attendance is marked when a student opens the class link, parents see an attendance percentage, and staff get attendance reports. */
const POINTS = [
  {
    title: "Attendance marks itself",
    body: "When a student opens their personal live-class link, their attendance is recorded. Teachers do not call out names or tick a register after class.",
  },
  {
    title: "Parents see the result",
    body: "The parent dashboard shows each child's attendance percentage, so parents do not have to ask the centre how their child is doing.",
  },
  {
    title: "Reports for the centre",
    body: "Attendance sits alongside batches, sessions and fees, so owners can review who is attending and follow up with families who are drifting away.",
  },
];

const STEPS = [
  { title: "Schedule the class", body: "Create a session for a batch. Every enrolled student gets their own link to the live class." },
  { title: "Students join", body: "A student opens their link and joins. That moment is recorded as their attendance for the session." },
  { title: "Parents and staff see it", body: "The parent dashboard shows each child's attendance percentage, and staff review attendance next to batches, sessions and fees." },
];

const FAQ = [
  { q: "How is attendance recorded?", a: "Attendance is recorded when a student opens their personal live-class link and joins the class. There is no register to fill in afterwards." },
  { q: "Can parents see their child's attendance?", a: "Yes. The parent dashboard shows each child's attendance percentage, so parents do not need to message the centre to ask." },
  { q: "Do teachers have to mark attendance by hand?", a: "No. Attendance comes from the live class itself. Teachers can still review attendance and records from the teacher portal." },
  { q: "Is attendance connected to fees and batches?", a: "Yes. Attendance, batches, sessions and fees live in one system, so there is one record per student instead of several spreadsheets." },
];

export default function AttendanceSolution() {
  return (
    <PageShell
      eyebrow="Attendance"
      title="Online attendance software for coaching centres and institutes."
      sub="Record attendance from the live class itself and show it to parents, without registers or spreadsheets."
      seo={{
        title: "Online Attendance Software for Coaching Centres | Meet to Manage",
        description: "Online attendance software for coaching centres and institutes. Attendance is recorded when students join the live class and shown to parents. Fees and reports included.",
        path: "/solutions/online-attendance-software-for-institutes",
      }}
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Online attendance software for coaching centres and institutes",
          url: "https://meettomanage.cloud/solutions/online-attendance-software-for-institutes",
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
        <ul className="mx-auto grid max-w-[1000px] gap-5 px-5 md:grid-cols-3">
          {POINTS.map((p) => (
            <li key={p.title} className="rounded-2xl border border-[#EFE3D7] bg-white p-7">
              <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">{p.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#57534E]">{p.body}</p>
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-14 max-w-[1000px] px-5">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">How online attendance works</h2>
          <ol className="mt-5 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-[#FFF6EE] p-6">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#C2410C] text-sm font-bold text-white">{i + 1}</span>
                <h3 className="font-display mt-3 text-lg font-extrabold">{s.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#57534E]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mx-auto mt-14 max-w-[1000px] px-5">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Attendance questions, answered</h2>
          <dl className="mt-5 divide-y divide-[#EFE3D7] rounded-2xl border border-[#EFE3D7]">
            {FAQ.map((f) => (
              <div key={f.q} className="p-6">
                <dt className="font-display text-base font-extrabold">{f.q}</dt>
                <dd className="mt-1.5 text-[15px] leading-relaxed text-[#57534E]">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mx-auto mt-10 max-w-[1000px] px-5">
          <p className="text-[15px] leading-relaxed text-[#57534E]">
            Attendance is one part of the platform. The same system runs your <Link to="/solutions/live-class-software-for-institutes" className={LINK}>live classes</Link>, admissions, fee collection and parent communication, so
            there is one record per student instead of several spreadsheets. Learn about <Link to="/solutions/fee-management-software-for-coaching-centres" className={LINK}>fee management</Link>, see <Link to="/pricing" className={LINK}>pricing</Link> or{" "}
            <Link to="/customers" className={LINK}>how other centres use it</Link>. Comparing tools? Read our <Link to="/alternatives/classplus-alternative-for-coaching-centres" className={LINK}>Classplus alternative guide</Link>.
          </p>
          <WalkthroughCta className="mt-6" />
        </div>
      </section>
    </PageShell>
  );
}
