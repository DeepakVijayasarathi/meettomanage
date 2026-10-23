import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Shared building blocks for the Tenant Admin console. Everything reads the theme tokens (see "Atelier Light" in
 * index.css), so there are no hard-coded colours here.
 */

export const inputClass = "w-full rounded-lg border border-input bg-card px-3.5 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground/70 read-only:bg-muted/50 read-only:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15";
export const labelClass = "space-y-1.5 text-sm font-medium text-foreground";
export const smallButton = "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50";
export const primaryButton = "inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60";
export const panel = "rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(31,41,55,0.04)]";
export const th = "px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em]";
export const td = "px-5 py-4";
export const tableHead = "border-b border-border bg-muted/40 text-muted-foreground";

/** Page title block: small brass eyebrow, serif title, quiet description, optional actions, hairline underneath. */
export function ConsoleHeader({ eyebrow = "Platform", title, description, actions, className = "" }: {
  eyebrow?: string; title: string; description?: string; actions?: ReactNode; className?: string;
}) {
  return <header className={`flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between ${className}`}>
    <div className="min-w-0">
      {eyebrow && <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[hsl(var(--console-brass))]"><span className="h-px w-6 bg-[hsl(var(--console-brass))]" />{eyebrow}</p>}
      <h1 className="console-heading text-[28px] font-bold leading-tight text-foreground">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>;
}

/** Back-compat alias used by the billing pages. */
export function Hero({ title, text }: { title: string; text: string }) {
  return <ConsoleHeader title={title} description={text} />;
}

/** A single bordered strip of figures separated by hairlines, the classic alternative to a row of big cards. */
export function StatStrip({ items }: { items: { label: string; value: ReactNode; hint?: string; tone?: "default" | "good" | "warn" | "bad" }[] }) {
  const tone = { default: "text-foreground", good: "text-success", warn: "text-amber-700", bad: "text-destructive" } as const;
  return <dl className={`${panel} grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x [&>div:nth-child(n+3)]:border-t [&>div:nth-child(n+3)]:border-border sm:[&>div:nth-child(n+3)]:border-t-0`}>
    {items.map(item => <div key={item.label} className="px-6 py-5">
      <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
      <dd className={`console-heading mt-1.5 text-3xl font-semibold ${tone[item.tone ?? "default"]}`}>{item.value}</dd>
      {item.hint && <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>}
    </div>)}
  </dl>;
}

export function StatCard({ label, value, hint, tone = "text-foreground" }: { label: string; value: ReactNode; hint?: string; tone?: string }) {
  return <div className={`${panel} p-5`}>
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <p className={`console-heading mt-1.5 text-3xl font-semibold ${tone}`}>{value}</p>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>;
}

const pillTone: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-800 ring-emerald-600/20", Paid: "bg-emerald-50 text-emerald-800 ring-emerald-600/20", Sent: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  Trialing: "bg-sky-50 text-sky-800 ring-sky-600/20", Open: "bg-sky-50 text-sky-800 ring-sky-600/20", Pending: "bg-sky-50 text-sky-800 ring-sky-600/20", Provisioning: "bg-sky-50 text-sky-800 ring-sky-600/20",
  PastDue: "bg-amber-50 text-amber-800 ring-amber-600/25", Skipped: "bg-amber-50 text-amber-800 ring-amber-600/25", Overdue: "bg-amber-50 text-amber-800 ring-amber-600/25",
  Suspended: "bg-orange-50 text-orange-800 ring-orange-600/25",
  Expired: "bg-red-50 text-red-700 ring-red-600/20", Failed: "bg-red-50 text-red-700 ring-red-600/20",
  Void: "bg-stone-100 text-stone-600 ring-stone-500/20", Cancelled: "bg-stone-100 text-stone-600 ring-stone-500/20",
};
export function Pill({ value, label }: { value: string; label?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${pillTone[value] ?? "bg-stone-100 text-stone-700 ring-stone-500/20"}`}>{label ?? value.replace(/([a-z])([A-Z])/g, "$1 $2")}</span>;
}

export function Notices({ error, notice }: { error: string; notice: string }) {
  return <>
    {error && <p role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
    {notice && <p role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</p>}
  </>;
}

/** Loads data once and again on demand; errors surface through the returned message. */
export function useLoader<T>(load: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try { setData(await load()); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load data."); }
    finally { setLoaded(true); }
  }, [load]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, loaded, error, reload, setError };
}

/** Underlined tabs: the classic pattern, quieter than filled pills. */
export function TabBar<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return <div role="tablist" className="flex gap-6 border-b border-border">
    {tabs.map(tab => <button key={tab.id} role="tab" aria-selected={value === tab.id} onClick={() => onChange(tab.id)}
      className={`-mb-px border-b-2 px-0.5 pb-3 pt-1 text-sm font-medium transition ${value === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{tab.label}</button>)}
  </div>;
}

/** Segmented control for short filters (All / Active / ...). */
export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return <div role="group" aria-label={label} className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
    {options.map(option => <button key={option.id} type="button" aria-pressed={value === option.id} onClick={() => onChange(option.id)}
      className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${value === option.id ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}>{option.label}</button>)}
  </div>;
}

export function describeLimit(value: number, unit: string): string {
  if (value === -1) return "Unlimited";
  if (unit === "MB" && value >= 1024) return `${(value / 1024).toLocaleString("en-IN", { maximumFractionDigits: 1 })} GB`;
  return `${value.toLocaleString("en-IN")} ${unit}`.trim();
}
