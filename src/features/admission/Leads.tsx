import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Mail, MessageSquarePlus, Phone, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CHART_PALETTE } from "@/lib/roles";
import { formatDate, getInitials } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  listDemoBookings,
  listParentDemoHistory,
  toApiConversionStatus,
  toFrontendLead,
  updateConversionStatus,
  type ApiParentDemoHistory,
} from "@/api/demoBookings";
import { LEADS as INITIAL_LEADS, type ConversionStage, type Lead } from "./data";

const STAGE_OPTIONS: { value: ConversionStage | "all"; label: string }[] = [
  { value: "all", label: "All stages" },
  { value: "Demo Scheduled", label: "Demo Scheduled" },
  { value: "Demo Completed", label: "Demo Completed" },
  { value: "Follow-up", label: "Follow-up" },
  { value: "Payment Pending", label: "Payment Pending" },
  { value: "Partially Paid", label: "Partially Paid" },
  { value: "Enrolled", label: "Enrolled" },
  { value: "Not Interested", label: "Not Interested" },
];

const STAGE_BADGE: Record<ConversionStage, BadgeProps["variant"]> = {
  "Demo Scheduled": "outline",
  "Demo Completed": "secondary",
  "Follow-up": "warning",
  "Payment Pending": "warning",
  "Partially Paid": "secondary",
  Enrolled: "success",
  "Not Interested": "destructive",
};

export default function AdmissionLeads() {
  const { data: apiLeads, reload } = useApiData(
    () => listDemoBookings().then((bookings) => bookings.map(toFrontendLead)),
    INITIAL_LEADS
  );
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  useEffect(() => setLeads(apiLeads), [apiLeads]);
  const [stageFilter, setStageFilter] = useState<ConversionStage | "all">("all");
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  // Per-parent demo record (every demo this parent has ever taken) for the open lead.
  const [history, setHistory] = useState<ApiParentDemoHistory | null>(null);
  useEffect(() => {
    setHistory(null);
    if (!apiEnabled() || !activeLead?.email) return;
    let cancelled = false;
    listParentDemoHistory(activeLead.email)
      .then((records) => {
        if (!cancelled) setHistory(records.find((r) => r.parentEmail === activeLead.email) ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeLead]);
  const [noteText, setNoteText] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [justLogged, setJustLogged] = useState<string | null>(null);
  const [loggingFollowUp, setLoggingFollowUp] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [newStage, setNewStage] = useState<ConversionStage>("Demo Scheduled");

  const filtered = useMemo(
    () => (stageFilter === "all" ? leads : leads.filter((l) => l.conversionStage === stageFilter)),
    [leads, stageFilter]
  );

  function openFollowUp(lead: Lead) {
    setActiveLead(lead);
    setNoteText("");
    setNextFollowUp(lead.nextFollowUpOn ?? "");
    setFollowUpError(null);
    setNewStage(lead.conversionStage);
  }

  async function handleLogFollowUp() {
    if (!activeLead || !noteText.trim()) return;

    if (apiEnabled()) {
      // The API keeps one running notes field per booking; append and persist
      const combined = [...activeLead.notes.map((n) => n.note), noteText.trim()].join("\n");
      setLoggingFollowUp(true);
      setFollowUpError(null);
      try {
        await updateConversionStatus(activeLead.id, toApiConversionStatus(newStage), combined);
        reload();
        setJustLogged(activeLead.childName);
        setTimeout(() => setJustLogged(null), 4000);
        setActiveLead(null);
      } catch (err) {
        setFollowUpError(err instanceof Error ? err.message : "Couldn't save this follow-up. Please try again.");
      } finally {
        setLoggingFollowUp(false);
      }
      return;
    }

    const today = "2026-07-09";
    const newNote = {
      id: `n-${Math.random().toString(36).slice(2, 9)}`,
      date: today,
      note: noteText.trim(),
      loggedBy: "Priya Menon",
      nextFollowUpDate: nextFollowUp || undefined,
    };
    setLeads((prev) =>
      prev.map((l) =>
        l.id === activeLead.id
          ? {
              ...l,
              notes: [...l.notes, newNote],
              lastContactedOn: today,
              nextFollowUpOn: nextFollowUp || l.nextFollowUpOn,
              conversionStage: newStage,
            }
          : l
      )
    );
    setJustLogged(activeLead.childName);
    setActiveLead(null);
    setTimeout(() => setJustLogged(null), 4000);
  }

  const columns: DataTableColumn<Lead>[] = useMemo(
    () => [
      {
        key: "lead",
        header: "Lead",
        sortable: true,
        accessor: (row) => row.childName,
        render: (row) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback
                style={{
                  backgroundColor: `${CHART_PALETTE[row.childName.length % CHART_PALETTE.length]}22`,
                  color: CHART_PALETTE[row.childName.length % CHART_PALETTE.length],
                }}
              >
                {getInitials(row.childName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{row.childName}</p>
              <p className="truncate text-xs text-muted-foreground">Parent: {row.parentName}</p>
            </div>
          </div>
        ),
      },
      {
        key: "contact",
        header: "Contact",
        render: (row) => (
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-3 w-3" /> {row.phone}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3 w-3" /> {row.email}
            </span>
          </div>
        ),
      },
      {
        key: "demoStatus",
        header: "Demo Status",
        render: (row) => (
          <Badge variant={row.conversionStage === "Demo Scheduled" ? "outline" : "secondary"}>
            {row.conversionStage === "Demo Scheduled" ? `Scheduled · ${formatDate(row.demoDate)}` : "Completed"}
          </Badge>
        ),
      },
      {
        key: "course",
        header: "Recommended Course",
        render: (row) => <span className="text-sm text-muted-foreground">{row.recommendedCourse}</span>,
      },
      {
        key: "stage",
        header: "Conversion Status",
        sortable: true,
        accessor: (row) => row.conversionStage,
        render: (row) => <Badge variant={STAGE_BADGE[row.conversionStage]}>{row.conversionStage}</Badge>,
      },
      {
        key: "lastContacted",
        header: "Last Contacted",
        sortable: true,
        accessor: (row) => row.lastContactedOn,
        render: (row) => (
          <div className="text-xs">
            <p className="font-medium text-foreground">{formatDate(row.lastContactedOn)}</p>
            {row.nextFollowUpOn && <p className="text-muted-foreground">Next: {formatDate(row.nextFollowUpOn)}</p>}
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <Button
            variant="soft"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openFollowUp(row);
            }}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" /> Log follow-up
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Leads"
        description="Every parent enquiry, demo and follow-up in one pipeline — log a note any time you speak with a family."
      />

      {justLogged && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" />
          Follow-up logged for {justLogged}.
        </div>
      )}

      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(row) => row.id}
        searchPlaceholder="Search by child, parent, phone or course…"
        onRowClick={(row) => openFollowUp(row)}
        toolbar={
          <Select value={stageFilter} onValueChange={(v) => setStageFilter(v as ConversionStage | "all")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Dialog open={!!activeLead} onOpenChange={(open) => !open && setActiveLead(null)}>
        <DialogContent className="max-w-lg">
          {activeLead && (
            <>
              <DialogHeader>
                <DialogTitle>{activeLead.childName}</DialogTitle>
                <DialogDescription>
                  Parent: {activeLead.parentName} · {activeLead.phone} · Source: {activeLead.source}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-2">
                <Badge variant={STAGE_BADGE[activeLead.conversionStage]}>{activeLead.conversionStage}</Badge>
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" /> {activeLead.recommendedCourse}
                </Badge>
              </div>

              {/* Demo record: every demo this parent has taken, with teacher + auto fee. */}
              {history && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demo history</p>
                      <p className="text-xs font-semibold text-foreground">
                        {history.totalDemos} demo{history.totalDemos === 1 ? "" : "s"} · {history.enrolledCount} enrolled · ₹{history.totalPayable} payable
                      </p>
                    </div>
                    <div className="flex max-h-36 flex-col gap-1.5 overflow-y-auto">
                      {history.bookings.map((b) => (
                        <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate text-foreground">
                            {b.childName}
                            <span className="text-xs text-muted-foreground">
                              {" "}
                              · {b.scheduledStartAtUtc ? formatDate(b.scheduledStartAtUtc.slice(0, 10)) : "—"} · {b.teacherName ?? "—"}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-foreground">₹{b.payableAmount}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeLead.notes.length > 0 && (
                <Card className="bg-muted/30">
                  <CardContent className="flex max-h-40 flex-col gap-3 overflow-y-auto p-4">
                    {[...activeLead.notes].reverse().map((n) => (
                      <div key={n.id} className="text-sm">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {formatDate(n.date, "long")} · {n.loggedBy}
                        </p>
                        <p className="mt-0.5 text-foreground">{n.note}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Separator />

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="followUpNote">Log a new follow-up note</Label>
                <Textarea
                  id="followUpNote"
                  placeholder="What did you discuss with the parent?"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nextFollowUp">Next follow-up date</Label>
                  <Input id="nextFollowUp" type="date" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Move to stage</Label>
                  <Select value={newStage} onValueChange={(v) => setNewStage(v as ConversionStage)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.filter((o) => o.value !== "all").map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {followUpError && <p className="text-sm font-medium text-destructive">{followUpError}</p>}

              <DialogFooter>
                <Button variant="outline" onClick={() => setActiveLead(null)} disabled={loggingFollowUp}>
                  Close
                </Button>
                <Button disabled={!noteText.trim() || loggingFollowUp} onClick={handleLogFollowUp}>
                  <MessageSquarePlus className="h-4 w-4" /> {loggingFollowUp ? "Saving…" : "Save follow-up"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
