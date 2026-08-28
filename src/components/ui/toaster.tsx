import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Fixed-position stack of active toasts — mounted once at the app root (see App.tsx). */
export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    // sm:right-24 (not right-4): the Ask-a-Doubt / Floating Notes launcher buttons already
    // live in that bottom-right corner (right-6, h-12 w-12 — see DoubtChatbot.tsx and
    // FloatingNotes.tsx), stacked on top of each other. A toast at right-4 would sit
    // directly on top of them at their exact height even though its z-index (100 vs their
    // 50) means it'd render above and briefly hide them — right-24 shifts the toast stack
    // fully clear of that column instead. Full-width on mobile (where those buttons sit
    // much higher, bottom-20+) doesn't have this conflict, so it's untouched below sm.
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-24 sm:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-md",
            t.variant === "success" && "border-success/30 bg-success/10 text-success",
            t.variant === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
            (!t.variant || t.variant === "default") && "border-border bg-card text-foreground"
          )}
        >
          {t.variant === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 translate-y-0.5" />}
          {t.variant === "error" && <AlertCircle className="h-4 w-4 shrink-0 translate-y-0.5" />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t.title}</p>
            {t.description && <p className="mt-0.5 text-xs opacity-90">{t.description}</p>}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
            aria-label="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
