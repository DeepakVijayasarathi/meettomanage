import { useEffect, useState, type ReactNode } from "react";
import { Bot, CircleDollarSign, Eye, EyeOff, Gauge, Loader2, MessageCircleQuestion, Plus, RefreshCw, Save, Send, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { useToast } from "@/hooks/use-toast";
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
import { apiEnabled, userMessage } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";
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
  getAiChatConfiguration,
  updateAiChatConfiguration,
  testAiChat,
  listAiModels,
  getAiCostMonitor,
  type AiChatConfiguration,
} from "@/api/chatbot";
import { MOCK_CHAT_FAQS, MOCK_CHAT_ESCALATIONS, MOCK_CHATBOT_USAGE_STATS } from "@/data/chatbot";
import { useSession } from "@/state/session";

const EMPTY_FORM: SaveChatFaqRequest = { question: "", answer: "", keywords: "", category: "", isActive: true, sortOrder: 0 };

export default function ChatbotAdmin() {
  const { role } = useSession();
  const canConfigureAi = role === "admin";
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
          {canConfigureAi && <TabsTrigger value="ai">AI Provider</TabsTrigger>}
          <TabsTrigger value="escalations">Escalations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="faqs">
          <FaqManager />
        </TabsContent>
        {canConfigureAi && <TabsContent value="ai"><AiProviderPanel /></TabsContent>}
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

const DEFAULT_AI: AiChatConfiguration = {
  enabled: false, endpoint: "https://inference.hetzner.com/api/v1", model: "Qwen/Qwen3.6-35B-A3B-FP8", systemPrompt: "Answer in 2-3 short sentences.",
  maxTokens: 500, temperature: 0.3, hasApiKey: false, maskedApiKey: "", inputCostPerMillionTokensUsd: 0, outputCostPerMillionTokensUsd: 0, monthlyBudgetUsd: 0,
};

function AiProviderPanel() {
  const { toast } = useToast();
  const { data: loaded, loading, error: loadError, reload } = useApiData(() => getAiChatConfiguration(), DEFAULT_AI);
  const { data: cost, error: costError, reload: reloadCost } = useApiData(() => getAiCostMonitor(), null);
  const [form, setForm] = useState<AiChatConfiguration>(DEFAULT_AI);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testQuestion, setTestQuestion] = useState("What is Node.js?");
  const [testAnswer, setTestAnswer] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useApiData replaces its fallback after loading; mirror that result into the editable form.
  useEffect(() => setForm(loaded), [loaded]);

  async function save() {
    if (!form.endpoint.trim() || !form.model.trim()) { setError("Enter the endpoint URL and model."); return; }
    setSaving(true); setError(null);
    try {
      await updateAiChatConfiguration({ ...form, endpoint: form.endpoint.trim(), model: form.model.trim(), apiKey: apiKey.trim() || undefined });
      setApiKey(""); reload(); reloadCost();
      toast({ variant: "success", title: "AI provider saved", description: "The shared assistant now uses this configuration in every enabled portal." });
    } catch (err) { const message = userMessage(err, "Could not save the AI provider."); setError(message); }
    finally { setSaving(false); }
  }

  async function test() {
    setTesting(true); setError(null); setTestAnswer("");
    try { setTestAnswer((await testAiChat(testQuestion)).answer); reloadCost(); }
    catch (err) { setError(userMessage(err, "The AI connection test failed.")); }
    finally { setTesting(false); }
  }

  async function loadModels() {
    setLoadingModels(true); setError(null);
    try { const items = await listAiModels(); setModels(items); if (items.length === 0) setError("The provider returned no models."); }
    catch (err) { setError(userMessage(err, "Could not load models. Save the endpoint and bearer key first.")); }
    finally { setLoadingModels(false); }
  }

  if (loading) return <Card><CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading AI configuration…</CardContent></Card>;
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Portal AI assistant</CardTitle>
        <CardDescription>Configure Hetzner Inference or another OpenAI/Ollama-compatible provider used by every portal. The authorization key is encrypted and only sent by the server.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        {(loadError || error) && <InlineAlert variant="error">{error ?? loadError ?? "Unable to load."}</InlineAlert>}
        <div className="flex items-center justify-between rounded-lg border p-4"><div><Label>Use AI answers</Label><p className="text-xs text-muted-foreground">When unavailable, the chatbot safely falls back to FAQs and teacher escalation.</p></div><Switch checked={form.enabled} onCheckedChange={(enabled) => setForm((f) => ({ ...f, enabled }))} /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2"><Label htmlFor="ai-endpoint">API base URL or chat endpoint</Label><Input id="ai-endpoint" placeholder="https://inference.hetzner.com/api/v1" value={form.endpoint} onChange={(e) => setForm((f) => ({ ...f, endpoint: e.target.value }))} /><p className="text-xs text-muted-foreground">Hetzner: https://inference.hetzner.com/api/v1</p></div>
          <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="ai-model">Model</Label><button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => void loadModels()} disabled={loadingModels}>{loadingModels ? "Loading…" : "Load models"}</button></div>{models.length > 0 ? <select id="ai-model" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}>{!models.includes(form.model) && <option value={form.model}>{form.model}</option>}{models.map((model) => <option key={model} value={model}>{model}</option>)}</select> : <Input id="ai-model" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />}</div>
          <div className="space-y-2"><Label htmlFor="ai-key">Bearer key</Label><div className="relative"><Input id="ai-key" type={showKey ? "text" : "password"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={form.hasApiKey ? "Key saved — enter only to replace" : "Enter bearer key (optional)"} className="pr-10" /><button type="button" onClick={() => setShowKey((v) => !v)} className="absolute right-3 top-2.5 text-muted-foreground" aria-label={showKey ? "Hide key" : "Show key"}>{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="ai-prompt">System prompt</Label><Textarea id="ai-prompt" value={form.systemPrompt} onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))} /></div>
          <div className="space-y-2"><Label htmlFor="ai-tokens">Maximum output tokens</Label><Input id="ai-tokens" type="number" min={1} max={2000} value={form.maxTokens} onChange={(e) => setForm((f) => ({ ...f, maxTokens: Number(e.target.value) }))} /></div>
          <div className="space-y-2"><Label htmlFor="ai-temp">Temperature (0–2)</Label><Input id="ai-temp" type="number" min={0} max={2} step={0.1} value={form.temperature} onChange={(e) => setForm((f) => ({ ...f, temperature: Number(e.target.value) }))} /></div>
          <div className="space-y-2"><Label htmlFor="ai-input-price">Input price / 1M tokens (USD)</Label><Input id="ai-input-price" type="number" min={0} step={0.000001} value={form.inputCostPerMillionTokensUsd} onChange={(e) => setForm((f) => ({ ...f, inputCostPerMillionTokensUsd: Number(e.target.value) }))} /></div>
          <div className="space-y-2"><Label htmlFor="ai-output-price">Output price / 1M tokens (USD)</Label><Input id="ai-output-price" type="number" min={0} step={0.000001} value={form.outputCostPerMillionTokensUsd} onChange={(e) => setForm((f) => ({ ...f, outputCostPerMillionTokensUsd: Number(e.target.value) }))} /></div>
          <div className="space-y-2"><Label htmlFor="ai-budget">Monthly AI budget (USD)</Label><Input id="ai-budget" type="number" min={0} step={0.01} value={form.monthlyBudgetUsd} onChange={(e) => setForm((f) => ({ ...f, monthlyBudgetUsd: Number(e.target.value) }))} /><p className="text-xs text-muted-foreground">Set 0 to monitor usage without a budget alert.</p></div>
        </div>
        <Button onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save configuration</Button>
        <div className="space-y-3 border-t pt-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><Label className="flex items-center gap-2 text-base"><CircleDollarSign className="h-4 w-4 text-primary" />AI cost monitor</Label><p className="mt-1 text-xs text-muted-foreground">Provider usage for {cost?.periodLabel ?? "this month"}; estimates use the prices configured above.</p></div><Button variant="outline" size="sm" onClick={reloadCost}><RefreshCw className="mr-2 h-3.5 w-3.5" />Refresh</Button></div>{costError && <InlineAlert variant="error">{costError}</InlineAlert>}{cost && <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><AiCostMetric label="Estimated spend" value={cost.pricingConfigured ? `$${cost.estimatedCostUsd.toFixed(4)}` : "Set pricing"} detail={cost.monthlyBudgetUsd > 0 ? `${cost.budgetUsedPercent}% of $${cost.monthlyBudgetUsd.toFixed(2)} budget` : "No monthly budget set"} warning={cost.monthlyBudgetUsd > 0 && cost.budgetUsedPercent >= 80} /><AiCostMetric label="Requests" value={formatNumber(cost.requests)} detail={`${cost.successfulRequests} successful · ${cost.failedRequests} failed`} warning={cost.failedRequests > 0} /><AiCostMetric label="Total tokens" value={formatNumber(cost.totalTokens)} detail={`${formatNumber(cost.inputTokens)} input · ${formatNumber(cost.outputTokens)} output`} /><AiCostMetric label="Success rate" value={cost.requests === 0 ? "No usage" : `${Math.round(100 * cost.successfulRequests / cost.requests)}%`} detail={`Updated ${formatDate(cost.generatedAtUtc, "datetime")}`} icon={<Gauge className="h-4 w-4" />} /></div>{cost.monthlyBudgetUsd > 0 && <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full transition-all ${cost.budgetUsedPercent >= 100 ? "bg-destructive" : cost.budgetUsedPercent >= 80 ? "bg-warning" : "bg-primary"}`} style={{ width: `${Math.min(100, cost.budgetUsedPercent)}%` }} /></div>}{!cost.pricingConfigured && <InlineAlert variant="warning">Enter your provider&apos;s input and output token prices to calculate estimated spend.</InlineAlert>}</>}</div>
        <div className="space-y-3 border-t pt-5"><Label htmlFor="ai-test">Test saved configuration</Label><div className="flex gap-2"><Input id="ai-test" value={testQuestion} onChange={(e) => setTestQuestion(e.target.value)} /><Button variant="outline" onClick={() => void test()} disabled={testing || !testQuestion.trim()}>{testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}<span className="ml-2">Test</span></Button></div>{testAnswer && <div className="rounded-lg bg-muted p-3 text-sm">{testAnswer}</div>}</div>
      </CardContent>
    </Card>
  );
}

function AiCostMetric({ label, value, detail, warning = false, icon }: { label: string; value: string; detail: string; warning?: boolean; icon?: ReactNode }) {
  return <div className={`rounded-lg border p-3 ${warning ? "border-warning/40 bg-warning/5" : "bg-muted/20"}`}><p className="text-xs font-medium text-muted-foreground">{label}</p><p className={`mt-1 flex items-center gap-1.5 text-xl font-bold ${warning ? "text-warning-foreground" : ""}`}>{icon}{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{detail}</p></div>;
}

function FaqManager() {
  const { toast } = useToast();
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
      toast({ variant: "success", title: editing ? "FAQ updated" : "FAQ created" });
    } catch (err) {
      const message = userMessage(err, "Could not save the FAQ.");
      setError(message);
      toast({ variant: "error", title: "Couldn't save FAQ", description: message });
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
      toast({ variant: "success", title: "FAQ deleted" });
    } catch (err) {
      const message = userMessage(err, "Could not delete that FAQ.");
      setNotice(message);
      toast({ variant: "error", title: "Couldn't delete FAQ", description: message });
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
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(faq)}
            aria-label={`Delete "${faq.question}"`}
          >
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

      {faqs.length === 0 && !loadError ? (
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
          emptyTitle="No FAQs configured yet"
          emptyDescription="Add a question and answer so the 'Ask a Doubt' chatbot can respond automatically."
          error={apiEnabled() ? loadError : null}
          onRetry={reload}
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
              <Label htmlFor="faq-question">Question <span className="text-destructive">*</span></Label>
              <Input id="faq-question" value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="faq-answer">Answer <span className="text-destructive">*</span></Label>
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
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {saving ? "Saving…" : editing ? "Save changes" : "Add FAQ"}
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
  const { toast } = useToast();
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
      toast({ variant: "success", title: "Doubt resolved" });
    } catch (err) {
      const message = userMessage(err, "Could not resolve that doubt.");
      setNotice(message);
      toast({ variant: "error", title: "Couldn't resolve doubt", description: message });
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

      {escalations.length === 0 && !loadError ? (
        <EmptyState icon={MessageCircleQuestion} title="No escalations" description="Every doubt so far has matched an FAQ — nothing has needed a teacher yet." />
      ) : (
        <DataTable
          data={escalations}
          columns={columns}
          rowKey={(e) => e.id}
          searchPlaceholder="Search doubts…"
          searchFn={(e, query) => e.question.toLowerCase().includes(query.toLowerCase()) || e.userName.toLowerCase().includes(query.toLowerCase())}
          error={apiEnabled() ? loadError : null}
          onRetry={reload}
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
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {saving ? "Saving…" : "Mark resolved"}
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
