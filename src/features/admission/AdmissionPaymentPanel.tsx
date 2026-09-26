import { useEffect, useState } from "react";
import { BadgeCheck, Check, Copy, Link2, Loader2, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InlineAlert } from "@/components/InlineAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiEnabled, userMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  getManualAdmissionOptions,
  sendAdmissionPaymentLink,
  verifyAndEnrollLead,
  type ManualAdmissionOptions,
} from "@/api/demoBookings";
import type { Lead } from "./data";

/** Stages where a payment link can still be issued or re-issued (nothing paid in full yet). */
const LINK_STAGES: Lead["conversionStage"][] = ["Demo Completed", "Follow-up", "Payment Pending", "Partially Paid"];

/**
 * The counsellor's side of the portal admission flow, shown on a lead: issue the parent's payment
 * link for a course at the agreed (discounted) amount, then -- once the parent has paid -- verify
 * the payment and click Enroll, which emails the parent's login automatically.
 */
export function AdmissionPaymentPanel({ lead, canEdit, onChanged }: { lead: Lead; canEdit: boolean; onChanged: () => void }) {
  const { toast } = useToast();
  const [options, setOptions] = useState<ManualAdmissionOptions | null>(null);
  const [courseId, setCourseId] = useState(lead.courseId ?? "");
  const [amount, setAmount] = useState(lead.invoiceAmount ? String(lead.invoiceAmount) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const canIssue = LINK_STAGES.includes(lead.conversionStage);
  const awaitingVerification = lead.conversionStage === "Payment Received";

  useEffect(() => {
    if (!apiEnabled() || !canIssue || options) return;
    getManualAdmissionOptions()
      .then(setOptions)
      .catch((err) => setError(userMessage(err, "Couldn't load the courses.")));
  }, [canIssue, options]);

  // Picking a course pre-fills its list price; the counsellor then edits it down to the agreed amount.
  const course = options?.courses.find((c) => c.id === courseId);
  useEffect(() => {
    if (course && !lead.invoiceAmount) setAmount(String(course.price));
  }, [course, lead.invoiceAmount]);

  if (!apiEnabled()) return null;
  if (!canIssue && !awaitingVerification && lead.conversionStage !== "Ready for Enrollment") return null;

  const amountNumber = Number(amount);
  const amountValid = amount.trim() !== "" && Number.isFinite(amountNumber) && amountNumber > 0 && (!course || amountNumber <= course.price);

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    } catch {
      toast({ variant: "error", title: "Couldn't copy", description: "Select the text and copy it manually." });
    }
  }

  async function handleIssue() {
    if (!courseId || !amountValid) return;
    setBusy(true);
    setError(null);
    try {
      const result = await sendAdmissionPaymentLink(lead.id, { courseId, amount: amountNumber });
      setShareMessage(result.shareMessage);
      await copy("link", result.paymentUrl);
      toast({ variant: "success", title: "Payment link ready", description: "The link is copied - share it with the parent." });
      onChanged();
    } catch (err) {
      const message = userMessage(err, "Couldn't create the payment link.");
      setError(message);
      toast({ variant: "error", title: "Couldn't create the payment link", description: message });
    } finally {
      setBusy(false);
    }
  }

  async function handleEnroll() {
    setBusy(true);
    setError(null);
    try {
      await verifyAndEnrollLead(lead.id);
      toast({ variant: "success", title: "Enrolled", description: "The parent's login has been emailed automatically." });
      onChanged();
    } catch (err) {
      const message = userMessage(err, "Couldn't enroll this lead.");
      setError(message);
      toast({ variant: "error", title: "Couldn't enroll", description: message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enrollment payment</p>

      {lead.conversionStage === "Ready for Enrollment" && (
        <InlineAlert variant="success" className="text-sm">
          <span>
            <strong>Enrolled.</strong> Payment verified
            {lead.paymentVerifiedAtUtc ? ` on ${formatDate(lead.paymentVerifiedAtUtc.slice(0, 10), "long")}` : ""} and the parent's login
            was emailed. Next, the parent adds their child's details for RM review.
          </span>
        </InlineAlert>
      )}

      {awaitingVerification && (
        <>
          <InlineAlert variant="info" className="text-sm">
            <span>
              <strong>{formatCurrency(lead.invoiceAmountPaid ?? lead.invoiceAmount ?? 0)}</strong> received
              {lead.termsAcceptedAtUtc ? " - Terms & Conditions accepted" : ""}. Verify the payment, then click Enroll: the parent's account
              details carry over automatically and their welcome email (portal link, email and PIN) is sent right away.
            </span>
          </InlineAlert>
          {canEdit && (
            <div>
              <Button disabled={busy} onClick={handleEnroll}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                {busy ? "Enrolling…" : "Verify payment & Enroll"}
              </Button>
            </div>
          )}
        </>
      )}

      {canIssue && (
        <>
          {lead.paymentLinkUrl && (
            <InlineAlert variant="info" className="text-sm">
              <span>
                A payment link for <strong>{formatCurrency(lead.invoiceAmount ?? 0)}</strong> is out
                {lead.conversionStage === "Partially Paid" ? " (part payment received - balance due)" : ", awaiting payment"}.
                You can copy it again or issue a corrected one below.
              </span>
            </InlineAlert>
          )}
          {lead.paymentLinkUrl && (
            <div className="flex items-center gap-2">
              <Input readOnly value={lead.paymentLinkUrl} aria-label="Payment link" className="text-xs" />
              <Button type="button" variant="outline" size="sm" onClick={() => copy("existing", lead.paymentLinkUrl!)}>
                {copied === "existing" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === "existing" ? "Copied" : "Copy"}
              </Button>
            </div>
          )}

          {canEdit && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admission-course">Course</Label>
                <Select value={courseId} onValueChange={setCourseId} disabled={busy}>
                  <SelectTrigger id="admission-course">
                    <SelectValue placeholder={options ? "Select course" : "Loading…"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(options?.courses ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} - {formatCurrency(c.price)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admission-amount">Agreed amount (after discount)</Label>
                <Input
                  id="admission-amount"
                  type="number"
                  min={1}
                  max={course?.price}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={busy}
                />
                {course && (
                  <p className="text-xs text-muted-foreground">
                    Course fee {formatCurrency(course.price)}
                    {amountValid && amountNumber < course.price ? ` - discount ${formatCurrency(course.price - amountNumber)}` : ""}
                  </p>
                )}
                {course && amount.trim() !== "" && amountNumber > course.price && (
                  <p className="text-xs font-medium text-destructive">Can't be more than the course fee.</p>
                )}
              </div>
            </div>
          )}

          {canEdit && (
            <div>
              <Button disabled={busy || !courseId || !amountValid} onClick={handleIssue}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {busy ? "Creating…" : lead.paymentLinkUrl ? "Issue corrected payment link" : "Generate payment link"}
              </Button>
            </div>
          )}

          {shareMessage && (
            <div className="flex flex-col gap-2">
              <pre className="whitespace-pre-wrap rounded-lg bg-background p-3 text-xs text-foreground">{shareMessage}</pre>
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => copy("msg", shareMessage)}>
                  {copied === "msg" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === "msg" ? "Copied" : "Copy message"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      {!canEdit && (canIssue || awaitingVerification) && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BadgeCheck className="h-3.5 w-3.5" /> Ask your Admin for Edit access on Admission to issue links or enroll.
        </p>
      )}
    </div>
  );
}
