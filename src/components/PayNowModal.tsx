import { useEffect, useState, type ComponentType } from "react";
import { Banknote, CheckCircle2, CreditCard, Landmark, Smartphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { getPaymentMethods } from "@/api/parentPortal";

interface PayNowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  invoiceLabel?: string;
}

interface PayMethod {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

// Cash is always offered (recorded as an offline payment); gateways come from the DB.
const CASH_METHOD: PayMethod = { id: "cash", label: "Cash", icon: Banknote };

// Demo-mode methods when no backend is configured.
const DEMO_METHODS: PayMethod[] = [
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "netbanking", label: "Net Banking", icon: Landmark },
  CASH_METHOD,
];

/** Picks an icon for a gateway from its integration key. */
function iconForGateway(key: string): PayMethod["icon"] {
  const k = key.toLowerCase();
  if (k.includes("upi")) return Smartphone;
  if (k.includes("bank")) return Landmark;
  if (k.includes("razorpay") || k.includes("cashfree") || k.includes("stripe") || k.includes("card")) return CreditCard;
  return Wallet;
}

export function PayNowModal({ open, onOpenChange, amount, invoiceLabel }: PayNowModalProps) {
  const [methods, setMethods] = useState<PayMethod[]>(DEMO_METHODS);
  const [method, setMethod] = useState<string>(DEMO_METHODS[0].id);
  const [status, setStatus] = useState<"idle" | "processing" | "success">("idle");

  // Load enabled payment gateways (+ Cash) each time the popup opens.
  useEffect(() => {
    if (!open || !apiEnabled()) return;
    let cancelled = false;
    getPaymentMethods()
      .then((gateways) => {
        if (cancelled) return;
        const list: PayMethod[] = [
          ...gateways.map((g) => ({ id: g.key, label: g.name, icon: iconForGateway(g.key) })),
          CASH_METHOD,
        ];
        setMethods(list);
        setMethod(list[0]?.id ?? "cash");
      })
      .catch(() => {
        if (!cancelled) setMethods([CASH_METHOD]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function handlePay() {
    setStatus("processing");
    setTimeout(() => setStatus("success"), 1200);
  }

  function handleClose(next: boolean) {
    onOpenChange(next);
    if (!next) setTimeout(() => setStatus("idle"), 200);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {status === "success" ? (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <h3 className="text-lg font-bold">Payment successful</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatCurrency(amount)} received{invoiceLabel ? ` for ${invoiceLabel}` : ""}. A receipt has been sent to your email and access has been restored.
            </p>
            <Button className="mt-6 w-full" onClick={() => handleClose(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Pay Now</DialogTitle>
              <DialogDescription>{invoiceLabel ?? "Complete your pending fee payment securely."}</DialogDescription>
            </DialogHeader>
            <div className="rounded-xl bg-muted/50 p-4">
              <p className="text-xs font-medium text-muted-foreground">Amount due</p>
              <p className="text-2xl font-bold tracking-tight">{formatCurrency(amount)}</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Choose a payment method</p>
              <div className="grid grid-cols-3 gap-2">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center text-xs font-semibold transition-colors",
                      method === m.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    <m.icon className="h-[18px] w-[18px]" />
                    <span className="line-clamp-1">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handlePay} disabled={status === "processing"}>
              {status === "processing" ? "Processing…" : `Pay ${formatCurrency(amount)}`}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">Secured, encrypted payment · This is a demo checkout.</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
