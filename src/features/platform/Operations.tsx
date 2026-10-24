import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Check, CheckCircle2, ExternalLink, Eye, Flag, Globe2, GraduationCap, HardDrive, Layers3, Loader2, Palette, Save, ScrollText, ShieldCheck, Sparkles, Users } from "lucide-react";
import PlatformShell from "./PlatformShell";
import { ConsoleHeader } from "./saasUi";
import { TenantSelector, useTenantSelection } from "./TenantSelection";
import { platformRequest } from "@/api/platform";

type OperationsData = {
  tenant: { id: string; code: string; name: string; customDomain?: string | null; status: string; appAccessGranted: boolean };
  subscription: null | { plan: string; status: string; trialEndsAtUtc?: string; currentPeriodEndUtc?: string };
  usage: { students: number; staff: number };
  business: { users: number; students: number; courses: number; batches: number; sessions: number; resources: number; recentAudit: { action: string; entityName: string; entityId?: string; createdAtUtc: string }[] };
  onboarding: Record<string, boolean>;
};
type Tab = "overview" | "setup" | "activity";
const panel = "rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(31,41,55,0.04)]";
const labels: Record<string, string> = { provisioned: "Workspace provisioned", organization: "Organization details", branding: "Brand identity", firstUser: "First team member", firstCourse: "First course", firstBatch: "First batch", integration: "Communication integration", customDomain: "Custom domain" };

export default function Operations() { return <PlatformShell><OperationsPage /></PlatformShell>; }

function OperationsPage() {
  const selection = useTenantSelection();
  const [data, setData] = useState<OperationsData | null>(null);
  const [domain, setDomain] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!selection.tenant) return setData(null);
    const controller = new AbortController(); setError(""); setNotice(""); setData(null);
    platformRequest<OperationsData>(`/tenants/${selection.tenant.id}/operations`, selection.token, "GET", undefined, controller.signal)
      .then(result => { setData(result); setDomain(result.tenant.customDomain ?? ""); })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not load tenant operations."); });
    return () => controller.abort();
  }, [selection.tenant?.id, selection.token]);
  const checklist = useMemo(() => data ? Object.entries(data.onboarding) : [], [data]);
  const complete = checklist.filter(([, done]) => done).length;
  const health = checklist.length ? Math.round(complete / checklist.length * 100) : 0;
  const nextStep = checklist.find(([, done]) => !done)?.[0];
  async function saveDomain(event: FormEvent) {
    event.preventDefault(); if (!selection.tenant) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await platformRequest(`/tenants/${selection.tenant.id}/custom-domain`, selection.token, "PUT", { domain: domain.trim() || null });
      setData(current => current ? { ...current, tenant: { ...current.tenant, customDomain: domain.trim() || null }, onboarding: { ...current.onboarding, customDomain: Boolean(domain.trim()) } } : current);
      setNotice(domain.trim() ? "Domain saved. Complete DNS and TLS setup before sharing it." : "Custom domain removed.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save the custom domain."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <ConsoleHeader eyebrow="Platform command center" title="Tenant operations" description="See what needs attention, finish setup and manage every tenant capability from one calm workspace." className="mb-0" />
    <TenantSelector {...selection} onChange={selection.select} disabled={busy} />
    {(selection.error || error) && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">{selection.error || error}</p>}
    {notice && <p role="status" className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800"><CheckCircle2 className="h-4 w-4" />{notice}</p>}
    {selection.tenant && !data && !error && <div className={`${panel} flex min-h-44 items-center justify-center gap-3 text-muted-foreground`}><Loader2 className="h-5 w-5 animate-spin" />Preparing the command center…</div>}
    {data && <>
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/[0.09] via-card to-card p-6 shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">{data.tenant.status}</span><span className="rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">{data.subscription?.plan ?? "No plan"}</span>{data.tenant.customDomain && <span className="rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">{data.tenant.customDomain}</span>}</div><h2 className="console-heading mt-4 text-2xl font-semibold sm:text-3xl">{data.tenant.name}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{nextStep ? <>Recommended next: <b className="text-foreground">{labels[nextStep] ?? nextStep}</b>. Complete it to make this workspace launch-ready.</> : "Everything essential is configured. This workspace is launch-ready."}</p></div>
          <div className="flex items-center gap-5 rounded-2xl border border-white/60 bg-card/80 p-4 backdrop-blur"><div className="relative grid h-20 w-20 place-items-center rounded-full" style={{ background: `conic-gradient(hsl(var(--primary)) ${health}%, hsl(var(--muted)) 0)` }}><div className="grid h-16 w-16 place-items-center rounded-full bg-card"><span className="text-xl font-bold">{health}%</span></div></div><div><p className="font-semibold">Workspace health</p><p className="mt-1 text-sm text-muted-foreground">{complete} of {checklist.length} essentials complete</p></div></div>
        </div>
      </section>
      <div className="flex gap-1 overflow-x-auto rounded-xl border bg-muted/40 p-1" role="tablist" aria-label="Tenant operations views">{(["overview", "setup", "activity"] as Tab[]).map(item => <button key={item} role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`min-w-28 flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold capitalize transition ${tab === item ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{item}</button>)}</div>
      {tab === "overview" && <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={GraduationCap} label="Students" value={data.usage.students} hint="Active learners" /><Metric icon={Users} label="Staff" value={data.usage.staff} hint="Team accounts" /><Metric icon={Activity} label="Sessions" value={data.business.sessions} hint="Classes created" /><Metric icon={HardDrive} label="Resources" value={data.business.resources} hint="Learning files" /></section>
        <section><div className="mb-3"><h2 className="text-lg font-semibold">Quick actions</h2><p className="text-sm text-muted-foreground">Common jobs, without hunting through menus.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"><Action icon={Palette} title="Branding & configuration" text="Logo, colors, app content and integrations" to={`/platform/configuration?tenant=${data.tenant.id}`} /><Action icon={ShieldCheck} title="Subscription & limits" text={`${data.subscription?.status ?? "Not configured"} · plans, invoices and warnings`} to={`/platform/subscriptions?tenant=${data.tenant.id}`} /><Action icon={Flag} title="Feature access" text="Temporary flags and entitlement overrides" to={`/platform/subscriptions?tenant=${data.tenant.id}`} /><Action icon={Layers3} title="Menus & navigation" text="Choose what each portal role can see" to={`/platform/menus?tenant=${data.tenant.id}`} /><Action icon={Globe2} title="Login routing" text="Email and organization-domain discovery" to={`/platform/email-mappings?tenant=${data.tenant.id}`} /><Action icon={Eye} title="Open tenant portal" text="Launch the tenant's isolated sign-in page" href={`/t/${data.tenant.code}/login`} /></div></section>
      </>}
      {tab === "setup" && <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <div className={`${panel} p-5 sm:p-6`}><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></span><div><h2 className="font-semibold">Launch checklist</h2><p className="text-sm text-muted-foreground">A guided path from provisioned to ready.</p></div></div><ol className="mt-5 space-y-2">{checklist.map(([key, done], index) => <li key={key} className={`flex items-center gap-3 rounded-xl border p-3.5 ${done ? "border-green-200 bg-green-50/60" : "bg-card"}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"}`}>{done ? <Check className="h-4 w-4" /> : index + 1}</span><span className="flex-1 text-sm font-medium">{labels[key] ?? key}</span><span className={`text-xs font-semibold ${done ? "text-green-700" : "text-muted-foreground"}`}>{done ? "Done" : "To do"}</span></li>)}</ol></div>
        <form onSubmit={saveDomain} className={`${panel} p-5 sm:p-6`}><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Globe2 className="h-5 w-5" /></span><div><h2 className="font-semibold">Custom domain</h2><p className="text-sm text-muted-foreground">Use your client's own web address.</p></div></div><div className="mt-5"><label htmlFor="custom-domain" className="text-sm font-medium">Hostname</label><input id="custom-domain" maxLength={253} placeholder="academy.example.com" value={domain} onChange={e => setDomain(e.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15" /><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Enter only the hostname. After saving, point DNS to this deployment and provision its TLS certificate.</p></div><button disabled={busy || domain.trim() === (data.tenant.customDomain ?? "")} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save domain</button><div className="mt-5 rounded-xl border bg-muted/30 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recovery policy</p><p className="mt-1 text-sm">Backups and destructive restores stay operator-controlled to prevent accidental data loss.</p></div></form>
      </section>}
      {tab === "activity" && <section className={`${panel} overflow-hidden`}><div className="flex items-center gap-3 border-b p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><ScrollText className="h-5 w-5" /></span><div><h2 className="font-semibold">Recent audit activity</h2><p className="text-sm text-muted-foreground">Latest recorded changes inside this tenant.</p></div></div><div className="divide-y">{data.business.recentAudit.length ? data.business.recentAudit.map((item, index) => <div key={`${item.createdAtUtc}-${index}`} className="flex items-center gap-3 px-5 py-4 transition hover:bg-muted/30"><span className="h-2 w-2 rounded-full bg-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.action} · {item.entityName}</p>{item.entityId && <p className="truncate font-mono text-xs text-muted-foreground">{item.entityId}</p>}</div><time className="shrink-0 text-xs text-muted-foreground">{new Date(item.createdAtUtc).toLocaleString()}</time></div>) : <div className="grid min-h-40 place-items-center p-6 text-sm text-muted-foreground">No audit activity recorded yet.</div>}</div></section>}
    </>}
  </div>;
}

function Metric({ icon: Icon, label, value, hint }: { icon: typeof Activity; label: string; value: number; hint: string }) { return <div className={`${panel} p-5 transition hover:-translate-y-0.5 hover:shadow-md`}><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><span className="text-xs font-medium text-muted-foreground">{hint}</span></div><p className="mt-5 text-3xl font-semibold tracking-tight">{value.toLocaleString()}</p><p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p></div>; }
function Action({ icon: Icon, title, text, to, href }: { icon: typeof Activity; title: string; text: string; to?: string; href?: string }) { const body = <><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="mt-0.5 block text-sm text-muted-foreground">{text}</span></span>{href ? <ExternalLink className="h-4 w-4 text-muted-foreground" /> : <ArrowRight className="h-4 w-4 text-muted-foreground" />}</>; const cls = `${panel} flex items-center gap-3 p-4 transition hover:border-primary/30 hover:bg-primary/[0.025]`; return to ? <Link className={cls} to={to}>{body}</Link> : <a className={cls} href={href} target="_blank" rel="noreferrer">{body}</a>; }
