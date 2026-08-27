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
      {/* logo.png is the full circular badge (arced "THE READER NEST" text + tagline) —
          legible as print/marketing art, but every actual usage of <Logo> in the app renders
          it well under 64px, where that ring of text is just illegible clutter and makes the
          mark look small/off-center next to the wordmark beside it. logo-icon.png is the same
          artwork cropped to just the nest+kids mark, which is what actually reads at icon size. */}
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
            read · write · speak
          </span>
        </div>
      )}
    </div>
  );
}
