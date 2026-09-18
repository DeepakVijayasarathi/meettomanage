import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type BatchPaymentPlanType = "FullPaymentDone" | "AfterSessions" | "DueOnDate";

export interface BatchPaymentPlanState {
  paymentPlanType: BatchPaymentPlanType;
  /** Kept as a string for input binding; only meaningful (and sent) when paymentPlanType is AfterSessions. */
  paymentAfterSessionsCount: string;
  /** Only meaningful (and sent) when paymentPlanType is DueOnDate. */
  paymentDueDate: string;
}

export const DEFAULT_PAYMENT_PLAN: BatchPaymentPlanState = {
  paymentPlanType: "FullPaymentDone",
  paymentAfterSessionsCount: "",
  paymentDueDate: "",
};

/** True once the selected option has whatever it needs to be saved. */
export function isPaymentPlanValid(plan: BatchPaymentPlanState): boolean {
  if (plan.paymentPlanType === "AfterSessions") return plan.paymentAfterSessionsCount.trim() !== "";
  if (plan.paymentPlanType === "DueOnDate") return plan.paymentDueDate.trim() !== "";
  return true;
}

const OPTIONS: { type: BatchPaymentPlanType; title: string; description: string }[] = [
  { type: "FullPaymentDone", title: "Full payment done", description: "The complete payment for this batch has already been made." },
  { type: "AfterSessions", title: "Payment after a certain number of sessions", description: "Collect payment once a set number of sessions have been completed." },
  { type: "DueOnDate", title: "Payment due on a specific date", description: "Collect payment by a fixed date." },
];

/**
 * The three mutually-exclusive batch payment options — selecting one clears the other two back
 * to N/A, both in this local draft state and (via BatchService's server-side validation) in
 * what actually gets saved.
 */
export function BatchPaymentPlanFields({
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  value: BatchPaymentPlanState;
  onChange: (next: BatchPaymentPlanState) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  function choose(type: BatchPaymentPlanType) {
    onChange({
      paymentPlanType: type,
      paymentAfterSessionsCount: type === "AfterSessions" ? value.paymentAfterSessionsCount : "",
      paymentDueDate: type === "DueOnDate" ? value.paymentDueDate : "",
    });
  }

  return (
    <div className="grid gap-2">
      <Label>Payment plan</Label>
      <div className="grid gap-2">
        {OPTIONS.map((opt) => {
          const selected = value.paymentPlanType === opt.type;
          return (
            <div
              key={opt.type}
              className={`rounded-xl border p-3 transition-colors ${selected ? "border-primary bg-primary/5" : "border-border bg-muted/20"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{opt.title}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  disabled={disabled}
                  onClick={() => choose(opt.type)}
                  className="shrink-0"
                >
                  {selected ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Selected
                    </>
                  ) : (
                    "Choose this option"
                  )}
                </Button>
              </div>

              {opt.type === "AfterSessions" &&
                (selected ? (
                  <div className="mt-2 grid gap-1.5">
                    <Label htmlFor={`${idPrefix}-payment-sessions`}>Number of sessions</Label>
                    <Input
                      id={`${idPrefix}-payment-sessions`}
                      type="number"
                      min={1}
                      max={500}
                      placeholder="e.g. 6"
                      value={value.paymentAfterSessionsCount}
                      disabled={disabled}
                      onChange={(e) => onChange({ ...value, paymentAfterSessionsCount: e.target.value })}
                    />
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">N/A</p>
                ))}

              {opt.type === "DueOnDate" &&
                (selected ? (
                  <div className="mt-2 grid gap-1.5">
                    <Label htmlFor={`${idPrefix}-payment-due-date`}>Due date</Label>
                    <Input
                      id={`${idPrefix}-payment-due-date`}
                      type="date"
                      value={value.paymentDueDate}
                      disabled={disabled}
                      onChange={(e) => onChange({ ...value, paymentDueDate: e.target.value })}
                    />
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">N/A</p>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
