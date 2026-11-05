import { useState } from "react";
import { BadgePercent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { userMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { applyDiscountToMyInvoice } from "@/api/discounts";
import type { Invoice } from "@/types";

/** "Have a promo code?": applies a code to one of the family's unpaid, not-yet-discounted invoices. */
export function PromoCodeCard({ invoices, onApplied }: { invoices: Invoice[]; onApplied: () => void }) {
  const { toast } = useToast();
  const eligible = invoices.filter((i) => i.apiId && (i.status === "pending" || i.status === "overdue") && !(i.amountPaid ?? 0) && !i.discountAmount);
  const [invoiceId, setInvoiceId] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  if (eligible.length === 0) return null;
  const selected = invoiceId || eligible[0].apiId!;

  const apply = async () => {
    setBusy(true);
    try {
      const updated = await applyDiscountToMyInvoice(selected, code);
      toast({ variant: "success", title: "Code applied", description: `${updated.discountLabel ?? "Discount"}: you saved ${formatCurrency(updated.discountAmount ?? 0)}.` });
      setCode("");
      onApplied();
    } catch (e) {
      toast({ variant: "error", title: "Code not applied", description: userMessage(e, "Please check the code and try again.") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 sm:w-48">
          <BadgePercent className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Have a promo code?</span>
        </div>
        {eligible.length > 1 && (
          <Select value={selected} onValueChange={setInvoiceId}>
            <SelectTrigger className="sm:w-72" aria-label="Invoice"><SelectValue /></SelectTrigger>
            <SelectContent>
              {eligible.map((i) => <SelectItem key={i.apiId} value={i.apiId!}>{i.courseName} · {i.childName} · {formatCurrency(i.amount)}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Input className="sm:w-48" placeholder="Enter code" value={code} maxLength={32} onChange={(e) => setCode(e.target.value.toUpperCase())} aria-label="Promo code" />
        <Button onClick={() => void apply()} disabled={busy || code.trim().length < 3}>Apply</Button>
      </CardContent>
    </Card>
  );
}
