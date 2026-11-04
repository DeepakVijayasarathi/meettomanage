import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { beginTwoFactorSetup, disableTwoFactor, enableTwoFactor, getTwoFactorStatus, type TwoFactorStatus } from "@/api/auth";
import { formatDate } from "@/lib/utils";

const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");

/** Staff security setting: turn authenticator-app codes on or off for this account. */
export function TwoFactorSettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => getTwoFactorStatus().then(setStatus).catch(() => setStatus(null));
  useEffect(() => { void load(); }, []);

  if (!status?.available) return null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const start = () => run(async () => {
    const result = await beginTwoFactorSetup();
    setSetup({ secret: result.secret, qr: await QRCode.toDataURL(result.otpAuthUri, { margin: 1, width: 180 }) });
    setCode("");
  });

  const confirm = () => run(async () => {
    const result = await enableTwoFactor(code);
    setRecovery(result.recoveryCodes);
    setSetup(null);
    setCode("");
    await load();
  });

  const turnOff = () => run(async () => {
    await disableTwoFactor(code);
    setCode("");
    setRecovery(null);
    await load();
  });

  return (
    <div className="mt-2 flex flex-col gap-3 border-t pt-4">
      <div className="flex items-start gap-2">
        {status.enabled ? <ShieldCheck className="mt-0.5 h-5 w-5 text-success" /> : <ShieldOff className="mt-0.5 h-5 w-5 text-muted-foreground" />}
        <div>
          <p className="text-sm font-semibold">Two-step sign-in {status.enabled ? "is on" : "is off"}</p>
          <p className="text-xs text-muted-foreground">
            {status.enabled
              ? `Since ${status.enabledAtUtc ? formatDate(status.enabledAtUtc) : "—"} · ${status.recoveryCodesLeft} recovery code${status.recoveryCodesLeft === 1 ? "" : "s"} left`
              : "After your PIN, also ask for a code from an authenticator app (Google or Microsoft Authenticator, 1Password)."}
          </p>
        </div>
      </div>

      {recovery && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="text-sm font-semibold">Save these recovery codes now</p>
          <p className="mb-2 text-xs">Each works once if you lose your phone. They won&apos;t be shown again.</p>
          <div className="grid grid-cols-2 gap-1 font-mono text-sm">{recovery.map((c) => <span key={c}>{c}</span>)}</div>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => void navigator.clipboard?.writeText(recovery.join("\n"))}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />Copy codes
          </Button>
        </div>
      )}

      {!status.enabled && !setup && <Button variant="outline" className="self-start" onClick={start} disabled={busy}>Set up two-step sign-in</Button>}

      {setup && (
        <div className="flex flex-col gap-3">
          <p className="text-sm">1. Scan this QR code with your authenticator app.</p>
          <img src={setup.qr} alt="QR code for your authenticator app" className="h-[180px] w-[180px] self-center rounded bg-white p-1" />
          <p className="text-xs text-muted-foreground">Can&apos;t scan? Enter this key: <span className="break-all font-mono">{setup.secret}</span></p>
          <p className="text-sm">2. Enter the 6-digit code it shows.</p>
        </div>
      )}

      {(setup || status.enabled) && (
        <div className="flex items-end gap-2">
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="tf-code">{status.enabled ? "Code or recovery code to turn it off" : "Code"}</Label>
            <Input id="tf-code" inputMode={status.enabled ? "text" : "numeric"} autoComplete="one-time-code" maxLength={12} value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          {status.enabled
            ? <Button variant="outline" onClick={turnOff} disabled={busy || code.trim().length < 6}>Turn off</Button>
            : <Button onClick={confirm} disabled={busy || code.replace(/\D/g, "").length !== 6}>Turn on</Button>}
        </div>
      )}

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
