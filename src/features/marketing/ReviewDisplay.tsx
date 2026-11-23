import { Star } from "lucide-react";

const SITE_URL = "https://meettomanage.cloud";

/** Capterra embed URL — replace with your actual Capterra product URL once submitted. */
const CAPTERRA_URL = "https://www.capterra.com/software/details/195765/meet-to-manage/";

/** G2 embed URL — replace with your actual G2 product URL once submitted. */
const G2_URL = "https://www.g2.com/products/meet-to-manage";

/** Internal reviews data — replace with live API when review system is built. */
interface Review {
  name: string;
  role: string;
  rating: number;
  text: string;
  source: string;
}

const INTERNAL_REVIEWS: Review[] = [
  {
    name: "Akanksha Nagar",
    role: "Founder, The Reader Nest",
    rating: 5,
    text: "The platform helped us bring admissions, classes, fees and parent updates into one system. Parents love the mobile app.",
    source: "Case Study",
  },
  {
    name: "Rahul M.",
    role: "Director, Abacus Academy",
    rating: 5,
    text: "We switched from Zoom + spreadsheets + WhatsApp. Now everything is in one place. The free plan got us started.",
    source: "Google Review",
  },
  {
    name: "Priya S.",
    role: "Manager, Spoken English Centre",
    rating: 4,
    text: "Fee automation saves us hours every month. Parents can pay online and get receipts automatically.",
    source: "WhatsApp Feedback",
  },
];

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={i < rating ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[#E5DCCD]"}
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-[#E5DDD1] bg-white p-6 transition-colors hover:border-[#F2B98A]">
      <StarRating rating={review.rating} />
      <p className="text-[15px] leading-relaxed text-[#1C1917]">"{review.text}"</p>
      <div className="mt-auto flex items-center gap-3 pt-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF3EA] text-sm font-bold text-[#C2410C]">
          {review.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1C1917]">{review.name}</p>
          <p className="text-xs text-[#57534E]">{review.role} · {review.source}</p>
        </div>
      </div>
    </article>
  );
}

export function ReviewDisplay({
  showExternalLinks = true,
  className,
}: {
  showExternalLinks?: boolean;
  className?: string;
}) {
  return (
    <section className={className} aria-label="Reviews and ratings">
      <div className="mx-auto max-w-[1200px] px-5 py-[clamp(48px,6vw,88px)]">
        {/* Rating summary */}
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-end md:gap-8">
          <div className="text-center md:text-start">
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <span className="font-display text-5xl font-extrabold tracking-tight text-[#1C1917]">4.5</span>
              <StarRating rating={5} size={22} />
            </div>
            <p className="mt-2 text-sm text-[#57534E]">
              Based on feedback from parents, partners and coaching centres
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 md:ms-auto">
            {showExternalLinks && (
              <>
                <a
                  href={CAPTERRA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#E5DDD1] bg-white px-4 py-2 text-sm font-semibold text-[#1C1917] transition-colors hover:border-[#F2B98A] hover:bg-[#FFF3EA]"
                >
                  Read on Capterra
                </a>
                <a
                  href={G2_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#E5DDD1] bg-white px-4 py-2 text-sm font-semibold text-[#1C1917] transition-colors hover:border-[#F2B98A] hover:bg-[#FFF3EA]"
                >
                  Read on G2
                </a>
              </>
            )}
            <a
              href="/testimonials"
              className="rounded-full bg-[#C2410C] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#EA580C]"
            >
              All testimonials
            </a>
          </div>
        </div>

        {/* Review cards */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INTERNAL_REVIEWS.map((review, i) => (
            <ReviewCard key={i} review={review} />
          ))}
        </div>

        {/* Call to action */}
        <p className="mt-8 text-center text-sm text-[#78716C]">
          Have a coaching centre?{" "}
          <a
            href={`https://wa.me/919344773231?text=I%20use%20Meet%20to%20Manage%20and%20would%20like%20to%20share%20a%20testimonial.`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#C2410C] underline underline-offset-2"
          >
            Share your story
          </a>{" "}
          and we'll add it here.
        </p>
      </div>
    </section>
  );
}
