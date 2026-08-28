import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FeeStatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate, invoiceBalance } from "@/lib/utils";
import type { Invoice } from "@/types";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 font-medium text-foreground">{value}</div>
    </div>
  );
}

/**
 * One shared invoice detail view for every portal that shows an invoice — Admin, Parent and
 * anywhere else that needs it. Before this, Admin had its own rich detail dialog while Parent
 * had none at all (just a table row + a bare download button); Admission's screen is an
 * operational link-generator list, not an invoice-detail view, so it stays as-is. Portal-only
 * actions (Pay Now, refund/record-payment forms, payment history) render as `children` below
 * the shared summary, so each portal keeps its own actions without re-deriving the layout.
 */
export function InvoiceDetailDialog({
  invoice,
  onClose,
  footerActions,
  children,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  /** Portal-specific buttons rendered after the always-present Close button (Download PDF, Record payment, etc.). */
  footerActions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {invoice && (
          <>
            <DialogHeader>
              <DialogTitle>{invoice.id}</DialogTitle>
              <DialogDescription>{invoice.courseName}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <Field label="Student" value={invoice.childName} />
              <Field label="Parent" value={invoice.parentName} />
              <Field label="Department" value={invoice.department} />
              <Field label="Amount" value={formatCurrency(invoice.amount)} />
              <Field label="Issued On" value={formatDate(invoice.issuedOn, "long")} />
              <Field label="Due On" value={formatDate(invoice.dueOn, "long")} />
              <Field label="Status" value={<FeeStatusBadge status={invoice.status} />} />
              <Field label="Balance Due" value={formatCurrency(invoiceBalance(invoice))} />
            </div>

            {children}

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {footerActions}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
