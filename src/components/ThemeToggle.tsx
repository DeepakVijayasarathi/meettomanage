import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

/**
 * One-click light/dark switch, styled to match NotificationPanel's bell button
 * (same Button variant/size/shape) so the two sit as a matched pair in the Topbar.
 *
 * A plain binary toggle rather than a light/dark/system picker: the "system" default
 * still governs the very first load (see lib/theme.ts + index.html's inline script),
 * this control just gives the signed-in user an explicit, one-tap override once they
 * want one — a 3-way segmented control would be more UI than this app's single
 * personal preference needs.
 */
export function ThemeToggle() {
  const { isDark, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      className="h-10 w-10 rounded-full"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </Button>
  );
}
