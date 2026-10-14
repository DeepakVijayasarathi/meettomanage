import { useState } from "react";
import { Lock, ReceiptText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PayNowModal } from "@/components/PayNowModal";
import { useToast } from "@/hooks/use-toast";
import { useBrand } from "@/lib/branding";
import { useApiData } from "@/api/hooks";
import { toFrontendInvoice } from "@/api/billing";
import { getParentDashboard, getParentInvoices, type ApiParentDashboard } from "@/api/parentPortal";
import { formatCurrency, invoiceBalance } from "@/lib/utils";
import type { Invoice } from "@/types";

interface UnlockTarget {
  childName: string;
  invoice: Invoice;
}

/**
 * Full-screen block shown in place of the entire Parent/Student portal shell while the
 * relevant scope is fee-suspended — see AppShell.tsx's role==="parent"/"student" check,
 * which only reaches this when there's genuinely nothing else to show (every child
 * suspended for a parent, or the one previewed child for a student), never for a parent
 * with even one unaffected sibling — those instead see the normal dashboard with a
 * per-child restriction (ParentDashboard.tsx), not a blanket lockout. On modal close this
 * re-fetches so the block clears the moment payment settles server-side
 * (ApplyPaymentToInvoiceAsync auto-lifts the matching suspension), no reload/re-login needed.
 */
export function AccountSuspendedScreen({ childId, onRecheck }: { childId?: string; onRecheck: () => void }) {
  const { toast } = useToast();
  const brand = useBrand();
  const { data: dashboard, reload: reloadDashboard } = useApiData<ApiParentDashboard | null>(
    () => getParentDashboard(),
    null
  );
  const { data: invoices, reload: reloadInvoices } = useApiData(
    () => getParentInvoices().then((items) => items.map(toFrontendInvoice)),
    []
  );
  const [payTarget, setPayTarget] = useState<UnlockTarget | null>(null);

  // ApplyPaymentToInvoiceAsync only lifts a suspension once its OWN specific invoice is paid
  // in full AND nothing else in that same scope is overdue — a child's suspendedInvoiceId
  // (from the dashboard, the same field the suspension is keyed on) is the only correct
  // target to pay. Per-child, not a single account total: each affected child gets its own
  // row/invoice/button, since a family-level invoice and a child-specific one don't merge.
  const suspendedChildren = childId
    ? dashboard?.children.filter((c) => c.childId === childId) ?? []
    : dashboard?.children.filter((c) => c.isSuspended) ?? [];

  const targets: UnlockTarget[] = suspendedChildren
    .map((c) => {
      const invoice =
        (c.suspendedInvoiceId && invoices.find((i) => i.apiId === c.suspendedInvoiceId)) ||
        invoices.find((i) => i.childId === c.childId && i.status === "overdue");
      return invoice ? { childName: c.name, invoice } : null;
    })
    .filter((t): t is UnlockTarget => t !== null)
    // Two children blocked by the same family-level invoice shouldn't render as two rows.
    .filter((t, i, arr) => arr.findIndex((o) => o.invoice.id === t.invoice.id) === i);

  const isSingleChild = !!childId;
  const scopeLabel = isSingleChild ? suspendedChildren[0]?.name ?? "this child" : "your account";

  function handleModalClose(open: boolean) {
    if (!open) {
      setPayTarget(null);
      // A cash "Pay Now" only creates a Pending intent (still needs staff confirmation), so
      // this may re-check and still find the account suspended — that's correct, not a bug.
      reloadInvoices();
      reloadDashboard();
      onRecheck();
      toast({ variant: "success", title: "Checking payment status…", description: "This unlocks automatically as soon as your payment is confirmed." });
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-foreground">
          {isSingleChild ? `${scopeLabel}'s access is on hold` : "Account Suspended"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Access to {brand.name || "your"} classes, worksheets and recordings is on hold for {isSingleChild ? scopeLabel : "every child on the account"} because of an unpaid fee.
          Pay {targets.length > 1 ? "the invoices" : "the invoice"} below to unlock instantly.
        </p>

        <div className="mt-6 flex flex-col gap-3 text-left">
          {targets.length === 0 && (
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">Couldn't find the specific invoice yet — this page will update automatically once it's ready.</p>
            </div>
          )}
          {targets.map((t) => (
            <div key={t.invoice.id} className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ReceiptText className="h-3.5 w-3.5" /> {targets.length > 1 ? t.childName : "Overdue — pay to unlock"}
                </div>
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(invoiceBalance(t.invoice))}</p>
              <p className="mt-1 text-xs text-muted-foreground">Invoice {t.invoice.id}.</p>
              <Button className="mt-3 w-full" onClick={() => setPayTarget(t)}>
                Pay Now
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Already paid? It can take a minute to reflect — this page updates automatically.
        </p>
      </Card>

      {payTarget && (
        <PayNowModal
          open={!!payTarget}
          onOpenChange={handleModalClose}
          amount={invoiceBalance(payTarget.invoice)}
          invoiceLabel={payTarget.invoice.id}
          invoiceId={payTarget.invoice.apiId}
        />
      )}
    </div>
  );
}
