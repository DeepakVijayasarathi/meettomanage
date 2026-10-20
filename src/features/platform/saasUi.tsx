import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

/** Shared look for the platform billing pages: matches the operator console's navy/sky style. */

export const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm shadow-sm outline-none transition placeholder:text-slate-400 read-only:bg-slate-50 read-only:text-slate-500 focus:border-primary focus:ring-4 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5";
export const labelClass = "space-y-1.5 text-sm font-medium text-slate-700 dark:text-foreground";
export const smallButton = "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-foreground";
export const primaryButton = "inline-flex items-center gap-2 rounded-xl bg-[hsl(214_52%_20%)] px-5 py-2.5 text-sm font-semibold text-white shadow-md ring-1 ring-white/15 transition hover:bg-[hsl(214_52%_28%)] disabled:opacity-60";
export const panel = "rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-card";
export const th = "px-4 py-3 font-semibold";
export const td = "px-4 py-3";

export function Hero({ title, text }: { title: string; text: string }) {
  return <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(214_52%_20%)] via-[hsl(214_52%_28%)] to-[hsl(214_52%_20%)] p-7 text-white shadow-lg sm:p-9">
    <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
    <h1 className="relative font-serif text-3xl font-semibold tracking-tight">{title}</h1>
    <p className="relative mt-2 max-w-2xl text-sm leading-relaxed text-white/70">{text}</p>
  </div>;
}

export function StatCard({ label, value, hint, tone = "text-slate-900 dark:text-foreground" }: { label: string; value: ReactNode; hint?: string; tone?: string }) {
  return <div className={`${panel} p-5`}>
    <span className="text-sm text-slate-500">{label}</span>
    <p className={`mt-2 font-serif text-3xl font-semibold ${tone}`}>{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>;
}

const pillTone: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", Paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", Sent: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Trialing: "bg-blue-50 text-blue-700 ring-blue-600/20", Open: "bg-blue-50 text-blue-700 ring-blue-600/20", Pending: "bg-blue-50 text-blue-700 ring-blue-600/20",
  PastDue: "bg-amber-50 text-amber-800 ring-amber-600/20", Skipped: "bg-amber-50 text-amber-800 ring-amber-600/20", Overdue: "bg-amber-50 text-amber-800 ring-amber-600/20",
  Suspended: "bg-red-50 text-red-700 ring-red-600/20", Expired: "bg-red-50 text-red-700 ring-red-600/20", Failed: "bg-red-50 text-red-700 ring-red-600/20", Void: "bg-slate-100 text-slate-600 ring-slate-500/20", Cancelled: "bg-slate-100 text-slate-600 ring-slate-500/20",
};
export function Pill({ value, label }: { value: string; label?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${pillTone[value] ?? "bg-slate-100 text-slate-700 ring-slate-500/20"}`}>{label ?? value.replace(/([a-z])([A-Z])/g, "$1 $2")}</span>;
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

export function TabBar<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return <div role="tablist" className="flex gap-1 rounded-xl bg-slate-200/60 p-1 dark:bg-white/10">
    {tabs.map(tab => <button key={tab.id} role="tab" aria-selected={value === tab.id} onClick={() => onChange(tab.id)}
      className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${value === tab.id ? "bg-white text-slate-900 shadow dark:bg-card dark:text-foreground" : "text-slate-600 hover:text-slate-900 dark:text-muted-foreground"}`}>{tab.label}</button>)}
  </div>;
}

export function describeLimit(value: number, unit: string): string {
  if (value === -1) return "Unlimited";
  if (unit === "MB" && value >= 1024) return `${(value / 1024).toLocaleString("en-IN", { maximumFractionDigits: 1 })} GB`;
  return `${value.toLocaleString("en-IN")} ${unit}`.trim();
}
