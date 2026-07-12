import { cn } from "@/lib/utils";
import { BRAND_LOGO_URL, BRAND_NAME } from "@/lib/branding";

interface LogoProps {
  className?: string;
  imgClassName?: string;
  showWordmark?: boolean;
  variant?: "light" | "dark";
}

export function Logo({ className, imgClassName, showWordmark = true, variant = "dark" }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img src={BRAND_LOGO_URL ?? "/logo.png"} alt={BRAND_NAME} className={cn("h-9 w-9 object-contain", imgClassName)} />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className={cn(
              "font-display text-[15px] font-extrabold tracking-tight",
              variant === "dark" ? "text-foreground" : "text-white"
            )}
          >
            {BRAND_NAME}
          </span>
          <span className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", variant === "dark" ? "text-muted-foreground" : "text-white/70")}>
            read · write · speak
          </span>
        </div>
      )}
    </div>
  );
}
