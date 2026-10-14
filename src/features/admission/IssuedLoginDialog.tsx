import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ApiIssuedParentLogin } from "@/api/demoBookings";

interface IssuedLoginDialogProps {
  login: ApiIssuedParentLogin | null;
  onClose: () => void;
}

/**
 * Shown once, right after a lead with no email is moved to "Ready for enrollment": their portal
 * login (mobile number + a new PIN) can't be emailed, so staff send it on WhatsApp from here.
 */
export function IssuedLoginDialog({ login, onClose }: IssuedLoginDialogProps) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    if (!login) return;
    try {
      await navigator.clipboard.writeText(login.whatsAppMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Dialog open={!!login} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Parent login created</DialogTitle>
          <DialogDescription>
            This parent has no email, so send these login details on WhatsApp. The PIN is shown only now.
          </DialogDescription>
        </DialogHeader>
        {login && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Login:</span> <strong>{login.loginId}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">PIN:</span> <strong>{login.temporaryPin}</strong>
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>WhatsApp message</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={copyMessage}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy message"}
                </Button>
              </div>
              <Textarea readOnly rows={7} value={login.whatsAppMessage} className="text-xs" />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
