import { useState } from "react";
import { Lock, ReceiptText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PayNowModal } from "@/components/PayNowModal";
import { useToast } from "@/hooks/use-toast";
import { useBrand } from "@/lib/branding";
import { useApiData } from "@/api/hooks";
import { toFrontendInvoice } from "@/api/billing";
import { getParentInvoices } from "@/api/parentPortal";
import { formatCurrency, invoiceBalance } from "@/lib/utils";

/**
 * Full-screen block shown in place of the entire Parent portal while the account has an
 * active fee suspension — replaces AppShell's normal page content (see the role==="parent"
 * check in AppShell.tsx) rather than just a dismissible banner, so there's no way to reach
 * a session/resource/anything else while suspended. The only way out is paying: on close,
 * this re-fetches the dashboard's isSuspended flag (a completed payment auto-lifts the
 * suspension server-side — ApplyPaymentToInvoiceAsync), and AppShell stops rendering this
 * screen the moment that flag comes back false, with no page reload or re-login needed.
 */
export function AccountSuspendedScreen({ onRecheck }: { onRecheck: () => void }) {
  const { toast } = useToast();
  const brand = useBrand();
  const { data: invoices, reload } = useApiData(
    () => getParentInvoices().then((items) => items.map(toFrontendInvoice)),
    []
  );
  const [payOpen, setPayOpen] = useState(false);

  const outstanding = invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled");
  const totalOutstanding = outstanding.reduce((sum, i) => sum + invoiceBalance(i), 0);
  const primary = outstanding[0];

  function handleModalClose(open: boolean) {
    setPayOpen(open);
    if (!open) {
      // A cash "Pay Now" only creates a Pending intent (still needs staff confirmation), so
      // this may re-check and still find the account suspended — that's correct, not a bug.
      reload();
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
        <h1 className="mt-4 text-xl font-bold text-foreground">Account Suspended</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Access to {brand.name || "your"} classes, worksheets and recordings is on hold because of an unpaid
          fee. Clear the outstanding balance below to unlock your account instantly.
        </p>

        <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-left">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ReceiptText className="h-3.5 w-3.5" /> Outstanding balance
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(totalOutstanding)}</p>
          {outstanding.length > 1 && (
            <p className="mt-1 text-xs text-muted-foreground">Across {outstanding.length} invoices.</p>
          )}
        </div>

        <Button className="mt-6 w-full" size="lg" disabled={!primary} onClick={() => setPayOpen(true)}>
          Pay Now
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Already paid? It can take a minute to reflect — this page updates automatically.
        </p>
      </Card>

      {primary && (
        <PayNowModal
          open={payOpen}
          onOpenChange={handleModalClose}
          amount={invoiceBalance(primary)}
          invoiceLabel={primary.id}
          invoiceId={primary.apiId}
        />
      )}
    </div>
  );
}
