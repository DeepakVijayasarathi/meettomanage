import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY } from "./MarketingNav";
import { PageShell } from "./PageShell";

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

export default function AttendanceSolution() {
  return (
    <PageShell
      eyebrow="Attendance"
      title="Online attendance software for institutes."
      sub="Record attendance from the live class itself and show it to parents, without registers or spreadsheets."
      seo={{
        title: "Online Attendance Software for Institutes — Meet to Manage",
        description: "Attendance is recorded when students join the live class and shown to parents on their dashboard. One platform for classes, attendance, fees and reports.",
        path: "/solutions/online-attendance-software-for-institutes",
      }}
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Online attendance software for institutes",
        url: "https://meettomanage.cloud/solutions/online-attendance-software-for-institutes",
        about: { "@type": "SoftwareApplication", name: "Meet to Manage", applicationCategory: "EducationalApplication" },
      }}
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
        <div className="mx-auto mt-10 max-w-[1000px] px-5">
          <p className="text-[15px] leading-relaxed text-[#57534E]">
            Attendance is one part of the platform. The same system runs your live classes, admissions, fee collection and parent communication, so
            there is one record per student instead of several spreadsheets. See <Link to="/pricing" className="font-semibold text-[#C2410C] underline">pricing</Link> or{" "}
            <Link to="/customers" className="font-semibold text-[#C2410C] underline">how other centres use it</Link>.
          </p>
          <Link to="/get-started" className={cn(BTN_PRIMARY, "mt-6 w-fit")}>
            Book a free walkthrough <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
