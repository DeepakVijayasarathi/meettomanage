import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { InlineAlert } from "@/components/InlineAlert";
import { useToast } from "@/hooks/use-toast";
import { useApiData } from "@/api/hooks";
import { apiEnabled, userMessage } from "@/lib/api";
import { verifyOwnPin } from "@/api/auth";
import { getSettings, toSettingsMap, updateSettings } from "@/api/settings";
import { SCREENSHOT_SETTING_KEY, announceScreenshotProtection, readLocalScreenshotProtection } from "@/lib/screenshotGuard";

/** Admin → Settings → Security. The switch is only changed after the admin re-enters their own PIN. */
export function SecuritySettings() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(readLocalScreenshotProtection);
  const [pending, setPending] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: rows } = useApiData(() => (apiEnabled() ? getSettings() : Promise.resolve([])), []);
  useEffect(() => {
    const value = toSettingsMap(rows)[SCREENSHOT_SETTING_KEY];
    if (value != null) setEnabled(value !== "false");
  }, [rows]);

  function ask(next: boolean) { setPending(next); setPin(""); setError(null); }

  async function confirm() {
    if (pending === null) return;
    if (!pin.trim()) { setError("Enter your PIN."); return; }
    setBusy(true);
    setError(null);
    try {
      if (apiEnabled()) {
        if (!(await verifyOwnPin(pin))) { setError("That PIN is not correct."); return; }
        await updateSettings([{ key: SCREENSHOT_SETTING_KEY, value: String(pending), category: "General", isPublic: true }]);
      }
      setEnabled(pending);
      announceScreenshotProtection(pending);
      toast({ variant: "success", title: `Screenshot protection ${pending ? "on" : "off"}` });
      setPending(null);
    } catch (err) {
      setError(userMessage(err, "Could not save the setting."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Screenshot protection</CardTitle>
        <CardDescription>Blur the portal when someone presses Print Screen or a snipping shortcut or switches tabs, block saving images and printing. Turning it on or off needs your PIN.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <Label htmlFor="shot-protection" className="text-sm font-semibold">Protect screens from screenshots</Label>
              <p className="text-xs text-muted-foreground">Currently {enabled ? "on" : "off"} for everyone in this academy.</p>
            </div>
          </div>
          <Switch id="shot-protection" checked={enabled} onCheckedChange={ask} />
        </div>
        <p className="text-xs text-muted-foreground">This discourages casual capture only. Browsers cannot block operating-system screenshots, screen recording or a phone camera.</p>
      </CardContent>

      <Dialog open={pending !== null} onOpenChange={(o) => { if (!o && !busy) setPending(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm with your PIN</DialogTitle>
            <DialogDescription>Turn screenshot protection {pending ? "on" : "off"}. Enter your own sign-in PIN to continue.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); void confirm(); }} className="grid gap-3">
            {error && <InlineAlert variant="error">{error}</InlineAlert>}
            <Label htmlFor="shot-pin">Your PIN</Label>
            <Input id="shot-pin" type="password" inputMode="numeric" autoComplete="current-password" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} />
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setPending(null)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
