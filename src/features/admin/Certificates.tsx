import { useMemo, useState } from "react";
import { Award, BadgeCheck, Ban, Download, RefreshCw, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { downloadCertificate, issueDueCertificates, listCertificates, reissueCertificate, revokeCertificate, type ApiCertificate } from "@/api/certificates";

/** Admin: every completion certificate issued, with download, revoke and re-issue. */
export default function AdminCertificates() {
  const { toast } = useToast();
  const { data, error, reload } = useApiData(() => listCertificates(), []);
  const [busy, setBusy] = useState(false);
  const active = useMemo(() => data.filter((c) => !c.revokedAtUtc), [data]);
  const thisMonth = active.filter((c) => new Date(c.issuedAtUtc) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast({ variant: "success", title: ok });
      reload();
    } catch (e) {
      toast({ variant: "error", title: "Couldn't update", description: userMessage(e, "Please try again.") });
    } finally {
      setBusy(false);
    }
  };

  const issueDue = () => run(async () => {
    const { issued } = await issueDueCertificates();
    toast({ variant: "success", title: issued ? `${issued} certificate${issued === 1 ? "" : "s"} issued` : "Nothing new to issue" });
  }, "Checked completed batches");

  const columns: DataTableColumn<ApiCertificate>[] = [
    { key: "studentName", header: "Student", sortable: true, accessor: (c) => c.studentName, render: (c) => <span className="font-semibold">{c.studentName}</span> },
    { key: "courseName", header: "Course", sortable: true, accessor: (c) => c.courseName, render: (c) => <div><p className="text-sm">{c.courseName}</p>{c.batchName && <p className="text-xs text-muted-foreground">{c.batchName}</p>}</div> },
    { key: "issuedAtUtc", header: "Issued", sortable: true, accessor: (c) => c.issuedAtUtc, render: (c) => <span className="text-sm text-muted-foreground">{formatDate(c.issuedAtUtc)}</span> },
    { key: "code", header: "Code", render: (c) => <span className="font-mono text-xs">{c.code}</span> },
    { key: "status", header: "Status", render: (c) => c.revokedAtUtc ? <Badge variant="destructive" title={c.revokedReason ?? undefined}>Revoked</Badge> : <Badge variant="secondary">Valid</Badge> },
    {
      key: "actions", header: "", render: (c) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" aria-label="Download PDF" onClick={() => void downloadCertificate(c)}><Download className="h-4 w-4" /></Button>
          {c.revokedAtUtc
            ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(() => reissueCertificate(c), "Certificate restored")}><RotateCcw className="mr-1 h-4 w-4" />Restore</Button>
            : <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => {
                const reason = window.prompt(`Revoke ${c.studentName}'s certificate? The QR check will show it as revoked. Reason (optional):`);
                if (reason !== null) void run(() => revokeCertificate(c.id, reason), "Certificate revoked");
              }}><Ban className="mr-1 h-4 w-4" />Revoke</Button>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Academics"
        title="Certificates"
        description="Issued automatically to every student when their batch completes. Families download and share them; anyone can check one with its QR code."
        actions={<Button variant="outline" onClick={() => void issueDue()} disabled={busy}><RefreshCw className="mr-1.5 h-4 w-4" />Issue for completed batches</Button>}
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Certificates issued" value={String(active.length)} icon={Award} tone="primary" />
        <KpiCard label="This month" value={String(thisMonth)} icon={BadgeCheck} tone="success" />
        <KpiCard label="Revoked" value={String(data.length - active.length)} icon={Ban} tone="neutral" />
      </div>
      <DataTable
        data={data}
        columns={columns}
        rowKey={(c) => c.id}
        searchPlaceholder="Search by student, course or code…"
        searchFn={(c, q) => [c.studentName, c.courseName, c.code, c.batchName].some((v) => v?.toLowerCase().includes(q.toLowerCase()))}
        emptyTitle="No certificates yet"
        emptyDescription="They appear here as soon as a batch is marked complete."
        error={apiEnabled() ? error : null}
        onRetry={reload}
      />
    </div>
  );
}
