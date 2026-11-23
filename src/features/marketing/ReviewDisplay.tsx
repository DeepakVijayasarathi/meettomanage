import { useState, useEffect, useMemo } from "react";
import { Star, Loader2 } from "lucide-react";

const API_BASE = ""; // relative to domain

interface PublicReview {
  id: string;
  source: string;
  rating: number;
  authorName: string;
  authorRole: string | null;
  text: string;
  response: string | null;
  reviewUrl: string | null;
  createdAtUtc: string;
}

interface AggregateRating {
  averageRating: number;
  totalReviews: number;
  visibleReviews: number;
  ratingBreakdown: Record<string, number>;
  reviewsBySource: Record<string, number>;
}

/** Capterra/G2 URLs — update when product is live on those platforms. */
const CAPTERRA_URL = "https://www.capterra.com/software/details/195765/meet-to-manage/";
const G2_URL = "https://www.g2.com/products/meet-to-manage";

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

function ReviewCard({ review }: { review: PublicReview }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-[#E5DDD1] bg-white p-6 transition-colors hover:border-[#F2B98A]">
      <StarRating rating={review.rating} />
      <p className="text-[15px] leading-relaxed text-[#1C1917]">"{review.text}"</p>
      {review.response && (
        <blockquote className="mt-2 border-l-2 border-[#C2410C] pl-3 text-sm italic text-[#57534E]">
          "{review.response}"
        </blockquote>
      )}
      <div className="mt-auto flex items-center gap-3 pt-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF3EA] text-sm font-bold text-[#C2410C]">
          {review.authorName.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold text-[#1C1917]">{review.authorName}</p>
          <p className="text-xs text-[#57534E]">
            {review.authorRole}{review.authorRole ? " · " : ""}{review.source}
          </p>
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
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [rating, setRating] = useState<AggregateRating | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`${API_BASE}/api/reviews/public?page=1&pageSize=6`).then((r) => r.json()),
      fetch(`${API_BASE}/api/reviews/aggregate-rating`).then((r) => r.json()),
    ]).then(([publicData, ratingData]) => {
      if (!cancelled) {
        setReviews(publicData.items || []);
        setRating(ratingData);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const displayRating = useMemo(() => {
    if (rating && rating.visibleReviews > 0) return rating.averageRating;
    // Fallback display if no reviews yet
    return null;
  }, [rating]);

  if (loading) {
    return (
      <section className={className} aria-label="Reviews and ratings">
        <div className="mx-auto max-w-[1200px] px-5 py-[clamp(48px,6vw,88px)] flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#C2410C]" />
        </div>
      </section>
    );
  }

  return (
    <section className={className} aria-label="Reviews and ratings">
      <div className="mx-auto max-w-[1200px] px-5 py-[clamp(48px,6vw,88px)]">
        {/* Rating summary */}
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-end md:gap-8">
          <div className="text-center md:text-start">
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <span className="font-display text-5xl font-extrabold tracking-tight text-[#1C1917]">
                {displayRating ?? "—"}
              </span>
              {displayRating && <StarRating rating={Math.round(displayRating)} size={22} />}
            </div>
            <p className="mt-2 text-sm text-[#57534E]">
              {rating
                ? `Based on ${rating.visibleReviews} review${rating.visibleReviews !== 1 ? "s" : ""} from parents, partners and coaching centres`
                : "Reviews from parents, partners and coaching centres"}
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
          {reviews.length > 0 ? (
            reviews.map((review, i) => (
              <ReviewCard key={review.id} review={review} />
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-[#9CA3AF]">
              <p className="text-lg font-medium">No reviews yet.</p>
              <p className="mt-2 text-sm">Be the first to share your experience!</p>
            </div>
          )}
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
