import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ColorField, FontField, LogoField, isHex } from "@/components/BrandingFields";
import { DEFAULT_BODY_FONT, DEFAULT_HEADING_FONT } from "@/lib/branding";
import { removeTenantLogoAsOperator, uploadTenantLogoAsOperator } from "@/api/branding";

/** Settings keys this editor owns; the generic key/value rows hide them so nothing is edited twice. */
export const BRAND_EDITOR_KEYS = new Set([
  "brand.name", "brand.logoUrl", "brand.logoFile", "brand.primaryColor", "brand.accentColor", "brand.fontFamily", "brand.headingFont",
]);

/** Defaults shown for branding keys a client has never saved (created on first save). */
export const BRAND_DEFAULTS: Record<string, string> = {
  "brand.fontFamily": DEFAULT_BODY_FONT,
  "brand.headingFont": DEFAULT_HEADING_FONT,
};

/**
 * Operator-side branding for one client: name, logo, colours and typefaces, with a live preview.
 * Edits go through the page's normal draft/Save flow, except the logo, which is uploaded straight away
 * (it is a file, not a value) and reported back through onLogoChanged.
 */
export default function BrandingEditor({ values, set, disabled, tenantId, token, onLogoChanged }: {
  values: Record<string, string>; set: (key: string, value: string) => void; disabled: boolean;
  tenantId: string; token: string; onLogoChanged: (url: string) => void;
}) {
  const primary = isHex(values["brand.primaryColor"]) ? values["brand.primaryColor"] : "#1E3A5F";
  const accent = isHex(values["brand.accentColor"]) ? values["brand.accentColor"] : "#E63329";
  const body = values["brand.fontFamily"] || DEFAULT_BODY_FONT;
  const heading = values["brand.headingFont"] || DEFAULT_HEADING_FONT;
  const logo = values["brand.logoUrl"] ?? "";
  const name = values["brand.name"] || "Your academy";

  return <div className="space-y-6 p-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-1.5"><Label htmlFor="op-brand-name">Brand name</Label>
        <Input id="op-brand-name" disabled={disabled} maxLength={100} value={values["brand.name"] ?? ""} onChange={e => set("brand.name", e.target.value)} />
        <p className="text-xs text-muted-foreground">Shown in the browser tab, the sidebar and sign-in page.</p></div>
    </div>

    <LogoField logoUrl={logo} disabled={disabled}
      onUpload={async file => { onLogoChanged((await uploadTenantLogoAsOperator(token, tenantId, file)).logoUrl); }}
      onRemove={async () => { await removeTenantLogoAsOperator(token, tenantId); onLogoChanged(""); }} />
    <div className="grid gap-1.5 sm:max-w-xl"><Label htmlFor="op-brand-logo-url">Or use a logo from a web address</Label>
      <Input id="op-brand-logo-url" disabled={disabled} maxLength={2000} placeholder="https://cdn.example.com/logo.png" value={logo} onChange={e => set("brand.logoUrl", e.target.value)} />
      <p className="text-xs text-muted-foreground">Uploading a file above fills this in automatically. Leave it empty to use the built-in mark.</p></div>

    <Separator />
    <div className="grid gap-6 sm:grid-cols-2">
      <ColorField id="op-brand-primary" label="Primary colour" disabled={disabled} value={values["brand.primaryColor"] ?? ""} onChange={hex => set("brand.primaryColor", hex)} />
      <ColorField id="op-brand-accent" label="Accent colour" disabled={disabled} value={values["brand.accentColor"] ?? ""} onChange={hex => set("brand.accentColor", hex)} />
    </div>

    <Separator />
    <div className="grid gap-6 sm:grid-cols-2">
      <FontField id="op-brand-font" label="Body font" disabled={disabled} value={body} sample="The quick brown fox jumps over the lazy dog" onChange={f => set("brand.fontFamily", f)} />
      <FontField id="op-brand-heading" label="Heading font" disabled={disabled} value={heading} sample="Welcome back to class" onChange={f => set("brand.headingFont", f)} />
    </div>

    <div className="rounded-xl border border-border p-4" aria-label="Brand preview">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live preview</p>
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: primary }}>
          <img src={logo || "/logo-icon.png"} alt="" className="h-8 w-8 rounded bg-white/90 object-contain p-0.5" />
          <span className="text-lg font-semibold" style={{ fontFamily: `"${heading}", system-ui, sans-serif` }}>{name}</span>
        </div>
        <div className="space-y-3 p-4" style={{ fontFamily: `"${body}", system-ui, sans-serif` }}>
          <h4 className="text-xl font-bold" style={{ fontFamily: `"${heading}", system-ui, sans-serif` }}>Good morning, parents</h4>
          <p className="text-sm text-muted-foreground">Your child's next class starts at 4:30 PM. Open the classroom to join.</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: primary }}>Join class</span>
            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${accent}1A`, color: accent }}>New resource</span>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
