import { useCallback, useState } from "react";
import PlatformShell, { usePlatformAdmin } from "./PlatformShell";
import { saasPlatform, type AuditLogPage } from "@/api/saas";
import { ConsoleHeader, Notices, Pill, inputClass, panel, smallButton, td, th, useLoader } from "./saasUi";

const none: AuditLogPage = { total: 0, page: 1, pageSize: 50, items: [] };

/** "Platform.SetStatus" -> "Set status". */
const actionLabel = (action: string) => action.split(".").pop()!.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase());

export default function AuditLog() {
  return <PlatformShell><AuditLogPage /></PlatformShell>;
}

function AuditLogPage() {
  const { token } = usePlatformAdmin();
  const [page, setPage] = useState(1);
  const [failedOnly, setFailedOnly] = useState(false);
  const [actor, setActor] = useState("");
  const [appliedActor, setAppliedActor] = useState("");
  const log = useLoader(useCallback(() => saasPlatform.auditLog(token, { page, failedOnly, actor: appliedActor }), [token, page, failedOnly, appliedActor]), none);
  const pages = Math.max(1, Math.ceil(log.data.total / log.data.pageSize));

  return <div className="space-y-6">
    <ConsoleHeader title="Audit log" description="Every change made from this console and every sign-in attempt, with the operator, the client it touched and the outcome. Entries cannot be edited or deleted here." />
    <Notices error={log.error} notice="" />
    <section className={`${panel} overflow-hidden`}>
      <form className="flex flex-wrap items-center gap-3 border-b border-border p-4 sm:px-6" onSubmit={e => { e.preventDefault(); setPage(1); setAppliedActor(actor); }}>
        <input aria-label="Filter by operator" className={`${inputClass} sm:max-w-xs`} placeholder="Filter by operator email…" value={actor} onChange={e => setActor(e.target.value)} />
        <button className={smallButton}>Apply</button>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={failedOnly} onChange={e => { setPage(1); setFailedOnly(e.target.checked); }} />Failures only</label>
        <span className="ml-auto text-xs text-muted-foreground">{log.data.total} entr{log.data.total === 1 ? "y" : "ies"}</span>
      </form>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-[0.12em] text-muted-foreground"><tr><th className={th}>When</th><th className={th}>Operator</th><th className={th}>Action</th><th className={th}>Client</th><th className={th}>Result</th><th className={th}>From</th></tr></thead>
        <tbody className="divide-y divide-border">{log.data.items.map(r => <tr key={r.id}>
          <td className={`${td} whitespace-nowrap text-xs text-muted-foreground`}>{new Date(r.occurredAtUtc).toLocaleString("en-IN")}</td>
          <td className={`${td} text-xs`}>{r.actor}</td>
          <td className={td}><span className="font-medium">{actionLabel(r.action)}</span><div className="max-w-xs truncate font-mono text-[11px] text-muted-foreground" title={r.path}>{r.httpMethod} {r.path}</div></td>
          <td className={td}>{r.tenantName ?? "-"}</td>
          <td className={td}><Pill value={r.statusCode < 400 ? "Active" : "Failed"} label={String(r.statusCode)} />{r.detail && <div className="mt-1 max-w-xs text-xs text-muted-foreground">{r.detail}</div>}</td>
          <td className={`${td} font-mono text-xs`}>{r.ipAddress ?? "-"}</td></tr>)}</tbody></table></div>
      {log.loaded && log.data.items.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No entries match.</p>}
      {pages > 1 && <div className="flex items-center justify-between border-t border-border p-4 text-sm">
        <button className={smallButton} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span className="text-muted-foreground">Page {page} of {pages}</span>
        <button className={smallButton} disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </section>
  </div>;
}
