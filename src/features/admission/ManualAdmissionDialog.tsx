import { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  admitManually,
  getDemoBooking,
  getManualAdmissionOptions,
  type ManualAdmissionOptions,
  type ManualAdmissionResult,
} from "@/api/demoBookings";
import { userMessage } from "@/lib/api";
import { isValidEmail } from "@/lib/utils";
import { realEmail } from "@/lib/parentLogin";

interface ManualAdmissionDialogProps {
  bookingId: string | null;
  onClose: () => void;
  /** Fired once the admission went through (the demo list should refresh). */
  onAdmitted: () => void;
}

const NO_BATCH = "none";

/**
 * "Admit manually" after a demo, for parents who don't use email and want everything on
 * WhatsApp. The counselor enters the details the parent's own enrollment form would have held;
 * the portal creates the parent login (mobile number + PIN when there's no email), the child and
 * the first invoice, then shows the payment link and a ready-to-paste WhatsApp message.
 */
export function ManualAdmissionDialog({ bookingId, onClose, onAdmitted }: ManualAdmissionDialogProps) {
  const [options, setOptions] = useState<ManualAdmissionOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [childFirstName, setChildFirstName] = useState("");
  const [childLastName, setChildLastName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [planId, setPlanId] = useState("");
  const [billBy, setBillBy] = useState<"course" | "plan">("course");
  const [courseId, setCourseId] = useState("");
  const [fee, setFee] = useState("");
  const [batchId, setBatchId] = useState(NO_BATCH);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [result, setResult] = useState<ManualAdmissionResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    setOptions(null);
    setLoadError(null);
    setSaveError(null);
    setAttempted(false);
    setResult(null);
    setPlanId("");
    setBillBy("course");
    setCourseId("");
    setFee("");
    setBatchId(NO_BATCH);
    setChildDob("");
    Promise.all([getDemoBooking(bookingId), getManualAdmissionOptions()])
      .then(([b, opts]) => {
        if (cancelled) return;
        setParentName(b.parentName);
        setParentPhone(b.parentPhone ?? "");
        setParentEmail(realEmail(b.parentEmail));
        const [first, ...rest] = b.childName.trim().split(" ");
        setChildFirstName(first ?? "");
        setChildLastName(rest.join(" "));
        setOptions(opts);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(userMessage(err, "Couldn't load this demo."));
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const today = new Date().toISOString().slice(0, 10);
  const errors = {
    parentName: !parentName.trim(),
    parentPhone: parentEmail.trim() === "" && parentPhone.replace(/\D/g, "").length < 7,
    parentEmail: parentEmail.trim() !== "" && !isValidEmail(parentEmail.trim()),
    childFirstName: !childFirstName.trim(),
    childDob: !childDob || childDob > today,
    planId: billBy === "plan" && !planId,
    courseId: billBy === "course" && !courseId,
    fee: (fee.trim() === "" || !(Number(fee) >= 0)),
  };
  const hasErrors = Object.values(errors).some(Boolean);

  async function handleAdmit() {
    setAttempted(true);
    if (!bookingId || hasErrors || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const admitted = await admitManually(bookingId, {
        parentName: parentName.trim(),
        parentEmail: parentEmail.trim() || null,
        parentPhone: parentPhone.trim() || null,
        childFirstName: childFirstName.trim(),
        childLastName: childLastName.trim() || null,
        childDateOfBirth: childDob,
        packagePlanId: billBy === "plan" ? planId : null,
        courseId: billBy === "course" ? courseId : null,
        amount: Number(fee),
        batchId: batchId === NO_BATCH ? null : batchId,
      });
      setResult(admitted);
      onAdmitted();
    } catch (err) {
      setSaveError(userMessage(err, "Couldn't complete the admission."));
    } finally {
      setSaving(false);
    }
  }

  // The counselor types the agreed fee themselves (the course's standard price is only shown as
  // a hint). Picking a course drops a batch picked for a different course.
  function pickCourse(id: string) {
    setCourseId(id);
    const batch = options?.batches.find((b) => b.id === batchId);
    if (batch && batch.courseId !== id) setBatchId(NO_BATCH);
  }

  const visibleBatches = (options?.batches ?? []).filter((b) => billBy !== "course" || !courseId || b.courseId === courseId);

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      setCopied(null);
    }
  }

  function copyButton(id: string, text: string, label: string) {
    return (
      <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => copy(id, text)}>
        {copied === id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied === id ? "Copied" : label}
      </Button>
    );
  }

  return (
    <Dialog open={!!bookingId} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{result ? "Admission done" : "Admit manually"}</DialogTitle>
          <DialogDescription>
            {result
              ? "Send the parent these details on WhatsApp."
              : "For parents who don't use email. Enter the details here and the portal creates their login, the student and the fee invoice."}
          </DialogDescription>
        </DialogHeader>

        {loadError && <p className="text-sm text-destructive">{loadError}</p>}
        {!loadError && !options && !result && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Login:</span> <strong>{result.loginId}</strong>
              </p>
              <p>
                <span className="text-muted-foreground">PIN:</span>{" "}
                <strong>{result.temporaryPin ?? "Parent already has an account and keeps their PIN"}</strong>
              </p>
              {result.amountDue > 0 && (
                <p>
                  <span className="text-muted-foreground">Fee due:</span>{" "}
                  <strong>
                    {result.currency} {result.amountDue.toLocaleString("en-IN")}
                  </strong>
                  {result.invoiceNumber && <span className="text-muted-foreground"> (invoice {result.invoiceNumber})</span>}
                </p>
              )}
            </div>

            {result.paymentLinkUrl && (
              <div className="flex flex-col gap-1.5">
                <Label>Payment link</Label>
                <div className="flex gap-2">
                  <Input readOnly value={result.paymentLinkUrl} onFocus={(e) => e.currentTarget.select()} />
                  {copyButton("link", result.paymentLinkUrl, "Copy")}
                </div>
              </div>
            )}
            {result.paymentLinkError && (
              <p className="text-xs text-destructive">
                Payment link not created: {result.paymentLinkError} You can create it later from Payments.
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label>WhatsApp message</Label>
                {copyButton("msg", result.whatsAppMessage, "Copy message")}
              </div>
              <Textarea readOnly rows={10} value={result.whatsAppMessage} className="text-xs" />
            </div>
          </div>
        )}

        {options && !result && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ma-parent-name">Parent name</Label>
                <Input id="ma-parent-name" value={parentName} onChange={(e) => setParentName(e.target.value)} aria-invalid={attempted && errors.parentName} />
                {attempted && errors.parentName && <p className="text-xs font-medium text-destructive">Enter the parent's name.</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ma-parent-phone">Mobile number</Label>
                <Input id="ma-parent-phone" type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} aria-invalid={attempted && errors.parentPhone} />
                {attempted && errors.parentPhone && <p className="text-xs font-medium text-destructive">Needed: it's the parent's login when there's no email.</p>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ma-parent-email">
                Email <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input id="ma-parent-email" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} aria-invalid={attempted && errors.parentEmail} />
              {attempted && errors.parentEmail && <p className="text-xs font-medium text-destructive">Enter a valid email address, or leave it blank.</p>}
              {!parentEmail.trim() && <p className="text-xs text-muted-foreground">No email: the parent will log in with their mobile number and PIN.</p>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ma-child-first">Student first name</Label>
                <Input id="ma-child-first" value={childFirstName} onChange={(e) => setChildFirstName(e.target.value)} aria-invalid={attempted && errors.childFirstName} />
                {attempted && errors.childFirstName && <p className="text-xs font-medium text-destructive">Enter the student's name.</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ma-child-last">Student last name</Label>
                <Input id="ma-child-last" value={childLastName} onChange={(e) => setChildLastName(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ma-child-dob">Student date of birth</Label>
              <Input id="ma-child-dob" type="date" max={today} value={childDob} onChange={(e) => setChildDob(e.target.value)} aria-invalid={attempted && errors.childDob} />
              {attempted && errors.childDob && <p className="text-xs font-medium text-destructive">Enter a valid date of birth.</p>}
            </div>

            {options.plans.length > 0 && (
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={billBy === "course" ? "default" : "outline"} onClick={() => setBillBy("course")}>
                  Course fee
                </Button>
                <Button type="button" size="sm" variant={billBy === "plan" ? "default" : "outline"} onClick={() => setBillBy("plan")}>
                  Monthly plan
                </Button>
              </div>
            )}

            {billBy === "plan" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ma-plan">Plan</Label>
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger id="ma-plan" aria-invalid={attempted && errors.planId}>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.courseName ? ` · ${p.courseName}` : ""} · ₹{p.price.toLocaleString("en-IN")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {attempted && errors.planId && <p className="text-xs font-medium text-destructive">Pick the plan to bill.</p>}
                <Label htmlFor="ma-plan-fee" className="mt-2">Fee (₹)</Label>
                <Input id="ma-plan-fee" type="number" min={0} inputMode="decimal" placeholder="Enter amount" value={fee} onChange={(e) => setFee(e.target.value)} aria-invalid={attempted && errors.fee} />
                {attempted && errors.fee && <p className="text-xs font-medium text-destructive">Enter the fee.</p>}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ma-course">Course</Label>
                  <Select value={courseId} onValueChange={pickCourse}>
                    <SelectTrigger id="ma-course" aria-invalid={attempted && errors.courseId}>
                      <SelectValue placeholder="Select the course" />
                    </SelectTrigger>
                    <SelectContent>
                      {options.courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} · ₹{c.price.toLocaleString("en-IN")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {attempted && errors.courseId && <p className="text-xs font-medium text-destructive">Pick the course.</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ma-fee">Fee (₹)</Label>
                  <Input id="ma-fee" type="number" min={0} inputMode="decimal" placeholder="Enter amount" value={fee} onChange={(e) => setFee(e.target.value)} aria-invalid={attempted && errors.fee} />
                  {attempted && errors.fee && <p className="text-xs font-medium text-destructive">Enter the fee.</p>}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ma-batch">
                Batch <span className="font-normal text-muted-foreground">(optional, can be done later)</span>
              </Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger id="ma-batch">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_BATCH}>Assign later</SelectItem>
                  {visibleBatches.map((b) => (
                    <SelectItem key={b.id} value={b.id} disabled={b.seatsLeft <= 0}>
                      {b.name} · {b.courseName} · {b.teacherName} ({b.seatsLeft > 0 ? `${b.seatsLeft} seats left` : "full"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleAdmit} disabled={!options || saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Admit &amp; create payment link
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
