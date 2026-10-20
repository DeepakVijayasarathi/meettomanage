import { useEffect, useRef, useState } from "react";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND_FONTS, loadBrandFont } from "@/lib/branding";
import { CHART_PALETTE } from "@/lib/roles";
import { LOGO_ACCEPT, checkLogoFile } from "@/api/branding";
import { cn } from "@/lib/utils";

/** Field components shared by the client's Settings -> Branding tab and the operator's Tenant configuration. */

export const isHex = (value: string | undefined): value is string => !!value && /^#[0-9a-fA-F]{6}$/.test(value);

export function ColorField({ id, label, value, onChange, disabled }: { id: string; label: string; value: string; onChange: (hex: string) => void; disabled?: boolean }) {
  const valid = isHex(value);
  return <div>
    <Label htmlFor={id}>{label}</Label>
    <div className="mt-2 flex items-center gap-2">
      <input id={id} type="color" aria-label={`${label} picker`} disabled={disabled} value={valid ? value : "#000000"} onChange={e => onChange(e.target.value.toUpperCase())}
        className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background disabled:cursor-not-allowed" />
      <Input aria-label={`${label} hex code`} disabled={disabled} value={value} maxLength={7} placeholder="#1E3A5F" aria-invalid={!valid}
        onChange={e => onChange(e.target.value.startsWith("#") || e.target.value === "" ? e.target.value : `#${e.target.value}`)} className={cn("w-32 font-mono text-sm", !valid && "border-destructive")} />
    </div>
    {!valid && <p className="mt-1 text-xs text-destructive">Use a 6-digit hex code like #1E3A5F.</p>}
    <div className="mt-3 flex flex-wrap gap-2">
      {CHART_PALETTE.map(hex => <button key={hex} type="button" disabled={disabled} onClick={() => onChange(hex.toUpperCase())}
        className={cn("h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
          value.toUpperCase() === hex.toUpperCase() ? "border-foreground" : "border-transparent")}
        style={{ backgroundColor: hex }} aria-label={`Use ${hex} for ${label}`} />)}
    </div>
  </div>;
}

export function FontField({ id, label, value, onChange, sample, disabled }: { id: string; label: string; value: string; onChange: (name: string) => void; sample: string; disabled?: boolean }) {
  useEffect(() => { if ((BRAND_FONTS as readonly string[]).includes(value)) loadBrandFont(value); }, [value]);
  return <div className="grid gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <select id={id} disabled={disabled} value={value} onChange={e => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
      {BRAND_FONTS.map(name => <option key={name} value={name}>{name}</option>)}
    </select>
    <p className="truncate rounded-md bg-muted/50 px-3 py-2 text-base" style={{ fontFamily: `"${value}", system-ui, sans-serif` }}>{sample}</p>
  </div>;
}

/** Logo preview with upload / remove. The upload itself is supplied by the caller (tenant or operator endpoint). */
export function LogoField({ logoUrl, onUpload, onRemove, disabled, fallbackSrc = "/logo-icon.png" }: {
  logoUrl: string; onUpload: (file: File) => Promise<void>; onRemove: () => Promise<void>; disabled?: boolean; fallbackSrc?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [logoUrl]);

  async function pick(file: File | undefined) {
    if (!file) return;
    const problem = checkLogoFile(file);
    if (problem) { setError(problem); return; }
    setBusy(true); setError("");
    try { await onUpload(file); }
    catch (err) { setError(err instanceof Error ? err.message : "The logo could not be uploaded."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  async function remove() {
    setBusy(true); setError("");
    try { await onRemove(); } catch (err) { setError(err instanceof Error ? err.message : "The logo could not be removed."); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-wrap items-center gap-5">
    <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-2">
      <img src={!logoUrl || broken ? fallbackSrc : logoUrl} alt="Brand logo preview" onError={() => setBroken(true)} className="h-full w-full object-contain" />
    </div>
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">Logo</p>
      <p className="text-xs text-muted-foreground">PNG, JPG or WebP up to 1 MB. A square image with a transparent background works best.</p>
      <div className="flex flex-wrap gap-2">
        <input ref={input} type="file" accept={LOGO_ACCEPT} className="sr-only" aria-label="Upload logo file" tabIndex={-1} onChange={e => { void pick(e.target.files?.[0]); }} />
        <Button type="button" size="sm" variant="outline" disabled={disabled || busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <ImageUp />}{logoUrl ? "Replace logo" : "Upload logo"}</Button>
        {logoUrl && <Button type="button" size="sm" variant="ghost" disabled={disabled || busy} onClick={() => { void remove(); }}><Trash2 />Remove</Button>}
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  </div>;
}
