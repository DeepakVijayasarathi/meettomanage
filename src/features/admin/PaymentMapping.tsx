import { useState } from "react";
import { BookOpenText, Building2, Calculator, ChevronDown, Landmark, Link2, Pencil, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PARENTS } from "@/data/users";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listPaymentAccounts, setPaymentMapping, updatePaymentAccount, type ApiPaymentAccount } from "@/api/billing";
import { listUsers, toAppUser } from "@/api/users";
import type { AppUser } from "@/types";

// Demo-mode fallback accounts (used only when the API is not configured).
const DEMO_ACCOUNTS: ApiPaymentAccount[] = [
  {
    id: "ph",
    name: "Phonics Department Account",
    departmentId: "phonics",
    departmentName: "Phonics",
    gatewayProvider: "Razorpay",
    gatewayAccountRef: "acc_ph0n1cs_4821",
    isActive: true,
    transactionCount: 0,
    totalCollected: 0,
    recentTransactions: [],
  },
  {
    id: "ma",
    name: "Maths Department Account",
    departmentId: "maths",
    departmentName: "Maths",
    gatewayProvider: "Cashfree",
    gatewayAccountRef: "acc_m4ths_7734",
    isActive: true,
    transactionCount: 0,
    totalCollected: 0,
    recentTransactions: [],
  },
];

// Known departments get a fitting icon; any admin-added one falls back to Building2 —
// not a closed set, just a nicer default for the two departments this app shipped with.
const DEPT_ICON: Record<string, typeof BookOpenText> = { Phonics: BookOpenText, Maths: Calculator };

function DepartmentCard({ account, color, onEdit }: { account: ApiPaymentAccount; color: string; onEdit: () => void }) {
  const Icon = DEPT_ICON[account.departmentName] ?? Building2;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}1A`, color }}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>{account.name}</CardTitle>
            <CardDescription>
              {/* A brand-new department gets this account auto-created (inactive, unwired) so
                  it shows up here immediately instead of silently having nowhere for its
                  invoices to route — "pending-client-decision" is that placeholder ref, not
                  something to show an admin as if it were real gateway wiring. */}
              {account.gatewayAccountRef === "pending-client-decision"
                ? "Not yet configured"
                : `${account.gatewayProvider} · ${account.gatewayAccountRef}`}
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {account.isActive ? (
            <Badge variant="success" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Active
            </Badge>
          ) : (
            account.gatewayAccountRef === "pending-client-decision" && <Badge variant="muted">Needs setup</Badge>
          )}
          <Button size="sm" variant="ghost" onClick={onEdit} title="Edit gateway wiring">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transactions</p>
            <p className="mt-1 text-xl font-bold text-foreground">{account.transactionCount}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Collected</p>
            <p className="mt-1 text-xl font-bold text-foreground">{formatCurrency(account.totalCollected)}</p>
          </div>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Transactions</p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Invoice</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {account.recentTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                account.recentTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.invoiceNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{t.studentName ?? "—"}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(t.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(t.dateUtc)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPaymentMapping() {
  const { data: accounts, reload: reloadAccounts } = useApiData<ApiPaymentAccount[]>(listPaymentAccounts, DEMO_ACCOUNTS);
  const { data: parents } = useApiData<AppUser[]>(
    () => listUsers({ role: "Parent" }).then((r) => r.items.map(toAppUser)),
    PARENTS
  );

  const [selectedParent, setSelectedParent] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Gateway-wiring editor (per department card)
  const [editAccount, setEditAccount] = useState<ApiPaymentAccount | null>(null);
  const [editName, setEditName] = useState("");
  const [editProvider, setEditProvider] = useState("razorpay");
  const [editRef, setEditRef] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [mappingConfirmOpen, setMappingConfirmOpen] = useState(false);

  // Collapsed by default: routing is automatic (every invoice already goes to its own
  // department's account, no per-parent setup), so this per-parent override — genuinely
  // rare — shouldn't read as a required step just by being visible on the page.
  const [showOverride, setShowOverride] = useState(false);

  function openEdit(account: ApiPaymentAccount) {
    setEditAccount(account);
    setEditName(account.name);
    setEditProvider(account.gatewayProvider.toLowerCase().includes("cashfree") ? "cashfree" : "razorpay");
    setEditRef(account.gatewayAccountRef === "pending-client-decision" ? "" : account.gatewayAccountRef);
    setEditActive(account.isActive);
    setEditError(null);
  }

  async function saveAccountEdit() {
    if (!editAccount) return;
    // Checked before the demo-mode short-circuit: the other way round, a blank/whitespace
    // account name closed the dialog with a success message and no error, same ordering
    // bug already fixed in Courses.tsx and Users.tsx.
    if (!editName.trim()) {
      setEditError("Account name is required.");
      return;
    }
    if (!apiEnabled()) {
      setResult({ ok: true, message: "Demo mode — account not persisted." });
      setEditAccount(null);
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await updatePaymentAccount(editAccount.id, {
        name: editName.trim(),
        gatewayProvider: editProvider,
        gatewayAccountRef: editRef.trim(),
        isActive: editActive,
      });
      setResult({ ok: true, message: `${editName.trim()} now charges through ${editProvider}.` });
      setEditAccount(null);
      reloadAccounts();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Could not save the account.");
    } finally {
      setEditSaving(false);
    }
  }

  const effectiveParent = selectedParent || parents[0]?.id || "";
  const effectiveAccount = selectedAccount || accounts[0]?.id || "";

  async function saveMapping() {
    if (!apiEnabled()) {
      setResult({ ok: true, message: "Demo mode — mapping not persisted." });
      setTimeout(() => setResult(null), 2500);
      return;
    }
    if (!effectiveParent || !effectiveAccount) return;
    setSaving(true);
    setResult(null);
    try {
      await setPaymentMapping(effectiveParent, effectiveAccount);
      const parentName = parents.find((p) => p.id === effectiveParent)?.name ?? "parent";
      const acctName = accounts.find((a) => a.id === effectiveAccount)?.name ?? "account";
      setResult({ ok: true, message: `${parentName} is now routed to ${acctName}.` });
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Could not save the mapping." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Payments Infrastructure"
        title="Payment Gateway Mapping"
        description="Where each department's invoices collect payment."
      />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm text-foreground">
          <span className="font-semibold">This is automatic.</span> Every invoice already routes to its own
          department's account below — nothing to set up per parent, and every new department inherits
          whichever account is already configured. New parents just work.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {accounts.map((account, i) => (
          <DepartmentCard
            key={account.id}
            account={account}
            color={CHART_PALETTE[(i + 3) % CHART_PALETTE.length]}
            onEdit={() => openEdit(account)}
          />
        ))}
      </div>

      <Dialog open={!!editAccount} onOpenChange={(open) => !open && setEditAccount(null)}>
        <DialogContent className="max-w-md">
          {editAccount && (
            <>
              <DialogHeader>
                <DialogTitle>Edit {editAccount.departmentName} payment account</DialogTitle>
                <DialogDescription>
                  Which gateway this department charges through. API keys live in Settings → Integrations; only the account reference is stored here.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="acct-name">Account name</Label>
                  <Input id="acct-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="acct-gateway-select">Gateway</Label>
                    <Select value={editProvider} onValueChange={setEditProvider}>
                      <SelectTrigger id="acct-gateway-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="razorpay">Razorpay</SelectItem>
                        <SelectItem value="cashfree">Cashfree</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="acct-status-select">Status</Label>
                    <Select value={editActive ? "active" : "inactive"} onValueChange={(v) => setEditActive(v === "active")}>
                      <SelectTrigger id="acct-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="acct-ref">Merchant / account reference</Label>
                  <Input
                    id="acct-ref"
                    placeholder="e.g. acc_LkzT9v2Abc123 (from the gateway dashboard)"
                    value={editRef}
                    onChange={(e) => setEditRef(e.target.value)}
                  />
                </div>
                {editError && <p className="text-sm font-medium text-destructive">{editError}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditAccount(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => (apiEnabled() ? setEditConfirmOpen(true) : saveAccountEdit())}
                  disabled={editSaving || !editName.trim() || !editRef.trim()}
                >
                  {editSaving ? "Saving…" : "Save account"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={editConfirmOpen}
        onOpenChange={setEditConfirmOpen}
        title={`Change how ${editAccount?.departmentName} charges get routed?`}
        description={`Every new payment for this department will go through ${editProvider} (${editRef.trim()}) from now on. Existing transactions are unaffected.`}
        confirmLabel="Save account"
        onConfirm={saveAccountEdit}
      />

      <Card className="mt-6">
        <button
          type="button"
          onClick={() => setShowOverride((v) => !v)}
          aria-expanded={showOverride}
          className="flex w-full items-center gap-3 p-5 text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${CHART_PALETTE[0]}1A`, color: CHART_PALETTE[0] }}>
            <Link2 className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <CardTitle>Override for one parent</CardTitle>
            <CardDescription>
              Rare — routes a specific parent's payments to a different account than their invoice's own
              department. Most parents never need this.
            </CardDescription>
          </div>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", showOverride && "rotate-180")} />
        </button>
        {showOverride && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="mapping-parent-select">Parent</Label>
              <Select value={effectiveParent} onValueChange={setSelectedParent}>
                <SelectTrigger id="mapping-parent-select">
                  <SelectValue placeholder="Select a parent" />
                </SelectTrigger>
                <SelectContent>
                  {parents.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="mapping-account-select">Department Account</Label>
              <Select value={effectiveAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger id="mapping-account-select">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.departmentName} — {a.gatewayProvider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={() => (apiEnabled() ? setMappingConfirmOpen(true) : saveMapping())}
                disabled={saving || !effectiveParent || !effectiveAccount}
              >
                <Landmark className="h-4 w-4" />
                {saving ? "Saving…" : "Save Mapping"}
              </Button>
            </div>
          </div>
          {result && (
            <p
              role={result.ok ? "status" : "alert"}
              className={cn(
                "mt-3 rounded-lg px-3 py-2 text-xs font-medium",
                result.ok ? "bg-success/10 text-success" : "bg-warning/10 text-warning-foreground"
              )}
            >
              {result.message}
            </p>
          )}
        </CardContent>
        )}
      </Card>

      <ConfirmDialog
        open={mappingConfirmOpen}
        onOpenChange={setMappingConfirmOpen}
        title="Reroute this parent's payments?"
        description={`${parents.find((p) => p.id === effectiveParent)?.name ?? "This parent"}'s future payments will route to ${accounts.find((a) => a.id === effectiveAccount)?.name ?? "the selected account"} instead of wherever they're routed today.`}
        confirmLabel="Save Mapping"
        onConfirm={saveMapping}
      />
    </div>
  );
}
