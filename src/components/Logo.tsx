import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/branding";

interface LogoProps {
  className?: string;
  imgClassName?: string;
  showWordmark?: boolean;
  variant?: "light" | "dark";
  /** Extra classes on the wordmark <span> — e.g. `"hidden sm:inline"` to drop the text on
      narrow headers where it would otherwise wrap and crowd sibling nav buttons. */
  wordmarkClassName?: string;
}

export function Logo({ className, imgClassName, showWordmark = true, variant = "dark", wordmarkClassName }: LogoProps) {
  const brand = useBrand();
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* logo.png is the full lockup (mark + "Meet to Manage" wordmark baked in, on an
          off-white matte) — used per explicit request even at the ~36px icon size every
          <Logo> renders at, where the baked-in text reads as texture rather than a label.
          logo-icon.png (transparent, mark only) is the better fit for that icon size and
          remains the favicon; swap back to it if the matte/duplicate-text look is unwanted. */}
      {variant === "light" ? (
        // The mark's dark figure otherwise disappears against a dark sidebar/hero — a
        // white backing keeps both figures visible wherever this variant is used.
        <span className="flex shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
          <img src={brand.logoUrl ?? "/logo.png"} alt={brand.name} className={cn("h-9 w-9 object-contain", imgClassName)} />
        </span>
      ) : (
        <img src={brand.logoUrl ?? "/logo.png"} alt={brand.name} className={cn("h-9 w-9 object-contain", imgClassName)} />
      )}
      {showWordmark && (
        <span
          className={cn(
            "font-display whitespace-nowrap text-[15px] font-extrabold tracking-tight",
            variant === "dark" ? "text-foreground" : "text-white",
            wordmarkClassName
          )}
        >
          {brand.name}
        </span>
      )}
    </div>
  );
}
