import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

/**
 * Light/dark switch for the classroom screens, which render outside the AppShell (and its
 * Topbar ThemeToggle). Same app-wide preference (lib/theme.ts, "trn.theme"), so a choice made
 * here carries over to the rest of the app and back.
 */
export default function CallThemeToggle({ className }: { className?: string }) {
  const { isDark, setTheme } = useTheme();
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-call-ink/80 transition-colors hover:bg-call-ink/10 hover:text-call-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange",
        className
      )}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
