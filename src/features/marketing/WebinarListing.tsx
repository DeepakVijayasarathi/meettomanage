import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useApiData } from "@/api/hooks";
import { listWebinars } from "@/api/webinars";
import { Seo } from "@/components/Seo";
import { useLightBrandScope } from "@/lib/theme";
import { webinarPath } from "@/lib/webinars";
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
        {webinars.map((webinar) => (
          <article key={webinar.id} className="flex flex-col gap-3 rounded-xl border border-[#F1DDD0] bg-[#FFF8F3] p-6">
            <h2 className="text-xl font-semibold leading-tight">{webinar.title}</h2>
            <time dateTime={webinar.start} className="text-sm font-medium">{localWebinarTime(new Date(webinar.start))}</time>
            <p className="flex-1 leading-relaxed text-slate-700">{webinar.excerpt}</p>
            <Link to={webinarPath(webinar.slug)} className="inline-flex w-fit items-center gap-2 font-semibold text-[#9A3412] hover:underline">
              View webinar <span className="sr-only">{webinar.title}</span><ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </article>
        ))}
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
