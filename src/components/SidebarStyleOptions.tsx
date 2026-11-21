import { Check } from "lucide-react";
import { SIDEBAR_STYLES, setSidebarStyle, useSidebarStyle, type SidebarStyle } from "@/lib/sidebarStyle";
import { cn } from "@/lib/utils";

/** Tiny drawing of each design for the picker. */
function StylePreview({ id }: { id: SidebarStyle }) {
  return (
    <div className="flex h-12 w-full overflow-hidden rounded-md border bg-muted/40 p-1">
      <div
        className={cn(
          "flex flex-col gap-0.5 p-0.5",
          "w-7",
          id === "floating" && "rounded-md border bg-background shadow",
          id === "classic" && "border-r bg-background",
          id === "brand" && "rounded-sm bg-[#FFE9D2]",
          id === "slate" && "rounded-sm bg-slate-200",
        )}
      >
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn("h-1.5 rounded-sm", i === 0 ? (id === "brand" ? "bg-[#F25C05]/60" : "bg-primary/40") : "bg-muted-foreground/30")} />
        ))}
      </div>
      <div className="ml-1 flex-1 rounded-sm bg-background/70" />
    </div>
  );
}

/** The four sidebar designs as a picker. Used in the sidebar's own popover and in Settings → Appearance. */
export function SidebarStyleOptions({ className }: { className?: string }) {
  const current = useSidebarStyle();
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", className)}>
      {SIDEBAR_STYLES.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setSidebarStyle(o.id)}
          aria-pressed={current === o.id}
          title={o.hint}
          className={cn("rounded-lg border p-1.5 text-left transition-colors hover:bg-muted/60", current === o.id && "border-primary bg-primary/5 ring-1 ring-primary/40")}
        >
          <StylePreview id={o.id} />
          <span className="mt-1 flex items-center justify-between px-0.5 text-xs font-medium">
            {o.label}
            {current === o.id && <Check className="h-3 w-3 text-primary" />}
          </span>
          <span className="block px-0.5 pb-0.5 text-[10px] leading-snug text-muted-foreground">{o.hint}</span>
        </button>
      ))}
    </div>
  );
}
