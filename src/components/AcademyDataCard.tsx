import { useState } from "react";
import { Download, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, downloadFile, userMessage } from "@/lib/api";
import { clearAuthStorage } from "@/lib/authStorage";
import { sessionTenantCode, tenantPath } from "@/lib/tenantPath";

/** The academy's web address (tenant code), which the admin types to confirm closing. */
function academyCode(): string {
  return sessionTenantCode() ?? tenantPath().replace(/^\/t\//, "");
}

/**
 * "Your academy's data" on My Subscription: download everything as CSV files, and close the academy.
 * Closing suspends the workspace at once and tells the platform; the data itself is kept until the
 * platform deletes it, so the admin is asked to export first.
 */
export function AcademyDataCard() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [reason, setReason] = useState("");
  const [closing, setClosing] = useState(false);
  const code = academyCode();

  async function exportData() {
    setExporting(true);
    try {
      await downloadFile("/api/academy-data/export", `${code || "academy"}-data.zip`);
      toast({ variant: "success", title: "Export downloaded", description: "A ZIP of CSV files with your students, parents, staff, classes, attendance and invoices." });
    } catch (err) {
      toast({ variant: "error", title: "Couldn't export your data", description: userMessage(err, "Please try again.") });
    } finally {
      setExporting(false);
    }
  }

  async function closeAcademy() {
    setClosing(true);
    try {
      await apiFetch("/api/academy-data/close", { method: "POST", body: JSON.stringify({ confirmCode: confirm.trim(), reason: reason.trim() || null }) });
      clearAuthStorage();
      window.location.assign("/?academy-closed=1");
    } catch (err) {
      toast({ variant: "error", title: "Couldn't close the academy", description: userMessage(err, "Please try again.") });
      setClosing(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Your academy's data</p>
          <p className="mt-1 text-sm text-muted-foreground">Download everything your academy holds, or close the academy. Sign-in PINs are never exported.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={exporting} onClick={() => { void exportData(); }}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Export all data
          </Button>
          <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setCloseOpen(true)}>
            <ShieldAlert className="mr-2 h-4 w-4" />Close academy
          </Button>
        </div>
      </CardContent>

      <Dialog open={closeOpen} onOpenChange={(o) => { if (!closing) { setCloseOpen(o); if (!o) setConfirm(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close your academy?</DialogTitle>
            <DialogDescription>
              Everyone loses access straight away: you, your teachers and every family. Any unpaid platform invoice is cancelled.
              Your data is kept until it is deleted on request, but you won't be able to sign in to download it. Export it first.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button variant="outline" size="sm" disabled={exporting} onClick={() => { void exportData(); }}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Export all data first
            </Button>
            <div className="space-y-1.5">
              <Label htmlFor="close-reason">Why are you leaving? (optional)</Label>
              <Textarea id="close-reason" maxLength={1000} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="close-confirm">Type <span className="font-mono font-semibold">{code}</span> to confirm</Label>
              <Input id="close-confirm" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={closing} onClick={() => setCloseOpen(false)}>Keep my academy</Button>
            <Button variant="destructive" disabled={closing || !code || confirm.trim().toLowerCase() !== code.toLowerCase()} onClick={() => { void closeAcademy(); }}>
              {closing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Close academy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
