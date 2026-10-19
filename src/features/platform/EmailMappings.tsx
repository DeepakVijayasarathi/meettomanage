import { useMemo, useState, type FormEvent } from "react";
import { AtSign, CheckCircle2, Mail, Plus, Trash2 } from "lucide-react";
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

  return <div className="space-y-6">
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[hsl(214_52%_20%)] via-[hsl(214_52%_28%)] to-[hsl(214_52%_20%)] p-7 text-white shadow-lg sm:p-9">
      <AtSign className="mb-4 h-8 w-8 text-sky-300" /><h1 className="font-serif text-3xl font-semibold">Login email mappings</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">Route users from the shared login URL to the correct tenant. Use a domain for organisation email, or an exact address for Gmail and other shared providers.</p>
    </div>
    <TenantSelector {...selection} onChange={selection.select} />
    {selection.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{selection.error}</p>}
    {selection.tenant && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.75fr)]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-card">
        <div className="border-b p-5"><h2 className="font-semibold">Mappings for {selection.tenant.name}</h2><p className="mt-1 text-sm text-muted-foreground">Exact email matches take priority over domain matches.</p></div>
        {visible.length ? <div className="divide-y">{visible.map(item => <div key={item.key} className="flex items-center gap-3 p-4"><span className="rounded-lg bg-blue-50 p-2 text-blue-700"><Mail className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate font-medium">{item.key}</p><p className="text-xs text-muted-foreground">{item.key.includes("@") ? "Exact email" : "Email domain"} → /t/{item.tenantCode}/login</p></div><button type="button" onClick={() => remove(item.key)} aria-label={`Remove ${item.key}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div>)}</div>
          : <p className="p-8 text-sm text-muted-foreground">No email mappings for this tenant yet.</p>}
      </section>
      <form onSubmit={add} className="self-start space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-card">
        <div><h2 className="font-semibold">Add mapping</h2><p className="mt-1 text-sm text-muted-foreground">For Gmail, choose Exact email.</p></div>
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">{(["email", "domain"] as const).map(item => <button key={item} type="button" onClick={() => { setKind(item); setError(""); }} className={`rounded-lg px-3 py-2 text-sm font-medium ${kind === item ? "bg-white shadow dark:bg-background" : "text-muted-foreground"}`}>{item === "email" ? "Exact email" : "Domain"}</button>)}</div>
        <label className="block space-y-2 text-sm"><span>{kind === "email" ? "Email address" : "Organisation domain"}</span><input required type={kind === "email" ? "email" : "text"} value={value} onChange={e => setValue(e.target.value)} placeholder={kind === "email" ? "owner@gmail.com" : "school.org"} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 dark:border-white/15 dark:bg-white/5" /></label>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && !error && <p role="status" className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800"><CheckCircle2 className="h-4 w-4" />{notice}</p>}
        <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(214_52%_20%)] px-4 py-3 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add mapping</button>
        <p className="text-xs leading-relaxed text-amber-700">These mappings currently apply to this browser. A shared production mapping requires the platform API tenant registry.</p>
      </form>
    </div>}
  </div>;
}
