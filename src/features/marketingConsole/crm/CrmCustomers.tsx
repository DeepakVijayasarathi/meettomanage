import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Building2, Loader2, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/api/hooks";
import { addCrmCustomerNote, getCrmCustomer, HEALTH_LABEL, inr, listCrmCustomers, type CrmCustomer, type CrmCustomerDetail, type CustomerHealth } from "@/api/crm";
import { LEAD_STAGE_LABEL } from "@/api/marketing";
import { userMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { TaskForm, TaskList } from "./shared";
import { useCrmMe, useRun, when } from "./hooks";

const HEALTH_VARIANT: Record<CustomerHealth, "success" | "warning" | "destructive" | "default" | "muted"> = {
  Healthy: "success", New: "default", Trial: "warning", AtRisk: "destructive", Churned: "muted",
};
const EMPTY = { available: true, items: [] as CrmCustomer[] };

export function HealthBadge({ health }: { health: CustomerHealth }) {
  return <Badge variant={HEALTH_VARIANT[health]}>{HEALTH_LABEL[health]}</Badge>;
}

/** Marketing console → Customers: every academy account with its plan, usage and health. */
export default function CrmCustomers() {
  const me = useCrmMe();
  const run = useRun();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [health, setHealth] = useState<CustomerHealth | "">("");
  const [params, setParams] = useSearchParams();
  const openId = params.get("open");
  const [detail, setDetail] = useState<CrmCustomerDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => { const id = setTimeout(() => setSearch(searchInput.trim()), 300); return () => clearTimeout(id); }, [searchInput]);
  const { data, loading, error, reload } = useApiData(() => listCrmCustomers({ search: search || undefined, health: health || undefined }), EMPTY, EMPTY, { cacheKey: `crm-customers-${search}-${health}`, ttlMs: 30_000 });

  async function loadDetail(id: string) {
    setDetail(null); setDetailError(null);
    try { setDetail(await getCrmCustomer(id)); } catch (err) { setDetailError(userMessage(err)); }
  }
  useEffect(() => { if (openId) void loadDetail(openId); }, [openId]);
  const open = (id: string) => setParams({ open: id });
  const close = () => { setParams({}); setDetail(null); };

  const counts = data.items.reduce<Record<string, number>>((acc, c) => { acc[c.health] = (acc[c.health] ?? 0) + 1; return acc; }, {});
  const mrr = data.items.filter((c) => c.health !== "Churned").reduce((s, c) => s + c.monthlyValue, 0);

  return (
    <div>
      <PageHeader eyebrow="CRM" title="Customers" description="Every academy account: plan, usage and health. At-risk academies come first, with the reason." />
      {!data.available && <InlineAlert variant="info" className="mb-4">Customers are read from academy accounts. They are shown only in the platform owner's marketing console when the platform runs in multi-tenant mode.</InlineAlert>}
      {error && <InlineAlert variant="warning" className="mb-4">Couldn't load customers ({error}). <button type="button" className="underline" onClick={() => reload()}>Retry</button></InlineAlert>}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">Monthly recurring revenue</p><p className="text-2xl font-bold">{inr(mrr)}</p></div>
        {(["AtRisk", "Trial", "New", "Healthy"] as CustomerHealth[]).map((h) => (
          <button key={h} type="button" onClick={() => setHealth(health === h ? "" : h)} className={`rounded-xl border bg-card p-4 text-start transition ${health === h ? "ring-2 ring-primary" : "hover:bg-muted/40"}`}>
            <p className="text-xs text-muted-foreground">{HEALTH_LABEL[h]}</p><p className={h === "AtRisk" && counts[h] ? "text-2xl font-bold text-destructive" : "text-2xl font-bold"}>{counts[h] ?? 0}</p>
          </button>
        ))}
      </div>

      <div className="relative mb-4 max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search academy, address or e-mail…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} /></div>

      {loading && data.items.length === 0 ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        : data.items.length === 0 ? <EmptyState icon={Building2} title="No customers to show" description={health || search ? "Try clearing the filters." : "Academy accounts appear here once they sign up."} />
        : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr>{["Academy", "Health", "Plan", "Students", "Classes this month", "Renews / trial ends", "Owner"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y">
                {data.items.map((c) => (
                  <tr key={c.tenantId} className="cursor-pointer hover:bg-muted/30" onClick={() => open(c.tenantId)}>
                    <td className="px-3 py-2"><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{c.code}{c.email ? ` · ${c.email}` : ""}</p></td>
                    <td className="px-3 py-2"><HealthBadge health={c.health} />{c.healthReasons[0] && c.health === "AtRisk" && <p className="mt-1 max-w-[14rem] text-xs text-destructive">{c.healthReasons.join(" · ")}</p>}</td>
                    <td className="px-3 py-2"><p>{c.plan ?? "–"}</p>{c.monthlyValue > 0 && <p className="text-xs text-muted-foreground">{inr(c.monthlyValue)}/mo</p>}</td>
                    <td className="px-3 py-2 tabular-nums">{c.students ?? "–"}</td>
                    <td className="px-3 py-2 tabular-nums">{c.sessionsThisMonth ?? "–"}</td>
                    <td className="px-3 py-2 text-xs">{c.status === "Trialing" ? `Trial ends ${c.trialEndsAtUtc ? formatDate(c.trialEndsAtUtc) : "–"}` : c.renewsAtUtc ? formatDate(c.renewsAtUtc) : "–"}</td>
                    <td className="px-3 py-2 text-xs">{c.owner ?? "–"}{c.openTasks > 0 && <p className="text-muted-foreground">{c.openTasks} open task{c.openTasks === 1 ? "" : "s"}</p>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <Dialog open={!!openId} onOpenChange={(v) => { if (!v) close(); }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2">{detail?.customer.name ?? "Customer"}{detail && <HealthBadge health={detail.customer.health} />}</DialogTitle>
            <DialogDescription>{detail ? [detail.customer.code, detail.customer.email, detail.phone].filter(Boolean).join(" · ") : "Loading…"}</DialogDescription></DialogHeader>
          {detailError ? <InlineAlert variant="warning">{detailError}</InlineAlert> : !detail ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <div className="space-y-5">
              {detail.customer.healthReasons.length > 0 && <ul className="list-disc space-y-0.5 pl-5 text-sm">{detail.customer.healthReasons.map((r) => <li key={r}>{r}</li>)}</ul>}
              <div className="grid gap-3 sm:grid-cols-4">
                {[["Plan", detail.customer.plan ?? "–"], ["Monthly value", detail.customer.monthlyValue ? inr(detail.customer.monthlyValue) : "–"], ["Students", String(detail.customer.students ?? "–")], ["Joined", formatDate(detail.customer.joinedAtUtc)]].map(([k, v]) => (
                  <div key={k} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{k}</p><p className="font-semibold">{v}</p></div>
                ))}
              </div>

              {detail.usage.length > 1 && (
                <div className="rounded-xl border p-4"><h3 className="mb-2 font-semibold">Usage, last 45 days</h3>
                  <div className="flex h-20 items-end gap-0.5" role="img" aria-label="Classes this month by day">
                    {detail.usage.map((u) => { const max = Math.max(1, ...detail.usage.map((x) => x.sessionsThisMonth)); return <span key={u.date} title={`${u.date}: ${u.sessionsThisMonth} classes, ${u.students} students`} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${Math.max(4, (100 * u.sessionsThisMonth) / max)}%` }} />; })}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Classes so far each month (resets on the 1st). Latest: {detail.usage[detail.usage.length - 1].students} students, {detail.usage[detail.usage.length - 1].staff} staff.</p>
                </div>
              )}

              <div className="rounded-xl border p-4"><h3 className="mb-2 font-semibold">Tasks</h3>
                <TaskForm tenantId={detail.customer.tenantId} onSaved={() => void loadDetail(detail.customer.tenantId)} compact />
                <div className="mt-3"><TaskList tasks={detail.tasks} onChanged={() => void loadDetail(detail.customer.tenantId)} showContext={false} empty="No tasks yet, e.g. an onboarding call or a renewal check-in." /></div>
              </div>

              <div className="rounded-xl border p-4"><h3 className="mb-2 font-semibold">Notes</h3>
                {me.canWrite && <div className="mb-3 flex flex-col gap-2"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Owner asked about adding a second branch in January" />
                  <Button size="sm" className="self-start" disabled={!note.trim()} onClick={() => void run(() => addCrmCustomerNote(detail.customer.tenantId, note.trim()), "Note saved").then((ok) => { if (ok) { setNote(""); void loadDetail(detail.customer.tenantId); } })}>Save note</Button></div>}
                {detail.notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes yet.</p> : <ul className="space-y-2">{detail.notes.map((n) => <li key={n.id} className="rounded-lg border p-3 text-sm"><p>{n.text}</p><p className="mt-1 text-xs text-muted-foreground">{n.author ?? "Team"} · {when(n.atUtc)}</p></li>)}</ul>}
              </div>

              <div className="rounded-xl border p-4"><h3 className="mb-2 font-semibold">Invoices</h3>
                {detail.invoices.length === 0 ? <p className="text-sm text-muted-foreground">No invoices yet.</p> : (
                  <table className="w-full text-sm"><tbody className="divide-y">{detail.invoices.map((i) => <tr key={i.number}><td className="py-1.5">{i.number}</td><td className="py-1.5">{formatDate(i.issuedAtUtc)}</td><td className="py-1.5 text-end tabular-nums">{i.currency} {Math.round(i.total).toLocaleString("en-IN")}</td><td className="py-1.5 text-end"><Badge variant={i.status === "Paid" ? "success" : i.status === "Open" && new Date(i.dueAtUtc) < new Date() ? "destructive" : "outline"}>{i.status}</Badge></td></tr>)}</tbody></table>
                )}
              </div>

              {detail.leads.length > 0 && <div className="rounded-xl border p-4"><h3 className="mb-2 font-semibold">Came from</h3><ul className="text-sm">{detail.leads.map((l) => <li key={l.id}><Link className="text-primary hover:underline" to={`/marketing/demo-requests?lead=${l.id}`}>{l.fullName}</Link> · {LEAD_STAGE_LABEL[l.stage]}{l.owner ? ` · ${l.owner}` : ""}</li>)}</ul></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
