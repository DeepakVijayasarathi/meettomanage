import { useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/api/hooks";
import { apiEnabled } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { listChatEscalations, resolveChatEscalation, type ApiChatEscalation } from "@/api/chatbot";
import { MOCK_CHAT_ESCALATIONS } from "@/data/chatbot";

/**
 * Doubts the "Ask a Doubt" chatbot couldn't answer, routed here for a teacher to resolve.
 * Any teacher can see and resolve any open one — there's no per-teacher assignment/routing
 * in this first pass (see ChatEscalation's own comment on the backend).
 */
export default function TeacherDoubts() {
  const { data: escalations, error: loadError, reload } = useApiData<ApiChatEscalation[]>(
    () => listChatEscalations(),
    MOCK_CHAT_ESCALATIONS
  );
  const [resolveTarget, setResolveTarget] = useState<ApiChatEscalation | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const pending = escalations.filter((e) => e.status === "Pending");
  const resolved = escalations.filter((e) => e.status === "Resolved");

  function openResolve(escalation: ApiChatEscalation) {
    setResolveTarget(escalation);
    setNote("");
  }

  async function confirmResolve() {
    if (!resolveTarget) return;
    if (!apiEnabled()) {
      setNotice("Demo mode — nothing was actually resolved.");
      setResolveTarget(null);
      return;
    }
    setSaving(true);
    try {
      await resolveChatEscalation(resolveTarget.id, note);
      setResolveTarget(null);
      reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not resolve that doubt.");
    } finally {
      setSaving(false);
    }
  }

  const columns: DataTableColumn<ApiChatEscalation>[] = [
    {
      key: "question",
      header: "Doubt",
      render: (e) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground" title={e.question}>{e.question}</p>
          <p className="text-xs text-muted-foreground">Asked by {e.userName} · {formatDate(e.createdAtUtc)}</p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (e) => (
        <Button size="sm" onClick={() => openResolve(e)}>
          Resolve
        </Button>
      ),
    },
  ];

  const resolvedColumns: DataTableColumn<ApiChatEscalation>[] = [
    {
      key: "question",
      header: "Doubt",
      render: (e) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground" title={e.question}>{e.question}</p>
          <p className="text-xs text-muted-foreground">Asked by {e.userName} · {formatDate(e.createdAtUtc)}</p>
        </div>
      ),
    },
    {
      key: "resolution",
      header: "Your resolution",
      render: (e) => (
        <p className="max-w-md truncate text-xs text-muted-foreground" title={e.resolutionNote ?? undefined}>
          {e.resolutionNote || "—"}
        </p>
      ),
    },
    {
      key: "resolvedBy",
      header: "Resolved by",
      render: (e) => <Badge variant="success">{e.resolvedByName ?? "—"}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Teaching"
        title="Student Doubts"
        description="Doubts the 'Ask a Doubt' chatbot couldn't match to an FAQ, forwarded here for a teacher to answer directly."
      />

      {apiEnabled() && loadError && (
        <InlineAlert variant="warning" className="mb-4">
          Could not reach the API ({loadError}).
        </InlineAlert>
      )}
      {notice && (
        <InlineAlert variant="success" className="mb-4">
          {notice}
        </InlineAlert>
      )}

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <EmptyState icon={MessageCircleQuestion} title="Nothing pending" description="Every escalated doubt has been resolved." />
        ) : (
          <DataTable data={pending} columns={columns} rowKey={(e) => e.id} />
        )}
      </div>

      {resolved.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-foreground">Resolved ({resolved.length})</h2>
          <DataTable data={resolved} columns={resolvedColumns} rowKey={(e) => e.id} />
        </div>
      )}

      <Dialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve this doubt</DialogTitle>
            <DialogDescription>{resolveTarget?.question}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="teacher-resolution-note">Resolution note (optional)</Label>
            <Textarea id="teacher-resolution-note" className="min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmResolve} disabled={saving}>
              {saving ? "Saving…" : "Mark resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
