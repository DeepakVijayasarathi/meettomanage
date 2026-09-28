import { useState } from "react";
import { CheckCircle2, IndianRupee, Loader2, Settings2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/api/hooks";
import {
  formatStaffPayoutPeriod,
  getStaffEarningsForUser,
  listEligibleStaff,
  markStaffPayoutPaid,
  setStaffCompensation,
  type ApiEligibleStaff,
  type ApiStaffEarnings,
  type CompensationBasis,
} from "@/api/staffPayouts";
import { toast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function compensationSummary(staff: ApiEligibleStaff): string {
  const c = staff.compensation;
  if (!c) return "Not set";
  if (c.basis === "FixedMonthly") return `Fixed — ${formatCurrency(c.fixedMonthlyAmount ?? 0)}/month`;
  return `${c.collectionPercentage ?? 0}% of monthly collection`;
}

/**
 * Admin/Management sets and edits non-teacher staff compensation — fixed monthly salary
 * (Coordinator, Relationship Manager, Admin) or a percentage of monthly collection (Admission),
 * per client requirement. Teachers keep their own per-batch/per-minute rate cards under
 * Teacher Payouts / Settings → Payroll.
 */
export default function StaffPayroll() {
  const { data: staff, loading, error, reload } = useApiData(() => listEligibleStaff(), [] as ApiEligibleStaff[]);

  const [editing, setEditing] = useState<ApiEligibleStaff | null>(null);
  const [basis, setBasis] = useState<CompensationBasis>("FixedMonthly");
  const [fixedAmount, setFixedAmount] = useState("");
  const [percentage, setPercentage] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [viewing, setViewing] = useState<ApiEligibleStaff | null>(null);
  const [earnings, setEarnings] = useState<ApiStaffEarnings | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  function openEdit(row: ApiEligibleStaff) {
    setFormError(null);
    setBasis(row.compensation?.basis ?? "FixedMonthly");
    setFixedAmount(row.compensation?.fixedMonthlyAmount != null ? String(row.compensation.fixedMonthlyAmount) : "");
    setPercentage(row.compensation?.collectionPercentage != null ? String(row.compensation.collectionPercentage) : "");
    setEffectiveFrom(todayIso());
    setEditing(row);
  }

  async function saveCompensation() {
    if (!editing) return;
    if (basis === "FixedMonthly" && !fixedAmount.trim()) {
      setFormError("Enter the fixed monthly amount.");
      return;
    }
    if (basis === "PercentOfMonthlyCollection" && !percentage.trim()) {
      setFormError("Enter the collection percentage.");
      return;
    }
    if (!apiEnabled()) {
      toast({ variant: "success", title: "Demo mode", description: "Compensation isn't saved without the API." });
      setEditing(null);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await setStaffCompensation(editing.userId, {
        basis,
        fixedMonthlyAmount: basis === "FixedMonthly" ? Number(fixedAmount) : undefined,
        collectionPercentage: basis === "PercentOfMonthlyCollection" ? Number(percentage) : undefined,
        effectiveFrom,
      });
      toast({ variant: "success", title: "Compensation saved", description: `${editing.name}'s pay is now set.` });
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(userMessage(err, "Could not save this."));
    } finally {
      setSaving(false);
    }
  }

  async function openView(row: ApiEligibleStaff) {
    setViewing(row);
    setEarnings(null);
    setEarningsLoading(true);
    try {
      const data = await getStaffEarningsForUser(row.userId);
      setEarnings(data);
    } catch (err) {
      toast({ variant: "error", title: "Couldn't load earnings", description: userMessage(err, "Please try again.") });
      setViewing(null);
    } finally {
      setEarningsLoading(false);
    }
  }

  async function markPaid(id: string) {
    setMarkingId(id);
    try {
      await markStaffPayoutPaid(id);
      toast({ variant: "success", title: "Marked as paid" });
      if (viewing) {
        const data = await getStaffEarningsForUser(viewing.userId);
        setEarnings(data);
      }
    } catch (err) {
      toast({ variant: "error", title: "Couldn't mark paid", description: userMessage(err, "Please try again.") });
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Payroll"
        title="Staff Payroll"
        description="Fixed monthly salary for Coordinators, Relationship Managers and Admin, and a collection percentage for Admission Counsellors. Teachers are paid per batch/class — see Teacher Payouts."
      />

      {apiEnabled() && error && (
        <InlineAlert variant="warning" className="mb-4">
          Could not load staff ({error}).{" "}
          <button type="button" className="underline" onClick={() => reload()}>Retry</button>
        </InlineAlert>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : apiEnabled() && error ? null : staff.length === 0 ? (
        <EmptyState icon={Wallet} title="No eligible staff found" description="Coordinator, Relationship Manager, Admission and Admin accounts show up here." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Compensation</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>
                    <p className="font-medium text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.roleName ?? row.role}</TableCell>
                  <TableCell>
                    <Badge variant={row.compensation ? "default" : "warning"}>{compensationSummary(row)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => void openView(row)}>View</Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                        <Settings2 className="h-3.5 w-3.5" /> {row.compensation ? "Edit" : "Set"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !saving && !open && setEditing(null)}>
        <DialogContent className="max-w-md">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle>{editing.name}'s compensation</DialogTitle>
                <DialogDescription>Takes effect from the date below onward — months already on record are never changed.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>Basis</Label>
                  <Select value={basis} onValueChange={(v) => setBasis(v as CompensationBasis)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FixedMonthly">Fixed monthly salary</SelectItem>
                      <SelectItem value="PercentOfMonthlyCollection">Percentage of monthly collection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {basis === "FixedMonthly" ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor="fixed-amount">Monthly amount (₹)</Label>
                    <Input id="fixed-amount" type="number" min={0} value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} />
                  </div>
                ) : (
                  <div className="grid gap-1.5">
                    <Label htmlFor="percentage">Percentage (%)</Label>
                    <Input id="percentage" type="number" min={0} max={100} step="0.1" value={percentage} onChange={(e) => setPercentage(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Applied to the month's total collection after it's floored down to the nearest ₹10,000.</p>
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label htmlFor="effective-from">Effective from</Label>
                  <Input id="effective-from" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
                </div>
                {formError && <InlineAlert variant="error">{formError}</InlineAlert>}
              </div>
              <DialogFooter>
                <Button variant="outline" disabled={saving} onClick={() => setEditing(null)}>Cancel</Button>
                <Button disabled={saving} onClick={() => void saveCompensation()}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.name}'s earnings</DialogTitle>
                <DialogDescription>Current month is live; past months are locked once computed.</DialogDescription>
              </DialogHeader>
              {earningsLoading || !earnings ? (
                <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
                  <div className="flex items-center justify-between rounded-lg border border-dashed border-border p-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{formatStaffPayoutPeriod(earnings.currentMonth.periodYear, earnings.currentMonth.periodMonth)} (this month, live)</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><IndianRupee className="h-3 w-3" /> not yet finalized</p>
                    </div>
                    <span className="font-bold text-foreground">{formatCurrency(earnings.currentMonth.amount)}</span>
                  </div>
                  {earnings.history.length === 0 ? (
                    <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">No past months on record yet.</p>
                  ) : (
                    earnings.history.map((p) => (
                      <div key={`${p.periodYear}-${p.periodMonth}`} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{formatStaffPayoutPeriod(p.periodYear, p.periodMonth)}</p>
                          <Badge variant={p.status === "Paid" ? "success" : "warning"} className="mt-1">{p.status === "Paid" ? "Paid" : "Finalized"}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-foreground">{formatCurrency(p.amount)}</span>
                          {p.status === "Finalized" && p.id && (
                            <Button size="sm" disabled={markingId === p.id} onClick={() => void markPaid(p.id!)}>
                              {markingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Mark Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
