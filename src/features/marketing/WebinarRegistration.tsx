import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, Gift } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { requestPlatformDemo } from "@/api/marketing";
import { getWebinar, registerForWebinar, type Webinar } from "@/api/webinars";
import { useApiData } from "@/api/hooks";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiEnabled, userMessage } from "@/lib/api";
import { useLightBrandScope } from "@/lib/theme";
import { localWebinarTime, readWebinarSchedule, webinarCalendarUrl } from "@/lib/webinarCalendar";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";

const fields = [
  { name: "fullName", label: "Full name", type: "text", autoComplete: "name", placeholder: "e.g. Asha Patel" },
  { name: "workEmail", label: "Email address", type: "email", autoComplete: "email", placeholder: "e.g. asha@example.com" },
  { name: "phone", label: "Phone number", type: "tel", autoComplete: "tel", placeholder: "e.g. +91 98765 43210" },
  { name: "academyName", label: "Academy or organization", type: "text", autoComplete: "organization", placeholder: "e.g. Sunrise Academy" },
] as const;

export default function WebinarRegistration() {
  useLightBrandScope();
  const { slug } = useParams();
  return slug ? <PublishedWebinar key={slug} slug={slug} /> : <RegistrationForm />;
}

function PublishedWebinar({ slug }: { slug: string }) {
  const { data, loading, error, reload } = useApiData<Webinar | null>(() => getWebinar(slug), null);
  if (data && !error) return <RegistrationForm webinar={data} />;
  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-[#FCF8F4] text-[#241A16]">
      <Seo title="Webinar | Meet to Manage" description="Meet to Manage webinar registration." path={window.location.pathname} noindex />
      <MarketingNav />
      <main className="mx-auto max-w-6xl space-y-5 px-5 py-16">
        <h1 className="text-3xl font-semibold">{loading ? "Loading webinar…" : "Webinar unavailable"}</h1>
        <div className="flex flex-wrap gap-3">
          {error && <Button variant="outline" onClick={reload}>Try again</Button>}
          {!loading && <Button variant="ghost" asChild><Link to="/webinars">Browse webinars</Link></Button>}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

function RegistrationForm({ webinar }: { webinar?: Webinar }) {
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  const [params] = useSearchParams();
  const details = webinar?.details;
  const benefits = details?.benefits.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];
  const schedule = details ? { startsAt: new Date(details.start), endsAt: new Date(details.end) } : readWebinarSchedule(params);
  const title = webinar?.title ?? "Meet to Manage Webinar";
  const closed = Boolean(webinar && schedule && schedule.endsAt.getTime() <= Date.now());
  const registrationUrl = new URL(window.location.pathname, window.location.origin);
  if (schedule && !webinar) {
    registrationUrl.searchParams.set("start", schedule.startsAt.toISOString());
    registrationUrl.searchParams.set("end", schedule.endsAt.toISOString());
  }
  const available = apiEnabled();

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || registered || !available || closed) return;

    const data = new FormData(event.currentTarget);
    const fullName = String(data.get("fullName") ?? "").trim();
    const workEmail = String(data.get("workEmail") ?? "").trim();
    const phoneInput = String(data.get("phone") ?? "").trim();
    const digits = phoneInput.replace(/\D/g, "");
    const phone = `${phoneInput.startsWith("+") ? "+" : ""}${digits}`;
    const academyName = String(data.get("academyName") ?? "").trim();
    if (!fullName || !academyName || !/^\+?[\d\s().-]+$/.test(phoneInput) || !/^\d{7,15}$/.test(digits)) {
      setError("Enter your name, organization, and a valid phone number with 7 to 15 digits.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const contact = { fullName, workEmail, phone, academyName };
      if (webinar) await registerForWebinar(webinar.slug, contact);
      else await requestPlatformDemo({
        ...contact,
        message: schedule
          ? `Meet to Manage webinar registration (starts ${schedule.startsAt.toISOString()})`
          : "Meet to Manage webinar registration",
        source: "Webinar",
        landingPath: registrationUrl.pathname,
      });
      setRegistered(true);
    } catch (err) {
      setError(userMessage(err, "Your registration could not be saved. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-[#FCF8F4] text-[#241A16]">
      <Seo title={`${title} | Registration`} description={webinar?.excerpt ?? "Register for the Meet to Manage live webinar."} path={registrationUrl.pathname} noindex />
      <MarketingNav />
      <main className="bg-[linear-gradient(180deg,#F5E6DB_0%,#FCF8F4_32rem)]">
        <div className="mx-auto max-w-6xl px-5 pb-14 pt-6 sm:px-8 sm:pb-20 sm:pt-8">
          <Link to="/webinars" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#9A3412] hover:underline sm:mb-6">
            <ArrowLeft className="h-4 w-4" aria-hidden /> All webinars
          </Link>
          <div className="grid gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(21rem,0.68fr)] lg:items-start">
            <header className="relative isolate min-w-0 overflow-hidden rounded-2xl bg-[#151E2A] px-6 py-9 text-white sm:px-9 sm:py-12 lg:col-start-1 lg:row-start-1">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
                <img src="/images/webinar-desk.webp" alt="" width={1200} height={676} className="absolute inset-y-0 right-0 h-full w-[80%] object-cover object-right sm:w-[72%]" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,#151E2A_8%,rgba(21,30,42,0.97)_35%,rgba(21,30,42,0.76)_76%,rgba(21,30,42,0.66))]" />
              </div>
              <h1 className="max-w-xl break-words text-[clamp(2rem,4.15vw,3.5rem)] font-bold leading-[1.08] tracking-tight">
                {webinar ? title : <>Meet to Manage <span className="block text-[#FFB056]">Webinar</span></>}
              </h1>
              {webinar?.excerpt && <p className="mt-4 max-w-xl break-words text-base leading-relaxed text-slate-200 sm:text-lg">{webinar.excerpt}</p>}
              {schedule && (
                <dl className="mt-6 grid gap-3 border-t border-white/20 pt-5 text-sm sm:grid-cols-2">
                  <div className="relative pl-6">
                    <dt className="text-xs font-medium text-[#F0D8CB]"><CalendarDays className="absolute left-0 top-0.5 h-4 w-4 text-[#FFB68D]" aria-hidden />Starts</dt>
                    <dd className="mt-1 font-semibold"><time dateTime={schedule.startsAt.toISOString()}>{localWebinarTime(schedule.startsAt)}</time></dd>
                  </div>
                  <div className="relative pl-6">
                    <dt className="text-xs font-medium text-[#F0D8CB]"><Clock3 className="absolute left-0 top-0.5 h-4 w-4 text-[#FFB68D]" aria-hidden />Ends</dt>
                    <dd className="mt-1 font-semibold"><time dateTime={schedule.endsAt.toISOString()}>{localWebinarTime(schedule.endsAt)}</time></dd>
                  </div>
                </dl>
              )}
            </header>
            <section aria-label="Webinar registration" className="min-w-0 rounded-2xl border border-[#E8D9D1] bg-white p-5 shadow-[0_12px_30px_rgba(53,25,11,0.08)] sm:p-7 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              {registered ? (
                <div role="status" className="space-y-3">
                  <span className="inline-flex rounded-full bg-emerald-50 p-3 text-emerald-700"><CheckCircle2 className="h-6 w-6" aria-hidden /></span>
                  <h2 className="text-2xl font-semibold">Registration received</h2>
                  <p className="text-slate-700">The webinar team can use your contact details to share the joining instructions.</p>
                  {schedule && (
                    <Button variant="outline" asChild>
                      <a href={webinarCalendarUrl(schedule, registrationUrl.href, title)} target="_blank" rel="noopener noreferrer"><CalendarDays className="h-4 w-4" /> Add to Google Calendar</a>
                    </Button>
                  )}
                </div>
              ) : closed ? (
                <h2 className="text-xl font-semibold">Registration has closed</h2>
              ) : (
                <form onSubmit={register} className="space-y-4">
                  <h2 className="mb-5 border-b border-[#EFE4DE] pb-4 text-2xl font-semibold tracking-tight">Register for this webinar</h2>
                  {fields.map(({ name, label, type, autoComplete, placeholder }) => (
                    <div key={name} className="space-y-2">
                      <Label htmlFor={name}>{label}</Label>
                      <Input className="h-11 border-[#D8CBC3] bg-[#FFFCF9] text-base focus-visible:ring-[#C2410C]" id={name} name={name} type={type} autoComplete={autoComplete} placeholder={placeholder} maxLength={type === "tel" ? 40 : type === "email" ? 256 : 150} required />
                    </div>
                  ))}
                  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                  {!available && <p role="status" className="text-sm text-muted-foreground">Registration is temporarily unavailable.</p>}
                  <Button type="submit" disabled={submitting || !available} className="h-12 w-full bg-[#C2410C] font-semibold text-white hover:bg-[#9A3412]">
                    {submitting ? "Registering…" : "Register now"} <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                  <p className="text-center text-xs text-[#645248]"><Link to="/privacy" className="underline underline-offset-2">Privacy policy</Link></p>
                </form>
              )}
            </section>
            <div className="min-w-0 space-y-7 lg:col-start-1 lg:row-start-2">
              {details?.bannerImage && (
                <img src={details.bannerImage} alt="" className="aspect-video max-h-96 w-full rounded-xl border border-[#E8D9D1] bg-[#231713] object-contain" />
              )}
              <section className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight">About the webinar</h2>
                <p className="whitespace-pre-line break-words text-base leading-7 text-[#58453A]">
                  {details?.description ?? "See how academies manage scheduling, live classes, and fees in one place. Bring your questions for the live walkthrough."}
                </p>
              </section>
              {benefits.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-2xl font-semibold tracking-tight">What you’ll learn</h2>
                  <ul className="divide-y divide-[#E9DDD5] border-y border-[#E9DDD5]">
                    {benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-3 py-3 leading-6 text-[#58453A]">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#9A3412]" aria-hidden />
                        <span className="min-w-0 break-words">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {details?.offers && (
                <section className="flex items-start gap-4 rounded-xl border border-[#EAC9B5] bg-[#FFF0E5] p-5">
                  <Gift className="mt-0.5 h-5 w-5 shrink-0 text-[#9A3412]" aria-hidden />
                  <div className="min-w-0 space-y-2">
                    <h2 className="text-lg font-semibold">Webinar offers</h2>
                    <p className="whitespace-pre-line break-words leading-6 text-[#58453A]">{details.offers}</p>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
