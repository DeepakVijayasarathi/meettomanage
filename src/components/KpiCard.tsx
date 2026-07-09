import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: { value: number; label?: string };
  tone?: "primary" | "success" | "warning" | "destructive" | "neutral";
  className?: string;
}

const TONE_STYLES: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export function KpiCard({ label, value, icon: Icon, trend, tone = "primary", className }: KpiCardProps) {
  const positive = trend ? trend.value >= 0 : true;
  return (
    <Card className={cn("group p-5 transition-shadow hover:shadow-pop", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          <p className="mt-1.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{value}</p>
        </div>
        {Icon && (
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", TONE_STYLES[tone])}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs font-semibold">
          <span className={cn("flex items-center gap-0.5 rounded-full px-1.5 py-0.5", positive ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive")}>
            {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(trend.value)}%
          </span>
          <span className="text-muted-foreground">{trend.label ?? "vs last month"}</span>
        </div>
      )}
    </Card>
  );
}
