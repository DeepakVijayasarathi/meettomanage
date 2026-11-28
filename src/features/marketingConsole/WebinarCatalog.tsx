import { useState, type FormEvent } from "react";
import { Link, useHref } from "react-router-dom";
import { BarChart3, CalendarDays, CalendarPlus, CheckCircle2, Clock3, Copy, ExternalLink, ImagePlus, MonitorPlay, Radio, Search, Sparkles, Trash2, UserRound, UsersRound } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createWebinarAttendeeLink, getWebinarAnalytics, listManagedWebinars, listWebinarRegistrations, saveWebinar, startWebinar, type Webinar, type WebinarAnalytics } from "@/api/webinars";
import { useApiData } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { userMessage } from "@/lib/api";
import { localWebinarTime, webinarCalendarUrl } from "@/lib/webinarCalendar";
import { webinarHosts, webinarPath } from "@/lib/webinars";

function localInput(date?: Date) {
  return date ? new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";
}

export default function WebinarCatalog() {
  const { data, loading, error, reload } = useApiData(listManagedWebinars, []);
  const [editing, setEditing] = useState<Webinar | null>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [banner, setBanner] = useState("");
  const [readingImage, setReadingImage] = useState(false);
  const [bannerError, setBannerError] = useState("");
  const [hostPhoto, setHostPhoto] = useState("");
  const [hostPhotoError, setHostPhotoError] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogFilter, setCatalogFilter] = useState<"all" | "upcoming" | "draft" | "completed">("all");
  const details = editing?.details;
  const hosts = webinarHosts(editing);
  const now = Date.now();
  const webinarIds = data.map((webinar) => webinar.id).join(",");
  const registrationCounts = useApiData(
    async () => Promise.all(data.map(async (webinar) => {
      try {
        const analytics = await getWebinarAnalytics(webinar.id);
        return { id: webinar.id, title: webinar.title, ...analytics };
      } catch {
        return { id: webinar.id, title: webinar.title, ...EMPTY_WEBINAR_ANALYTICS };
      }
    })),
    [],
    [],
    { cacheKey: `webinar-registration-counts-${webinarIds}`, ttlMs: 30_000 },
  );
  const sortedWebinars = [...data].sort((a, b) => {
    const aStart = new Date(a.details.start).getTime();
    const bStart = new Date(b.details.start).getTime();
    const aFuture = new Date(a.details.end).getTime() > now;
    const bFuture = new Date(b.details.end).getTime() > now;
    return aFuture === bFuture ? (aFuture ? aStart - bStart : bStart - aStart) : aFuture ? -1 : 1;
  });
  const visibleWebinars = sortedWebinars.filter((webinar) => {
    const queryMatches = `${webinar.title} ${webinar.excerpt}`.toLowerCase().includes(catalogQuery.trim().toLowerCase());
    const ended = new Date(webinar.details.end).getTime() <= now;
    const filterMatches = catalogFilter === "all"
      || (catalogFilter === "upcoming" && !ended && webinar.isPublished)
      || (catalogFilter === "draft" && !webinar.isPublished)
      || (catalogFilter === "completed" && ended && webinar.isPublished);
    return queryMatches && filterMatches;
  });

  function openEditor(webinar: Webinar | null) {
    setEditing(webinar);
    setBanner(webinar?.details.bannerImage ?? "");
    setBannerError("");
    setHostPhoto(webinar?.details.hostPhoto ?? "");
    setHostPhotoError("");
    setSaveError("");
    setFeedback("");
  }

  function selectImage(file: File | undefined, limitKb: number, setImage: (value: string) => void, setError: (value: string) => void) {
    if (!file) return;
    setError("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > limitKb * 1000 || !file.size) {
      setError(`Choose a PNG, JPG, or WebP image up to ${limitKb} KB.`);
      return;
    }
    const reader = new FileReader();
    setReadingImage(true);
    reader.onload = () => setImage(String(reader.result));
    reader.onerror = () => setError("Could not read the image. Try selecting it again.");
    reader.onloadend = () => setReadingImage(false);
    reader.readAsDataURL(file);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || readingImage) return;
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const title = value("title");
    const excerpt = value("summary");
    const description = value("description");
    const start = new Date(value("start"));
    const end = new Date(value("end"));
    const publish = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "publish";
    if (!title || !excerpt || !description || !Number.isFinite(start.getTime()) || !(end > start) || (publish && end.getTime() <= Date.now())) {
      setSaveError("Enter a title, summary, description, and valid times. Published webinars must end in the future.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await saveWebinar({
        title, excerpt, description, benefits: value("benefits"), offers: value("offers"),
        start: start.toISOString(), end: end.toISOString(), isPublished: publish, bannerImage: banner,
        hostName: value("hostName"), hostRole: value("hostRole"), teamName: value("teamName"), hostPhoto,
      }, editing?.id);
      reload();
      setEditing(undefined);
      setFeedback(publish ? "Webinar published to the landing page." : "Webinar saved as a draft.");
    } catch (err) {
      setSaveError(userMessage(err, "Could not save the webinar."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {!loading && !error && <WebinarOverview webinars={data} counts={registrationCounts.data} countsLoading={registrationCounts.loading} />}
    <Card className="overflow-hidden border-border/70 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div><CardTitle className="text-lg">Webinar catalog</CardTitle><p className="mt-1 text-sm text-muted-foreground">Manage upcoming, draft, and completed events.</p></div>
        {editing === undefined && <Button onClick={() => openEditor(null)}><CalendarPlus className="h-4 w-4" /> Create webinar</Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        {editing !== undefined && (
          <form key={editing?.id ?? "new"} onSubmit={save} className="space-y-3 rounded-lg border p-4">
            <label className="block space-y-1 text-sm">Title<Input name="title" required maxLength={150} defaultValue={editing?.title} /></label>
            <fieldset className="space-y-3 rounded-xl border bg-muted/30 p-4">
              <legend className="px-1 text-sm font-medium">Webinar banner</legend>
              {banner && <img src={banner} alt="Webinar banner preview" className="aspect-video w-full rounded-lg border bg-background object-contain" />}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="webinar-banner"
                  className="peer sr-only"
                  type="file"
                  aria-label="Webinar banner image"
                  aria-describedby="webinar-banner-hint"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={saving || readingImage}
                  onChange={(event) => {
                    selectImage(event.currentTarget.files?.[0], 500, setBanner, setBannerError);
                    event.currentTarget.value = "";
                  }}
                />
                <Button asChild variant="outline" size="sm">
                  <label htmlFor="webinar-banner" className="cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:pointer-events-none peer-disabled:opacity-50">
                    <ImagePlus className="h-4 w-4" /> {banner ? "Replace banner" : "Choose banner"}
                  </label>
                </Button>
                {banner && (
                  <Button type="button" size="sm" variant="ghost" disabled={saving || readingImage} onClick={() => { setBanner(""); setBannerError(""); }}>
                    <Trash2 className="h-4 w-4" /> Remove banner
                  </Button>
                )}
              </div>
              <p id="webinar-banner-hint" className="text-xs text-muted-foreground">Optional. A 16:9 PNG, JPG, or WebP up to 500 KB works well.</p>
              {bannerError && <p role="alert" className="text-sm text-destructive">{bannerError}</p>}
            </fieldset>
            <label className="block space-y-1 text-sm">Landing page summary<Input name="summary" required maxLength={240} defaultValue={editing?.excerpt} /></label>
            <label className="block space-y-1 text-sm">Description<Textarea name="description" required maxLength={3000} defaultValue={details?.description} /></label>
            <label className="block space-y-1 text-sm">Benefits, one per line<Textarea name="benefits" maxLength={2000} defaultValue={details?.benefits} /></label>
            <label className="block space-y-1 text-sm">Offers<Textarea name="offers" maxLength={2000} defaultValue={details?.offers} /></label>
            <fieldset className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
              <legend className="px-1 text-sm font-medium">Webinar hosts</legend>
              <label className="block space-y-1 text-sm">Host name<Input name="hostName" maxLength={100} defaultValue={hosts.hostName} placeholder="e.g. Prithiv" /></label>
              <label className="block space-y-1 text-sm">Host role<Input name="hostRole" maxLength={100} defaultValue={hosts.hostRole} placeholder="e.g. Chief Marketing Officer" /></label>
              <label className="block space-y-1 text-sm sm:col-span-2">Team name<Input name="teamName" maxLength={120} defaultValue={hosts.teamName} placeholder="e.g. Meet to Manage team" /></label>
              <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                {hostPhoto && <img src={hostPhoto} alt="Host photo preview" className="h-16 w-16 shrink-0 rounded-full border object-cover" />}
                <div className="min-w-0 space-y-1">
                  <label className="block space-y-1 text-sm">
                    Host photo
                    <Input type="file" accept="image/png,image/jpeg,image/webp" disabled={saving || readingImage}
                      aria-describedby="webinar-host-photo-hint"
                      onChange={(event) => {
                        selectImage(event.currentTarget.files?.[0], 200, setHostPhoto, setHostPhotoError);
                        event.currentTarget.value = "";
                      }} />
                  </label>
                  <p id="webinar-host-photo-hint" className="text-xs text-muted-foreground">Square PNG, JPG, or WebP up to 200 KB.</p>
                  {hostPhotoError && <p role="alert" className="text-sm text-destructive">{hostPhotoError}</p>}
                </div>
                {hostPhoto && <Button type="button" variant="ghost" size="sm" disabled={saving || readingImage} onClick={() => { setHostPhoto(""); setHostPhotoError(""); }}>Remove photo</Button>}
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">Starts in your time zone<Input type="datetime-local" name="start" required defaultValue={localInput(details ? new Date(details.start) : undefined)} /></label>
              <label className="block space-y-1 text-sm">Ends in your time zone<Input type="datetime-local" name="end" required defaultValue={localInput(details ? new Date(details.end) : undefined)} /></label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" value="publish" disabled={saving || readingImage}>{editing?.isPublished ? "Update published webinar" : "Publish webinar"}</Button>
              <Button type="submit" variant="outline" disabled={saving || readingImage}>{editing?.isPublished ? "Unpublish and save draft" : "Save draft"}</Button>
              <Button type="button" variant="ghost" disabled={saving || readingImage} onClick={() => setEditing(undefined)}>Cancel</Button>
            </div>
            {readingImage && <p role="status" className="text-sm">Loading image preview…</p>}
            {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          </form>
        )}
        {feedback && <p role="status" className="text-sm">{feedback}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {loading && <p role="status" className="text-sm text-muted-foreground">Loading webinars…</p>}
        {!loading && !error && !data.length && editing === undefined && <p className="text-sm text-muted-foreground">No webinars yet.</p>}
        {editing === undefined && data.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Search webinars…" className="bg-background pl-9" aria-label="Search webinars" />
            </div>
            <div className="flex flex-wrap gap-1" aria-label="Filter webinar catalog">
              {(["all", "upcoming", "draft", "completed"] as const).map((filter) => (
                <Button key={filter} type="button" size="sm" variant={catalogFilter === filter ? "default" : "ghost"} onClick={() => setCatalogFilter(filter)} className="capitalize">{filter}</Button>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-4">{visibleWebinars.map((webinar) => (
          <WebinarRow key={`${webinar.id}:${webinar.details.end}:${webinar.isPublished}`} webinar={webinar} analytics={registrationCounts.data.find((item) => item.id === webinar.id)} countsLoading={registrationCounts.loading} disabled={saving || readingImage} onEdit={() => openEditor(webinar)} />
        ))}</div>
        {editing === undefined && data.length > 0 && visibleWebinars.length === 0 && <div className="rounded-xl border border-dashed py-10 text-center"><Search className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-2 text-sm font-medium">No matching webinars</p><p className="text-xs text-muted-foreground">Change the search or status filter.</p></div>}
      </CardContent>
    </Card>
    </div>
  );
}

const WEBINAR_COLORS = ["#7C3AED", "#EC4899", "#F97316", "#0EA5E9", "#10B981"];
const EMPTY_WEBINAR_ANALYTICS: WebinarAnalytics = { pageViews: 0, visitors: 0, formViews: 0, formStarts: 0, submitAttempts: 0, trackedSubmissions: 0, registrations: 0, joinClicks: 0, demoClicks: 0, converted: 0, sources: [], dailyRegistrations: [] };
type WebinarRegistrationCount = WebinarAnalytics & { id: string; title: string };

function WebinarOverview({ webinars, counts, countsLoading }: { webinars: Webinar[]; counts: WebinarRegistrationCount[]; countsLoading: boolean }) {
  const now = Date.now();
  const published = webinars.filter((webinar) => webinar.isPublished).length;
  const draft = webinars.filter((webinar) => !webinar.isPublished).length;
  const upcoming = webinars.filter((webinar) => webinar.isPublished && new Date(webinar.details.end).getTime() > now).length;
  const completed = webinars.filter((webinar) => webinar.isPublished && new Date(webinar.details.end).getTime() <= now).length;
  const totalRegistrations = counts.reduce((sum, item) => sum + item.registrations, 0);
  const funnel = [
    { name: "Landing visitors", value: counts.reduce((sum, item) => sum + item.visitors, 0) },
    { name: "Saw registration form", value: counts.reduce((sum, item) => sum + item.formViews, 0) },
    { name: "Started form", value: counts.reduce((sum, item) => sum + item.formStarts, 0) },
    { name: "Submit attempts", value: counts.reduce((sum, item) => sum + item.submitAttempts, 0) },
    { name: "Registrations saved", value: totalRegistrations },
    { name: "Join-link clicks", value: counts.reduce((sum, item) => sum + item.joinClicks, 0) },
    { name: "Converted customers", value: counts.reduce((sum, item) => sum + item.converted, 0) },
  ];
  const funnelTop = Math.max(1, funnel[0].value);
  const statusData = [
    { name: "Upcoming", value: upcoming },
    { name: "Completed", value: completed },
    { name: "Draft", value: draft },
  ].filter((item) => item.value > 0);
  const nextWebinar = webinars
    .filter((webinar) => webinar.isPublished && new Date(webinar.details.start).getTime() > now)
    .sort((a, b) => new Date(a.details.start).getTime() - new Date(b.details.start).getTime())[0];

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-950 p-6 text-white shadow-xl shadow-violet-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-200"><Sparkles className="h-4 w-4" /> Event performance</div>
            <h2 className="max-w-xl text-2xl font-bold tracking-tight sm:text-3xl">Turn every webinar into a measurable growth channel.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Track your event pipeline, registration interest, publishing readiness, and upcoming sessions at a glance.</p>
            {nextWebinar && <p className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs text-violet-100"><Radio className="h-3.5 w-3.5 shrink-0 text-pink-300" /><span className="truncate"><b>Next:</b> {nextWebinar.title}</span><span className="hidden text-slate-300 sm:inline">· {localWebinarTime(new Date(nextWebinar.details.start))}</span></p>}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            {[
              { label: "All webinars", value: webinars.length, icon: MonitorPlay },
              { label: "Upcoming", value: upcoming, icon: CalendarDays },
              { label: "Published", value: published, icon: Radio },
              { label: "Registrations", value: countsLoading ? "…" : totalRegistrations, icon: UsersRound },
            ].map((item) => <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur-sm"><div className="flex items-center justify-between text-xs text-slate-300">{item.label}<item.icon className="h-4 w-4" /></div><p className="mt-1 text-2xl font-bold">{item.value}</p></div>)}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="pb-2"><div className="flex items-start justify-between"><div><CardTitle className="text-base">Registrations by webinar</CardTitle><p className="mt-1 text-xs text-muted-foreground">Compare audience interest across your events.</p></div><span className="rounded-xl bg-violet-500/10 p-2 text-violet-600"><BarChart3 className="h-4 w-4" /></span></div></CardHeader>
          <CardContent>
            {counts.length ? <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={counts} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}><defs><linearGradient id="webinarRegistrationFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7C3AED" /><stop offset="100%" stopColor="#EC4899" /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="title" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(value) => value.length > 18 ? `${value.slice(0, 18)}…` : value} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => [`${value} registrations`, "Audience"]} /><Bar dataKey="registrations" fill="url(#webinarRegistrationFill)" radius={[7, 7, 0, 0]} maxBarSize={50} /></BarChart></ResponsiveContainer></div> : <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">Create a webinar to begin tracking registrations.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Webinar pipeline</CardTitle><p className="text-xs text-muted-foreground">Current event status distribution.</p></CardHeader>
          <CardContent>
            {statusData.length ? <div className="grid h-56 grid-cols-[9rem_1fr] items-center"><div className="relative h-40"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={68} paddingAngle={4} stroke="none">{statusData.map((item, index) => <Cell key={item.name} fill={WEBINAR_COLORS[index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold">{webinars.length}</span><span className="text-[10px] text-muted-foreground">events</span></div></div><div className="space-y-3">{statusData.map((item, index) => <div key={item.name} className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: WEBINAR_COLORS[index] }} /><span className="flex-1 text-muted-foreground">{item.name}</span><b>{item.value}</b></div>)}</div></div> : <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">No webinar pipeline yet.</p>}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Webinar conversion journey</CardTitle><p className="text-xs text-muted-foreground">First-party landing, form, registration, joining and customer signals. New tracking appears from this release onward.</p></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {funnel.map((step, index) => <div key={step.name} className="rounded-xl border bg-muted/20 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{step.name}</span><span className="text-[10px] font-semibold text-muted-foreground">{index === 0 ? "BASE" : step.value > funnelTop ? "NEW BASELINE" : `${Math.round(step.value * 100 / funnelTop)}%`}</span></div><p className="mt-1 text-2xl font-bold">{countsLoading ? "…" : step.value}</p><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500" style={{ width: `${Math.min(100, step.value * 100 / funnelTop)}%` }} /></div></div>)}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function WebinarRow({ webinar, analytics, countsLoading, disabled, onEdit }: { webinar: Webinar; analytics?: WebinarRegistrationCount; countsLoading: boolean; disabled: boolean; onEdit: () => void }) {
  const [invite, setInvite] = useState<Awaited<ReturnType<typeof createWebinarAttendeeLink>>>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const path = webinarPath(webinar.slug);
  const registrationUrl = new URL(useHref(path), window.location.origin).href;
  const schedule = { startsAt: new Date(webinar.details.start), endsAt: new Date(webinar.details.end) };
  const ended = schedule.endsAt.getTime() <= Date.now();
  const hosts = webinarHosts(webinar);
  const durationMinutes = Math.max(0, Math.round((schedule.endsAt.getTime() - schedule.startsAt.getTime()) / 60_000));
  const readinessFields = [webinar.title, webinar.excerpt, webinar.details.description, webinar.details.bannerImage, hosts.hostName, webinar.details.benefits];
  const readiness = Math.round((readinessFields.filter(Boolean).length / readinessFields.length) * 100);

  async function openRoom() {
    setPending(true);
    setError("");
    try {
      const { url } = await startWebinar(webinar.id);
      window.location.assign(url);
    } catch (err) {
      setError(userMessage(err, "Could not open the Jitsi room."));
    } finally {
      setPending(false);
    }
  }

  async function generateLink() {
    setPending(true);
    setError("");
    setFeedback("");
    try {
      setInvite(await createWebinarAttendeeLink(webinar.id));
    } catch (err) {
      setError(userMessage(err, "Could not generate the attendee link."));
    } finally {
      setPending(false);
    }
  }

  async function copy(url: string, label: string) {
    setFeedback("");
    try {
      await navigator.clipboard.writeText(url);
      setFeedback(`${label} copied.`);
    } catch {
      setFeedback(`Copy the ${label.toLowerCase()} from its link field or open the link and copy it from the address bar.`);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="grid md:grid-cols-[15rem_1fr]">
        <div className="relative min-h-44 overflow-hidden bg-gradient-to-br from-violet-700 via-fuchsia-700 to-orange-500">
          {webinar.details.bannerImage ? <img src={webinar.details.bannerImage} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center text-white"><MonitorPlay className="mb-3 h-10 w-10 opacity-90" /><span className="text-xs font-bold uppercase tracking-[0.18em] opacity-80">Meet to Manage</span><span className="mt-1 text-lg font-bold">Live webinar</span></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
          <Badge className="absolute left-3 top-3 border-0 bg-white/90 text-slate-900 hover:bg-white">{!webinar.isPublished ? "Draft" : ended ? "Completed" : "Published"}</Badge>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white"><span className="flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5" />{countsLoading ? "Loading" : `${analytics?.registrations ?? 0} registered`}</span><span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{durationMinutes} min</span></div>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-primary" />{localWebinarTime(schedule.startsAt)}</span>{hosts.hostName && <span className="flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-primary" />{hosts.hostName}</span>}<span className="flex items-center gap-1.5" title="Title, summary, description, banner, host and benefits completed"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{readiness}% page ready</span></div>
            <h3 className="text-lg font-bold tracking-tight">{webinar.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">{webinar.excerpt}</p>
            {!countsLoading && analytics && <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-violet-700 dark:text-violet-300">{analytics.visitors} landing visitors</span><span className="rounded-full bg-fuchsia-500/10 px-2.5 py-1 text-fuchsia-700 dark:text-fuchsia-300">{analytics.visitors >= analytics.registrations && analytics.visitors ? `${Math.round(analytics.registrations * 100 / analytics.visitors)}% registration rate` : "Conversion baseline starts now"}</span><span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">{analytics.joinClicks} join clicks</span></div>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={disabled} onClick={onEdit}>Edit details</Button>
            <WebinarRegistrations webinar={webinar} />
            <Button size="sm" disabled={pending || ended} onClick={openRoom}><Radio className="h-4 w-4" /> Start Jitsi</Button>
        {webinar.isPublished && (
          <>
              <Button variant="outline" size="sm" disabled={pending || ended} onClick={generateLink}>Attendee link</Button>
              <Button variant="ghost" size="sm" asChild><a href={webinarCalendarUrl(schedule, registrationUrl, webinar.title)} target="_blank" rel="noopener noreferrer"><CalendarPlus className="h-4 w-4" /> Calendar</a></Button>
          </>
        )}
          </div>
        </div>
      </div>
      {webinar.isPublished && (
        <div className="space-y-2 border-t bg-muted/20 px-5 py-4">
          <label htmlFor={`webinar-registration-${webinar.id}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Public registration page</label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id={`webinar-registration-${webinar.id}`}
              className="min-w-0 flex-[1_1_15rem] bg-background"
              type="url"
              value={registrationUrl}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button variant="outline" size="sm" onClick={() => copy(registrationUrl, "Registration link")}><Copy className="h-4 w-4" /> Copy</Button>
            <Button variant="ghost" size="sm" asChild><Link to={path} target="_blank" rel="noopener noreferrer">Open <ExternalLink className="h-4 w-4" /></Link></Button>
          </div>
        </div>
      )}
      {invite && (
        <div className="flex flex-wrap items-center gap-2 border-t px-5 py-4">
          <Input className="max-w-md" aria-label="Attendee link" value={invite.url} readOnly onFocus={(event) => event.currentTarget.select()} />
          <Button size="sm" variant="outline" onClick={() => copy(invite.url, "Attendee link")}>Copy attendee link</Button>
          <span className="text-xs text-muted-foreground">Expires {localWebinarTime(new Date(invite.expiresAtUtc))}</span>
        </div>
      )}
      {(error || pending || feedback) && <div className="border-t px-5 py-3">{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{pending && <p role="status" className="text-sm">Connecting to the webinar service…</p>}{feedback && <p role="status" className="text-sm">{feedback}</p>}</div>}
    </article>
  );
}

function WebinarRegistrations({ webinar }: { webinar: Webinar }) {
  const [page, setPage] = useState(1);
  return (
    <Dialog onOpenChange={(open) => { if (open) setPage(1); }}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Registrations</Button></DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Webinar registrations</DialogTitle>
          <DialogDescription>{webinar.title}</DialogDescription>
        </DialogHeader>
        <RegistrationPage key={page} webinarId={webinar.id} page={page} onPageChange={setPage} />
      </DialogContent>
    </Dialog>
  );
}

function RegistrationPage({ webinarId, page, onPageChange }: { webinarId: string; page: number; onPageChange: (page: number) => void }) {
  const { data, loading, error, reload } = useApiData(() => listWebinarRegistrations(webinarId, page), null);
  if (loading) return <p role="status" className="text-sm text-muted-foreground">Loading registrations…</p>;
  if (error) return (
    <div className="space-y-2">
      <p role="alert" className="text-sm text-destructive">{error}</p>
      <Button variant="outline" size="sm" onClick={reload}>Try again</Button>
    </div>
  );
  if (!data?.totalCount) return <p className="text-sm text-muted-foreground">No registrations to show for this webinar.</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{data.totalCount} {data.totalCount === 1 ? "registration" : "registrations"}</p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th scope="col" className="px-3 py-2">Attendee</th>
              <th scope="col" className="px-3 py-2">Contact</th>
              <th scope="col" className="px-3 py-2">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.items.map((registration) => (
              <tr key={registration.id}>
                <td className="px-3 py-2">
                  <Link to={`/marketing/leads/${registration.id}`} className="font-medium hover:underline">{registration.fullName}</Link>
                  <p className="text-muted-foreground">{registration.academyName}</p>
                </td>
                <td className="px-3 py-2">
                  <div>{registration.workEmail}</div>
                  <div className="text-muted-foreground">{registration.phone}</div>
                </td>
                <td className="min-w-36 px-3 py-2">
                  <time dateTime={registration.createdAtUtc}>{localWebinarTime(new Date(registration.createdAtUtc))}</time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(page > 1 || data.totalCount > data.pageSize) && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page * data.pageSize >= data.totalCount} onClick={() => onPageChange(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
