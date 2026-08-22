import { useEffect, useMemo, useRef, useState } from "react";
import { Mail, Save, Sparkles } from "lucide-react";
import { RichTextEditor, type RichTextEditorHandle } from "@/components/RichTextEditor";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDate } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import {
  listEmailTemplates,
  updateEmailTemplate,
  previewEmailTemplate,
  type ApiEmailTemplate,
  type EmailTemplateCategory,
} from "@/api/emailTemplates";

const CATEGORY_ORDER: EmailTemplateCategory[] = [
  "BookingConfirmation",
  "SessionReminder",
  "DelayedSessionAlert",
  "NoShowAlert",
  "PerformanceSummary",
  "PayoutStatement",
  "LeaveStatusUpdate",
  "AttendanceUpdate",
  "PaymentReminder",
  "PaymentReceived",
  "FeeSuspension",
  "General",
];

const CATEGORY_LABEL: Record<EmailTemplateCategory, string> = {
  BookingConfirmation: "Booking Confirmation",
  SessionReminder: "Session Reminders",
  NoShowAlert: "No-Show Alerts",
  DelayedSessionAlert: "Delayed Session Alerts",
  PaymentReminder: "Payment Reminders",
  PaymentReceived: "Payment Received",
  FeeSuspension: "Fee Suspension",
  LeaveStatusUpdate: "Leave Status Updates",
  AttendanceUpdate: "Attendance Updates",
  PerformanceSummary: "Class Summaries",
  PayoutStatement: "Payout Statements",
  General: "General",
};

/** Inserts text at the current cursor position of a controlled input/textarea. */
function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  current: string,
  insert: string,
  onChange: (next: string) => void
) {
  if (!el) {
    onChange(current + insert);
    return;
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const next = current.slice(0, start) + insert + current.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + insert.length, start + insert.length);
  });
}

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<ApiEmailTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sampleTokens, setSampleTokens] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ subject: string; htmlBody: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const visualRef = useRef<RichTextEditorHandle>(null);
  const lastFocused = useRef<"subject" | "body" | "visual">("visual");

  async function reload(keepSelection = true) {
    if (!apiEnabled()) return;
    try {
      const items = await listEmailTemplates();
      setTemplates(items);
      setError(null);
      if (!keepSelection && items.length > 0) {
        setSelectedId(items[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load email templates.");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void reload(false);
  }, []);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    setSubject(selected.subject);
    setHtmlBody(selected.htmlBody);
    setIsActive(selected.isActive);
    setSampleTokens(Object.fromEntries(selected.placeholders.map((p) => [p, ""])));
    setPreview(null);
    setSavedAt(null);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced live preview: re-renders via the backend so it matches send-time output exactly.
  useEffect(() => {
    if (!selected) return;
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const result = await previewEmailTemplate(selected.id, sampleTokens);
        setPreview(result);
      } catch {
        setPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [selected, subject, htmlBody, sampleTokens]);

  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        items: templates.filter((t) => t.category === category),
      })).filter((g) => g.items.length > 0),
    [templates]
  );

  function insertPlaceholder(token: string) {
    const placeholder = `{{${token}}}`;
    if (lastFocused.current === "subject") {
      insertAtCursor(subjectRef.current, subject, placeholder, setSubject);
    } else if (lastFocused.current === "visual") {
      visualRef.current?.insertText(placeholder);
    } else {
      insertAtCursor(bodyRef.current, htmlBody, placeholder, setHtmlBody);
    }
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    try {
      await updateEmailTemplate(selected.id, { subject, htmlBody, isActive });
      await reload();
      setSavedAt(Date.now());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the template.");
    } finally {
      setBusy(false);
    }
  }

  if (!apiEnabled()) {
    return (
      <div>
        <PageHeader eyebrow="Communication" title="Email Templates" description="The Email Template Master for every automated system email." />
        <Card>
          <CardHeader>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>Templates are maintained in the database. Connect the API (VITE_API_BASE_URL) to manage them.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Communication"
        title="Email Templates"
        description="Design the Subject and HTML body every automated system email sends from — changes apply the next time that email fires."
      />

      {error && <p role="alert" className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">{error}</p>}

      {loaded && templates.length === 0 ? (
        <EmptyState icon={Mail} title="No email templates yet" description="Templates are seeded automatically when the API starts." />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
          <Card className="h-fit lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle className="text-base">All Templates</CardTitle>
              <CardDescription>{templates.length} system templates</CardDescription>
            </CardHeader>
            <CardContent className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
              {grouped.map((group) => (
                <div key={group.category}>
                  <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {CATEGORY_LABEL[group.category]}
                  </p>
                  <div className="flex flex-col gap-1">
                    {group.items.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedId(t.id)}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          t.id === selectedId ? "bg-primary/10 font-semibold text-primary" : "text-foreground hover:bg-muted/60"
                        )}
                      >
                        <span className="truncate">{t.name}</span>
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", t.isActive ? "bg-success" : "bg-muted-foreground/40")} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {selected ? (
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {selected.name}
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {selected.key}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{selected.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="template-active" className="text-xs text-muted-foreground">
                    Active
                  </Label>
                  <Switch id="template-active" checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {selected.placeholders.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-muted/40 p-2.5">
                    <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      <Sparkles className="h-3 w-3" /> Insert:
                    </span>
                    {selected.placeholders.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => insertPlaceholder(p)}
                        className="rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[11px] text-foreground hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {`{{${p}}}`}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid gap-1.5">
                  <Label>Subject</Label>
                  <Input
                    ref={subjectRef}
                    value={subject}
                    onFocus={() => (lastFocused.current = "subject")}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <Tabs defaultValue="visual">
                  <TabsList>
                    <TabsTrigger value="visual">Visual Edit</TabsTrigger>
                    <TabsTrigger value="edit">Edit HTML</TabsTrigger>
                    <TabsTrigger value="preview">Preview{previewLoading && "…"}</TabsTrigger>
                    <TabsTrigger value="sample">Sample Data</TabsTrigger>
                  </TabsList>

                  <TabsContent value="visual">
                    <RichTextEditor
                      ref={visualRef}
                      value={htmlBody}
                      onChange={setHtmlBody}
                      onFocus={() => (lastFocused.current = "visual")}
                      minHeight={360}
                    />
                  </TabsContent>

                  <TabsContent value="edit">
                    <Textarea
                      ref={bodyRef}
                      value={htmlBody}
                      onFocus={() => (lastFocused.current = "body")}
                      onChange={(e) => setHtmlBody(e.target.value)}
                      className="min-h-[360px] font-mono text-xs"
                      spellCheck={false}
                    />
                  </TabsContent>

                  <TabsContent value="preview">
                    <div className="overflow-hidden rounded-lg border border-border">
                      <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs">
                        <span className="text-muted-foreground">Subject: </span>
                        <span className="font-medium">{preview?.subject ?? subject}</span>
                      </div>
                      <iframe
                        title="Email preview"
                        srcDoc={preview?.htmlBody ?? ""}
                        sandbox=""
                        className="h-[380px] w-full bg-white"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="sample">
                    <p className="mb-3 text-xs text-muted-foreground">
                      Sample values used only for the Preview tab — they are never sent in a real email.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {selected.placeholders.map((p) => (
                        <div key={p} className="grid gap-1">
                          <Label className="font-mono text-[11px]">{p}</Label>
                          <Input
                            value={sampleTokens[p] ?? ""}
                            placeholder={`[${p}]`}
                            onChange={(e) => setSampleTokens((prev) => ({ ...prev, [p]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">
                    {savedAt
                      ? "Saved just now."
                      : selected.updatedAtUtc
                        ? `Last updated ${formatDate(selected.updatedAtUtc)}`
                        : "Not edited since it was seeded."}
                  </p>
                  <Button onClick={save} disabled={busy}>
                    <Save className="h-3.5 w-3.5" /> Save Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState icon={Mail} title="Select a template" description="Pick a template from the list to edit its subject and HTML body." />
          )}
        </div>
      )}
    </div>
  );
}
