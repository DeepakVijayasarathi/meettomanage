import { useState } from "react";
import { BookOpenText, Calculator, Landmark, Link2, Pencil, ShieldCheck } from "lucide-react";
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
    department: "Phonics",
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
    department: "Maths",
    gatewayProvider: "Cashfree",
    gatewayAccountRef: "acc_m4ths_7734",
    isActive: true,
    transactionCount: 0,
    totalCollected: 0,
    recentTransactions: [],
  },
];

const DEPT_ICON = { Phonics: BookOpenText, Maths: Calculator } as const;

function DepartmentCard({ account, color, onEdit }: { account: ApiPaymentAccount; color: string; onEdit: () => void }) {
  const Icon = DEPT_ICON[account.department] ?? BookOpenText;
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
              {account.gatewayProvider} · {account.gatewayAccountRef}
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {account.isActive && (
            <Badge variant="success" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Active
            </Badge>
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
        description="Department-level payment accounts for Phonics and Maths, and parent-to-account assignment."
      />

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
                <DialogTitle>Edit {editAccount.department} payment account</DialogTitle>
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
                    <Label>Gateway</Label>
                    <Select value={editProvider} onValueChange={setEditProvider}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="razorpay">Razorpay</SelectItem>
                        <SelectItem value="cashfree">Cashfree</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Status</Label>
                    <Select value={editActive ? "active" : "inactive"} onValueChange={(v) => setEditActive(v === "active")}>
                      <SelectTrigger>
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
        title={`Change how ${editAccount?.department} charges get routed?`}
        description={`Every new payment for this department will go through ${editProvider} (${editRef.trim()}) from now on. Existing transactions are unaffected.`}
        confirmLabel="Save account"
        onConfirm={saveAccountEdit}
      />

      <Card className="mt-6">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${CHART_PALETTE[0]}1A`, color: CHART_PALETTE[0] }}>
            <Link2 className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Assign Parent to Payment Account</CardTitle>
            <CardDescription>Route a parent&apos;s future payments to a specific department account.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Parent</Label>
              <Select value={effectiveParent} onValueChange={setSelectedParent}>
                <SelectTrigger>
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
              <Label>Department Account</Label>
              <Select value={effectiveAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.department} — {a.gatewayProvider}
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
              className={cn(
                "mt-3 rounded-lg px-3 py-2 text-xs font-medium",
                result.ok ? "bg-success/10 text-success" : "bg-warning/10 text-warning-foreground"
              )}
            >
              {result.message}
            </p>
          )}
        </CardContent>
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
