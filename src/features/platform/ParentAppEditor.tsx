import { useState } from "react";
import { Smartphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { platformRequest } from "@/api/platform";

/** Settings this editor owns (hidden from the generic rows). All are read by the mobile app via GET /api/app/config. */
export const APP_EDITOR_KEYS = new Set(["app.webBaseUrl", "app.announcement", "org.supportEmail", "org.supportPhone"]);

/** Defaults for keys a client has never saved. Not public: only a signed-in family reads them, through the app config endpoint. */
export const APP_DEFAULTS: Record<string, string> = { "app.webBaseUrl": "", "app.announcement": "" };

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

  async function toggle(next: boolean) {
    setBusy(true); setError("");
    try { await platformRequest<void>(`/tenants/${tenantId}/app-access`, token, "PUT", { granted: next }); onGrantedChange(next); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not change app access."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6 p-5">
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
      <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="app-announcement">Announcement</Label>
        <Textarea id="app-announcement" disabled={disabled} rows={3} maxLength={500} placeholder="A short message shown at the top of the app, e.g. Classes are off on Friday." value={values["app.announcement"] ?? ""} onChange={e => set("app.announcement", e.target.value)} />
        <p className="text-xs text-muted-foreground">Leave empty to show nothing. The app's name, logo and colours come from the Branding tab.</p></div>
    </div>
  </div>;
}
