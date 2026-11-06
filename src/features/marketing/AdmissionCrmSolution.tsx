import { Link } from "react-router-dom";
import { PageShell } from "./PageShell";
import { WalkthroughCta } from "./WalkthroughCta";

const LINK = "font-semibold text-[#C2410C] underline underline-offset-4";

const FEATURES = [
  ["Capture every enquiry", "Keep the parent name, child details, course interest, source and contact history together instead of splitting new leads across forms, WhatsApp and spreadsheets."],
  ["Plan and book demo classes", "Offer a suitable demo slot, assign a teacher and keep the meeting details attached to the enquiry so admissions staff can see what happens next."],
  ["Follow up on time", "Give every lead an owner and a dated next action. Overdue follow-ups remain visible until they are completed, reducing the chance that an interested family is forgotten."],
  ["Move leads through one pipeline", "Track a family from new enquiry to contacted, demo booked, trial, payment and enrolment. The current stage is visible without reading an entire message thread."],
  ["Keep the demo outcome", "Record attendance, teacher feedback, parent questions and the next recommended action after a demo instead of losing the result when staff change shifts."],
  ["Collect the first payment", "Create the admission payment and share a secure payment link. Once payment is confirmed, the parent and student records are created from the same lead details."],
  ["Understand where admissions come from", "Compare enquiry sources, demo bookings and conversions so you can see which campaigns and referrals are producing families—not just clicks."],
  ["Continue after enrolment", "The same platform manages batches, classes, attendance, fees, parent updates and learning resources, so admissions data does not need to be entered again."],
] as const;

const FAQ = [
  ["What is coaching centre admission CRM software?", "It is a shared system for recording enquiries, assigning follow-ups, booking demo classes, tracking admission stages and converting an interested family into an enrolled student."],
  ["Can parents book a demo class?", "Meet to Manage supports the demo workflow from enquiry and scheduling through teacher assignment, attendance, feedback and the next admission action."],
  ["Does it replace an enquiry spreadsheet?", "Yes. The admissions pipeline keeps the lead, owner, contact history, status, follow-up date and demo outcome together, while still allowing teams to import existing lead data."],
  ["What happens after a parent pays?", "The admission can continue into the academy workspace, where staff manage the student, parent access, batch, schedule, invoices, attendance and classes."],
] as const;

export default function AdmissionCrmSolution() {
  const path = "/solutions/coaching-centre-admission-crm";
  return (
    <PageShell
      eyebrow="Admissions and demo booking"
      title="Coaching centre admission CRM for enquiries, demos and follow-ups."
      sub="Turn a new parent enquiry into a booked demo and enrolled student without losing the next action in WhatsApp, a spreadsheet or a staff member's inbox."
      seo={{
        title: "Coaching Centre Admission CRM & Demo Booking Software",
        description: "Manage academy enquiries, demo class bookings, follow-ups, payments and enrolment in one coaching centre admission CRM. Built for education businesses in India.",
        path,
      }}
      jsonLd={[
        { "@context": "https://schema.org", "@type": "WebPage", name: "Coaching centre admission CRM and demo booking software", url: `https://meettomanage.cloud${path}`, about: { "@id": "https://meettomanage.cloud/#software" } },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
      ]}
    >
      <section className="bg-white pb-[clamp(64px,7vw,104px)]">
        <div className="mx-auto max-w-[1000px] px-5">
          <div className="rounded-2xl border border-[#F0D8C4] bg-[#FFF8F3] p-6 sm:p-8">
            <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">One admission record from first enquiry to first paid class</h2>
            <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-[#57534E]">A parent should not have to repeat their details after a demo, and your team should not have to search several tools to learn who promised the next call. Meet to Manage connects the sales conversation to the operational student record.</p>
          </div>
          <ul className="mt-6 grid gap-5 md:grid-cols-2">
            {FEATURES.map(([title, body]) => <li key={title} className="rounded-2xl border border-[#EFE3D7] p-7"><h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">{title}</h2><p className="mt-2 text-[15px] leading-relaxed text-[#57534E]">{body}</p></li>)}
          </ul>
          <section className="mt-12" aria-labelledby="admission-crm-faq"><h2 id="admission-crm-faq" className="font-display text-2xl font-extrabold tracking-[-0.02em]">Admission CRM questions</h2><div className="mt-5 grid gap-4 md:grid-cols-2">{FAQ.map(([question, answer]) => <article key={question} className="rounded-2xl border border-[#EFE3D7] p-6"><h3 className="font-bold">{question}</h3><p className="mt-2 text-sm leading-relaxed text-[#57534E]">{answer}</p></article>)}</div></section>
          <div className="mt-12 rounded-2xl bg-[#FFF8F3] p-6 sm:p-8"><h2 className="font-display text-2xl font-extrabold">Connect admissions to the rest of your centre</h2><p className="mt-3 text-[15px] leading-relaxed text-[#57534E]">See how the CRM connects with <Link className={LINK} to="/solutions/tuition-centre-management-software">tuition centre management</Link>, <Link className={LINK} to="/solutions/online-attendance-software-for-institutes">student attendance</Link>, <Link className={LINK} to="/solutions/fee-management-software-for-coaching-centres">fee collection</Link> and the <Link className={LINK} to="/pricing">parent app and plans</Link>.</p><WalkthroughCta className="mt-6" /></div>
        </div>
      </section>
    </PageShell>
  );
}
