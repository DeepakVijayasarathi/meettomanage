import { useState } from "react";
import { MessageCircleQuestion, Plus, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useApiData } from "@/api/hooks";
import { apiEnabled } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  listAllFaqs,
  createChatFaq,
  updateChatFaq,
  deleteChatFaq,
  listChatEscalations,
  resolveChatEscalation,
  getChatbotUsageStats,
  type ApiChatFaq,
  type ApiChatEscalation,
  type SaveChatFaqRequest,
} from "@/api/chatbot";
import { MOCK_CHAT_FAQS, MOCK_CHAT_ESCALATIONS, MOCK_CHATBOT_USAGE_STATS } from "@/data/chatbot";

const EMPTY_FORM: SaveChatFaqRequest = { question: "", answer: "", keywords: "", category: "", isActive: true, sortOrder: 0 };

export default function ChatbotAdmin() {
  return (
    <div>
      <PageHeader
        eyebrow="Communication"
        title="Doubt Chatbot"
        description="The FAQ knowledge base the 'Ask a Doubt' widget matches against, doubts it escalated to a teacher, and how much it's being used."
      />
      <Tabs defaultValue="faqs">
        <TabsList>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="escalations">Escalations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="faqs">
          <FaqManager />
        </TabsContent>
        <TabsContent value="escalations">
          <EscalationsPanel />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FaqManager() {
  const { data: faqs, error: loadError, reload } = useApiData<ApiChatFaq[]>(() => listAllFaqs(), MOCK_CHAT_FAQS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiChatFaq | null>(null);
  const [form, setForm] = useState<SaveChatFaqRequest>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiChatFaq | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sortOrder: faqs.length });
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(faq: ApiChatFaq) {
    setEditing(faq);
    setForm({
      question: faq.question,
      answer: faq.answer,
      keywords: faq.keywords ?? "",
      category: faq.category ?? "",
      isActive: faq.isActive,
      sortOrder: faq.sortOrder,
    });
    setError(null);
    setDialogOpen(true);
  }

  async function save() {
    if (!form.question.trim() || !form.answer.trim()) {
      setError("Enter both a question and an answer.");
      return;
    }
    if (!apiEnabled()) {
      setNotice("Demo mode — changes not persisted.");
      setDialogOpen(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateChatFaq(editing.id, form);
      } else {
        await createChatFaq(form);
      }
      setDialogOpen(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the FAQ.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (!apiEnabled()) {
      setNotice("Demo mode — nothing was actually deleted.");
      setDeleteTarget(null);
      return;
    }
    setDeleting(true);
    try {
      await deleteChatFaq(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not delete that FAQ.");
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<ApiChatFaq>[] = [
    {
      key: "question",
      header: "Question",
      render: (faq) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground" title={faq.question}>{faq.question}</p>
          {faq.category && <p className="text-xs text-muted-foreground">{faq.category}</p>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (faq) => (
        <Badge variant={faq.isActive ? "secondary" : "outline"}>{faq.isActive ? "Active" : "Inactive"}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (faq) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => openEdit(faq)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(faq)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add FAQ
        </Button>
      </div>

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

      {faqs.length === 0 ? (
        <EmptyState
          icon={MessageCircleQuestion}
          title="No FAQs yet"
          description="The chatbot has nothing to match against until some are added here."
          action={
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add FAQ
            </Button>
          }
        />
      ) : (
        <DataTable
          data={faqs}
          columns={columns}
          rowKey={(f) => f.id}
          searchPlaceholder="Search FAQs…"
          searchFn={(f, query) => f.question.toLowerCase().includes(query.toLowerCase())}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit FAQ" : "Add an FAQ"}</DialogTitle>
            <DialogDescription>
              Keywords are extra terms the chatbot should also treat as a match — comma-separated (e.g. "fee, invoice, payment").
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
            <div className="grid gap-1.5">
              <Label htmlFor="faq-question">Question</Label>
              <Input id="faq-question" value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="faq-answer">Answer</Label>
              <Textarea
                id="faq-answer"
                className="min-h-[100px]"
                value={form.answer}
                onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="faq-category">Category (optional)</Label>
                <Input id="faq-category" value={form.category ?? ""} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="faq-keywords">Keywords (optional)</Label>
                <Input id="faq-keywords" value={form.keywords ?? ""} onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="faq-active">Active</Label>
              <Switch id="faq-active" checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this FAQ?"
        description={deleteTarget ? `"${deleteTarget.question}" will no longer be matched by the chatbot.` : ""}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function EscalationsPanel() {
  const { data: escalations, error: loadError, reload } = useApiData<ApiChatEscalation[]>(
    () => listChatEscalations(),
    MOCK_CHAT_ESCALATIONS
  );
  const [resolveTarget, setResolveTarget] = useState<ApiChatEscalation | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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
      key: "status",
      header: "Status",
      render: (e) => <Badge variant={e.status === "Pending" ? "warning" : "success"}>{e.status}</Badge>,
    },
    {
      key: "resolution",
      header: "Resolution",
      render: (e) =>
        e.status === "Resolved" ? (
          <p className="max-w-xs truncate text-xs text-muted-foreground" title={e.resolutionNote ?? undefined}>
            {e.resolutionNote ? `${e.resolutionNote} — ${e.resolvedByName}` : `Resolved by ${e.resolvedByName}`}
          </p>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      render: (e) =>
        e.status === "Pending" ? (
          <Button size="sm" variant="ghost" onClick={() => openResolve(e)}>
            Resolve
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
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

      {escalations.length === 0 ? (
        <EmptyState icon={MessageCircleQuestion} title="No escalations" description="Every doubt so far has matched an FAQ — nothing has needed a teacher yet." />
      ) : (
        <DataTable
          data={escalations}
          columns={columns}
          rowKey={(e) => e.id}
          searchPlaceholder="Search doubts…"
          searchFn={(e, query) => e.question.toLowerCase().includes(query.toLowerCase()) || e.userName.toLowerCase().includes(query.toLowerCase())}
        />
      )}

      <Dialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve this doubt</DialogTitle>
            <DialogDescription>{resolveTarget?.question}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="resolution-note">Resolution note (optional)</Label>
            <Textarea id="resolution-note" className="min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} />
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

function AnalyticsPanel() {
  const { data: stats } = useApiData(() => getChatbotUsageStats(), MOCK_CHATBOT_USAGE_STATS);

  const tiles: { label: string; value: number }[] = [
    { label: "Questions asked", value: stats.totalQuestions },
    { label: "Answered by bot", value: stats.answeredByBot },
    { label: "Escalated to teacher", value: stats.escalatedToTeacher },
    { label: "Pending escalations", value: stats.pendingEscalations },
    { label: "Marked unhelpful", value: stats.markedUnhelpful },
    { label: "Active users", value: stats.activeUsers },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardContent className="pt-5">
              <p className="text-2xl font-bold text-foreground">{tile.value}</p>
              <p className="text-xs text-muted-foreground">{tile.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" /> Top unanswered questions
          </CardTitle>
          <CardDescription>The doubts escalated most often — good candidates for a new FAQ entry.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topUnansweredQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing escalated yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {stats.topUnansweredQuestions.map((q) => (
                <li key={q} className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-foreground">
                  {q}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
