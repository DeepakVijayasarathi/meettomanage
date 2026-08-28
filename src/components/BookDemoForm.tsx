import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  bookStoreDemo,
  listDemoAvailability,
  listStoreDepartments,
  type ApiAvailableDemoSlot,
  type ApiPublicDepartment,
} from "@/api/store";
import { cn } from "@/lib/utils";
import { DEMO_DEPARTMENTS } from "@/data/departments";

const EMPTY_DEMO_FORM = {
  parentName: "",
  parentEmail: "",
  parentPhone: "",
  childName: "",
  childAge: "",
  department: "none",
  preferredStart: "",
};

/** yyyy-MM-ddTHH:mm in the visitor's own timezone, for a datetime-local input's min/max/value. */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Public "Book a free demo" form — no account needed. The actual booking UI, with
 * no dialog chrome, so it can live inside a modal (BookDemoDialog) or stand alone
 * on a dedicated, linkable /demo page.
 */
interface BookDemoFormProps {
  /** Shows a "Done" button after a successful booking — only relevant inside a dialog. */
  onDone?: () => void;
  /** Fires once the booking is confirmed — lets a host dialog hide its header/description. */
  onConfirmedChange?: (confirmed: boolean) => void;
}

export function BookDemoForm({ onDone, onConfirmedChange }: BookDemoFormProps) {
  const live = apiEnabled();
  const { data: departments } = useApiData<ApiPublicDepartment[]>(() => listStoreDepartments(), DEMO_DEPARTMENTS);

  const [demoForm, setDemoForm] = useState(EMPTY_DEMO_FORM);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [demoConfirmed, setDemoConfirmed] = useState<string | null>(null);

  // The date the visitor is browsing for a slot — separate from demoForm.preferredStart,
  // which only gets set once they actually pick one of the real openings below.
  const [demoDate, setDemoDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<ApiAvailableDemoSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const demoMinStart = toLocalInputValue(new Date(Date.now() + 2 * 3_600_000 + 10 * 60_000)); // 2h + a small buffer
  const demoMaxStart = toLocalInputValue(new Date(Date.now() + 29 * 86_400_000));

  const demoDepartment = demoForm.department === "none" ? undefined : demoForm.department;

  const loadAvailableSlots = useCallback(
    (date: string) => {
      if (!date) {
        setAvailableSlots([]);
        return;
      }
      setSlotsLoading(true);
      setSlotsError(null);
      listDemoAvailability(date, demoDepartment)
        .then(setAvailableSlots)
        .catch((err) => setSlotsError(err instanceof Error ? err.message : "Couldn't load available times."))
        .finally(() => setSlotsLoading(false));
    },
    [demoDepartment]
  );

  // Real openings only exist with a backend to ask — demo mode keeps the old free-text picker.
  useEffect(() => {
    if (!live) return;
    loadAvailableSlots(demoDate);
  }, [live, demoDate, loadAvailableSlots]);

  useEffect(() => {
    onConfirmedChange?.(demoConfirmed !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the confirmed transition matters, not the callback identity
  }, [demoConfirmed]);

  async function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault();
    // The native `required` attribute blocks a truly empty field but not a whitespace-only
    // one (" " satisfies it), which then reads back as a blank name on every screen that
    // shows this booking.
    if (!demoForm.parentName.trim() || !demoForm.childName.trim()) {
      setDemoError("Enter a parent name and child name.");
      return;
    }
    if (!demoForm.preferredStart) {
      setDemoError(live ? "Pick one of the available times below." : "Pick a date and time for the demo.");
      return;
    }

    if (!live) {
      setDemoConfirmed(new Date(demoForm.preferredStart).toLocaleString());
      return;
    }

    setDemoSubmitting(true);
    setDemoError(null);
    try {
      const confirmation = await bookStoreDemo({
        parentName: demoForm.parentName,
        parentEmail: demoForm.parentEmail,
        parentPhone: demoForm.parentPhone,
        childName: demoForm.childName,
        childAge: demoForm.childAge ? Number(demoForm.childAge) : undefined,
        departmentId: demoForm.department === "none" ? undefined : demoForm.department,
        preferredStartAtUtc: new Date(demoForm.preferredStart).toISOString(),
      });
      setDemoConfirmed(new Date(confirmation.scheduledStartAtUtc).toLocaleString());
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : "Couldn't book that slot. Please try again.");
      // Someone else likely just took it — clear the stale pick and refresh what's actually
      // still open, instead of leaving a slot chip selected that no longer works.
      setDemoForm((f) => ({ ...f, preferredStart: "" }));
      loadAvailableSlots(demoDate);
    } finally {
      setDemoSubmitting(false);
    }
  }

  if (demoConfirmed) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF3EA] text-[#EA580C]">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h2 className="text-lg font-bold">Demo booked!</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {live
            ? `See you on ${demoConfirmed}. A confirmation with the join link is on its way to your email.`
            : `Demo mode — "booked" for ${demoConfirmed}, but nothing was actually scheduled.`}
        </p>
        {onDone && (
          <Button className="mt-6 !bg-[#F97316] !text-white hover:!bg-[#EA580C]" onClick={onDone}>
            Done
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleDemoSubmit} className="flex flex-col gap-3.5">
      <div className="grid gap-1.5">
        <Label htmlFor="demoParentName">Your name</Label>
        <Input
          id="demoParentName"
          required
          value={demoForm.parentName}
          onChange={(e) => setDemoForm((f) => ({ ...f, parentName: e.target.value }))}
          placeholder="e.g. Priya Kapoor"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="demoParentEmail">Email</Label>
          <Input
            id="demoParentEmail"
            type="email"
            required
            value={demoForm.parentEmail}
            onChange={(e) => setDemoForm((f) => ({ ...f, parentEmail: e.target.value }))}
            placeholder="you@email.com"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="demoParentPhone">Phone</Label>
          <Input
            id="demoParentPhone"
            type="tel"
            required
            value={demoForm.parentPhone}
            onChange={(e) => setDemoForm((f) => ({ ...f, parentPhone: e.target.value }))}
            placeholder="+91 98765 43210"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="demoChildName">Child's name</Label>
          <Input
            id="demoChildName"
            required
            value={demoForm.childName}
            onChange={(e) => setDemoForm((f) => ({ ...f, childName: e.target.value }))}
            placeholder="e.g. Aarav Kapoor"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="demoChildAge">Child's age</Label>
          <Input
            id="demoChildAge"
            type="number"
            min={1}
            max={25}
            value={demoForm.childAge}
            onChange={(e) => setDemoForm((f) => ({ ...f, childAge: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="demo-subject-select">Subject (optional)</Label>
        <Select value={demoForm.department} onValueChange={(v) => setDemoForm((f) => ({ ...f, department: v }))}>
          <SelectTrigger id="demo-subject-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No preference</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {live ? (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="demoDate">Preferred date</Label>
            <Input
              id="demoDate"
              type="date"
              required
              min={demoMinStart.slice(0, 10)}
              max={demoMaxStart.slice(0, 10)}
              value={demoDate}
              onChange={(e) => {
                setDemoDate(e.target.value);
                setDemoForm((f) => ({ ...f, preferredStart: "" }));
              }}
            />
            <p className="text-xs text-muted-foreground">At least 2 hours from now, within the next month.</p>
          </div>
          {demoDate && (
            <div className="grid gap-1.5">
              <Label id="demo-available-times-label">Available times</Label>
              {slotsLoading ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking availability…
                </p>
              ) : slotsError ? (
                <p className="text-xs text-destructive">{slotsError}</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-muted-foreground">No open slots that day — try another date.</p>
              ) : (
                <div className="flex flex-wrap gap-2" role="group" aria-labelledby="demo-available-times-label">
                  {availableSlots.map((slot) => {
                    const slotLocal = toLocalInputValue(new Date(slot.startAtUtc));
                    const isSelected = demoForm.preferredStart === slotLocal;
                    return (
                      <button
                        key={slot.startAtUtc}
                        type="button"
                        onClick={() => setDemoForm((f) => ({ ...f, preferredStart: slotLocal }))}
                        aria-pressed={isSelected}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                          isSelected
                            ? "border-[#F97316] bg-[#F97316] text-white"
                            : "border-black/15 text-[#171B22] hover:border-[#F97316]"
                        )}
                      >
                        {new Date(slot.startAtUtc).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor="demoStart">Preferred date &amp; time</Label>
          <Input
            id="demoStart"
            type="datetime-local"
            required
            min={demoMinStart}
            max={demoMaxStart}
            value={demoForm.preferredStart}
            onChange={(e) => setDemoForm((f) => ({ ...f, preferredStart: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">At least 2 hours from now, within the next month.</p>
        </div>
      )}
      {demoError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {demoError}
        </p>
      )}
      <Button type="submit" disabled={demoSubmitting} className="mt-1 w-full !bg-[#F97316] !text-white hover:!bg-[#EA580C]">
        {demoSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Book Demo"}
      </Button>
    </form>
  );
}
