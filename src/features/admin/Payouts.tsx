import { useMemo, useState } from "react";
import { format, parse } from "date-fns";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  IndianRupee,
  Loader2,
  Settings2,
  UsersRound,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { InlineAlert } from "@/components/InlineAlert";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PAYOUTS } from "@/data/payouts";
import { getTeacherById } from "@/data/users";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { adjustPayoutItem, finalizePayout, listPayouts, markPayoutPaid, toFrontendPayout } from "@/api/payouts";
import { listAttendance, type ApiSessionAttendance } from "@/api/academicOps";
import { downloadReportCsv } from "@/api/reports";
import type { TeacherPayout, TeacherPayoutItem } from "@/types";
import { formatCurrency, formatNumber, getInitials, toCsv } from "@/lib/utils";
import { utcIsoToLocalDateTime } from "@/lib/datetime";

function formatClockTime(isoUtc: string) {
  const { time } = utcIsoToLocalDateTime(isoUtc);
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminPayouts() {
  const { toast } = useToast();
  const { data: payouts, loading: payoutsLoading, error: payoutsError, reload: reloadPayouts } = useApiData(
    () => listPayouts().then((items) => items.map(toFrontendPayout)),
    PAYOUTS
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Finalize/mark-paid: the API client (finalizePayout/markPayoutPaid) and backend
  // (PayoutService.FinalizeAsync/MarkPaidAsync, already tested) existed with no UI
  // anywhere calling them — this table was purely read-only, so a payout could never
  // actually be finalized or paid from the app itself.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ payout: TeacherPayout; action: "finalize" | "mark-paid" } | null>(null);

  // Review flow: a payout can't finalize while any item is flagged (teacher's captured
  // attendance fell well short of the scheduled class) — this dialog is the only way to act
  // on that, either correcting the amount or confirming it as-is (same amount, a reason logged).
  const [reviewPayout, setReviewPayout] = useState<TeacherPayout | null>(null);
  const [reviewAmounts, setReviewAmounts] = useState<Record<string, string>>({});
  const [reviewReasons, setReviewReasons] = useState<Record<string, string>>({});
  const [reviewSavingId, setReviewSavingId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  // The item's own note already says *how many* minutes were attended, but not *when* —
  // this pulls the teacher's actual join/leave timestamps for the review dialog so the
  // reason isn't just a generated sentence, it's the real clock times an admin can check
  // against the scheduled slot themselves. Best-effort per item: a lookup failure just
  // leaves that item without a timing line rather than blocking the review dialog.
  const [reviewTiming, setReviewTiming] = useState<Record<string, ApiSessionAttendance | null>>({});

  function openReview(payout: TeacherPayout) {
    setReviewError(null);
    const flagged = payout.items.filter((i) => i.requiresReview);
    setReviewAmounts(Object.fromEntries(flagged.map((i) => [i.id, String(i.amount)])));
    setReviewReasons(Object.fromEntries(flagged.map((i) => [i.id, ""])));
    setReviewTiming({});
    setReviewPayout(payout);

    for (const item of flagged) {
      if (!item.classSessionId) continue;
      listAttendance(item.classSessionId)
        .then((records) => {
          const teacherRecord = records.find((r) => r.participantType === "Teacher") ?? null;
          setReviewTiming((prev) => ({ ...prev, [item.id]: teacherRecord }));
        })
        .catch(() => undefined);
    }
  }

  async function saveReviewItem(item: TeacherPayoutItem) {
    if (!reviewPayout) return;
    const reason = (reviewReasons[item.id] ?? "").trim();
    if (!reason) {
      setReviewError("A reason is required before saving.");
      return;
    }
    const newAmount = Number(reviewAmounts[item.id]);
    if (!Number.isFinite(newAmount)) {
      setReviewError("Enter a valid amount.");
      return;
    }
    setReviewSavingId(item.id);
    setReviewError(null);
    try {
      const updated = await adjustPayoutItem(reviewPayout.id, item.id, { newAmount, reason });
      const stillFlagged = updated.items.some((i) => i.requiresReview);
      await reloadPayouts();
      if (stillFlagged) {
        setReviewPayout((prev) =>
          prev ? { ...prev, items: prev.items.map((i) => (i.id === item.id ? { ...i, requiresReview: false, amount: newAmount } : i)) } : prev
        );
      } else {
        setReviewPayout(null);
      }
      toast({ variant: "success", title: "Adjustment saved" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save this adjustment.";
      setReviewError(message);
      toast({ variant: "error", title: "Couldn't save adjustment", description: message });
    } finally {
      setReviewSavingId(null);
    }
  }

  async function runPayoutAction() {
    if (!confirmTarget) return;
    const { payout, action } = confirmTarget;
    if (!apiEnabled()) {
      setActionError(`Demo mode — no payout actually ${action === "finalize" ? "finalized" : "marked paid"}.`);
      setConfirmTarget(null);
      return;
    }
    setBusyId(payout.id);
    setActionError(null);
    try {
      if (action === "finalize") await finalizePayout(payout.id);
      else await markPayoutPaid(payout.id);
      await reloadPayouts();
      toast({ variant: "success", title: action === "finalize" ? "Payout finalized" : "Payout marked paid" });
    } catch (err) {
      const message = err instanceof Error ? err.message : `Could not ${action === "finalize" ? "finalize" : "mark paid"} this payout.`;
      setActionError(message);
      toast({ variant: "error", title: "Couldn't update payout", description: message });
    } finally {
      setBusyId(null);
      setConfirmTarget(null);
    }
  }

  async function handleExport() {
    setExportError(null);
    if (apiEnabled()) {
      setExporting(true);
      try {
        await downloadReportCsv("payouts");
      } catch {
        setExportError("Couldn't reach the export endpoint. Showing the on-screen list as CSV instead.");
        downloadCsv(
          `payouts-${new Date().toISOString().slice(0, 10)}.csv`,
          toCsv(
            ["Teacher", "Month", "Sessions", "Base Amount", "Deductions", "Waiting Added", "Final Amount", "Status"],
            payouts.map((p) => [p.teacherName, p.month, p.sessionsCompleted, p.baseAmount, p.deductions, p.waitingAmountAdded, p.finalAmount, p.status])
          )
        );
      } finally {
        setExporting(false);
      }
      return;
    }
    downloadCsv(
      "payouts-2026-07-09.csv",
      toCsv(
        ["Teacher", "Month", "Sessions", "Base Amount", "Deductions", "Waiting Added", "Final Amount", "Status"],
        payouts.map((p) => [p.teacherName, p.month, p.sessionsCompleted, p.baseAmount, p.deductions, p.waitingAmountAdded, p.finalAmount, p.status])
      )
    );
  }

  // Demo mock data is authored around a fixed set of months (e.g. June/July 2026) that fall
  // further into the past every day relative to the real calendar -- comparing it against
  // `new Date()` made the headline "Total Payout" KPI read as ₹0/0/0 forever once today rolled
  // past the mock data's last month, right next to teacher cards showing real paid amounts for
  // those "past" months. In demo mode, treat the most recent month actually present in the
  // mock data as "this month" so the KPI always reflects the data visible below it; API mode
  // keeps using the real current month since live data is genuinely dated to it.
  const currentMonthLabel = apiEnabled()
    ? format(new Date(), "MMMM yyyy")
    : payouts.reduce<string | null>((latest, p) => {
        if (!latest) return p.month;
        return parse(p.month, "MMMM yyyy", new Date()) > parse(latest, "MMMM yyyy", new Date()) ? p.month : latest;
      }, null) ?? format(new Date(), "MMMM yyyy");

  const totals = useMemo(() => {
    // Both counts below used to run over ALL of `payouts` regardless of month -- while
    // sitting right next to a KPI card explicitly labeled "Total Payout — <this month>".
    // A teacher paid in a past month counted toward "Teachers Paid" forever, and a
    // long-since-resolved pending payout from months ago kept inflating "Pending
    // Calculations" — three cards that read as one snapshot of the same period, two of
    // which were secretly all-time. Scoped to the same `thisMonth` set now.
    const thisMonth = payouts.filter((p) => p.month === currentMonthLabel);
    // Distinct teachers, not payout rows -- one teacher with three paid months
    // (one row each) was counting as 3 toward a card literally titled "Teachers Paid".
    const paidTeacherIds = new Set(thisMonth.filter((p) => p.status === "paid").map((p) => p.teacherId));
    const pendingCount = thisMonth.filter((p) => p.status === "pending").length;
    return {
      totalThisMonth: thisMonth.reduce((sum, p) => sum + p.finalAmount, 0),
      teachersPaid: paidTeacherIds.size,
      pendingCalculations: pendingCount,
    };
  }, [payouts, currentMonthLabel]);

  const [teacherSearch, setTeacherSearch] = useState("");
  const [collapsedTeacherIds, setCollapsedTeacherIds] = useState<Set<string>>(new Set());

  function toggleTeacherGroup(teacherId: string) {
    setCollapsedTeacherIds((prev) => {
      const next = new Set(prev);
      if (next.has(teacherId)) next.delete(teacherId);
      else next.add(teacherId);
      return next;
    });
  }

  /** One card per teacher instead of a flat month-by-month list -- the same teacher
   *  repeating once per month (see the screenshot this grouping was built from: "UAT Test
   *  Teacher" three times in a row) made it hard to see a teacher's overall standing at a
   *  glance, or to tell how many distinct teachers were even being paid at all. */
  const teacherGroups = useMemo(() => {
    const byTeacher = new Map<string, TeacherPayout[]>();
    for (const payout of payouts) {
      const list = byTeacher.get(payout.teacherId) ?? [];
      list.push(payout);
      byTeacher.set(payout.teacherId, list);
    }

    const query = teacherSearch.trim().toLowerCase();
    const groups = [...byTeacher.entries()]
      .map(([teacherId, rows]) => {
        const sorted = [...rows].sort((a, b) => b.month.localeCompare(a.month));
        return {
          teacherId,
          teacherName: rows[0].teacherName,
          rows: sorted,
          // Split instead of one combined figure -- "how much has actually gone out" and
          // "how much is still owed" are different questions an admin asks, and a single
          // lump total answered neither of them clearly. Pending here covers both
          // not-yet-finalized and finalized-but-unpaid amounts -- either way, money the
          // teacher hasn't actually received yet.
          paidTotal: rows.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.finalAmount, 0),
          pendingTotal: rows.filter((p) => p.status !== "paid").reduce((sum, p) => sum + p.finalAmount, 0),
          pendingCount: rows.filter((p) => p.status === "pending" && !p.requiresReview).length,
          needsReviewCount: rows.filter((p) => p.requiresReview).length,
        };
      })
      .filter((g) => !query || g.teacherName.toLowerCase().includes(query));

    // Whoever needs the admin's attention floats to the top; the rest settle alphabetically.
    return groups.sort((a, b) => {
      const aUrgent = a.needsReviewCount > 0 ? 2 : a.pendingCount > 0 ? 1 : 0;
      const bUrgent = b.needsReviewCount > 0 ? 2 : b.pendingCount > 0 ? 1 : 0;
      if (aUrgent !== bUrgent) return bUrgent - aUrgent;
      return a.teacherName.localeCompare(b.teacherName);
    });
  }, [payouts, teacherSearch]);

  function renderStatus(row: TeacherPayout) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={row.status === "paid" ? "success" : row.status === "finalized" ? "default" : "warning"} className="capitalize">
          {row.status}
        </Badge>
        {row.requiresReview && (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Needs review
          </Badge>
        )}
      </div>
    );
  }

  function renderActions(row: TeacherPayout) {
    if (row.status === "pending" && row.requiresReview) {
      return (
        <Button size="sm" variant="outline" className="text-warning-foreground" onClick={() => openReview(row)}>
          <AlertTriangle className="h-3.5 w-3.5" /> Review
        </Button>
      );
    }
    if (row.status === "pending") {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={busyId === row.id}
          onClick={() => setConfirmTarget({ payout: row, action: "finalize" })}
        >
          {busyId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Finalize"}
        </Button>
      );
    }
    if (row.status === "finalized") {
      return (
        <Button size="sm" disabled={busyId === row.id} onClick={() => setConfirmTarget({ payout: row, action: "mark-paid" })}>
          {busyId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Mark Paid"}
        </Button>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs text-success">
        <CheckCircle2 className="h-3.5 w-3.5" /> Paid
      </span>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Payroll"
        title="Teacher Payouts"
        description="Monthly payout calculation from each teacher's rate card, and payment history. Rate cards (and the no-show penalty) are configured in Settings & Branding → Payroll."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin/settings?tab=payroll">
                <Settings2 className="h-4 w-4" />
                Configure Rates
              </Link>
            </Button>
          </div>
        }
      />

      {apiEnabled() && payoutsError && (
        <InlineAlert variant="warning" className="mb-4">
          Could not load payouts ({payoutsError}) — the totals below don't reflect real data.{" "}
          <button type="button" className="underline" onClick={() => reloadPayouts()}>
            Retry
          </button>
        </InlineAlert>
      )}

      {exportError && <InlineAlert variant="warning" className="mb-4">{exportError}</InlineAlert>}

      {actionError && <InlineAlert variant="warning" className="mb-4">{actionError}</InlineAlert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label={`Total Payout — ${currentMonthLabel}`} value={formatCurrency(totals.totalThisMonth)} icon={IndianRupee} tone="primary" loading={payoutsLoading} />
        <KpiCard label="Teachers Paid" value={formatNumber(totals.teachersPaid)} icon={UsersRound} tone="success" loading={payoutsLoading} />
        <KpiCard label="Pending Calculations" value={formatNumber(totals.pendingCalculations)} icon={Wallet} tone="warning" loading={payoutsLoading} />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Input
          value={teacherSearch}
          onChange={(e) => setTeacherSearch(e.target.value)}
          placeholder="Search by teacher name…"
          className="max-w-sm"
        />

        {apiEnabled() && payoutsError ? null : payouts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payouts yet"
            description="Teacher payouts will appear here once sessions are delivered and calculated for a pay period."
          />
        ) : teacherGroups.length === 0 ? (
          <EmptyState icon={Wallet} title="No teacher matches that search" description="Try a different name." />
        ) : (
          teacherGroups.map((group) => {
            const teacher = getTeacherById(group.teacherId);
            const expanded = !collapsedTeacherIds.has(group.teacherId);
            return (
              <div key={group.teacherId} className="overflow-hidden rounded-xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => toggleTeacherGroup(group.teacherId)}
                  className="flex w-full flex-col items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                  aria-expanded={expanded}
                >
                  <div className="flex min-w-0 w-full items-center gap-3 sm:w-auto">
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback style={{ backgroundColor: `${teacher?.avatarColor ?? "#999"}22`, color: teacher?.avatarColor ?? "#999" }}>
                        {getInitials(group.teacherName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{group.teacherName}</p>
                      <p className="text-xs text-muted-foreground">
                        {teacher?.department ?? "—"} · {group.rows.length} month{group.rows.length === 1 ? "" : "s"} on record
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full shrink-0 flex-wrap items-center gap-2 pl-7 sm:w-auto sm:pl-0">
                    {group.needsReviewCount > 0 && (
                      <Badge variant="warning" className="gap-1">
                        <AlertTriangle className="h-3 w-3" /> {group.needsReviewCount} needs review
                      </Badge>
                    )}
                    {group.pendingCount > 0 && <Badge variant="warning">{group.pendingCount} pending</Badge>}
                    <div className="flex flex-col items-end leading-tight">
                      <span className="text-sm font-bold text-success">Paid {formatCurrency(group.paidTotal)}</span>
                      <span className="text-xs font-medium text-warning-foreground">Pending {formatCurrency(group.pendingTotal)}</span>
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="relative border-t border-border">
                    {/* This breakdown table has 8 columns and is genuinely wider than a phone
                        screen — Table already makes it horizontally scrollable, but with no
                        visible cue a user has no reason to think there's more to the right.
                        A static edge fade (unlike DataTable's scroll-position-aware version)
                        is enough here since this is a small, per-row nested table rather than
                        a primary page table. */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-card to-transparent sm:hidden" />
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead>Month</TableHead>
                          <TableHead>Sessions</TableHead>
                          <TableHead>Base Amount</TableHead>
                          <TableHead>Deductions</TableHead>
                          <TableHead>Waiting Added</TableHead>
                          <TableHead>Final Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.month}</TableCell>
                            <TableCell>{row.sessionsCompleted}</TableCell>
                            <TableCell className="text-muted-foreground">{formatCurrency(row.baseAmount)}</TableCell>
                            <TableCell>
                              <span className={row.deductions > 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
                                {row.deductions > 0 ? `-${formatCurrency(row.deductions)}` : "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={row.waitingAmountAdded > 0 ? "font-medium text-success" : "text-muted-foreground"}>
                                {row.waitingAmountAdded > 0 ? `+${formatCurrency(row.waitingAmountAdded)}` : "—"}
                              </span>
                            </TableCell>
                            <TableCell className="font-bold text-foreground">{formatCurrency(row.finalAmount)}</TableCell>
                            <TableCell>{renderStatus(row)}</TableCell>
                            <TableCell>{renderActions(row)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })
        )}

        {apiEnabled() && payoutsError && (
          <InlineAlert variant="warning">
            Could not load payouts ({payoutsError}).{" "}
            <button type="button" className="underline" onClick={() => reloadPayouts()}>
              Retry
            </button>
          </InlineAlert>
        )}
      </div>

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        title={confirmTarget?.action === "finalize" ? "Finalize this payout?" : "Mark this payout as paid?"}
        description={
          confirmTarget?.action === "finalize"
            ? `Locks ${confirmTarget.payout.teacherName}'s ${confirmTarget.payout.month} amount (${formatCurrency(confirmTarget.payout.finalAmount)}) — no more sessions will be added to it.`
            : confirmTarget
              ? `Confirms ${confirmTarget.payout.teacherName}'s ${confirmTarget.payout.month} payout (${formatCurrency(confirmTarget.payout.finalAmount)}) was paid and emails their salary slip.`
              : undefined
        }
        confirmLabel={confirmTarget?.action === "finalize" ? "Finalize" : "Mark Paid"}
        destructive={confirmTarget?.action === "finalize"}
        onConfirm={runPayoutAction}
      />

      <Dialog open={reviewPayout !== null} onOpenChange={(open) => !open && setReviewPayout(null)}>
        <DialogContent className="max-w-lg">
          {reviewPayout && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning-foreground">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  {reviewPayout.teacherName}'s {reviewPayout.month} payout
                </DialogTitle>
                <DialogDescription>
                  Captured attendance for the session(s) below fell well short of the scheduled class. Confirm the
                  amount as-is or correct it — either way, a reason is logged and the flag clears once saved.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                {reviewPayout.items.filter((i) => i.requiresReview).map((item) => {
                  const timing = reviewTiming[item.id];
                  return (
                  <div key={item.id} className="rounded-xl border border-warning/30 bg-warning/5 p-3.5">
                    <p className="text-sm font-medium text-foreground">{item.note}</p>
                    {timing && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        {timing.joinedAtUtc ? (
                          <>
                            Joined {formatClockTime(timing.joinedAtUtc)}
                            {timing.leftAtUtc ? ` · Left ${formatClockTime(timing.leftAtUtc)}` : " · never left before the class was marked complete"}
                          </>
                        ) : (
                          "Never joined — no join time recorded at all"
                        )}
                      </p>
                    )}
                    <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg bg-card p-3 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label htmlFor={`review-amount-${item.id}`}>Amount (₹)</Label>
                        <Input
                          id={`review-amount-${item.id}`}
                          type="number"
                          value={reviewAmounts[item.id] ?? ""}
                          onChange={(e) => setReviewAmounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor={`review-reason-${item.id}`}>Reason</Label>
                        <Textarea
                          id={`review-reason-${item.id}`}
                          rows={1}
                          placeholder="e.g. connection dropped, or confirmed full amount"
                          value={reviewReasons[item.id] ?? ""}
                          onChange={(e) => setReviewReasons((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" disabled={reviewSavingId === item.id} onClick={() => saveReviewItem(item)}>
                        {reviewSavingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                      </Button>
                    </div>
                  </div>
                  );
                })}
                {reviewError && (
                  <InlineAlert variant="error" className="text-sm">
                    {reviewError}
                  </InlineAlert>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReviewPayout(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
