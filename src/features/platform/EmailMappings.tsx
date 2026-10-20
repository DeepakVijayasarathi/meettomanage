import { useMemo, useState, type FormEvent } from "react";
import { AlertCircle, AtSign, CheckCircle2, Globe, Mail, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import PlatformShell from "./PlatformShell";
import { TenantSelector, useTenantSelection } from "./TenantSelection";
import { readTenantEmailMappings, saveTenantEmailMappings, type TenantEmailMapping } from "@/lib/tenantEmailMappings";

export default function EmailMappings() {
  return <PlatformShell><EmailMappingsPage /></PlatformShell>;
}

function EmailMappingsPage() {
  const selection = useTenantSelection();
  const [mappings, setMappings] = useState<TenantEmailMapping[]>(readTenantEmailMappings);
  const [kind, setKind] = useState<"email" | "domain">("email");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const visible = useMemo(() => mappings.filter(item => item.tenantCode === selection.tenant?.code), [mappings, selection.tenant?.code]);

  function add(event: FormEvent) {
    event.preventDefault();
    if (!selection.tenant) return;
    const key = value.trim().toLowerCase().replace(kind === "domain" ? /^@/ : /^$/, "");
    const valid = kind === "email"
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)
      : /^(?!gmail\.com$)(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(key);
    if (!valid) {
      setError(kind === "email" ? "Enter one complete email address, for example owner@gmail.com." : "Enter an organisation domain. Shared domains such as gmail.com must use an exact email mapping.");
      return;
    }
    if (mappings.some(item => item.key === key)) {
      setError("That email or domain is already mapped to a tenant.");
      return;
    }
    const next = [...mappings, { key, tenantCode: selection.tenant.code }];
    saveTenantEmailMappings(next); setMappings(next); setValue(""); setError(""); setNotice("Login mapping saved for this browser.");
  }

  function remove(key: string) {
    const next = mappings.filter(item => item.key !== key);
    saveTenantEmailMappings(next); setMappings(next); setNotice("Login mapping removed.");
  }

  const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5";
  return <div className="space-y-6">
    <PageHeader eyebrow="Platform" title="Simple SSO" description="Give every client one shared login experience. Route organisation domains automatically, or map an exact Gmail address to the correct tenant." className="mb-0" />
    <TenantSelector {...selection} onChange={selection.select} />
    {selection.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{selection.error}</p>}
    {error && <p role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
    {notice && !error && <p role="status" className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</p>}
    {selection.tenant && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.75fr)]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
        <div className="flex items-center gap-3 border-b border-slate-200 p-5 dark:border-white/10"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20"><AtSign className="h-5 w-5" /></span>
          <div><h2 className="text-base font-semibold">Mappings for {selection.tenant.name}</h2><p className="text-xs text-slate-500">Exact email matches take priority over domain matches.</p></div></div>
        {visible.length ? <div className="divide-y divide-slate-100 dark:divide-white/10">{visible.map(item => <div key={item.key} className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50/70 dark:hover:bg-white/5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{item.key.includes("@") ? <Mail className="h-4 w-4" /> : <Globe className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="truncate font-medium">{item.key}</p><p className="text-xs text-slate-500">{item.key.includes("@") ? "Exact email" : "Email domain"} → <span className="font-mono">/t/{item.tenantCode}/login</span></p></div><button type="button" onClick={() => remove(item.key)} aria-label={`Remove ${item.key}`} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}</div>
          : <p className="p-8 text-center text-sm text-slate-500">No email mappings for this tenant yet.</p>}
      </section>
      <form onSubmit={add} className="self-start space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-card">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20"><Plus className="h-5 w-5" /></span>
          <div><h2 className="text-base font-semibold">Add SSO mapping</h2><p className="text-xs text-slate-500">For Gmail and other shared providers, choose Exact email.</p></div></div>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">{(["email", "domain"] as const).map(item => <button key={item} type="button" onClick={() => { setKind(item); setError(""); }} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${kind === item ? "bg-white text-primary shadow-sm ring-1 ring-primary/20 dark:bg-card" : "text-slate-500 hover:text-slate-700"}`}>{item === "email" ? "Exact email" : "Domain"}</button>)}</div>
        <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-foreground"><span>{kind === "email" ? "Email address" : "Organisation domain"}</span><input required type={kind === "email" ? "email" : "text"} value={value} onChange={e => setValue(e.target.value)} placeholder={kind === "email" ? "owner@gmail.com" : "school.org"} className={inputClass} /></label>
        <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/15 transition hover:bg-primary/90"><Plus className="h-4 w-4" />Add SSO mapping</button>
        <p className="text-xs leading-relaxed text-slate-500">Sign-in at <span className="font-mono">/login</span> already finds each user's tenant from their registered email or mobile. These mappings are saved in this browser only.</p>
      </form>
    </div>}
  </div>;
}
