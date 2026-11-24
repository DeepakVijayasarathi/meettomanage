import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useApiData } from "@/api/hooks";
import { listWebinars } from "@/api/webinars";
import { Seo } from "@/components/Seo";
import { useLightBrandScope } from "@/lib/theme";
import { isAcademyWebinar, webinarPath } from "@/lib/webinars";
import { localWebinarTime } from "@/lib/webinarCalendar";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";

export function WebinarListing({ landing = false }: { landing?: boolean }) {
  const { data, loading, error, reload } = useApiData(listWebinars, []);
  if (landing && !data.length) return null;
  const webinars = landing ? data.slice(0, 3) : data;

  return (
    <section aria-labelledby="public-webinars" className="mx-auto max-w-[1160px] space-y-6 px-5 py-12 sm:py-16">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        {landing
          ? <h2 id="public-webinars" className="text-3xl font-bold tracking-tight">Webinars</h2>
          : <h1 id="public-webinars" className="text-4xl font-bold tracking-tight">Webinars</h1>}
        {landing && <Link to="/webinars" className="font-semibold text-[#9A3412] hover:underline">View all webinars</Link>}
      </div>
      {loading && <p role="status">Loading webinars…</p>}
      {error && <p role="alert">Webinars are temporarily unavailable. <button className="underline" onClick={reload}>Try again</button></p>}
      {!loading && !error && !webinars.length && <p>No webinars are currently listed.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {webinars.map((webinar) => {
          const featured = !landing && isAcademyWebinar(webinar);
          const path = webinarPath(webinar.slug);
          return (
            <article key={webinar.id} className={featured
              ? "overflow-hidden rounded-2xl border border-[#F1DDD0] bg-[#FFF8F3] sm:col-span-full md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
              : "flex flex-col rounded-xl border border-[#F1DDD0] bg-[#FFF8F3]"}>
              {featured && (
                <img src="/images/academy-webinar-hero.webp" alt="An educator presenting from her coaching studio" width={1200} height={675} fetchPriority="high"
                  className="aspect-[16/9] h-full w-full object-cover object-[center_43%] md:min-h-[18rem] md:aspect-auto" />
              )}
              <div className={featured ? "flex flex-col items-start justify-center gap-4 p-6 md:p-9" : "flex flex-1 flex-col gap-3 p-6"}>
                <h2 className={featured ? "text-2xl font-bold leading-tight tracking-tight sm:text-3xl" : "text-xl font-semibold leading-tight"}>{webinar.title}</h2>
                <time dateTime={webinar.start} className="text-sm font-semibold text-[#6C3B25]">{localWebinarTime(new Date(webinar.start))}</time>
                <p className="leading-relaxed text-slate-700">{webinar.excerpt}</p>
                <Link to={path} className={featured
                  ? "inline-flex min-h-11 w-fit items-center rounded-lg bg-[#B53B0C] px-5 font-bold text-white hover:bg-[#913009]"
                  : "mt-auto inline-flex w-fit items-center gap-2 font-semibold text-[#9A3412] hover:underline"}>
                  View webinar <span className="sr-only">{webinar.title}</span>{!featured && <ArrowRight className="h-4 w-4" aria-hidden />}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function WebinarsPage() {
  useLightBrandScope();
  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-white text-[#171B22]">
      <Seo title="Webinars | Meet to Manage" description="Browse live Meet to Manage webinars and register for a session." path="/webinars" />
      <MarketingNav />
      <main><WebinarListing /></main>
      <MarketingFooter />
    </div>
  );
}
