import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CalendarDays, Check, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, Copy, CreditCard, Gift, MessageCircle, UserPlus, UsersRound, Video } from "lucide-react";
import { Link, Navigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { requestPlatformDemo } from "@/api/marketing";
import { getWebinar, registerForWebinar, type Webinar } from "@/api/webinars";
import { useApiData } from "@/api/hooks";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackMarketingEvent } from "@/lib/analytics";
import { apiEnabled, userMessage } from "@/lib/api";
import { useLightBrandScope } from "@/lib/theme";
import { localWebinarTime, readWebinarSchedule, webinarCalendarUrl, type WebinarSchedule } from "@/lib/webinarCalendar";
import { isAcademyWebinar, webinarApiSlug, webinarHosts, webinarPath } from "@/lib/webinars";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";
import { WebinarAssistant } from "./WebinarAssistant";

const fields = [
  { name: "fullName", label: "Full name", type: "text", autoComplete: "name", placeholder: "e.g. Asha Patel" },
  { name: "workEmail", label: "Email address", type: "email", autoComplete: "email", placeholder: "e.g. asha@example.com" },
  { name: "phone", label: "Phone number", type: "tel", autoComplete: "tel", placeholder: "e.g. +91 98765 43210" },
  { name: "academyName", label: "Academy or organization", type: "text", autoComplete: "organization", placeholder: "e.g. Sunrise Academy" },
] as const;

const academyTopics = [
  { title: "Student admissions", description: "Organise student enrolment and keep admission details together.", match: /admission|enrol/, icon: UserPlus },
  { title: "Batch scheduling", description: "Schedule classes, update timetables, and coordinate instructors.", match: /schedul|timetable|batch/, icon: CalendarDays },
  { title: "Live class management", description: "Manage live online classes.", match: /live class|online class/, icon: Video },
  { title: "Attendance and performance", description: "Track attendance and see which students missed class.", match: /attendan|performance/, icon: ClipboardCheck },
  { title: "Fees and payments", description: "Spot outstanding fees and prioritise follow-ups.", match: /fee|payment|collection/, icon: CreditCard },
] as const;

const academyFaq = [
  { question: "Who is the webinar for?", answer: "Teachers, tutors, coaches, and academy owners who want to simplify how they run their classes and day-to-day operations." },
  { question: "Is the webinar free?", answer: "Yes. You can reserve a spot and attend online for free." },
  { question: "What will the live walkthrough cover?", answer: "We’ll cover student admissions, batch scheduling, live class management, attendance and performance, and fees and payments. Bring your questions for the live Q&A." },
  { question: "How do I join after registering?", answer: "Use the joining link on your RSVP confirmation when it’s available. The webinar team can also share joining instructions separately. You can add the session to Google Calendar after registering." },
  { question: "How do I use an attendee offer?", answer: "Ask the webinar team which offers are available, whether your academy qualifies, and how to redeem an offer before choosing a plan." },
] as const;

export default function WebinarRegistration() {
  useLightBrandScope();
  const { slug } = useParams();
  const { pathname, search, hash } = useLocation();
  if (!slug) return <RegistrationForm />;
  const apiSlug = webinarApiSlug(slug);
  const canonicalPath = webinarPath(apiSlug);
  if (pathname !== canonicalPath) return <Navigate replace to={{ pathname: canonicalPath, search, hash }} />;
  return <PublishedWebinar key={apiSlug} slug={apiSlug} />;
}

function PublishedWebinar({ slug }: { slug: string }) {
  const { data, loading, error, reload } = useApiData<Webinar | null>(() => getWebinar(slug), null);
  if (data && !error) return <RegistrationForm webinar={data} />;
  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-[#FCF8F4] text-[#241A16]">
      <Seo title="Webinar | Meet to Manage" description="Meet to Manage webinar registration." path={window.location.pathname} noindex />
      <MarketingNav hideMobileSalesBar />
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
  const [joinUrl, setJoinUrl] = useState<string>();
  const [error, setError] = useState("");
  const [params] = useSearchParams();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === "#webinar-registration") document.getElementById("webinar-registration")?.scrollIntoView({ block: "start" });
  }, [hash]);
  const details = webinar?.details;
  const academyWebinar = isAcademyWebinar(webinar);
  const { hostName, hostRole, teamName } = webinarHosts(webinar);
  const benefits = details?.benefits.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];
  const topicBenefits = academyWebinar ? academyTopics.map(({ title, description, match, icon }) => ({
    title, description: benefits.find((benefit) => match.test(benefit.toLowerCase())) ?? description, icon,
  })) : [];
  const additionalBenefits = academyWebinar
    ? benefits.filter((benefit) => !topicBenefits.some((topic) => topic.description === benefit))
    : benefits;
  const schedule = details ? { startsAt: new Date(details.start), endsAt: new Date(details.end) } : readWebinarSchedule(params);
  const title = webinar?.title ?? "Meet to Manage Webinar";
  const timeZone = academyWebinar ? "Asia/Kolkata" : undefined;
  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone,
  });
  const dateLabel = schedule && dateFormatter.format(schedule.startsAt);
  const timeFormatter: Intl.DateTimeFormat & { formatRange?: (start: Date, end: Date) => string } = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone,
  });
  const timeLabel = schedule && (
    dateLabel !== dateFormatter.format(schedule.endsAt)
      ? `${localWebinarTime(schedule.startsAt)} to ${localWebinarTime(schedule.endsAt)}`
      : timeFormatter.formatRange?.(schedule.startsAt, schedule.endsAt) ??
        `${timeFormatter.format(schedule.startsAt)} to ${timeFormatter.format(schedule.endsAt)}`
  );
  const closed = Boolean(webinar && schedule && schedule.endsAt.getTime() <= Date.now());
  const registrationUrl = new URL(webinar ? webinarPath(webinar.slug) : window.location.pathname, window.location.origin);
  if (schedule && !webinar) {
    registrationUrl.searchParams.set("start", schedule.startsAt.toISOString());
    registrationUrl.searchParams.set("end", schedule.endsAt.toISOString());
  }
  const available = apiEnabled();
  const canRegister = !closed && !registered && available;
  const registrationAction = academyWebinar ? "Reserve your spot" : "Register now";
  const titleEnding = academyWebinar ? title.match(/^(.*?)(less admin work)$/i) : null;

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
      trackMarketingEvent("form_validation_failed");
      setError("Enter your name, organization, and a valid phone number with 7 to 15 digits.");
      return;
    }

    const variant = webinar ? `webinar:${webinar.slug}` : "webinar:general";
    trackMarketingEvent("form_submit_attempted", registrationUrl.pathname, variant);
    setError("");
    setSubmitting(true);
    try {
      const contact = { fullName, workEmail, phone, academyName };
      if (webinar) {
        const confirmation = await registerForWebinar(webinar.slug, contact);
        if (confirmation?.joinUrl && /^https:\/\/[^\s/]+\//i.test(confirmation.joinUrl)) setJoinUrl(confirmation.joinUrl);
      }
      else await requestPlatformDemo({
        ...contact,
        message: schedule
          ? `Meet to Manage webinar registration (starts ${schedule.startsAt.toISOString()})`
          : "Meet to Manage webinar registration",
        source: "Webinar",
        landingPath: registrationUrl.pathname,
      });
      trackMarketingEvent("form_submitted", registrationUrl.pathname, variant);
      setRegistered(true);
    } catch (err) {
      trackMarketingEvent("form_submit_failed", registrationUrl.pathname, variant);
      setError(userMessage(err, "Your registration could not be saved. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  const registrationPanel = (
    <section id="webinar-registration" tabIndex={-1} aria-labelledby="webinar-registration-title" className="scroll-mt-8 overflow-hidden rounded-[1.5rem] border border-[#EED7C7] bg-white shadow-[0_20px_48px_rgba(80,37,17,0.09)]">
      {registered ? (
        <div className="p-5 sm:p-8"><RegistrationConfirmation title={title} schedule={schedule} registrationUrl={registrationUrl.href} joinUrl={joinUrl} /></div>
      ) : closed ? (
        <h2 id="webinar-registration-title" className="p-5 text-2xl font-bold sm:p-8">Registration has closed</h2>
      ) : (
        <form onSubmit={register}>
          <div className="border-b border-[#EFDCD0] bg-[#FFF8F2] px-5 py-5 sm:px-8 sm:py-6">
            <h2 id="webinar-registration-title" className="text-2xl font-bold tracking-tight sm:text-3xl">{academyWebinar ? registrationAction : "Register for this webinar"}</h2>
            <p className="mt-2 text-base text-[#6C5347]">{academyWebinar ? "RSVP for the free online session." : "Enter your details to register for the online session."}</p>
          </div>
          <div className="space-y-4 p-5 sm:p-8">
            {fields.map(({ name, label, type, autoComplete, placeholder }) => (
              <div key={name} className="space-y-2">
                <Label htmlFor={name}>{label}</Label>
                <Input className="h-12 rounded-lg border-[#E5D6CD] bg-[#FFFCFA] text-base placeholder:text-[#74665D] focus-visible:ring-[#C2410C]" id={name} name={name} type={type} autoComplete={autoComplete} placeholder={placeholder} maxLength={type === "tel" ? 40 : type === "email" ? 256 : 150} required />
              </div>
            ))}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {!available && <p role="status" className="text-sm text-muted-foreground">Registration is temporarily unavailable.</p>}
            <Button type="submit" disabled={submitting || !available} className="h-12 w-full rounded-lg bg-[#B53B0C] text-base font-bold text-white hover:bg-[#913009]">
              {submitting ? "Registering…" : registrationAction}
            </Button>
            <p className="text-center text-sm text-[#645248]"><Link to="/privacy" className="underline underline-offset-2">Privacy policy</Link></p>
          </div>
        </form>
      )}
    </section>
  );

  return (
    <div className="theme-light-scope min-h-screen bg-[#FFFCF8] text-[#251B17]">
      <Seo title={academyWebinar ? "Free Academy Management Webinar | Meet to Manage" : `${title} | Registration`}
        description={webinar?.excerpt ?? "Register for the Meet to Manage live webinar."}
        path={registrationUrl.pathname} noindex={!academyWebinar || !webinar?.isPublished}
        image={academyWebinar ? "https://meettomanage.cloud/images/academy-webinar-hero.webp" : undefined} />
      <header className="border-b border-[#F0E4DA] bg-white">
        <div className="mx-auto flex min-h-[4.5rem] max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" aria-label="Meet to Manage home">
            <img src="/logo-full.webp" alt="Meet to Manage" width={170} height={61} className="h-auto w-[145px] sm:w-[170px]" />
          </Link>
          <div className="flex items-center gap-5">
          <Link to="/webinars" className="hidden items-center gap-2 text-sm font-semibold text-[#813B20] hover:underline sm:inline-flex">
            <ArrowLeft className="h-4 w-4" aria-hidden /> All webinars
          </Link>
          {canRegister && <a href="#webinar-registration" className="inline-flex min-h-11 items-center rounded-lg bg-[#B53B0C] px-4 text-sm font-bold text-white hover:bg-[#913009]">{registrationAction}</a>}
          {!canRegister && <Link to="/webinars" className="text-sm font-semibold text-[#813B20] hover:underline sm:hidden">All webinars</Link>}
          </div>
        </div>
      </header>
      <main id="main-content">
        <section aria-labelledby="webinar-title" className={academyWebinar ? "border-b border-[#F1E1D2] bg-[linear-gradient(115deg,#FFFCF8_55%,#FCE5D4_100%)]" : "border-b border-[#F1E1D2] bg-[#FFF4EA]"}>
          <div className="mx-auto grid max-w-[1240px] items-start gap-7 px-5 py-9 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.66fr)] lg:gap-x-14 lg:gap-y-7 lg:py-16">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#F0D8C7] bg-[#FFF1E6] px-4 py-2 text-sm font-bold text-[#973C17]">
                <Video className="h-4 w-4" aria-hidden /> {academyWebinar ? "Free online webinar" : "Live webinar"}
              </p>
              <h1 id="webinar-title" className="mt-5 max-w-2xl break-words text-[clamp(2.55rem,5.1vw,4.125rem)] font-bold leading-[1.02] tracking-[-0.055em] [text-wrap:balance]">{titleEnding ? <>{titleEnding[1]}<span className="text-[#A83B16]">{titleEnding[2]}</span></> : title}</h1>
              {webinar?.excerpt && <p className="mt-5 max-w-[38rem] break-words text-lg leading-relaxed text-[#5F4A40]">{webinar.excerpt}</p>}
              {schedule && (
                <dl className="mt-6 grid gap-3 text-[#251B17] sm:grid-cols-[1.25fr_1fr]">
                  <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 rounded-xl border border-[#EBD8C9] bg-[#FFF7F0] px-3 py-3">
                    <CalendarDays className="row-span-2 h-5 w-5 text-[#A8441B]" aria-hidden />
                    <dt className="text-sm text-[#6C5347]">Date</dt>
                    <dd className="font-semibold"><time dateTime={schedule.startsAt.toISOString()}>{dateLabel}</time></dd>
                  </div>
                  <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 rounded-xl border border-[#EBD8C9] bg-[#FFF7F0] px-3 py-3">
                    <Clock3 className="row-span-2 h-5 w-5 text-[#A8441B]" aria-hidden />
                    <dt className="text-sm text-[#6C5347]">Time</dt>
                    <dd className="font-semibold">{timeLabel}</dd>
                  </div>
                </dl>
              )}
              {academyWebinar && (
                <>
                  <p className="mt-4 text-base text-[#5F4A40]">For teachers, tutors, coaches, and academy owners.</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {canRegister && <a href="#webinar-registration" className="inline-flex min-h-12 items-center rounded-xl bg-[#B53B0C] px-5 font-bold text-white hover:bg-[#913009]">{registrationAction}</a>}
                    <a href="#webinar-agenda" className="inline-flex min-h-12 items-center rounded-xl border border-[#DAB9A6] bg-white px-5 font-bold text-[#492B21] hover:bg-[#FFF1E6]">See what you’ll learn</a>
                  </div>
                </>
              )}
            </div>
            {!academyWebinar && <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">{registrationPanel}</div>}
            {academyWebinar ? (
              <figure className="overflow-hidden rounded-2xl border border-[#E5C8B6] bg-white shadow-[0_24px_64px_rgba(71,33,14,0.13)] lg:col-start-2 lg:row-start-1">
                <img src="/images/academy-webinar-hero.webp" alt="An educator presenting from her coaching studio" width={1200} height={675} fetchPriority="high" className="aspect-[4/3] w-full object-cover object-[center_43%] lg:aspect-square" />
                <figcaption className="flex items-center gap-3 border-t border-[#EFE1D6] px-5 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#FFF0E4] text-[#973C17]"><Video className="h-5 w-5" aria-hidden /></span>
                  <span className="font-bold leading-tight">Live product walkthrough and Q&A</span>
                </figcaption>
              </figure>
            ) : (
              <img src={details?.bannerImage || "/images/webinar-desk.webp"} alt="" width={1200} height={675} className="aspect-[2/1] w-full rounded-2xl object-cover lg:col-start-1 lg:row-start-2" />
            )}
          </div>
        </section>
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.66fr)] lg:gap-14">
          <div className="min-w-0 space-y-8">
            <section aria-labelledby="webinar-agenda">
              <h2 id="webinar-agenda" className="scroll-mt-8 text-3xl font-bold tracking-tight sm:text-4xl">What you’ll learn</h2>
              <p className="mt-4 max-w-[42rem] whitespace-pre-line break-words leading-7 text-[#5F4A40]">
                {details?.description || "See how academies manage scheduling, live classes, and fees in one place. Bring your questions for the live walkthrough."}
              </p>
              {topicBenefits.length > 0 && (
                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {topicBenefits.map(({ title, description, icon: Icon }) => (
                    <li key={title} className="rounded-2xl border border-[#F0E1D5] bg-white p-5">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FFF0E4] text-[#973C17]"><Icon className="h-5 w-5" aria-hidden /></span>
                      <h3 className="mt-3 text-lg font-bold">{title}</h3>
                      <p className="mt-1 break-words leading-6 text-[#5F4A40]">{description}</p>
                    </li>
                  ))}
                </ul>
              )}
              {additionalBenefits.length > 0 && (
                <ul className="mt-6 divide-y divide-[#F0E1D5] overflow-hidden rounded-2xl border border-[#F0E1D5] bg-white">
                  {additionalBenefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-3 px-4 py-3.5 leading-6 text-[#4E3A31] sm:px-5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#FFF0E4] text-[#973C17]"><Check className="h-4 w-4" aria-hidden /></span>
                      <span className="min-w-0 break-words">{benefit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {!academyWebinar && canRegister && <a href="#webinar-registration" className="inline-flex min-h-11 items-center rounded-lg bg-[#B53B0C] px-5 font-bold text-white hover:bg-[#913009]">{registrationAction}</a>}
          </div>
          <div className="min-w-0 space-y-5">
            {academyWebinar && webinar && <WebinarAssistant slug={webinar.slug} canRegister={canRegister} suggestions={[academyFaq[2], academyFaq[3]]} />}
            {(hostName || teamName) && (
              <section aria-labelledby="webinar-hosts" className="rounded-2xl border border-[#F0E1D5] bg-white p-5 sm:p-6">
                <h2 id="webinar-hosts" className="text-xl font-bold">Meet your {hostName ? "host" : "team"}</h2>
                <ul className="mt-4 space-y-4">
                  {hostName && (
                    <li className="flex min-w-0 items-center gap-4">
                      {details?.hostPhoto ? (
                        <img src={details.hostPhoto} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#FBE8D7] text-lg font-bold text-[#933A17]">{Array.from(hostName)[0]?.toUpperCase()}</span>
                      )}
                      <div className="min-w-0 break-words">
                        <p className="font-bold">{hostName}</p>
                        {hostRole && <p className="mt-0.5 text-sm text-[#5F4A40]">{hostRole}</p>}
                      </div>
                    </li>
                  )}
                  {teamName && <li className="flex items-center gap-3 break-words text-sm font-semibold text-[#5F4A40]"><UsersRound className="h-5 w-5 shrink-0 text-[#A8441B]" aria-hidden />{teamName}</li>}
                </ul>
              </section>
            )}
            {details?.offers && (
              <section className="flex items-start gap-4 rounded-2xl border border-[#F0D4BE] bg-[#FFF0E3] p-5 sm:p-6">
                {academyWebinar ? <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#A8441B]" aria-hidden /> : <Gift className="mt-0.5 h-5 w-5 shrink-0 text-[#A8441B]" aria-hidden />}
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">{academyWebinar ? "Live Q&A" : "Webinar offers"}</h2>
                  <p className="mt-2 whitespace-pre-line break-words leading-6 text-[#5F4A40]">{details.offers}</p>
                </div>
              </section>
            )}
          </div>
        </div>
        {academyWebinar && (
          <section aria-labelledby="webinar-faq" className="border-t border-[#F0E1D5] bg-white">
            <div className="mx-auto grid max-w-[1240px] gap-7 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.6fr_1fr] lg:gap-14">
              <h2 id="webinar-faq" className="text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
              <div className="divide-y divide-[#F0E1D5] rounded-2xl border border-[#F0E1D5]">
                {academyFaq.map(({ question, answer }) => (
                  <details key={question} className="group px-5 py-4 sm:px-6">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B53B0C] [&::-webkit-details-marker]:hidden">
                      {question}<ChevronDown className="h-5 w-5 shrink-0 text-[#A8441B] transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
                    </summary>
                    <p className="mt-3 leading-relaxed text-[#5F4A40]">{answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}
        {academyWebinar && (
          <section aria-label="Webinar signup" className="border-t border-[#EED7C7] bg-[#FFF0E4]">
            <div className="mx-auto grid max-w-[1240px] items-start gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)] lg:gap-14">
              <div className="overflow-hidden rounded-2xl bg-[#321D18] text-white">
                <img src="/images/webinar-desk.webp" alt="An online meeting open on a laptop" width={1200} height={676} loading="lazy" className="aspect-[2.2/1] w-full object-cover" />
                <div className="p-5 sm:p-8">
                  <h2 className="max-w-lg text-2xl font-bold tracking-tight sm:text-3xl">Bring an admin task you’d like to simplify.</h2>
                  <p className="mt-3 max-w-md leading-relaxed text-[#F0DCD0]">Ask the Meet to Manage team about it during the live Q&A.</p>
                </div>
              </div>
              {registrationPanel}
            </div>
          </section>
        )}
        {academyWebinar && (
          <section aria-labelledby="webinar-next-steps" className="border-t border-[#F0E1D5] bg-white">
            <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-6 px-5 py-10 sm:px-8">
              <div className="max-w-xl">
                <h2 id="webinar-next-steps" className="text-2xl font-bold tracking-tight">Explore Meet to Manage for your academy</h2>
                <p className="mt-2 leading-relaxed text-[#5F4A40]">Book a free demo or compare plans. If you’re attending the webinar, ask the team about available offers before you buy.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to={`/get-started?from=${encodeURIComponent(registrationUrl.pathname)}`} className="inline-flex min-h-11 items-center rounded-lg bg-[#B53B0C] px-4 font-bold text-white hover:bg-[#913009]">Claim a free demo</Link>
                <Link to="/pricing" className="inline-flex min-h-11 items-center rounded-lg border border-[#DAB9A6] px-4 font-bold text-[#492B21] hover:bg-[#FFF1E6]">View plans and buy</Link>
                <a href="https://wa.me/919344773231?text=I%27d%20like%20to%20ask%20about%20Meet%20to%20Manage%20webinar%20attendee%20offers." target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center px-1 font-semibold text-[#813B20] hover:underline">Ask about attendee offers</a>
              </div>
            </div>
          </section>
        )}
      </main>
      <MarketingFooter />
    </div>
  );
}

function RegistrationConfirmation({ title, schedule, registrationUrl, joinUrl }: {
  title: string;
  schedule: WebinarSchedule | null;
  registrationUrl: string;
  joinUrl?: string;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const starts = schedule ? localWebinarTime(schedule.startsAt) : "";
  const ends = schedule ? localWebinarTime(schedule.endsAt) : "";
  const shareMessage = [
    `Join me for ${title}!`,
    ...(schedule ? [`Starts ${starts}`, `Ends ${ends}`] : []),
    `Register here: ${registrationUrl}`,
  ].join("\n");
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopyStatus("Registration link copied.");
    } catch {
      setCopyStatus("Select and copy the registration link from the field above.");
    }
  }

  return (
    <div className="space-y-5">
      <div role="status" className="space-y-2">
        <span className="inline-flex rounded-full bg-emerald-50 p-3 text-emerald-700"><CheckCircle2 className="h-6 w-6" aria-hidden /></span>
        <h2 id="webinar-registration-title" className="text-2xl font-semibold">Registration received</h2>
        <p className="text-sm leading-relaxed text-slate-700">{joinUrl ? "Your RSVP is confirmed. Save your joining link and open it at the scheduled time." : "Your RSVP is confirmed. The webinar team shares the live joining instructions separately."}</p>
      </div>
      {joinUrl && <Button className="w-full rounded-lg bg-[#B53B0C] font-bold text-white hover:bg-[#913009]" asChild>
        <a href={joinUrl} target="_blank" rel="noopener noreferrer"><Video className="h-4 w-4" aria-hidden /> Join the webinar</a>
      </Button>}

      <div className="space-y-3 rounded-xl border border-[#F3D8BD] bg-[#FFF6EB] p-4">
        <p className="break-words font-semibold">{title}</p>
        {schedule && (
          <dl className="grid gap-2 text-sm text-[#512809]">
            <div><dt className="font-semibold">Starts</dt><dd><time dateTime={schedule.startsAt.toISOString()}>{starts}</time></dd></div>
            <div><dt className="font-semibold">Ends</dt><dd><time dateTime={schedule.endsAt.toISOString()}>{ends}</time></dd></div>
          </dl>
        )}
        {schedule && (
          <Button className="w-full bg-white" variant="outline" asChild>
            <a href={webinarCalendarUrl(schedule, registrationUrl, title)} target="_blank" rel="noopener noreferrer">
              <CalendarDays className="h-4 w-4" /> Add to Google Calendar
            </a>
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold">Invite friends</h3>
        <div className="space-y-1">
          <Label htmlFor="webinar-share-url">Public registration link</Label>
          <Input id="webinar-share-url" type="url" readOnly value={registrationUrl} onFocus={(event) => event.currentTarget.select()} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyLink}><Copy className="h-4 w-4" /> Copy link</Button>
          <Button className="bg-[#147243] text-white hover:bg-[#0D5732]" asChild>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /> Share on WhatsApp</a>
          </Button>
        </div>
        {copyStatus && <p role="status" className="text-sm text-muted-foreground">{copyStatus}</p>}
      </div>
    </div>
  );
}
