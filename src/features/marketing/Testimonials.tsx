import { Link } from "react-router-dom";
import { Star, ArrowRight, Check, Quote } from "lucide-react";
import { PageShell } from "./PageShell";
import { WalkthroughCta } from "./WalkthroughCta";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "./styles";

const SITE = "https://meettomanage.cloud";

const REVIEWS = [
  {
    author: "Akanksha Nagar",
    role: "Founder, The Reader Nest",
    rating: 5,
    text: "Meet to Manage understood our workflow from day one. Instead of forcing us into a rigid template, the team worked with us to customise admissions, teacher scheduling and parent access around how we actually operate. The result is a platform that feels built for us — because it was.",
    story: "/customers/the-reader-nest",
    storyLabel: "Read The Reader Nest's story",
  },
  {
    author: "Alphabet Academy",
    role: "Director, Jolly Phonics & Storytelling",
    rating: 5,
    text: "We needed a system that could handle phonics classes, storytelling sessions, parent communication and fee management without juggling three different tools. Meet to Manage brought everything together, and our teachers can now focus on what matters — the children.",
    story: "/customers/alphabet",
    storyLabel: "Read Alphabet's story",
  },
];

const RATINGS_SUMMARY = [
  { label: "Average rating", value: "4.9/5", icon: "⭐" },
  { label: "Customers featured", value: "2+", icon: "🏫" },
  { label: "Satisfaction", value: "100%", icon: "🤝" },
];

const WHATS_INCLUDED = [
  "Live classroom with whiteboard and screen sharing",
  "Attendance tracking and parent app",
  "Automated fee collection and reminders",
  "Admissions CRM with demo booking",
  "Team roles with granular permissions",
  "Recording and playback for every class",
  "Homework, quizzes and certificates",
  "WhatsApp integration and bulk messaging",
  "Custom domain and white-label options",
  "Two-way API for integrations",
];

const FAQ = [
  { q: "Can I try Meet to Manage before committing?", a: "Yes. You can start a free trial for up to 14 days with full access, or book a free 30-minute walkthrough of the platform." },
  { q: "What if I need help setting up?", a: "The platform supports direct onboarding assistance. You can also reach the team through WhatsApp, email or the in-app chat." },
  { q: "Do I have to migrate my data manually?", a: "No. The team can help migrate existing student, batch and teacher data so you do not lose continuity when switching." },
  { q: "Is my data safe and private?", a: "Meet to Manage follows strict data protection practices. Student records, payment information and class recordings are stored securely with role-based access controls." },
  { q: "Can I leave if the platform is not a good fit?", a: "You can export your data at any time. Meet to Manage does not lock you in — your student records, fees and resources are always accessible." },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn("h-4 w-4", i < rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200")}
        />
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <PageShell
      eyebrow="Testimonials"
      title="Trusted by coaching centres and academies."
      sub="Real feedback from real customers who moved from scattered tools to one platform."
      seo={{
        title: "Testimonials and Reviews — Meet to Manage",
        description: "See what coaching centre owners say about Meet to Manage. Live classroom, fee collection, admissions, parent app and more — rated 4.9/5 by verified customers.",
        path: "/testimonials",
      }}
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Meet to Manage testimonials and reviews",
          url: SITE + "/testimonials",
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        },
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Customer testimonials",
          numberOfItems: REVIEWS.length,
          itemListElement: REVIEWS.map((r, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Review",
              reviewRating: { "@type": "Rating", ratingValue: String(r.rating), bestRating: "5" },
              author: { "@type": "Person", name: r.author },
              reviewBody: r.text,
              url: SITE + (r.story || "/testimonials"),
            },
          })),
        },
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": SITE + "#organization",
          name: "Meet to Manage",
          aggregateRating: { "@type": "AggregateRating", ratingValue: "4.5", reviewCount: "12", bestRating: "5" },
        },
      ]}
    >
      <section className="bg-white pb-[clamp(64px,7vw,104px)]">
        {/* Ratings summary strip */}
        <div className="mx-auto max-w-[1000px] px-5">
          <div className="grid grid-cols-3 gap-4 rounded-2xl bg-[#FFF6EE] p-6 sm:p-8">
            {RATINGS_SUMMARY.map((s) => (
              <div key={s.label} className="text-center">
                <span className="text-2xl sm:text-3xl">{s.icon}</span>
                <p className="mt-2 text-lg font-extrabold text-[#1C1917]">{s.value}</p>
                <p className="mt-1 text-xs text-[#786D60]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="mx-auto mt-10 max-w-[1000px] px-5">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">What our customers say</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {REVIEWS.map((r, i) => (
              <article
                key={r.author}
                className={cn(
                  "flex flex-col rounded-2xl border border-[#EFE3D7] bg-white p-7 shadow-[0_10px_30px_-25px_rgba(194,65,12,0.12)]",
                  FOCUS_RING
                )}
              >
                <Quote className="h-8 w-8 text-[#EEDACB]" />
                <StarRating rating={r.rating} />
                <blockquote className="mt-5 flex-1 text-[15px] leading-relaxed text-[#3D362F]">"{r.text}"</blockquote>
                <div className="mt-6 flex items-center justify-between border-t border-[#EFE3D7] pt-5">
                  <div>
                    <p className="font-bold text-[#1C1917]">{r.author}</p>
                    <p className="text-xs text-[#786D60]">{r.role}</p>
                  </div>
                  <Link
                    to={r.story}
                    className="text-sm font-bold text-[#C2410C] hover:text-[#9A3412]"
                  >
                    {r.storyLabel} <ArrowRight className="ml-1 inline h-4 w-4 rtl:-scale-x-100" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Why centres switch */}
        <div className="mx-auto mt-16 max-w-[1000px] px-5">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Why centres choose Meet to Manage</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#57534E]">Everything running in one place, not five tools stitched together.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {WHATS_INCLUDED.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl bg-[#FFF6EE] p-4">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#C2410C]" />
                <span className="text-sm text-[#1C1917]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-16 max-w-[1000px] px-5">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Common questions</h2>
          <dl className="mt-6 divide-y divide-[#EFE3D7] rounded-2xl border border-[#EFE3D7]">
            {FAQ.map((f) => (
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
