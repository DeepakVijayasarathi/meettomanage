import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";
import { resetPin } from "@/api/users";

type Phase = { kind: "idle" } | { kind: "confirm" } | { kind: "busy" } | { kind: "shown"; pin: string; copied: boolean };

/**
 * Users-table cell for issuing a PIN without opening the detail panel. Existing PINs are
 * stored only as a hash and can't be read back, so this is "reset and show": the admin
 * confirms, a fresh PIN is generated for that one user (their old PIN stops working), and
 * it's shown here once. Leaving the page or dismissing it discards it -- nothing is kept.
 */
export function UserPinCell({ userId, userName }: { userId: string; userName: string }) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  // A row click opens the user's detail panel; nothing in this cell should trigger that.
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  async function reset() {
    setPhase({ kind: "busy" });
    try {
      // Demo mode has no backend: a plausible-looking PIN, no real credential touched.
      const pin = apiEnabled() ? await resetPin(userId) : String(Math.floor(1000 + Math.random() * 9000));
      setPhase({ kind: "shown", pin, copied: false });
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

  return (
    <div className="flex min-w-[9.5rem] items-center gap-1.5" onClick={stop} onKeyDown={stop}>
      {phase.kind === "idle" && (
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPhase({ kind: "confirm" })} aria-label={`Reset and show PIN for ${userName}`}>
          <KeyRound className="h-3.5 w-3.5" /> Reset &amp; show PIN
        </Button>
      )}
      {phase.kind === "confirm" && (
        <>
          <span className="text-xs text-muted-foreground">Old PIN stops working.</span>
          <Button size="sm" className="h-7 px-2 text-xs" onClick={reset}>
            Reset
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setPhase({ kind: "idle" })}>
            Cancel
          </Button>
        </>
      )}
      {phase.kind === "busy" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Resetting PIN" />}
      {phase.kind === "shown" && (
        <>
          <code className="rounded-md bg-muted px-2 py-0.5 text-sm font-bold tracking-[0.3em] text-foreground" aria-label={`New PIN ${phase.pin.split("").join(" ")}`}>
            {phase.pin}
          </code>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(phase.pin)} aria-label="Copy PIN">
            {phase.copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPhase({ kind: "idle" })} aria-label="Hide PIN">
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
}
