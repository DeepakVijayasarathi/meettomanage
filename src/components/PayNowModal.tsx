import { useEffect, useState, type ComponentType } from "react";
import { Banknote, CheckCircle2, CreditCard, ExternalLink, Landmark, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import {
  getPaymentMethods,
  payInvoice,
  refreshInvoicePayment,
  startInlineCheckout,
  verifyInlineCheckout,
} from "@/api/parentPortal";

/** Success proof Razorpay's checkout hands to the handler callback. */
interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

// checkout.js is loaded once, lazily, the first time a payer picks Razorpay.
let razorpayScript: Promise<void> | null = null;
function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  razorpayScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => {
      razorpayScript = null;
      reject(new Error("Could not load the secure checkout. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return razorpayScript;
}

interface PayNowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  invoiceLabel?: string;
  /** Real invoice id: enables the live payment flow (checkout link / cash intent) in API mode. */
  invoiceId?: string;
  /** Called after a payment was initiated (cash intent or checkout opened) so the caller can refresh. */
  onInitiated?: () => void;
}

interface PayMethod {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

// Demo-mode methods when no backend is configured (real methods come from Settings → Integrations).
const DEMO_METHODS: PayMethod[] = [
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "netbanking", label: "Net Banking", icon: Landmark },
  { id: "cash", label: "Cash", icon: Banknote },
];

/** Picks an icon for a payment method from its integration key. */
function iconForGateway(key: string): PayMethod["icon"] {
  const k = key.toLowerCase();
  if (k.includes("cash")) return Banknote;
  if (k.includes("upi")) return Smartphone;
  if (k.includes("bank")) return Landmark;
  if (k.includes("razorpay") || k.includes("cashfree") || k.includes("stripe") || k.includes("card")) return CreditCard;
  return Wallet;
}

export function PayNowModal({ open, onOpenChange, amount, invoiceLabel, invoiceId, onInitiated }: PayNowModalProps) {
  const [methods, setMethods] = useState<PayMethod[]>(DEMO_METHODS);
  const [method, setMethod] = useState<string>(DEMO_METHODS[0].id);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "redirect" | "cash" | "inline">("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyNote, setVerifyNote] = useState<string | null>(null);
  const liveFlow = apiEnabled() && !!invoiceId;

  // Load enabled payment gateways (+ Cash) each time the popup opens.
  useEffect(() => {
    if (!open || !apiEnabled()) return;
    let cancelled = false;
    getPaymentMethods()
      .then((gateways) => {
        if (cancelled) return;
        // Every enabled payment method (gateways + Cash) is served from Settings → Integrations.
        const list: PayMethod[] = gateways.map((g) => ({ id: g.key, label: g.name, icon: iconForGateway(g.key) }));
        setMethods(list);
        setMethod(list[0]?.id ?? "");
      })
      .catch(() => {
        if (!cancelled) setMethods([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handlePay() {
    setError(null);
    setStatus("processing");

    if (!liveFlow) {
      // Demo checkout: simulated success only when no backend/invoice is wired.
      setTimeout(() => setStatus("success"), 1200);
      return;
    }

    // Razorpay pays in an in-page popup (no redirect); everything else keeps the
    // checkout-link / cash-intent flow.
    if (method.toLowerCase().includes("razorpay")) {
      await payInline();
      return;
    }

    await payViaLinkOrCash();
  }

  async function payViaLinkOrCash() {
    try {
      const result = await payInvoice(invoiceId!, method);
      // Chosen gateway can't start a checkout (turned off / missing keys) → keep the payer on
      // the form with the actionable reason so they can pick another method.
      if (result.mode === "unavailable") {
        setStatus("idle");
        setError(result.message ?? "This payment method is not available right now.");
        return;
      }
      setResultMessage(result.message);
      if (result.mode === "redirect" && result.url) {
        window.open(result.url, "_blank", "noopener");
        setStatus("redirect");
      } else {
        setStatus("cash");
      }
      onInitiated?.();
    } catch (e) {
      setStatus("idle");
      setError(e instanceof Error ? e.message : "Could not start the payment. Please try again.");
    }
  }

  /** In-page Razorpay popup: order → checkout.js → server-verified settlement, no redirect. */
  async function payInline() {
    try {
      const checkout = await startInlineCheckout(invoiceId!, method);
      if (checkout.mode === "unavailable") {
        setStatus("idle");
        setError(checkout.message ?? "This payment method is not available right now.");
        return;
      }

      await loadRazorpayScript();
      onInitiated?.();
      setStatus("inline");

      const razorpay = new window.Razorpay!({
        key: checkout.keyId,
        order_id: checkout.orderId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: checkout.displayName ?? "The Reader Nest",
        description: checkout.description ?? invoiceLabel,
        prefill: {
          name: checkout.prefillName ?? undefined,
          email: checkout.prefillEmail ?? undefined,
          contact: checkout.prefillContact ?? undefined,
        },
        theme: { color: "#57B33B" },
        handler: (response: RazorpaySuccessResponse) => {
          void settleInline(response);
        },
        modal: {
          ondismiss: () => {
            // Only a pre-payment dismissal lands here (success goes through handler).
            setStatus((current) => (current === "inline" ? "idle" : current));
            setError(
              "Checkout was closed before the payment finished. If you did complete it, the invoice will update automatically within the hour."
            );
          },
        },
      });
      razorpay.on("payment.failed", (response) => {
        setStatus("idle");
        setError(response.error?.description ?? "The payment failed. No money moved — please try again.");
      });
      razorpay.open();
    } catch (e) {
      setStatus("idle");
      setError(e instanceof Error ? e.message : "Could not start the payment. Please try again.");
    }
  }

  /** Sends the popup's success proof for server-side verification and flips the invoice to Paid. */
  async function settleInline(response: RazorpaySuccessResponse) {
    setStatus("processing");
    try {
      await verifyInlineCheckout(invoiceId!, {
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      });
      setStatus("success");
      onInitiated?.();
    } catch (e) {
      // The charge went through at the gateway; verification is what failed. Try the
      // pull-based reconcile before bothering the payer.
      const settled = await verifyPayment(true);
      if (!settled) {
        setStatus("idle");
        setError(e instanceof Error ? e.message : "We couldn't verify the payment yet — it will reconcile automatically.");
      }
    }
  }

  // Verify with the gateway whether the checkout completed (webhook-independent), and flip
  // the invoice to paid if so. Returns true when confirmed paid.
  async function verifyPayment(silent = false): Promise<boolean> {
    if (!liveFlow) return false;
    if (!silent) setVerifyNote(null);
    setVerifying(true);
    try {
      const invoice = await refreshInvoicePayment(invoiceId!);
      if (invoice.status === "Paid") {
        setStatus("success");
        onInitiated?.();
        return true;
      }
      if (!silent) {
        setVerifyNote("We haven't received this payment yet. If you've just paid, wait a moment and try again.");
      }
      return false;
    } catch {
      if (!silent) setVerifyNote("Couldn't check the payment status. Please try again.");
      return false;
    } finally {
      setVerifying(false);
    }
  }

  // When the payer returns to this tab after the gateway page, auto-check once.
  useEffect(() => {
    if (status !== "redirect") return;
    function onFocus() {
      void verifyPayment(true);
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function handleClose(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setTimeout(() => {
        setStatus("idle");
        setResultMessage(null);
        setError(null);
        setVerifyNote(null);
      }, 200);
    }
  }

  return (
    // While the Razorpay popup is on screen, our dialog must not be modal — Radix's
    // focus trap would keep yanking focus out of the gateway's iframe (card fields
    // couldn't be typed into). It becomes modal again the moment the popup closes.
    <Dialog open={open} onOpenChange={handleClose} modal={status !== "inline"}>
      <DialogContent
        className="max-w-md"
        // While the Razorpay popup is up, our dialog must survive Escape/outside clicks —
        // otherwise the success confirmation after payment has nowhere to appear. The
        // popup handles its own dismissal and hands control back via ondismiss.
        onEscapeKeyDown={(e) => {
          if (status === "inline") e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (status === "inline") e.preventDefault();
        }}
      >
        {status === "inline" ? (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ShieldCheck className="h-8 w-8" />
            </span>
            <h3 className="text-lg font-bold">Complete your payment</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Finish the payment in the secure Razorpay window. Your invoice updates here the moment it succeeds.
            </p>
          </div>
        ) : status === "success" ? (
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
        ) : status === "redirect" || status === "cash" ? (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              {status === "redirect" ? <ExternalLink className="h-8 w-8" /> : <Banknote className="h-8 w-8" />}
            </span>
            <h3 className="text-lg font-bold">{status === "redirect" ? "Complete your payment" : "Cash payment noted"}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{resultMessage}</p>
            {status === "redirect" && (
              <p className="mt-2 text-xs text-muted-foreground">
                Paid in the checkout tab? Come back here and confirm — your invoice updates right away.
              </p>
            )}
            {verifyNote && <p className="mt-3 text-sm font-medium text-warning">{verifyNote}</p>}
            {status === "redirect" ? (
              <div className="mt-6 flex w-full flex-col gap-2">
                <Button className="w-full" onClick={() => verifyPayment(false)} disabled={verifying}>
                  {verifying ? "Checking…" : "I've paid — verify now"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handleClose(false)}>
                  Close
                </Button>
              </div>
            ) : (
              <Button className="mt-6 w-full" onClick={() => handleClose(false)}>
                Done
              </Button>
            )}
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
              {methods.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                  No payment methods are enabled yet. An admin can turn on a gateway or Cash in Settings → Integrations.
                </p>
              ) : (
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
              )}
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button className="w-full" onClick={handlePay} disabled={status === "processing" || !method}>
              {status === "processing" ? "Processing…" : `Pay ${formatCurrency(amount)}`}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              {liveFlow ? "Secured, encrypted payment via the centre's payment gateway." : "Secured, encrypted payment · This is a demo checkout."}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
