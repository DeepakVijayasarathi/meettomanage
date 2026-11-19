import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Loader2, Pencil, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/api/hooks";
import { cn } from "@/lib/utils";
import { getCrmStuck, getCrmTargets, inr, saveCrmTarget, type CrmStuckLead, type CrmTargetRow, type CrmTargets } from "@/api/crm";
import { LEAD_STAGE_LABEL } from "@/api/marketing";
import { useRun } from "./hooks";

const EMPTY_TARGETS: CrmTargets = { month: "", dayOfMonth: 1, daysInMonth: 30, rows: [] };

export function useCrmTargets() {
  const { data, loading, reload } = useApiData(getCrmTargets, EMPTY_TARGETS, EMPTY_TARGETS, { cacheKey: "crm-targets", ttlMs: 30_000 });
  return { targets: data, loading, reload };
}

export function useCrmStuck() {
  const { data, loading, reload } = useApiData(getCrmStuck, [] as CrmStuckLead[], [] as CrmStuckLead[], { cacheKey: "crm-stuck", ttlMs: 30_000 });
  return { stuck: data, loading, reload };
}

const monthLabel = (ym: string) => (ym ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(`${ym}-01T00:00:00`)) : "This month");

/**
 * A progress bar against a target, with a tick showing where you'd be if you were exactly on pace for the month.
 * Green when ahead of pace, amber when behind.
 */
export function ProgressBar({ value, target, pace, label, format = String }: { value: number; target: number | null; pace: number; label: string; format?: (v: number) => string }) {
  if (!target) return <div className="text-sm"><p className="text-xs text-muted-foreground">{label}</p><p className="font-semibold">{format(value)} <span className="text-xs font-normal text-muted-foreground">no target</span></p></div>;
  const pct = Math.min(100, (100 * value) / target);
  const ahead = value >= target * pace;
  return (
    <div className="text-sm">
      <div className="flex items-baseline justify-between gap-2"><p className="text-xs text-muted-foreground">{label}</p><p className="tabular-nums"><b>{format(value)}</b> <span className="text-xs text-muted-foreground">of {format(target)}</span></p></div>
      <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={value} aria-label={label}>
        <div className={cn("h-full rounded-full", value >= target ? "bg-emerald-600" : ahead ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${pct}%` }} />
        <span className="absolute top-0 h-full w-0.5 bg-foreground/40" style={{ left: `${Math.min(100, pace * 100)}%` }} title="Where you'd be on pace today" />
      </div>
    </div>
  );
}

function TargetDialog({ row, onClose, onSaved }: { row: CrmTargetRow | null; onClose: () => void; onSaved: () => void }) {
  const run = useRun();
  const [won, setWon] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [forId, setForId] = useState<string | null>(null);
  if (row && forId !== row.userId) { setForId(row.userId); setWon(row.wonTarget?.toString() ?? ""); setValue(row.valueTarget?.toString() ?? ""); }
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/[^\d.]/g, "")));

  async function save() {
    if (!row) return;
    setBusy(true);
    const ok = await run(() => saveCrmTarget(row.userId, { won: num(won), value: num(value) }), "Target saved");
    setBusy(false);
    if (ok) { onSaved(); onClose(); }
  }

  return (
    <Dialog open={row !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Monthly target for {row?.name}</DialogTitle><DialogDescription>Applies every month until you change it. Leave both empty to remove it.</DialogDescription></DialogHeader>
        <div className="space-y-3">
          <label className="block space-y-1 text-sm"><span className="font-medium">Deals won per month</span><Input inputMode="numeric" value={won} onChange={(e) => setWon(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 5" /></label>
          <label className="block space-y-1 text-sm"><span className="font-medium">New monthly revenue (₹)</span><Input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 12000" /><span className="block text-xs text-muted-foreground">The total expected monthly value of the leads they win.</span></label>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={() => void save()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Everyone's monthly targets and progress. Managers can set them. */
export function TargetsPanel({ editable }: { editable: boolean }) {
  const { targets, loading, reload } = useCrmTargets();
  const [editing, setEditing] = useState<CrmTargetRow | null>(null);
  const pace = targets.dayOfMonth / targets.daysInMonth;
  const withTargets = targets.rows.filter((r) => r.wonTarget || r.valueTarget);
  const teamWonTarget = withTargets.reduce((s, r) => s + (r.wonTarget ?? 0), 0);
  const teamValueTarget = withTargets.reduce((s, r) => s + (r.valueTarget ?? 0), 0);

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><Target className="h-4 w-4" />Targets · {monthLabel(targets.month)}</h2>
        <span className="text-xs text-muted-foreground">Day {targets.dayOfMonth} of {targets.daysInMonth}{loading && <Loader2 className="ms-2 inline h-3 w-3 animate-spin" />}</span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">Deals won and new monthly revenue so far this month. The tick on each bar is where you'd be on pace today.{editable && " Click Set target to change someone's goal."}</p>

      {(teamWonTarget > 0 || teamValueTarget > 0) && (
        <div className="mb-4 grid gap-4 rounded-lg bg-muted/40 p-3 sm:grid-cols-2">
          <ProgressBar label="Team: deals won" value={targets.rows.reduce((s, r) => s + r.won, 0)} target={teamWonTarget || null} pace={pace} />
          <ProgressBar label="Team: new monthly revenue" value={targets.rows.reduce((s, r) => s + r.wonValue, 0)} target={teamValueTarget || null} pace={pace} format={inr} />
        </div>
      )}

      {targets.rows.length === 0 ? <p className="text-sm text-muted-foreground">No managers or sales reps yet.</p> : (
        <ul className="divide-y">
          {targets.rows.map((r) => (
            <li key={r.userId} className="grid items-center gap-3 py-3 sm:grid-cols-[11rem_1fr_1fr_auto]">
              <p className="font-medium">{r.name}<span className="block text-xs font-normal text-muted-foreground">{r.role === "Sales" ? "Sales rep" : r.role}</span></p>
              <ProgressBar label="Deals won" value={r.won} target={r.wonTarget} pace={pace} />
              <ProgressBar label="New monthly revenue" value={r.wonValue} target={r.valueTarget} pace={pace} format={inr} />
              {editable ? <Button size="sm" variant="outline" onClick={() => setEditing(r)}><Pencil className="h-3.5 w-3.5" />{r.wonTarget || r.valueTarget ? "Edit" : "Set target"}</Button> : <span />}
            </li>
          ))}
        </ul>
      )}
      <TargetDialog row={editing} onClose={() => setEditing(null)} onSaved={reload} />
    </section>
  );
}

/** Open leads that have waited too long in their stage, most valuable first. */
export function StuckList({ stuck, limit, empty = "Nothing stuck. Every open lead has moved recently." }: { stuck: CrmStuckLead[]; limit?: number; empty?: string }) {
  if (stuck.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  const shown = limit ? stuck.slice(0, limit) : stuck;
  return (
    <ul className="divide-y text-sm">
      {shown.map((l) => (
        <li key={l.id} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <Link to={`/marketing/leads/${l.id}`} className="font-semibold hover:underline">{l.academyName}</Link>
            <p className="truncate text-xs text-muted-foreground">{l.reason} · {LEAD_STAGE_LABEL[l.stage]}{l.owner ? ` · ${l.owner}` : " · Unassigned"}</p>
          </div>
          <div className="shrink-0 text-end">
            <Badge variant={l.days >= 14 ? "destructive" : "warning"}>{l.days}d</Badge>
            {l.expectedMonthlyValue != null && <p className="mt-0.5 text-xs text-muted-foreground">{inr(l.expectedMonthlyValue)}/mo</p>}
          </div>
        </li>
      ))}
      {limit && stuck.length > limit && <li className="pt-2 text-xs text-muted-foreground">+{stuck.length - limit} more. Use the Stuck filter on Leads to see them all.</li>}
    </ul>
  );
}

export function StuckHeading({ count }: { count: number }) {
  return <h2 className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className={cn("h-4 w-4", count ? "text-amber-600" : "text-muted-foreground")} />Stuck leads{count > 0 && <Badge variant="warning">{count}</Badge>}</h2>;
}
