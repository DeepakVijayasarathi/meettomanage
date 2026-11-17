import { Link } from "react-router-dom";
import { CalendarCheck2, Clock3, Inbox, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { useApiData } from "@/api/hooks";
import { getCrmToday, type CrmLeadBrief, type CrmToday as Today } from "@/api/crm";
import { LEAD_STAGE_LABEL } from "@/api/marketing";
import { TaskForm, TaskList } from "./shared";
import { useCrmMe, when } from "./hooks";

const EMPTY: Today = { overdue: [], today: [], upcoming: [], demosToday: [], waitingForReply: [], followUpsDue: [] };

function LeadList({ leads, empty, timeLabel }: { leads: CrmLeadBrief[]; empty: string; timeLabel: (l: CrmLeadBrief) => string }) {
  if (leads.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y text-sm">
      {leads.map((l) => (
        <li key={l.id} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0"><Link to={`/marketing/demo-requests?lead=${l.id}`} className="font-semibold hover:underline">{l.academyName}</Link><p className="truncate text-xs text-muted-foreground">{l.fullName} · {LEAD_STAGE_LABEL[l.stage]}{l.owner ? ` · ${l.owner}` : ""}</p></div>
          <span className="shrink-0 text-xs text-muted-foreground">{timeLabel(l)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Marketing console → My day: what needs doing now, in one place. */
export default function CrmToday() {
  const me = useCrmMe();
  const { data, loading, error, reload } = useApiData(getCrmToday, EMPTY, EMPTY, { cacheKey: "crm-today", ttlMs: 10_000 });
  const ago = (iso: string | null) => { if (!iso) return ""; const h = (Date.now() - new Date(iso).getTime()) / 3_600_000; return h < 1 ? "just now" : h < 48 ? `${Math.round(h)} h ago` : `${Math.round(h / 24)} days ago`; };

  return (
    <div>
      <PageHeader eyebrow="CRM" title={me.name ? `Good to see you, ${me.name.split(" ")[0]}` : "My day"} description="Your overdue and due-today tasks, today's demos and leads waiting for a first reply." />
      {error && <InlineAlert variant="warning" className="mb-4">Couldn't load your day ({error}). <button type="button" className="underline" onClick={() => reload()}>Retry</button></InlineAlert>}
      {loading && <div className="mb-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[{ label: "Overdue tasks", value: data.overdue.length, danger: true }, { label: "Due today", value: data.today.length }, { label: "Demos today", value: data.demosToday.length }, { label: "Waiting for a reply", value: data.waitingForReply.length, danger: true }].map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{k.label}</p><p className={k.danger && k.value ? "text-2xl font-bold text-destructive" : "text-2xl font-bold"}>{k.value}</p></div>
        ))}
      </div>

      {me.canWrite && <section className="mb-6 rounded-xl border bg-card p-5"><h2 className="mb-3 font-semibold">Add a task</h2><TaskForm onSaved={reload} /></section>}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5"><h2 className="mb-2 flex items-center gap-2 font-semibold text-destructive"><Clock3 className="h-4 w-4" />Overdue</h2><TaskList tasks={data.overdue} onChanged={reload} empty="Nothing overdue." /></section>
          <section className="rounded-xl border bg-card p-5"><h2 className="mb-2 font-semibold">Today</h2><TaskList tasks={data.today} onChanged={reload} empty="No tasks due today." /></section>
          <section className="rounded-xl border bg-card p-5"><h2 className="mb-2 font-semibold">Next 7 days</h2><TaskList tasks={data.upcoming} onChanged={reload} empty="Nothing scheduled this week." /></section>
        </div>
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-5"><h2 className="mb-2 flex items-center gap-2 font-semibold"><CalendarCheck2 className="h-4 w-4" />Demos today</h2><LeadList leads={data.demosToday} empty="No demos today." timeLabel={(l) => when(l.atUtc)} /></section>
          <section className="rounded-xl border bg-card p-5"><h2 className="mb-2 flex items-center gap-2 font-semibold"><Inbox className="h-4 w-4" />Waiting for a first reply</h2><LeadList leads={data.waitingForReply} empty="Every new lead has been contacted." timeLabel={(l) => ago(l.atUtc)} /></section>
          <section className="rounded-xl border bg-card p-5"><h2 className="mb-2 font-semibold">Follow-ups due</h2><LeadList leads={data.followUpsDue} empty="No lead follow-ups due." timeLabel={(l) => when(l.atUtc)} /></section>
        </div>
      </div>
    </div>
  );
}
