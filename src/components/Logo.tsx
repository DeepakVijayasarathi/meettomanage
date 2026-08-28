import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/branding";

interface LogoProps {
  className?: string;
  imgClassName?: string;
  showWordmark?: boolean;
  variant?: "light" | "dark";
}

export function Logo({ className, imgClassName, showWordmark = true, variant = "dark" }: LogoProps) {
  const brand = useBrand();
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* logo.png is the full square mark (the two-figure "M" handshake glyph) at higher
          resolution for print/marketing art. logo-icon.png is the same mark, which still
          reads cleanly at the ~36px icon size every actual <Logo> usage in the app renders. */}
      <img src={brand.logoUrl ?? "/logo-icon.png"} alt={brand.name} className={cn("h-9 w-9 object-contain", imgClassName)} />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-[15px] font-extrabold tracking-tight",
              variant === "dark" ? "text-foreground" : "text-white"
            )}
          >
            {brand.name}
          </span>
          <span className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", variant === "dark" ? "text-muted-foreground" : "text-white/70")}>
            {brand.tagline}
          </span>
        </div>
      )}
    </div>
  );
}
