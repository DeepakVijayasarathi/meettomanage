import { useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
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
  { name: "fullName", label: "Full name", type: "text", autoComplete: "name" },
  { name: "workEmail", label: "Email address", type: "email", autoComplete: "email" },
  { name: "phone", label: "Phone number", type: "tel", autoComplete: "tel" },
  { name: "academyName", label: "Academy or organization", type: "text", autoComplete: "organization" },
] as const;

export default function WebinarRegistration() {
  const { slug } = useParams();
  return slug ? <PublishedWebinar key={slug} slug={slug} /> : <RegistrationForm />;
}

function PublishedWebinar({ slug }: { slug: string }) {
  const { data, loading, error, reload } = useApiData<Webinar | null>(() => getWebinar(slug), null);
  if (data && !error) return <RegistrationForm webinar={data} />;
  return (
    <main className="mx-auto max-w-xl space-y-4 px-5 py-16">
      <Seo title="Webinar | Meet to Manage" description="Meet to Manage webinar registration." path={window.location.pathname} noindex />
      <h1 className="text-2xl font-semibold">{loading ? "Loading webinar…" : "Webinar unavailable"}</h1>
      {error && <Button variant="outline" onClick={reload}>Try again</Button>}
    </main>
  );
}

function RegistrationForm({ webinar }: { webinar?: Webinar }) {
  useLightBrandScope();
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  const [params] = useSearchParams();
  const details = webinar?.details;
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
    <div className="theme-light-scope marketing-square min-h-screen bg-white text-[#171B22]">
      <Seo title={`${title} | Registration`} description={webinar?.excerpt ?? "Register for the Meet to Manage live webinar."} path={registrationUrl.pathname} noindex />
      <MarketingNav />
      <main className="bg-gradient-to-b from-[#FFF3EA] to-white px-5 py-12 sm:py-20">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2 lg:items-start">
          <div className="lg:pt-8">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{webinar ? title : "Register for the Meet to Manage webinar"}</h1>
            <p className="mt-5 max-w-md whitespace-pre-line text-lg leading-relaxed text-slate-700">{details?.description ?? "See how academies manage scheduling, live classes, and fees in one place. Bring your questions for the live walkthrough."}</p>
            {schedule && (
              <p className="mt-5 font-medium">
                <time dateTime={schedule.startsAt.toISOString()}>{localWebinarTime(schedule.startsAt)}</time>
                {" to "}
                <time dateTime={schedule.endsAt.toISOString()}>{localWebinarTime(schedule.endsAt)}</time>
              </p>
            )}
            {details?.benefits && (
              <section className="mt-6 space-y-2">
                <h2 className="text-lg font-semibold">What you’ll learn</h2>
                <ul className="list-disc space-y-1 pl-5 text-slate-700">
                  {details.benefits.split("\n").map((line, index) => line.trim() && <li key={index}>{line.trim()}</li>)}
                </ul>
              </section>
            )}
            {details?.offers && (
              <section className="mt-6 space-y-2">
                <h2 className="text-lg font-semibold">Webinar offers</h2>
                <p className="whitespace-pre-line text-slate-700">{details.offers}</p>
              </section>
            )}
          </div>
          <div className="rounded-2xl border border-[#F6E3D3] bg-white p-6 shadow-sm sm:p-8">
            {registered ? (
              <div role="status" className="space-y-3">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                <h2 className="text-2xl font-semibold">Registration received</h2>
                <p className="text-slate-700">The webinar team can use your contact details to share the joining instructions.</p>
                {schedule && (
                  <Button variant="outline" asChild>
                    <a href={webinarCalendarUrl(schedule, registrationUrl.href, title)} target="_blank" rel="noopener noreferrer"><CalendarDays className="h-4 w-4" /> Add to Google Calendar</a>
                  </Button>
                )}
              </div>
            ) : closed ? (
              <p className="font-medium">Registration for this webinar has closed.</p>
            ) : (
              <form onSubmit={register} className="space-y-4">
                {fields.map(({ name, label, type, autoComplete }) => (
                  <div key={name} className="space-y-2">
                    <Label htmlFor={name}>{label}</Label>
                    <Input id={name} name={name} type={type} autoComplete={autoComplete} maxLength={type === "tel" ? 40 : type === "email" ? 256 : 150} required />
                  </div>
                ))}
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                {!available && <p role="status" className="text-sm text-muted-foreground">Registration is temporarily unavailable.</p>}
                <Button type="submit" disabled={submitting || !available} className="w-full">
                  {submitting ? "Registering…" : "Register for the webinar"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
