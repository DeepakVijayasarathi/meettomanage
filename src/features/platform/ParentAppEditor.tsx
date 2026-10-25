import { useState } from "react";
import { AlertTriangle, CheckCircle2, Circle, Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { platformRequest } from "@/api/platform";
import ParentAppStatus from "./ParentAppStatus";

/** Settings this editor owns (hidden from the generic rows). All are read by the mobile app via GET /api/app/config. */
export const APP_EDITOR_KEYS = new Set(["app.webBaseUrl", "app.announcement", "app.joinOpensMinutesBefore", "org.supportEmail", "org.supportPhone",
  "app.welcome.enabled", "app.welcome.title", "app.welcome.subtitle", "app.welcome.features", "app.maintenance.enabled", "app.maintenance.message",
  "app.maintenance.startsAtUtc", "app.maintenance.endsAtUtc", "app.minimumVersion", "app.forceUpgrade", "app.quickActions",
  "app.features.classes", "app.features.fees", "app.features.updates", "app.features.reports", "app.features.resources", "app.features.recordings",
  "app.features.enrollment", "app.features.support", "app.features.feedback"]);

/** Defaults for keys a client has never saved. Not public: only a signed-in family reads them, through the app config endpoint. */
export const APP_DEFAULTS: Record<string, string> = { "app.webBaseUrl": "", "app.announcement": "", "app.joinOpensMinutesBefore": "10",
  "app.welcome.enabled": "true", "app.welcome.title": "", "app.welcome.subtitle": "", "app.welcome.features": "" };
Object.assign(APP_DEFAULTS, {
  "app.maintenance.enabled": "false", "app.maintenance.message": "", "app.maintenance.startsAtUtc": "", "app.maintenance.endsAtUtc": "",
  "app.minimumVersion": "", "app.forceUpgrade": "false", "app.quickActions": "reports,resources,recordings,support",
  ...Object.fromEntries(["classes", "fees", "updates", "reports", "resources", "recordings", "enrollment", "support", "feedback"].map(x => [`app.features.${x}`, "true"])),
});

const isHttp = (value: string) => { try { const u = new URL(value); return u.protocol === "https:" || u.protocol === "http:"; } catch { return false; } };

/**
 * Operator-side setup of the mobile parent app for one client. The app itself ships with a single API address; the
 * access switch and every value here are read by the app after sign-in, so changing them needs no app release.
 * The switch saves immediately (it is a tenant flag, not a setting); the fields use the page's normal Save.
 */
export default function ParentAppEditor({ values, set, disabled, tenantId, token, granted, onGrantedChange }: {
  values: Record<string, string>; set: (key: string, value: string) => void; disabled: boolean;
  tenantId: string; token: string; granted: boolean; onGrantedChange: (granted: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const web = values["app.webBaseUrl"] ?? "";
  const webInvalid = web.trim() !== "" && !isHttp(web.trim());
  const readiness = [
    { label: "Family access", ready: granted, detail: granted ? "Enabled" : "App sign-in is blocked" },
    { label: "Brand identity", ready: !!(values["brand.name"]?.trim() || values["brand.logoUrl"]?.trim()), detail: "Name or logo configured" },
    { label: "Web portal", ready: web.trim() === "" || !webInvalid, detail: web.trim() ? "Custom portal configured" : "Using server default" },
    { label: "Support contact", ready: !!(values["org.supportEmail"]?.trim() || values["org.supportPhone"]?.trim()), detail: "Email or phone configured" },
    { label: "Welcome experience", ready: values["app.welcome.enabled"] === "false" || !!(values["app.welcome.title"]?.trim() || values["app.welcome.features"]?.trim()), detail: values["app.welcome.enabled"] === "false" ? "Disabled intentionally" : "Content ready" },
  ];
  const readyCount = readiness.filter(x => x.ready).length;
  const readinessPercent = Math.round(readyCount / readiness.length * 100);

  async function toggle(next: boolean) {
    setBusy(true); setError("");
    try { await platformRequest<void>(`/tenants/${tenantId}/app-access`, token, "PUT", { granted: next }); onGrantedChange(next); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not change app access."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6 p-5">
    <ParentAppStatus tenantId={tenantId} token={token} />
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" aria-labelledby="app-readiness-title">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-gradient-to-r from-primary/10 via-background to-secondary/40 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h3 id="app-readiness-title" className="font-semibold">Mobile app readiness</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Configuration health for this tenant. Runtime usage monitoring is tracked separately in the implementation TODO.</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${readinessPercent === 100 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
          {readyCount}/{readiness.length} ready · {readinessPercent}%
        </div>
      </div>
      <div className="h-1.5 bg-muted"><div className={`h-full transition-all ${readinessPercent === 100 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${readinessPercent}%` }} /></div>
      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">
        {readiness.map(item => <div key={item.label} className="bg-card p-4">
          <div className="flex items-center gap-2">
            {item.ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
            <span className="text-sm font-semibold">{item.label}</span>
          </div>
          <p className="mt-1 pl-6 text-xs text-muted-foreground">{item.detail}</p>
        </div>)}
      </div>
      {!granted && <div className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-5 py-3 text-xs font-medium text-amber-900"><Circle className="h-3 w-3 fill-current" /> Families cannot use the mobile app until access is enabled.</div>}
    </section>

    <div className="flex items-start gap-4 rounded-xl border border-border bg-muted/30 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Smartphone className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Label htmlFor="app-access" className="text-sm font-semibold">Mobile app access</Label>
            <p className="mt-0.5 text-xs text-muted-foreground">When off, this client's families cannot sign in to or use the parent app. The website is not affected.</p>
          </div>
          <Switch id="app-access" checked={granted} disabled={disabled || busy} onCheckedChange={v => { void toggle(v); }} aria-label="Mobile app access granted" />
        </div>
        <p className="mt-2 text-xs font-medium" aria-live="polite">{granted ? "Access granted" : "Access not granted"}</p>
        {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    </div>

    <div className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><Label htmlFor="maintenance-enabled" className="font-semibold">Maintenance mode</Label><p className="mt-0.5 text-xs text-muted-foreground">Temporarily blocks the signed-in app during the optional UTC schedule.</p></div><Switch id="maintenance-enabled" checked={values["app.maintenance.enabled"] === "true"} disabled={disabled} onCheckedChange={v => set("app.maintenance.enabled", String(v))} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="maintenance-message">Message</Label><Input id="maintenance-message" maxLength={240} disabled={disabled} placeholder="We're improving the app. Please try again shortly." value={values["app.maintenance.message"] ?? ""} onChange={e => set("app.maintenance.message", e.target.value)} /></div>
        <div className="grid gap-1.5"><Label htmlFor="maintenance-start">Starts at (UTC)</Label><Input id="maintenance-start" type="datetime-local" disabled={disabled} value={values["app.maintenance.startsAtUtc"]?.replace("Z", "") ?? ""} onChange={e => set("app.maintenance.startsAtUtc", e.target.value ? `${e.target.value}Z` : "")} /></div>
        <div className="grid gap-1.5"><Label htmlFor="maintenance-end">Ends at (UTC)</Label><Input id="maintenance-end" type="datetime-local" disabled={disabled} value={values["app.maintenance.endsAtUtc"]?.replace("Z", "") ?? ""} onChange={e => set("app.maintenance.endsAtUtc", e.target.value ? `${e.target.value}Z` : "")} /></div>
      </div>
    </div>

    <div className="space-y-4 rounded-xl border border-border p-4">
      <div><Label className="font-semibold">Release controls</Label><p className="mt-0.5 text-xs text-muted-foreground">Warn or block older builds without changing the published app.</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-1.5"><Label htmlFor="minimum-version">Minimum app version</Label><Input id="minimum-version" disabled={disabled} placeholder="1.2.0" value={values["app.minimumVersion"] ?? ""} onChange={e => set("app.minimumVersion", e.target.value)} /></div><div className="flex items-center justify-between rounded-lg bg-muted/40 p-3"><div><Label htmlFor="force-upgrade">Force upgrade</Label><p className="text-xs text-muted-foreground">Block versions below the minimum.</p></div><Switch id="force-upgrade" checked={values["app.forceUpgrade"] === "true"} disabled={disabled} onCheckedChange={v => set("app.forceUpgrade", String(v))} /></div></div>
      <div className="grid gap-1.5"><Label htmlFor="quick-actions">Home quick actions</Label><Input id="quick-actions" disabled={disabled} value={values["app.quickActions"] ?? ""} onChange={e => set("app.quickActions", e.target.value)} /><p className="text-xs text-muted-foreground">Comma-separated: reports, resources, recordings, support.</p></div>
    </div>

    <div className="space-y-4 rounded-xl border border-border p-4"><div><Label className="font-semibold">Mobile features</Label><p className="mt-0.5 text-xs text-muted-foreground">Hidden features disappear from navigation immediately after configuration refresh.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{["classes", "fees", "updates", "reports", "resources", "recordings", "enrollment", "support", "feedback"].map(feature => <label key={feature} className="flex items-center justify-between rounded-lg border p-3 text-sm font-medium capitalize"><span>{feature}</span><Switch checked={values[`app.features.${feature}`] !== "false"} disabled={disabled} onCheckedChange={v => set(`app.features.${feature}`, String(v))} /></label>)}</div></div>

    <p className="text-sm text-muted-foreground">The app is built with one API address only. Everything below is read from here after a family signs in, so you can change it at any time without publishing a new app.</p>

    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="app-web">Web portal address</Label>
        <Input id="app-web" disabled={disabled} maxLength={300} placeholder="https://app.example.com (empty = the server's default)" value={web} aria-invalid={webInvalid}
          onChange={e => set("app.webBaseUrl", e.target.value)} className={webInvalid ? "border-destructive" : ""} />
        <p className={`text-xs ${webInvalid ? "text-destructive" : "text-muted-foreground"}`}>{webInvalid ? "Use a full address starting with https://" : "Where the app opens payments, adding a child and other website pages."}</p></div>
      <div className="grid gap-1.5"><Label htmlFor="app-support-email">Support email</Label>
        <Input id="app-support-email" type="email" disabled={disabled} maxLength={200} value={values["org.supportEmail"] ?? ""} onChange={e => set("org.supportEmail", e.target.value)} /></div>
      <div className="grid gap-1.5"><Label htmlFor="app-support-phone">Support phone</Label>
        <Input id="app-support-phone" disabled={disabled} maxLength={40} value={values["org.supportPhone"] ?? ""} onChange={e => set("org.supportPhone", e.target.value)} /></div>
      <div className="grid gap-1.5"><Label htmlFor="app-join-opens">Join Class opens (minutes before start)</Label>
        <Input id="app-join-opens" type="number" min={0} max={1440} disabled={disabled} value={values["app.joinOpensMinutesBefore"] ?? "10"} onChange={e => set("app.joinOpensMinutesBefore", e.target.value)} />
        <p className="text-xs text-muted-foreground">The app enables Join Class this many minutes before a class starts. Default 10.</p></div>
      <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="app-announcement">Announcement</Label>
        <Textarea id="app-announcement" disabled={disabled} rows={3} maxLength={500} placeholder="A short message shown at the top of the app, e.g. Classes are off on Friday." value={values["app.announcement"] ?? ""} onChange={e => set("app.announcement", e.target.value)} />
        <p className="text-xs text-muted-foreground">Leave empty to show nothing. The app's name, logo and colours come from the Branding tab.</p></div>
    </div>

    <div className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Label htmlFor="app-welcome-enabled" className="text-sm font-semibold">Welcome tour</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">A short, swipeable introduction families see once, the first time they open the app. It uses this client's logo and colours from the Branding tab.</p>
        </div>
        <Switch id="app-welcome-enabled" checked={values["app.welcome.enabled"] !== "false"} disabled={disabled} onCheckedChange={v => set("app.welcome.enabled", v ? "true" : "false")} aria-label="Show the welcome tour" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5"><Label htmlFor="app-welcome-title">Welcome title</Label>
          <Input id="app-welcome-title" disabled={disabled} maxLength={80} placeholder="Welcome to {name}" value={values["app.welcome.title"] ?? ""} onChange={e => set("app.welcome.title", e.target.value)} />
          <p className="text-xs text-muted-foreground">Empty uses "Welcome to" plus the brand name.</p></div>
        <div className="grid gap-1.5"><Label htmlFor="app-welcome-subtitle">Welcome subtitle</Label>
          <Input id="app-welcome-subtitle" disabled={disabled} maxLength={160} placeholder="Classes, progress and fees for your family, all in one place." value={values["app.welcome.subtitle"] ?? ""} onChange={e => set("app.welcome.subtitle", e.target.value)} /></div>
        <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="app-welcome-features">Features and overview</Label>
          <Textarea id="app-welcome-features" disabled={disabled} rows={6} className="font-mono text-xs" placeholder={"Live classes | Join your child's class with one tap.\nProgress reports | See how your child is doing after every term.\nFees & payments | View invoices and pay securely."} value={values["app.welcome.features"] ?? ""} onChange={e => set("app.welcome.features", e.target.value)} />
          <p className="text-xs text-muted-foreground">One feature per line as <code>Title | Description</code>, up to 6. Empty uses the standard feature list.</p></div>
      </div>
    </div>
  </div>;
}
