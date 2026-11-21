import { useState, type FormEvent } from "react";
import { Link, useHref } from "react-router-dom";
import { ImagePlus, Trash2 } from "lucide-react";
import { createWebinarAttendeeLink, listManagedWebinars, listWebinarRegistrations, saveWebinar, startWebinar, type Webinar } from "@/api/webinars";
import { useApiData } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { userMessage } from "@/lib/api";
import { localWebinarTime, webinarCalendarUrl } from "@/lib/webinarCalendar";
import { webinarPath } from "@/lib/webinars";

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
  const [readingBanner, setReadingBanner] = useState(false);
  const [bannerError, setBannerError] = useState("");
  const details = editing?.details;

  function openEditor(webinar: Webinar | null) {
    setEditing(webinar);
    setBanner(webinar?.details.bannerImage ?? "");
    setBannerError("");
    setSaveError("");
    setFeedback("");
  }

  function selectBanner(file?: File) {
    if (!file) return;
    setBannerError("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 500_000 || !file.size) {
      setBannerError("Choose a PNG, JPG, or WebP image up to 500 KB.");
      return;
    }
    const reader = new FileReader();
    setReadingBanner(true);
    reader.onload = () => setBanner(String(reader.result));
    reader.onerror = () => setBannerError("Could not read the banner image. Try selecting it again.");
    reader.onloadend = () => setReadingBanner(false);
    reader.readAsDataURL(file);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || readingBanner) return;
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
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-lg">Webinar catalog</CardTitle>
        {editing === undefined && <Button onClick={() => openEditor(null)}>Create webinar</Button>}
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
                  disabled={saving || readingBanner}
                  onChange={(event) => {
                    selectBanner(event.currentTarget.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
                <Button asChild variant="outline" size="sm">
                  <label htmlFor="webinar-banner" className="cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:pointer-events-none peer-disabled:opacity-50">
                    <ImagePlus className="h-4 w-4" /> {banner ? "Replace banner" : "Choose banner"}
                  </label>
                </Button>
                {banner && (
                  <Button type="button" size="sm" variant="ghost" disabled={saving || readingBanner} onClick={() => { setBanner(""); setBannerError(""); }}>
                    <Trash2 className="h-4 w-4" /> Remove banner
                  </Button>
                )}
              </div>
              <p id="webinar-banner-hint" className="text-xs text-muted-foreground">Optional. A 16:9 PNG, JPG, or WebP up to 500 KB works well.</p>
              {readingBanner && <p role="status" className="text-sm">Loading preview…</p>}
              {bannerError && <p role="alert" className="text-sm text-destructive">{bannerError}</p>}
            </fieldset>
            <label className="block space-y-1 text-sm">Landing page summary<Input name="summary" required maxLength={240} defaultValue={editing?.excerpt} /></label>
            <label className="block space-y-1 text-sm">Description<Textarea name="description" required maxLength={3000} defaultValue={details?.description} /></label>
            <label className="block space-y-1 text-sm">Benefits, one per line<Textarea name="benefits" maxLength={2000} defaultValue={details?.benefits} /></label>
            <label className="block space-y-1 text-sm">Offers<Textarea name="offers" maxLength={2000} defaultValue={details?.offers} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">Starts in your time zone<Input type="datetime-local" name="start" required defaultValue={localInput(details ? new Date(details.start) : undefined)} /></label>
              <label className="block space-y-1 text-sm">Ends in your time zone<Input type="datetime-local" name="end" required defaultValue={localInput(details ? new Date(details.end) : undefined)} /></label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" value="publish" disabled={saving || readingBanner}>{editing?.isPublished ? "Update published webinar" : "Publish webinar"}</Button>
              <Button type="submit" variant="outline" disabled={saving || readingBanner}>{editing?.isPublished ? "Unpublish and save draft" : "Save draft"}</Button>
              <Button type="button" variant="ghost" disabled={saving || readingBanner} onClick={() => setEditing(undefined)}>Cancel</Button>
            </div>
            {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          </form>
        )}
        {feedback && <p role="status" className="text-sm">{feedback}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {loading && <p role="status" className="text-sm text-muted-foreground">Loading webinars…</p>}
        {!loading && !error && !data.length && editing === undefined && <p className="text-sm text-muted-foreground">No webinars yet.</p>}
        {data.map((webinar) => (
          <WebinarRow key={`${webinar.id}:${webinar.details.end}:${webinar.isPublished}`} webinar={webinar} disabled={saving || readingBanner} onEdit={() => openEditor(webinar)} />
        ))}
      </CardContent>
    </Card>
  );
}

function WebinarRow({ webinar, disabled, onEdit }: { webinar: Webinar; disabled: boolean; onEdit: () => void }) {
  const [invite, setInvite] = useState<Awaited<ReturnType<typeof createWebinarAttendeeLink>>>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const path = webinarPath(webinar.slug);
  const registrationUrl = new URL(useHref(path), window.location.origin).href;
  const schedule = { startsAt: new Date(webinar.details.start), endsAt: new Date(webinar.details.end) };
  const ended = schedule.endsAt.getTime() <= Date.now();

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
    <article className="space-y-3 border-t pt-4">
      <div>
        <h3 className="font-medium">{webinar.title}</h3>
        <p className="text-sm text-muted-foreground">{ended ? "Ended" : webinar.isPublished ? "Published" : "Draft"} · {localWebinarTime(schedule.startsAt)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={disabled} onClick={onEdit}>Edit</Button>
        <WebinarRegistrations webinar={webinar} />
        <Button size="sm" disabled={pending || ended} onClick={openRoom}>Start Jitsi webinar</Button>
        {webinar.isPublished && (
          <>
            <Button variant="outline" size="sm" disabled={pending || ended} onClick={generateLink}>Generate attendee link</Button>
            <Button variant="outline" size="sm" onClick={() => copy(registrationUrl, "Registration link")}>Copy registration link</Button>
            <Button variant="ghost" size="sm" asChild><Link to={path} target="_blank" rel="noopener noreferrer">Open registration</Link></Button>
            <Button variant="ghost" size="sm" asChild><a href={webinarCalendarUrl(schedule, registrationUrl, webinar.title)} target="_blank" rel="noopener noreferrer">Add to Google Calendar</a></Button>
          </>
        )}
      </div>
      {invite && (
        <div className="flex flex-wrap items-center gap-2">
          <Input className="max-w-md" aria-label="Attendee link" value={invite.url} readOnly onFocus={(event) => event.currentTarget.select()} />
          <Button size="sm" variant="outline" onClick={() => copy(invite.url, "Attendee link")}>Copy attendee link</Button>
          <span className="text-xs text-muted-foreground">Expires {localWebinarTime(new Date(invite.expiresAtUtc))}</span>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {pending && <p role="status" className="text-sm">Connecting to the webinar service…</p>}
      {feedback && <p role="status" className="text-sm">{feedback}</p>}
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
