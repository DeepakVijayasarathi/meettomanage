import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Distinct from EmptyState: EmptyState means "the request worked, there's just nothing
 * here yet" (with a next action like "Create"); this means "the request itself failed"
 * (with a recovery action — Retry — not a creation one). Conflating the two previously
 * meant a failed fetch either silently fell back to an empty table with no explanation,
 * or borrowed EmptyState's "nothing here" copy, both of which read as "there is no data"
 * rather than "we couldn't load it."
 */
export function ErrorState({
  title = "Couldn't load this data",
  description = "Something went wrong while fetching this. Check your connection and try again.",
  onRetry,
  retryLabel = "Retry",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-6 py-14 text-center",
        className
      )}
    >
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-8 ring-destructive/5">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {onRetry && (
        <div className="mt-5">
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
