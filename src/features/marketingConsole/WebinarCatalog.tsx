import { useState, type FormEvent } from "react";
import { Link, useHref } from "react-router-dom";
import { createWebinarAttendeeLink, listManagedWebinars, saveWebinar, startWebinar, type Webinar } from "@/api/webinars";
import { useApiData } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const details = editing?.details;

  function openEditor(webinar: Webinar | null) {
    setEditing(webinar);
    setSaveError("");
    setFeedback("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
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
        start: start.toISOString(), end: end.toISOString(), isPublished: publish,
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
            <label className="block space-y-1 text-sm">Landing page summary<Input name="summary" required maxLength={240} defaultValue={editing?.excerpt} /></label>
            <label className="block space-y-1 text-sm">Description<Textarea name="description" required maxLength={3000} defaultValue={details?.description} /></label>
            <label className="block space-y-1 text-sm">Benefits, one per line<Textarea name="benefits" maxLength={2000} defaultValue={details?.benefits} /></label>
            <label className="block space-y-1 text-sm">Offers<Textarea name="offers" maxLength={2000} defaultValue={details?.offers} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">Starts in your time zone<Input type="datetime-local" name="start" required defaultValue={localInput(details ? new Date(details.start) : undefined)} /></label>
              <label className="block space-y-1 text-sm">Ends in your time zone<Input type="datetime-local" name="end" required defaultValue={localInput(details ? new Date(details.end) : undefined)} /></label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" value="publish" disabled={saving}>{editing?.isPublished ? "Update published webinar" : "Publish webinar"}</Button>
              <Button type="submit" variant="outline" disabled={saving}>{editing?.isPublished ? "Unpublish and save draft" : "Save draft"}</Button>
              <Button type="button" variant="ghost" disabled={saving} onClick={() => setEditing(undefined)}>Cancel</Button>
            </div>
            {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          </form>
        )}
        {feedback && <p role="status" className="text-sm">{feedback}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {loading && <p role="status" className="text-sm text-muted-foreground">Loading webinars…</p>}
        {!loading && !error && !data.length && editing === undefined && <p className="text-sm text-muted-foreground">No webinars yet.</p>}
        {data.map((webinar) => (
          <WebinarRow key={`${webinar.id}:${webinar.details.end}:${webinar.isPublished}`} webinar={webinar} disabled={saving} onEdit={() => openEditor(webinar)} />
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
