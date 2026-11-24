import { useState, type FormEvent } from "react";
import { ArrowLeft, CalendarDays, Check, CheckCircle2, Clock3, Copy, Gift, MessageCircle, UsersRound, Video } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
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
import { isAcademyWebinar, webinarHosts } from "@/lib/webinars";
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
  const [error, setError] = useState("");
  const [params] = useSearchParams();
  const details = webinar?.details;
  const academyWebinar = isAcademyWebinar(webinar);
  const { hostName, hostRole, teamName } = webinarHosts(webinar);
  const benefits = details?.benefits.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];
  if (academyWebinar && !benefits.some((benefit) => /live class/i.test(benefit))) {
    benefits.push("Manage live online classes.");
  }
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
      if (webinar) await registerForWebinar(webinar.slug, contact);
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


  return (
    <div className="theme-light-scope min-h-screen bg-[#FFFCF8] text-[#251B17]">
      <Seo title={webinar ? `${title} | Meet to Manage Webinar` : `${title} | Registration`} description={webinar?.excerpt ?? "Register for the Meet to Manage live webinar."} path={registrationUrl.pathname} noindex />
      <header className="border-b border-[#F0E4DA] bg-white">
        <div className="mx-auto flex min-h-20 max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" aria-label="Meet to Manage home">
            <img src="/logo-full.webp" alt="Meet to Manage" width={170} height={61} className="h-auto w-[145px] sm:w-[170px]" />
          </Link>
          <Link to="/webinars" className="inline-flex items-center gap-2 text-sm font-semibold text-[#813B20] hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> All webinars
          </Link>
        </div>
      </header>
      <main id="main-content">
        <section aria-labelledby="webinar-title" className="border-b border-[#F1E1D2] bg-[radial-gradient(ellipse_at_top_left,#FDE5D0_0%,#FFF7EF_48%,#FFFCF8_85%)]">
          <div className="mx-auto grid max-w-[1240px] items-start gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.66fr)] lg:gap-14 lg:py-16">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#EBC4AA] bg-[#FFF8F1] px-4 py-2 text-sm font-bold text-[#973C17]">
                <Video className="h-4 w-4" aria-hidden /> {academyWebinar ? "Free online webinar" : "Live webinar"}
              </p>
              <h1 id="webinar-title" className="mt-5 max-w-2xl break-words text-[clamp(2.55rem,5.1vw,4.5rem)] font-bold leading-[1.02] tracking-[-0.055em] [text-wrap:balance]">{title}</h1>
              {webinar?.excerpt && <p className="mt-5 max-w-[38rem] break-words text-lg leading-relaxed text-[#5F4A40]">{webinar.excerpt}</p>}
              {schedule && (
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-y border-[#EEDACB] py-4">
                  <p className="flex items-center gap-2.5 font-semibold">
                    <CalendarDays className="h-5 w-5 shrink-0 text-[#A8441B]" aria-hidden />
                    <time dateTime={schedule.startsAt.toISOString()}>{dateLabel}</time>
                  </p>
                  <p className="flex items-center gap-2.5 font-semibold">
                    <Clock3 className="h-5 w-5 shrink-0 text-[#A8441B]" aria-hidden /> {timeLabel}
                  </p>
                </div>
              )}
              {academyWebinar && <p className="mt-4 text-base text-[#5F4A40]">For teachers, tutors, coaches, and academy owners.</p>}
              <img src={academyWebinar ? "/images/academy-webinar-hero.webp" : details?.bannerImage || "/images/webinar-desk.webp"}
                alt={academyWebinar ? "An educator presenting from her coaching studio" : ""}
                width={1200} height={675} fetchPriority="high"
                className="mt-7 aspect-[2.6/1] w-full rounded-2xl object-cover object-[center_43%] lg:aspect-[2.15/1]" />
            </div>
            <section id="webinar-registration" tabIndex={-1} aria-labelledby="webinar-registration-title" className="scroll-mt-8 rounded-[1.5rem] border border-[#EED7C7] bg-white p-5 shadow-[0_20px_48px_rgba(80,37,17,0.09)] sm:p-8">
              {registered ? (
                <RegistrationConfirmation title={title} schedule={schedule} registrationUrl={registrationUrl.href} />
              ) : closed ? (
                <h2 id="webinar-registration-title" className="text-2xl font-bold">Registration has closed</h2>
              ) : (
                <form onSubmit={register} className="space-y-4">
                  <div className="mb-5 border-b border-[#F0E5DC] pb-5">
                    <h2 id="webinar-registration-title" className="text-2xl font-bold tracking-tight sm:text-3xl">{academyWebinar ? "Save your free spot" : "Register for this webinar"}</h2>
                    <p className="mt-2 text-base text-[#6C5347]">Enter your details to register for the online session.</p>
                  </div>
                  {fields.map(({ name, label, type, autoComplete, placeholder }) => (
                    <div key={name} className="space-y-2">
                      <Label htmlFor={name}>{label}</Label>
                      <Input className="h-12 rounded-lg border-[#E5D6CD] bg-[#FFFCFA] text-base placeholder:text-[#74665D] focus-visible:ring-[#C2410C]" id={name} name={name} type={type} autoComplete={autoComplete} placeholder={placeholder} maxLength={type === "tel" ? 40 : type === "email" ? 256 : 150} required />
                    </div>
                  ))}
                  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                  {!available && <p role="status" className="text-sm text-muted-foreground">Registration is temporarily unavailable.</p>}
                  <Button type="submit" disabled={submitting || !available} className="h-12 w-full rounded-lg bg-[#B53B0C] text-base font-bold text-white hover:bg-[#913009]">
                    {submitting ? "Registering…" : academyWebinar ? "Register for free" : "Register now"}
                  </Button>
                  <p className="text-center text-sm text-[#645248]"><Link to="/privacy" className="underline underline-offset-2">Privacy policy</Link></p>
                </form>
              )}
            </section>
          </div>
        </section>
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.66fr)] lg:gap-14">
          <div className="min-w-0 space-y-8">
            <section aria-labelledby="webinar-agenda">
              <h2 id="webinar-agenda" className="text-3xl font-bold tracking-tight sm:text-4xl">What you’ll learn</h2>
              <p className="mt-4 max-w-[42rem] whitespace-pre-line break-words leading-7 text-[#5F4A40]">
                {details?.description || "See how academies manage scheduling, live classes, and fees in one place. Bring your questions for the live walkthrough."}
              </p>
              {benefits.length > 0 && (
                <ul className="mt-6 divide-y divide-[#F0E1D5] overflow-hidden rounded-2xl border border-[#F0E1D5] bg-white">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-center gap-3 px-4 py-3.5 leading-6 text-[#4E3A31] sm:px-5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#FFF0E4] text-[#973C17]"><Check className="h-4 w-4" aria-hidden /></span>
                      <span className="min-w-0 break-words">{benefit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {!closed && !registered && available && <a href="#webinar-registration" className="inline-flex min-h-11 items-center rounded-lg bg-[#B53B0C] px-5 font-bold text-white hover:bg-[#913009]">{academyWebinar ? "Save your free spot" : "Register now"}</a>}
          </div>
          <div className="min-w-0 space-y-5">
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
                <Gift className="mt-0.5 h-5 w-5 shrink-0 text-[#A8441B]" aria-hidden />
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">{academyWebinar ? "Live Q&A" : "Webinar offers"}</h2>
                  <p className="mt-2 whitespace-pre-line break-words leading-6 text-[#5F4A40]">{details.offers}</p>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

function RegistrationConfirmation({ title, schedule, registrationUrl }: {
  title: string;
  schedule: WebinarSchedule | null;
  registrationUrl: string;
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
        <p className="text-sm leading-relaxed text-slate-700">The webinar team shares the live joining instructions separately.</p>
      </div>

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
