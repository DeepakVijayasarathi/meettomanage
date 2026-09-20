import { useState } from "react";
import { AlertTriangle, Check, Copy, Eye, KeyRound, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";
import { resetPin, revealPin } from "@/api/users";

type Phase = { kind: "idle" } | { kind: "confirm" } | { kind: "busy" } | { kind: "shown"; pin: string; copied: boolean };

/**
 * Users-table cell for getting a user's PIN without opening the detail panel.
 *
 * - "Show PIN": the server keeps the PIN it last ISSUED (temporary PIN on create / resend /
 *   reset) encrypted, and an admin can read it back. Only offered when the API says one is
 *   stored (`viewable`); each view is audit-logged server-side.
 * - "Reset & show PIN": for everyone else (a user who chose their own PIN, or an account from
 *   before PINs were stored) -- after a confirm, issues a fresh PIN for that one user (their
 *   old one stops working) and shows it.
 *
 * Either way the PIN is held only in this component's state: hiding it or leaving the page
 * discards it.
 */
export function UserPinCell({ userId, userName, viewable }: { userId: string; userName: string; viewable?: boolean }) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  // A reset stores a fresh PIN server-side, so from then on this row can offer "Show PIN" too.
  const [stored, setStored] = useState(!!viewable);

  // A row click opens the user's detail panel; nothing in this cell should trigger that.
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  async function show() {
    setPhase({ kind: "busy" });
    try {
      const pin = await revealPin(userId);
      setPhase({ kind: "shown", pin, copied: false });
    } catch (err) {
      setPhase({ kind: "idle" });
      toast({ variant: "error", title: "Couldn't show the PIN", description: userMessage(err, "Could not show the PIN.") });
    }
  }

  async function reset() {
    setPhase({ kind: "busy" });
    try {
      // Demo mode has no backend: a plausible-looking PIN, no real credential touched.
      const pin = apiEnabled() ? await resetPin(userId) : String(Math.floor(1000 + Math.random() * 9000));
      setPhase({ kind: "shown", pin, copied: false });
      if (apiEnabled()) setStored(true);
      toast({ variant: "success", title: "PIN reset", description: `A new PIN was generated for ${userName}. Their old PIN no longer works.` });
    } catch (err) {
      setPhase({ kind: "idle" });
      toast({ variant: "error", title: "Couldn't reset PIN", description: userMessage(err, "Could not reset the PIN.") });
    }
  }

  async function copy(pin: string) {
    await navigator.clipboard?.writeText(pin).catch(() => undefined);
    setPhase({ kind: "shown", pin, copied: true });
    setTimeout(() => setPhase((p) => (p.kind === "shown" ? { ...p, copied: false } : p)), 2000);
  }

  // One fixed-height (h-8) box for every state, so the row never jumps when a cell changes phase.
  const box = "inline-flex h-8 items-center overflow-hidden rounded-lg border text-xs font-semibold";
  const seg =
    "inline-flex h-full items-center gap-1.5 px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45";

  return (
    <div className="min-w-[13.5rem]" onClick={stop} onKeyDown={stop}>
      {phase.kind === "idle" && (
        // Show PIN is only usable once the server holds a PIN it issued (chosen or older PINs are
        // hashed and can't be read back) -- until then it's disabled with the reason, and Reset PIN
        // is how one gets generated.
        <div className={cn(box, "divide-x divide-border border-border bg-card shadow-sm")}>
          <button
            type="button"
            onClick={show}
            disabled={!stored}
            aria-label={`Show PIN for ${userName}`}
            title={stored ? "Show the PIN issued to this user" : "No PIN on file to show — use Reset PIN to generate one"}
            className={cn(seg, "text-foreground enabled:hover:bg-primary/10 enabled:hover:text-primary")}
          >
            <Eye className="h-3.5 w-3.5" /> Show PIN
          </button>
          <button
            type="button"
            onClick={() => setPhase({ kind: "confirm" })}
            aria-label={`Reset PIN for ${userName}`}
            title="Reset PIN (issue a new one)"
            className={cn(seg, "text-muted-foreground hover:bg-warning/15 hover:text-foreground")}
          >
            <KeyRound className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      )}

      {phase.kind === "confirm" && (
        <div className={cn(box, "gap-1 border-warning/40 bg-warning/10 pl-2.5")}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning-foreground" />
          <span className="whitespace-nowrap pr-1 font-medium text-foreground">Old PIN stops working</span>
          <button type="button" onClick={reset} className={cn(seg, "h-full bg-primary text-primary-foreground hover:bg-primary/90")}>
            Reset
          </button>
          <button type="button" onClick={() => setPhase({ kind: "idle" })} className={cn(seg, "text-muted-foreground hover:bg-muted")}>
            Cancel
          </button>
        </div>
      )}

      {phase.kind === "busy" && (
        <div className={cn(box, "gap-2 border-border bg-muted/50 px-3 text-muted-foreground")}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-label="Working" /> Working…
        </div>
      )}

      {phase.kind === "shown" && (
        <div className={cn(box, "gap-0.5 border-success/40 bg-success/10 pl-1.5")}>
          <span className="flex items-center gap-1" aria-label={`PIN ${phase.pin.split("").join(" ")}`}>
            {phase.pin.split("").map((digit, idx) => (
              <span key={idx} className="flex h-5 w-4 items-center justify-center rounded bg-background font-mono text-sm font-bold text-foreground shadow-sm">
                {digit}
              </span>
            ))}
          </span>
          <button type="button" onClick={() => copy(phase.pin)} aria-label="Copy PIN" title="Copy PIN" className={cn(seg, "px-2 text-success hover:bg-success/15")}>
            {phase.copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={() => setPhase({ kind: "idle" })} aria-label="Hide PIN" title="Hide PIN" className={cn(seg, "px-2 text-muted-foreground hover:bg-muted")}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
