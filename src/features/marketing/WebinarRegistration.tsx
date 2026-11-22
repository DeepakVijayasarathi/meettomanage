import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Copy, Gift, MessageCircle, UsersRound, Video } from "lucide-react";
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
import { localWebinarTime, readWebinarSchedule, webinarCalendarUrl, type WebinarSchedule } from "@/lib/webinarCalendar";
import { webinarHosts } from "@/lib/webinars";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";
import { FloatingWhatsApp } from "./FloatingWhatsApp";

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
      <FloatingWhatsApp />
    </div>
  );
}

function RegistrationForm({ webinar }: { webinar?: Webinar }) {
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  const [params] = useSearchParams();
  const details = webinar?.details;
  const { hostName, hostRole, teamName } = webinarHosts(webinar);
  const benefits = details?.benefits.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];
  const schedule = details ? { startsAt: new Date(details.start), endsAt: new Date(details.end) } : readWebinarSchedule(params);
  const title = webinar?.title ?? "Meet to Manage Webinar";
  const scheduleFormatter: Intl.DateTimeFormat & { formatRange?: (start: Date, end: Date) => string } = new Intl.DateTimeFormat(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
  const scheduleLabel = schedule && (
    scheduleFormatter.formatRange?.(schedule.startsAt, schedule.endsAt) ??
    `${localWebinarTime(schedule.startsAt)} to ${localWebinarTime(schedule.endsAt)}`
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
    <div className="theme-light-scope marketing-square min-h-screen bg-[#F9F8F6] text-[#17212D]">
      <Seo title={`${title} | Registration`} description={webinar?.excerpt ?? "Register for the Meet to Manage live webinar."} path={registrationUrl.pathname} noindex />
      <MarketingNav hideMobileSalesBar />
      <main className="border-t border-[#EFEAE5] bg-[radial-gradient(ellipse_at_top_left,#FFF0E1_0%,#F9F8F6_58%)]">
        <div className="mx-auto max-w-[1240px] px-5 pb-14 pt-6 sm:px-8 sm:pb-20 sm:pt-8">
          <Link to="/webinars" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#7C3515] hover:underline sm:mb-8">
            <ArrowLeft className="h-4 w-4" aria-hidden /> All webinars
          </Link>
          <div className="grid gap-y-7 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.66fr)] lg:items-start lg:gap-x-12 xl:gap-x-16">
            <header className="min-w-0 lg:col-start-1 lg:row-start-1">
              <p className="mb-4 inline-flex items-center gap-2 border-b-2 border-[#ED842A] pb-2 text-xs font-bold uppercase tracking-[0.12em] text-[#9A3412]">
                <Video className="h-4 w-4" aria-hidden /> Live webinar
              </p>
              <h1 className="max-w-2xl break-words text-[clamp(2.25rem,4.3vw,3.85rem)] font-bold leading-[1.04] tracking-[-0.045em] [text-wrap:balance]">{title}</h1>
              {webinar?.excerpt && <p className="mt-4 max-w-xl break-words text-base leading-relaxed text-[#455262] sm:text-lg">{webinar.excerpt}</p>}
              {scheduleLabel && (
                <p className="mt-5 flex items-start gap-2.5 text-sm font-semibold leading-6 text-[#38271D]">
                  <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[#AD4610]" aria-hidden />
                  <span>{scheduleLabel}</span>
                </p>
              )}
            </header>
            <section aria-label="Webinar registration" className="min-w-0 rounded-2xl border border-[#E8E2DB] bg-white p-5 shadow-[0_12px_32px_rgba(27,36,50,0.07)] sm:p-8 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              {registered ? (
                <RegistrationConfirmation title={title} schedule={schedule} registrationUrl={registrationUrl.href} />
              ) : closed ? (
                <h2 className="text-xl font-semibold">Registration has closed</h2>
              ) : (
                <form onSubmit={register} className="space-y-4">
                  <h2 className="mb-5 border-b border-[#EDE9E4] pb-4 text-2xl font-semibold tracking-tight">Register for this webinar</h2>
                  {fields.map(({ name, label, type, autoComplete, placeholder }) => (
                    <div key={name} className="space-y-2">
                      <Label htmlFor={name}>{label}</Label>
                      <Input className="h-11 !rounded-md border-[#D9DDE2] bg-white text-base placeholder:text-[#657182] focus-visible:ring-[#C2410C]" id={name} name={name} type={type} autoComplete={autoComplete} placeholder={placeholder} maxLength={type === "tel" ? 40 : type === "email" ? 256 : 150} required />
                    </div>
                  ))}
                  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                  {!available && <p role="status" className="text-sm text-muted-foreground">Registration is temporarily unavailable.</p>}
                  <Button type="submit" disabled={submitting || !available} className="h-12 w-full !rounded-md bg-[#C2410C] font-semibold text-white hover:bg-[#9A3412]">
                    {submitting ? "Registering…" : "Register now"} <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                  <p className="text-center text-xs text-[#645248]"><Link to="/privacy" className="underline underline-offset-2">Privacy policy</Link></p>
                </form>
              )}
            </section>
            <div className="min-w-0 space-y-8 lg:col-start-1 lg:row-start-2">
              {details?.bannerImage ? (
                <img src={details.bannerImage} alt="" className="aspect-video max-h-96 w-full rounded-xl border border-[#E8E2DB] bg-[#17212D] object-contain" />
              ) : (
                <img src="/images/webinar-desk.webp" alt="" width={1200} height={676} className="aspect-video w-full rounded-xl object-cover" />
              )}
              <section className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-tight">About the webinar</h2>
                <p className="whitespace-pre-line break-words text-base leading-7 text-[#455262]">
                  {details?.description ?? "See how academies manage scheduling, live classes, and fees in one place. Bring your questions for the live walkthrough."}
                </p>
              </section>
              {(hostName || teamName) && (
                <section aria-labelledby="webinar-hosts" className="space-y-4">
                  <h2 id="webinar-hosts" className="break-words text-2xl font-semibold tracking-tight">
                    {hostName ? `Meet ${hostName}${teamName ? " and the team" : ""}` : "Meet the team"}
                  </h2>
                  <ul className="grid divide-y divide-[#EFE8E0] rounded-xl border border-[#E8E2DB] bg-white sm:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] sm:divide-x sm:divide-y-0">
                    {hostName && (
                      <li className="flex min-w-0 items-center gap-3 p-4">
                        {details?.hostPhoto ? (
                          <img src={details.hostPhoto} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FFF0E1] font-bold text-[#9A3412]">{Array.from(hostName)[0]?.toUpperCase()}</span>
                        )}
                        <div className="min-w-0 break-words">
                          <p className="font-semibold">{hostName}</p>
                          {hostRole && <p className="text-sm text-[#455262]">{hostRole}</p>}
                        </div>
                      </li>
                    )}
                    {teamName && (
                      <li className="flex min-w-0 items-center gap-3 p-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F0F3F7] text-[#34475B]">
                          <UsersRound className="h-5 w-5" aria-hidden />
                        </span>
                        <p className="min-w-0 break-words font-semibold">{teamName}</p>
                      </li>
                    )}
                  </ul>
                </section>
              )}
              {benefits.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-2xl font-semibold tracking-tight">What you’ll learn</h2>
                  <ul className="divide-y divide-[#E9DDD5] border-y border-[#E9DDD5]">
                    {benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-3 py-3 leading-6 text-[#455262]">
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
      <FloatingWhatsApp />
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
        <h2 className="text-2xl font-semibold">Registration received</h2>
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
