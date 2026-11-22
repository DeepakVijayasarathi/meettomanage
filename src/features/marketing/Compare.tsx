import { Link } from "react-router-dom";
import { ArrowRight, Check, X, Sparkles } from "lucide-react";
import { PageShell } from "./PageShell";
import { WalkthroughCta } from "./WalkthroughCta";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "./styles";

const LINK = "font-semibold text-[#C2410C] underline underline-offset-4";
const SITE = "https://meettomanage.cloud";

/** Feature groups in the comparison table. Each row shows Free, Basic, Pro and Growth. */
const FEATURE_ROWS: {
  category: string;
  rows: {
    name: string;
    free: string | boolean;
    basic: string | boolean;
    pro: string | boolean;
    growth: string | boolean;
  }[];
}[] = [
  {
    category: "Students & Staff",
    rows: [
      { name: "Active students", free: "25", basic: "75", pro: "250", growth: "750" },
      { name: "Teachers & staff", free: "3", basic: "5", pro: "15", growth: "50" },
      { name: "Storage", free: "1 GB", basic: "10 GB", pro: "50 GB", growth: "200 GB" },
    ],
  },
  {
    category: "Live Classes",
    rows: [
      { name: "Video classroom", free: true, basic: true, pro: true, growth: true },
      { name: "Shared whiteboard", free: true, basic: true, pro: true, growth: true },
      { name: "Screen sharing", free: true, basic: true, pro: true, growth: true },
      { name: "Live quizzes", free: true, basic: true, pro: true, growth: true },
      { name: "Class recordings (browser)", free: "12 hrs/mo", basic: "36 hrs/mo", pro: "120 hrs/mo", growth: "360 hrs/mo" },
      { name: "Recording retention", free: "0 days", basic: "7 days", pro: "30 days", growth: "90 days" },
      { name: "Server recording", free: false, basic: false, pro: false, growth: true },
    ],
  },
  {
    category: "Parent App & Communication",
    rows: [
      { name: "Parent app", free: true, basic: true, pro: true, growth: true },
      { name: "Class schedule for parents", free: true, basic: true, pro: true, growth: true },
      { name: "Parent notifications (push/SMS)", free: true, basic: true, pro: true, growth: true },
      { name: "WhatsApp notifications", free: false, basic: false, pro: true, growth: true },
      { name: "Bulk messaging", free: false, basic: false, pro: true, growth: true },
    ],
  },
  {
    category: "Fees & Finance",
    rows: [
      { name: "Online payment gateway", free: false, basic: true, pro: true, growth: true },
      { name: "Invoicing", free: false, basic: true, pro: true, growth: true },
      { name: "Automatic fee reminders", free: false, basic: true, pro: true, growth: true },
      { name: "Pause classes for overdue fees", free: false, basic: true, pro: true, growth: true },
      { name: "Teacher payouts & payroll", free: false, basic: false, pro: false, growth: true },
    ],
  },
  {
    category: "Admissions & Teaching",
    rows: [
      { name: "Demo booking & tracking", free: false, basic: false, pro: true, growth: true },
      { name: "Admissions pipeline board", free: false, basic: false, pro: true, growth: true },
      { name: "Homework & assignments", free: false, basic: true, pro: true, growth: true },
      { name: "Quiz bank", free: false, basic: true, pro: true, growth: true },
      { name: "Certificates", free: false, basic: true, pro: true, growth: true },
    ],
  },
  {
    category: "Advanced & Branding",
    rows: [
      { name: "Your academy's branding", free: false, basic: true, pro: true, growth: true },
      { name: "White-label parent app", free: false, basic: true, pro: true, growth: true },
      { name: "Custom domain", free: false, basic: false, pro: false, growth: true },
      { name: "API access", free: false, basic: false, pro: false, growth: true },
      { name: "Reports & analytics dashboard", free: false, basic: false, pro: false, growth: true },
      { name: "Leave management & class logs", free: false, basic: false, pro: false, growth: true },
    ],
  },
];

function CheckCell({ value, category, rowName }: { value: string | boolean | null | undefined; category: string; rowName: string }) {
  const isCheck = value === true;
  const isX = value === false;
  if (isCheck) return <span className="flex justify-center"><Check className="h-5 w-5 text-[#16A34A]" /></span>;
  if (isX) return <span className="flex justify-center"><X className="h-5 w-5 text-[#D1D5DB]" /></span>;
  if (typeof value === "string") return <span className="text-sm font-medium text-[#374151]">{value}</span>;
  return <span className="text-sm text-[#D1D5DB]">—</span>;
}

export default function Compare() {
  return (
    <PageShell
      eyebrow="Compare plans"
      title="Free vs paid — see what fits your academy."
      sub="Start free with live classes and the parent app. Upgrade when you need fees, admissions, reports or more students."
      seo={{
        title: "Compare Plans — Meet to Manage",
        description: "Compare Meet to Manage Free, Basic, Pro and Growth plans. Live classes free forever. Add fees, admissions, WhatsApp, reports as you grow.",
        path: "/compare",
      }}
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Meet to Manage plan comparison",
        url: SITE + "/compare",
      }}
    >
      <section className="bg-white pb-[clamp(64px,7vw,104px)]">
        {/* Plans overview cards */}
        <div className="mx-auto max-w-[1200px] px-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                name: "Free",
                price: "₹0/mo",
                cta: "Create free account",
                ctaTo: "/signup?plan=free",
                badge: "Free forever",
                color: "border-[#E5DCCD] bg-white",
              },
              {
                name: "Basic",
                price: "₹999/mo",
                cta: "Start 14-day trial",
                ctaTo: "/signup?plan=trial&for=basic",
                badge: "14-day trial",
                color: "border-[#E5DCCD] bg-[#FFFBF7]",
              },
              {
                name: "Pro",
                price: "₹2,499/mo",
                cta: "Start 14-day trial",
                ctaTo: "/signup?plan=trial&for=pro",
                badge: "Most popular",
                color: "border-[#C2410C] bg-[#FFF6EE] shadow-[0_4px_20px_-12px_rgba(194,65,12,0.3)]",
              },
              {
                name: "Growth",
                price: "₹5,999/mo",
                cta: "Talk to us",
                ctaTo: "/get-started",
                badge: null,
                color: "border-[#E5DCCD] bg-white",
              },
            ].map((plan) => (
              <div key={plan.name} className={cn("rounded-2xl border-2 p-6 transition-shadow hover:shadow-lg", plan.color, FOCUS_RING)}>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-extrabold text-[#1C1917]">{plan.name}</p>
                  {plan.badge && (
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      plan.name === "Pro" ? "bg-[#C2410C] text-white" : "bg-[#F5E8DE] text-[#9A3412]"
                    )}>
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-2xl font-extrabold text-[#1C1917]">{plan.price}</p>
                <Link to={plan.ctaTo} className={cn(
                  "mt-5 flex items-center justify-center gap-2 rounded-full text-sm font-bold text-white transition-colors hover:opacity-90",
                  plan.name === "Free" ? "bg-[#C2410C]" : plan.name === "Pro" ? "bg-[#C2410C]" : "bg-[#1C1917]"
                )}>
                  {plan.cta} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="mx-auto mt-14 max-w-[1200px] px-5">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Feature comparison</h2>
          <div className="mt-6 overflow-x-auto rounded-2xl border border-[#E5DDD1]">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-[#E5DDD1] bg-[#FFF6EE]">
                  <th className="text-start p-4 font-extrabold text-[#1C1917]">Feature</th>
                  <th className="w-28 p-4 text-center font-extrabold text-[#1C1917]">Free</th>
                  <th className="w-28 p-4 text-center font-extrabold text-[#9A3412]">Basic</th>
                  <th className="w-28 p-4 text-center font-extrabold text-[#C2410C]">Pro</th>
                  <th className="w-28 p-4 text-center font-extrabold text-[#1C1917]">Growth</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((group, gi) => (
                  <>
                    {group.rows.map((row, ri) => (
                      <tr
                        key={row.name}
                        className={cn(
                          "border-b border-[#F0E5DA] transition-colors hover:bg-[#FFFBF7]",
                          gi % 2 !== 0 && "bg-[#FFFCF9]"
                        )}
                      >
                        <td className="p-4 font-medium text-[#374151]">{row.name}</td>
                        <td className="p-4"><CheckCell value={row.free} category={group.category} rowName={row.name} /></td>
                        <td className="p-4"><CheckCell value={row.basic} category={group.category} rowName={row.name} /></td>
                        <td className="p-4"><CheckCell value={row.pro} category={group.category} rowName={row.name} /></td>
                        <td className="p-4"><CheckCell value={row.growth} category={group.category} rowName={row.name} /></td>
                      </tr>
                    ))}
                    {/* Spacer row between groups */}
                    {gi < FEATURE_ROWS.length - 1 && (
                      <tr>
                        <td colSpan={5} className="p-0"></td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-[#9CA3AF]">Pro plan shown as most popular. All paid plans include a 14-day trial with every module unlocked. Prices exclude applicable taxes.</p>
        </div>

        {/* Add-ons */}
        <div className="mx-auto mt-16 max-w-[1000px] px-5">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Add-ons when you need more</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#57534E]">Grow without jumping a whole plan. Ask us on WhatsApp and we'll add any of these to your account.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              { name: "50 more students", price: "₹399 / month" },
              { name: "50 GB more storage", price: "₹299 / month" },
              { name: "Keep recordings 180 days", price: "₹499 / month" },
              { name: "Custom domain on Pro", price: "₹499 / month" },
              { name: "WhatsApp messages", price: "Prepaid credit" },
            ].map((addon) => (
              <div key={addon.name} className="flex items-center justify-between rounded-xl border border-[#E5DDD1] bg-[#FFFBF7] p-4">
                <span className="font-medium text-[#374151]">{addon.name}</span>
                <span className="text-sm font-bold text-[#C2410C]">{addon.price}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-16 max-w-[1000px] px-5">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Common questions</h2>
          <dl className="mt-6 divide-y divide-[#EFE3D7] rounded-2xl border border-[#EFE3D7]">
            {[
              { q: "Can I switch plans later?", a: "Yes. Change or cancel your plan at any time from the admin panel. Nothing already in your account is removed when you downgrade." },
              { q: "What happens when I reach my student limit?", a: "New admissions pause until you add an add-on or move up a plan. Your existing students and teachers are never removed." },
              { q: "Is the Free plan really free forever?", a: "Yes. Free includes live classes, parent app and the teacher portal with no time limit or trial period." },
              { q: "Can I get a custom quote?", a: "For multi-branch institutes that want the platform under their own name and domain, we offer a one-time licence with annual maintenance." },
              { q: "Do you offer education discounts?", a: "Reach out on WhatsApp or email and we'll discuss options for small academies and individual coaches." },
            ].map((f) => (
              <div key={f.q} className="p-6">
                <dt className="font-display text-base font-extrabold">{f.q}</dt>
                <dd className="mt-1.5 text-[15px] leading-relaxed text-[#57534E]">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* CTA */}
        <div className="mx-auto mt-16 max-w-[1000px] px-5">
          <WalkthroughCta />
        </div>
      </section>
    </PageShell>
  );
}
