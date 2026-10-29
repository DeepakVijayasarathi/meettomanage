import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpenText, CalendarCheck2, CreditCard, FileText, LayoutDashboard, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageShell } from "./PageShell";

/** What The Reader Nest uses, taken from the product configuration and from The Reader Nest's own published
 *  Terms & Conditions (src/content/terms.ts). No figures or quotes appear here until the customer supplies and approves them. */
const USES = [
  { icon: LayoutDashboard, title: "A parent dashboard", body: "Each family manages its child's learning from one dashboard: course details, class schedule, attendance, worksheets and recordings." },
  { icon: CreditCard, title: "Enrolment after payment", body: "A child's enrolment begins once the course fee is paid and the parent has accepted the Terms & Conditions and Refund Policy, all inside the portal." },
  { icon: CalendarCheck2, title: "One-to-one and group batches", body: "After enrolment, each child is placed in the right group batch or individual class, and the schedule is shared on the dashboard." },
  { icon: Video, title: "Live online classes", body: "Classes run in the live classroom, with recordings and worksheets available to families afterwards." },
  { icon: FileText, title: "Clear class rules, in one place", body: "Cancellation windows and refund rules are written into the portal, and class changes are made through the dashboard rather than in chat apps." },
  { icon: BookOpenText, title: "Phonics and public speaking", body: "Programmes for children including phonics and public speaking, supported by books and worksheets." },
];

export default function CaseStudyReaderNest() {
  return (
    <PageShell
      eyebrow="Customer story"
      title="The Reader Nest runs online phonics and public speaking on one platform."
      sub="From enrolment to the live class to the parent dashboard."
      seo={{
        title: "The Reader Nest Customer Story — Meet to Manage",
        description: "How The Reader Nest runs online phonics and public-speaking classes for children on Meet to Manage: enrolment, live classes, worksheets, recordings and a parent dashboard.",
        path: "/customers/the-reader-nest",
        type: "article",
      }}
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "The Reader Nest runs online phonics and public speaking on one platform",
        url: "https://meettomanage.cloud/customers/the-reader-nest",
        publisher: { "@type": "Organization", name: "Meet to Manage", logo: { "@type": "ImageObject", url: "https://meettomanage.cloud/logo-icon.png" } },
        about: { "@type": "Organization", name: "The Reader Nest" },
      }}
    >
      <article className="bg-white pb-[clamp(64px,7vw,104px)]">
        <div className="mx-auto max-w-[860px] px-5">
          <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#C2410C] hover:underline"><ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> All customers</Link>

          <div className="mt-8 flex items-center gap-4 rounded-2xl border border-[#EFE3D7] bg-[#FFF6EE] p-5">
            <img src="/clients/thereader.png" alt="The Reader Nest logo" width={64} height={64} className="h-16 w-16 rounded-full object-cover ring-1 ring-black/10" />
            <dl className="grid flex-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
              <div><dt className="font-bold text-[#1C1917]">Customer</dt><dd className="text-[#57534E]">The Reader Nest</dd></div>
              <div><dt className="font-bold text-[#1C1917]">Teaches</dt><dd className="text-[#57534E]">Phonics and public speaking for children</dd></div>
              <div><dt className="font-bold text-[#1C1917]">Format</dt><dd className="text-[#57534E]">Online, one-to-one and group classes</dd></div>
              <div><dt className="font-bold text-[#1C1917]">Platform</dt><dd className="text-[#57534E]">Meet to Manage</dd></div>
            </dl>
          </div>

          <h2 className="font-display mt-14 text-[clamp(1.4rem,2.5vw,1.85rem)] font-extrabold tracking-[-0.03em]">How The Reader Nest uses the platform</h2>
          <p className="mt-4 text-lg leading-relaxed text-[#57534E]">The Reader Nest teaches children online. Its programmes run as group batches and individual sessions, and families follow everything from the parent dashboard. These are the parts of Meet to Manage it uses.</p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {USES.map((u) => (
              <li key={u.title} className="rounded-2xl border border-[#EFE3D7] bg-white p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFEBDD] text-[#C2410C]"><u.icon className="h-5 w-5" /></span>
                <h3 className="font-display mt-4 text-lg font-extrabold tracking-[-0.01em]">{u.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#57534E]">{u.body}</p>
              </li>
            ))}
          </ul>

          <div className="mt-14 rounded-3xl bg-[#C2410C] p-8 text-white sm:p-10">
            <h2 className="font-display text-[clamp(1.35rem,2.4vw,1.75rem)] font-extrabold tracking-[-0.03em]">See it for your centre.</h2>
            <p className="mt-3 max-w-xl text-lg leading-relaxed">Book a free demo class. We will set up a sample batch so you can see enrolment, the live class, fees and the parent app working together.</p>
            <Link to="/get-started" className={cn("mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-4 text-[15px] font-bold text-[#9A3412] transition-colors hover:bg-[#FFF3EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white")}>Book a free demo <ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></Link>
          </div>
        </div>
      </article>
    </PageShell>
  );
}
