import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDemoBooking, updateDemoBooking, type ApiDemoBooking } from "@/api/demoBookings";
import { userMessage } from "@/lib/api";
import { isValidEmail } from "@/lib/utils";
import { realEmail } from "@/lib/parentLogin";

interface ExtraAdult {
  key: string;
  id: string | null;
  name: string;
  email: string;
  phone: string;
}

interface ExtraChild {
  key: string;
  id: string | null;
  name: string;
}

function newKey() {
  return Math.random().toString(36).slice(2, 9);
}

interface EditDemoDialogProps {
  /** Booking to edit; null closes the dialog. */
  bookingId: string | null;
  onClose: () => void;
  onSaved: (booking: ApiDemoBooking) => void;
}

/**
 * Corrects a demo booking's parent/child details in place — the fix for the admission team's
 * most common mistake, a mistyped parent email, which used to mean deleting and rebooking the
 * demo. Loads the booking fresh (not from the table row) so each extra invitee's id round-trips
 * and they keep their own join link. Slot, teacher and stage are left to their own actions.
 */
export function EditDemoDialog({ bookingId, onClose, onSaved }: EditDemoDialogProps) {
  const [booking, setBooking] = useState<ApiDemoBooking | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [adults, setAdults] = useState<ExtraAdult[]>([]);
  const [children, setChildren] = useState<ExtraChild[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    setBooking(null);
    setLoadError(null);
    setSaveError(null);
    setAttempted(false);
    getDemoBooking(bookingId)
      .then((b) => {
        if (cancelled) return;
        setBooking(b);
        setParentName(b.parentName);
        setParentEmail(realEmail(b.parentEmail));
        setParentPhone(b.parentPhone ?? "");
        setChildName(b.childName);
        setChildAge(b.childAge != null ? String(b.childAge) : "");
        setAdults(
          b.participants
            .filter((p) => !p.isChild)
            .map((p) => ({ key: newKey(), id: p.id ?? null, name: p.name, email: p.email ?? "", phone: p.phone ?? "" }))
        );
        setChildren(b.participants.filter((p) => p.isChild).map((p) => ({ key: newKey(), id: p.id ?? null, name: p.name })));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(userMessage(err, "Couldn't load this demo booking."));
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const ageNumber = childAge.trim() === "" ? null : Number(childAge);
  const ageValid = ageNumber === null || (Number.isInteger(ageNumber) && ageNumber >= 1 && ageNumber <= 18);
  const errors = {
    parentName: !parentName.trim(),
    // Optional (WhatsApp-only parents) but then the phone is needed: it is their login.
    parentEmail: parentEmail.trim() !== "" && !isValidEmail(parentEmail.trim()),
    parentPhone: parentEmail.trim() === "" && parentPhone.replace(/\D/g, "").length < 7,
    childName: !childName.trim(),
    childAge: !ageValid,
    adults: adults.some((a) => !a.name.trim() || !isValidEmail(a.email.trim())),
    children: children.some((c) => !c.name.trim()),
  };
  const hasErrors = Object.values(errors).some(Boolean);

  async function handleSave() {
    setAttempted(true);
    if (!bookingId || !booking || hasErrors) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await updateDemoBooking(bookingId, {
        parentName: parentName.trim(),
        parentEmail: parentEmail.trim() || null,
        parentPhone: parentPhone.trim() || null,
        childName: childName.trim(),
        childAge: ageNumber,
        departmentId: booking.departmentId,
        participants: [
          ...adults.map((a) => ({ id: a.id, name: a.name.trim(), email: a.email.trim(), phone: a.phone.trim() || null, isChild: false })),
          ...children.map((c) => ({ id: c.id, name: c.name.trim(), email: null, phone: null, isChild: true })),
        ],
      });
      onSaved(saved);
    } catch (err) {
      setSaveError(userMessage(err, "Couldn't save the changes."));
    } finally {
      setSaving(false);
    }
  }

  const emailChanged = booking != null && parentEmail.trim() !== "" && parentEmail.trim().toLowerCase() !== realEmail(booking.parentEmail).toLowerCase();

  return (
    <Dialog open={!!bookingId} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit demo details</DialogTitle>
          <DialogDescription>
            Fix parent or child details without rebooking. The date, time and teacher stay the same. Use Reschedule to change those.
          </DialogDescription>
        </DialogHeader>

        {loadError ? (
          <p className="text-sm font-medium text-destructive">{loadError}</p>
        ) : !booking ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-child-name">Child name</Label>
                <Input id="edit-child-name" value={childName} onChange={(e) => setChildName(e.target.value)} aria-invalid={attempted && errors.childName} />
                {attempted && errors.childName && <p className="text-xs font-medium text-destructive">Enter the child's name.</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-child-age">Child age</Label>
                <Input id="edit-child-age" type="number" min={1} max={18} value={childAge} onChange={(e) => setChildAge(e.target.value)} aria-invalid={attempted && errors.childAge} />
                {attempted && errors.childAge && <p className="text-xs font-medium text-destructive">Age must be between 1 and 18.</p>}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-parent-name">Parent name</Label>
                <Input id="edit-parent-name" value={parentName} onChange={(e) => setParentName(e.target.value)} aria-invalid={attempted && errors.parentName} />
                {attempted && errors.parentName && <p className="text-xs font-medium text-destructive">Enter the parent's name.</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-parent-phone">Parent phone</Label>
                <Input id="edit-parent-phone" type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} aria-invalid={attempted && errors.parentPhone} />
                {attempted && errors.parentPhone && <p className="text-xs font-medium text-destructive">Enter a mobile number (needed when there is no email).</p>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-parent-email">Parent email <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="edit-parent-email" type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} aria-invalid={attempted && errors.parentEmail} />
              {attempted && errors.parentEmail && <p className="text-xs font-medium text-destructive">Enter a valid email address.</p>}
              {emailChanged && !errors.parentEmail && (
                <p className="text-xs text-muted-foreground">The join link will be emailed to this new address.</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Other parents / guardians</Label>
                <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => setAdults((prev) => [...prev, { key: newKey(), id: null, name: "", email: "", phone: "" }])}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              {adults.length === 0 && <p className="text-xs text-muted-foreground">None.</p>}
              {adults.map((a) => (
                <div key={a.key} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border p-2">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input placeholder="Name" aria-label="Guardian name" value={a.name} onChange={(e) => setAdults((prev) => prev.map((x) => (x.key === a.key ? { ...x, name: e.target.value } : x)))} />
                    <Input placeholder="Email" aria-label="Guardian email" type="email" value={a.email} onChange={(e) => setAdults((prev) => prev.map((x) => (x.key === a.key ? { ...x, email: e.target.value } : x)))} />
                    <Input placeholder="Phone" aria-label="Guardian phone" type="tel" value={a.phone} onChange={(e) => setAdults((prev) => prev.map((x) => (x.key === a.key ? { ...x, phone: e.target.value } : x)))} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove guardian" onClick={() => setAdults((prev) => prev.filter((x) => x.key !== a.key))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {attempted && errors.adults && <p className="text-xs font-medium text-destructive">Each guardian needs a name and a valid email.</p>}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Other children</Label>
                <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => setChildren((prev) => [...prev, { key: newKey(), id: null, name: "" }])}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
              {children.length === 0 && <p className="text-xs text-muted-foreground">None.</p>}
              {children.map((c) => (
                <div key={c.key} className="flex gap-2">
                  <Input placeholder="Child name" aria-label="Additional child name" value={c.name} onChange={(e) => setChildren((prev) => prev.map((x) => (x.key === c.key ? { ...x, name: e.target.value } : x)))} />
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove child" onClick={() => setChildren((prev) => prev.filter((x) => x.key !== c.key))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {attempted && errors.children && <p className="text-xs font-medium text-destructive">Enter a name for each child.</p>}
            </div>

            {saveError && <p className="text-sm font-medium text-destructive">{saveError}</p>}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={saving || !booking}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
