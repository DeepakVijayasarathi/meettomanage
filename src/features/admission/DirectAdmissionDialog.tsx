import { useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDirectAdmissionLead, type ApiDemoBooking } from "@/api/demoBookings";
import { userMessage } from "@/lib/api";
import { isValidEmail } from "@/lib/utils";
import type { Lead } from "./data";

interface DirectAdmissionDialogProps {
  open: boolean;
  /** Set when adding a second child from this lead's demo: the parent is copied from it. */
  sibling?: Lead | null;
  /** Pre-filled child name (e.g. an extra child already listed on the sibling's demo). */
  suggestedChildName?: string;
  onClose: () => void;
  /** The new lead, so the caller can open it straight on its payment panel. */
  onCreated: (booking: ApiDemoBooking) => void;
}

/**
 * Creates a lead with no demo class so the counsellor can go straight to a payment link -- for a
 * family that wants to enroll without a demo, or for a second child who attended a sibling's demo
 * (each child gets their own lead, so their own payment link, Enroll and details form).
 */
export function DirectAdmissionDialog({ open, sibling, suggestedChildName, onClose, onCreated }: DirectAdmissionDialogProps) {
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setParentName("");
    setParentPhone("");
    setParentEmail("");
    setChildName(suggestedChildName ?? "");
    setChildAge("");
    setError(null);
  }, [open, suggestedChildName]);

  const age = childAge.trim() === "" ? undefined : Number(childAge);
  const ageValid = age === undefined || (Number.isInteger(age) && age >= 1 && age <= 18);
  const emailValid = parentEmail.trim() === "" || isValidEmail(parentEmail.trim());
  const canSubmit =
    childName.trim() !== "" && ageValid && (sibling ? true : parentName.trim() !== "" && parentPhone.trim() !== "" && emailValid);

  async function handleCreate() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const booking = await createDirectAdmissionLead(
        sibling
          ? { siblingOfBookingId: sibling.id, childName: childName.trim(), childAge: age }
          : {
              parentName: parentName.trim(),
              parentPhone: parentPhone.trim(),
              parentEmail: parentEmail.trim() || undefined,
              childName: childName.trim(),
              childAge: age,
            }
      );
      onCreated(booking);
    } catch (err) {
      setError(userMessage(err, "Couldn't create the lead."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{sibling ? "Add another child" : "New admission without a demo"}</DialogTitle>
          <DialogDescription>
            {sibling
              ? `Creates a separate lead for this child under ${sibling.parentName}, so you can send them their own payment link.`
              : "For a family that wants to enroll straight away. Next you'll pick the course and send the payment link."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!sibling && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="direct-parent-name">
                  Parent name <span className="text-destructive">*</span>
                </Label>
                <Input id="direct-parent-name" value={parentName} onChange={(e) => setParentName(e.target.value)} disabled={busy} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="direct-parent-phone">
                    Mobile number <span className="text-destructive">*</span>
                  </Label>
                  <Input id="direct-parent-phone" type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} disabled={busy} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="direct-parent-email">Email (optional)</Label>
                  <Input id="direct-parent-email" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} disabled={busy} />
                  {!emailValid && <p className="text-xs font-medium text-destructive">Enter a valid email or leave it blank.</p>}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_6rem]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="direct-child-name">
                Child name <span className="text-destructive">*</span>
              </Label>
              <Input id="direct-child-name" value={childName} onChange={(e) => setChildName(e.target.value)} disabled={busy} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="direct-child-age">Age</Label>
              <Input
                id="direct-child-age"
                type="number"
                min={1}
                max={18}
                inputMode="numeric"
                value={childAge}
                onChange={(e) => setChildAge(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>
          {!ageValid && <p className="text-xs font-medium text-destructive">Age must be between 1 and 18.</p>}

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canSubmit || busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {busy ? "Creating…" : "Create & continue to payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
