import { useMemo, useState } from "react";
import { BookOpenText, Calculator, Landmark, Link2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INVOICES } from "@/data/invoices";
import { PARENTS } from "@/data/users";
import type { Invoice } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";

interface DeptAccount {
  department: Invoice["department"];
  icon: typeof BookOpenText;
  color: string;
  gateway: string;
  accountId: string;
}

const ACCOUNTS: DeptAccount[] = [
  { department: "Phonics", icon: BookOpenText, color: CHART_PALETTE[3], gateway: "Razorpay", accountId: "acc_ph0n1cs_••••4821" },
  { department: "Maths", icon: Calculator, color: CHART_PALETTE[4], gateway: "Cashfree", accountId: "acc_m4ths_••••7734" },
];

function DepartmentCard({ account }: { account: DeptAccount }) {
  const Icon = account.icon;
  const deptInvoices = INVOICES.filter((i) => i.department === account.department);
  const monthInvoices = deptInvoices.filter((i) => i.issuedOn.startsWith("2026-07") || i.issuedOn.startsWith("2026-06"));
  const totalThisMonth = monthInvoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${account.color}1A`, color: account.color }}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>{account.department} Department</CardTitle>
            <CardDescription>{account.gateway} · {account.accountId}</CardDescription>
          </div>
        </div>
        <Badge variant="success" className="gap-1">
          <ShieldCheck className="h-3.5 w-3.5" /> Verified
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transactions (Jun–Jul)</p>
            <p className="mt-1 text-xl font-bold text-foreground">{monthInvoices.length}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Collected</p>
            <p className="mt-1 text-xl font-bold text-foreground">{formatCurrency(totalThisMonth)}</p>
          </div>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Transactions</p>
        <div className="overflow-hidden rounded-lg border border-border">
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
              {deptInvoices.slice(0, 5).map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.id}</TableCell>
                  <TableCell className="text-muted-foreground">{inv.childName}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(inv.issuedOn)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPaymentMapping() {
  const [selectedParent, setSelectedParent] = useState(PARENTS[0].id);
  const [selectedDept, setSelectedDept] = useState<Invoice["department"]>("Phonics");
  const [saved, setSaved] = useState(false);

  const totalTransactions = useMemo(() => INVOICES.length, []);

  return (
    <div>
      <PageHeader
        eyebrow="Payments Infrastructure"
        title="Payment Gateway Mapping"
        description="Department-level payment accounts for Phonics and Maths, and parent-to-account assignment."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {ACCOUNTS.map((account) => (
          <DepartmentCard key={account.department} account={account} />
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${CHART_PALETTE[0]}1A`, color: CHART_PALETTE[0] }}>
            <Link2 className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Assign Parent to Payment Account</CardTitle>
            <CardDescription>Route a parent&apos;s future payments to a specific department account. {totalTransactions} total transactions recorded.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Parent</Label>
              <Select value={selectedParent} onValueChange={setSelectedParent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARENTS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Department Account</Label>
              <Select value={selectedDept} onValueChange={(v) => setSelectedDept(v as Invoice["department"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Phonics">Phonics — Razorpay</SelectItem>
                  <SelectItem value="Maths">Maths — Cashfree</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={() => {
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2200);
                }}
              >
                <Landmark className="h-4 w-4" />
                {saved ? "Mapping Saved!" : "Save Mapping"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
