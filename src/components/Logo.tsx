import { cn } from "@/lib/utils";
import { BRAND_NAME, useBrand } from "@/lib/branding";

interface LogoProps {
  className?: string;
  imgClassName?: string;
  showWordmark?: boolean;
  variant?: "light" | "dark";
  /** Extra classes on the wordmark — e.g. `"hidden sm:inline"` to drop it on narrow headers
      where it would otherwise wrap and crowd sibling nav buttons. */
  wordmarkClassName?: string;
}

export function Logo({ className, imgClassName, showWordmark = true, variant = "dark", wordmarkClassName }: LogoProps) {
  const brand = useBrand();
  // logo-full.png (public/logo-full.png, sourced from Docs/newlogo.png) is the current mark —
  // the handshake "M" icon, "Meet to Manage" wordmark and "Connect · Plan · Achieve" tagline
  // baked into one image, used whole rather than cropped into separate icon/text pieces.
  // A white-labeled tenant (brand.name overridden via Settings & Branding, see lib/branding.ts)
  // never gets this baked-in "Meet to Manage" image — it falls back to the plain icon + text
  // wordmark instead, same as before this mark existed.
  const isDefaultBrand = brand.name === BRAND_NAME;

  if (variant === "dark" && isDefaultBrand && showWordmark) {
    const height = imgClassName?.match(/\bh-\S+/)?.[0] ?? "h-14";
    return (
      <div className={cn("flex items-center", className)}>
        <img src="/logo-full.png" alt={brand.name} className={cn(height, "w-auto object-contain", wordmarkClassName)} />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Icon-only fallback — used for the dark-sidebar variant (the full lockup's dark
          "to" would disappear against that background), a white-labeled brand, or when the
          caller doesn't want a wordmark at all (loading states, error screens). logo-icon.png
          is a tightly-cropped, transparent, square (400x400) render of the older mark — the
          right fit at the small icon sizes these contexts use. logo.png is the same older mark
          with a large baked-in off-white matte and asymmetric padding, so squeezed into this
          small a box it reads as a tiny, off-center smudge rather than a crisp icon; it
          remains the favicon source. */}
      {variant === "light" ? (
        // The mark's dark figure otherwise disappears against a dark sidebar/hero — a
        // white backing keeps both figures visible wherever this variant is used.
        <span className="flex shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
          <img src={brand.logoUrl ?? "/logo-icon.png"} alt={brand.name} className={cn("h-9 w-9 object-contain", imgClassName)} />
        </span>
      ) : (
        <img src={brand.logoUrl ?? "/logo-icon.png"} alt={brand.name} className={cn("h-9 w-9 object-contain", imgClassName)} />
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
