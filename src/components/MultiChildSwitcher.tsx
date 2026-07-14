import { Link } from "react-router-dom";
import { AlertCircle, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSession } from "@/state/session";
import { CHART_PALETTE } from "@/lib/roles";
import { cn, getInitials } from "@/lib/utils";

export function MultiChildSwitcher() {
  const { activeChildId, setActiveChildId, children } = useSession();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {children.map((child, i) => {
        const active = activeChildId === child.id;
        const color = CHART_PALETTE[i % CHART_PALETTE.length];
        return (
          <button
            key={child.id}
            onClick={() => setActiveChildId(child.id)}
            className={cn(
              "group relative flex items-center gap-2 rounded-full border px-2 py-1.5 pr-3 text-sm font-semibold transition-colors",
              active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-muted/60"
            )}
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback style={{ backgroundColor: `${color}22`, color }} className="text-[10px]">
                {getInitials(child.name)}
              </AvatarFallback>
            </Avatar>
            {child.name.split(" ")[0]}
            {!child.enrollmentComplete && (
              <span className="flex items-center gap-0.5 rounded-full bg-warning/25 px-1.5 py-0.5 text-[10px] font-bold text-warning-foreground">
                <AlertCircle className="h-3 w-3" /> Setup
              </span>
            )}
          </button>
        );
      })}
      <Link
        to="/parent/add-child"
        className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
        Add child
      </Link>
    </div>
  );
}
