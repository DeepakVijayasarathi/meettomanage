import { Link } from "react-router-dom";
import { ArrowRight, CreditCard, Database, Fingerprint, History, KeyRound, Lock, MessageSquare, Trash2, Video, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY } from "./MarketingNav";
import { PageShell } from "./PageShell";
import { SALES_WHATSAPP_URL } from "./WalkthroughCta";

/**
 * Data protection overview for buyers. Every line here must stay true of the running product: check the code
 * (tenancy, entitlement enforcement, payment gateways) and the privacy policy before adding a claim. No backup
 * schedule, hosting region or certification is stated because none is published yet.
 */
const PRACTICES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Database, title: "A separate database for every academy", body: "Each academy's students, fees, classes and messages live in their own database, not in rows shared with other academies." },
  { icon: KeyRound, title: "Role-based access", body: "Admins, teachers, parents, students and staff each see only what their role allows. Removing someone's access takes effect on their next request." },
  { icon: Lock, title: "Encrypted connections", body: "The website, portals and mobile apps talk to our servers over encrypted HTTPS connections." },
  { icon: History, title: "Activity logging", body: "Important actions are logged, so a question about who changed what can be traced." },
  { icon: CreditCard, title: "Payments through Razorpay or Cashfree", body: "Parents pay fees on the payment gateway's own pages. Card and bank details are entered with the gateway, not stored by us." },
  { icon: Video, title: "Recordings expire on schedule", body: "Class recordings are kept only for your plan's retention period, then removed automatically." },
  { icon: Fingerprint, title: "Biometric lock in the parent app", body: "Families can lock the app with their fingerprint or face, so a shared phone doesn't expose a child's details." },
  { icon: Trash2, title: "Deletion on request", body: "Users can ask us to delete their account and eligible personal information. Some records may be kept where the law requires it." },
];

const QUESTIONS = [
  "Where is our data hosted, and how is it backed up?",
  "Who on your team can access our academy's data?",
  "How do we export our data if we leave?",
  "What happens to recordings of children's classes?",
];

export default function SecurityPage() {
  return (
    <PageShell
      eyebrow="Data and security"
      title="How we look after your academy's data."
      sub="Coaching centres trust us with children's details, family contacts and fee records. Here is how that data is kept apart, protected and removed."
      seo={{ title: "Data Protection and Security | Meet to Manage", description: "How Meet to Manage protects academy data: a separate database per academy, role-based access, encrypted connections and gateway payments.", path: "/security" }}
    >
      <section className="bg-white pb-[clamp(48px,6vw,88px)]">
        <ul className="mx-auto grid max-w-[1100px] gap-4 px-5 sm:grid-cols-2">
          {PRACTICES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4 rounded-2xl border border-[#EFE3D7] bg-[#FFFBF7] p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E3] text-[#C2410C]"><Icon aria-hidden="true" className="h-5 w-5" /></span>
              <div>
                <h2 className="font-display text-lg font-extrabold tracking-[-0.02em] text-[#1C1917]">{title}</h2>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#57534E]">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-[#FFF8F3] py-[clamp(48px,6vw,80px)]">
        <div className="mx-auto grid max-w-[1100px] gap-8 px-5 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <h2 className="font-display text-[clamp(1.5rem,2.6vw,2.1rem)] font-extrabold leading-tight tracking-[-0.03em] text-[#1C1917]">What we don't claim yet</h2>
            <p className="mt-4 text-lg leading-relaxed text-[#57534E]">We don't publish formal compliance certifications such as ISO 27001 or SOC 2. If your institute needs specific answers for a security review, we'll go through them with you on a call.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/get-started?intent=security&from=security" className={cn(BTN_PRIMARY, "justify-center")}>Book a security walkthrough <ArrowRight className="h-4 w-4" /></Link>
              <a href={SALES_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D9C9BA] bg-white px-6 py-3 text-sm font-bold text-[#166534] hover:bg-[#F0FDF4]"><MessageSquare className="h-4 w-4" /> Ask on WhatsApp</a>
            </div>
          </div>
          <div className="rounded-2xl border border-[#EBCFB7] bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#C2410C]">Questions buyers usually ask</p>
            <ul className="mt-4 flex flex-col gap-3">
              {QUESTIONS.map((q) => <li key={q} className="border-b border-[#F2E4D7] pb-3 text-[15px] font-semibold text-[#292524] last:border-0 last:pb-0">{q}</li>)}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-[#6B625B]">Bring these to your walkthrough and we'll answer them for your academy.</p>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-[1100px] px-5 text-sm text-[#57534E]">
          Read the full <Link to="/privacy" className="font-semibold text-[#C2410C] underline underline-offset-4">Privacy Policy</Link> and <Link to="/legal/terms" className="font-semibold text-[#C2410C] underline underline-offset-4">Terms of Service</Link>, or email <a href="mailto:support@meettomanage.cloud" className="font-semibold text-[#C2410C] underline underline-offset-4">support@meettomanage.cloud</a>.
        </p>
      </section>
    </PageShell>
  );
}
