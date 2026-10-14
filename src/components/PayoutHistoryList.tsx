import type { ApiPayoutChange } from "@/api/payouts";
import { formatCurrency, formatDate } from "@/lib/utils";

/** A payout's correction history — what changed, from/to, who, when and why. Shared by teacher and staff payouts. */
export function PayoutHistoryList({ changes }: { changes: ApiPayoutChange[] }) {
  if (changes.length === 0) {
    return <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">No corrections have been made to this payout.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {changes.map((c) => (
        <li key={c.id} className="rounded-lg border border-border p-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <p className="font-medium text-foreground">{c.description}</p>
            <p className="tabular-nums text-foreground">
              {formatCurrency(c.amountBefore)} → <span className="font-semibold">{formatCurrency(c.amountAfter)}</span>
            </p>
          </div>
          <p className="mt-1 text-muted-foreground">Reason: {c.reason}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Payable total {formatCurrency(c.totalBefore)} → {formatCurrency(c.totalAfter)} · {c.changedByName ?? "System"} ·{" "}
            {formatDate(c.changedAtUtc, "datetime")}
          </p>
        </li>
      ))}
    </ul>
  );
}
