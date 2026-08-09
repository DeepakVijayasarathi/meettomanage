import type { ReactNode } from "react";
import { AlertCircle, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  height?: number;
  /** Shows a skeleton block instead of the chart while data is in flight. */
  loading?: boolean;
  /** Shows an inline error instead of a chart that would otherwise render empty/zeroed. */
  error?: string | null;
  /** Shows a neutral placeholder instead of a chart library rendering nothing for an empty dataset. */
  empty?: boolean;
  emptyMessage?: string;
}

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
  height = 280,
  loading,
  error,
  empty,
  emptyMessage = "No data yet.",
}: ChartCardProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="flex-auto pt-0" style={{ height }}>
        {loading ? (
          <Skeleton className="h-full w-full rounded-lg" />
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span>Couldn&apos;t load this data.</span>
          </div>
        ) : empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
            <BarChart3 className="h-5 w-5" />
            <span>{emptyMessage}</span>
          </div>
        ) : (
          // Charts render as bare SVG with no inherent text alternative — this at
          // least names the graphic for a screen-reader user (not a full data-table
          // equivalent, which would need a bespoke summary per chart).
          <div className="h-full w-full" role="img" aria-label={description ? `${title}. ${description}` : `${title} chart`}>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
