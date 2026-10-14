import { cn } from "@/lib/utils";

/** The footnote a "*" next to a displayed course fee points to. */
export const FEE_DISCLAIMER =
  "Applicable only for classes being conducted between 10 AM and 10 PM IST. Classes scheduled outside these hours will have different pricing.";

/** Shown below any section that lists course fees marked with an asterisk. */
export function FeeDisclaimer({ className }: { className?: string }) {
  return <p className={cn("text-xs text-muted-foreground", className)}>*{FEE_DISCLAIMER}</p>;
}
