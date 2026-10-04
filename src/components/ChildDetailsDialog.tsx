import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useApiData } from "@/api/hooks";
import { listCourseOptions } from "@/api/courses";
import { getChildSchedulePreference, saveChildSchedulePreference, type ApiChildSchedulePreference } from "@/api/parentPortal";
import { userMessage } from "@/lib/api";
import { DAYS_PER_WEEK_OPTIONS, SCHEDULE_DAYS, timeOptionsFor } from "@/lib/schedulePreference";

interface FormState {
  courseId: string;
  startDate: string;
  daysPerWeek: number | null;
  days: string[];
  dayTimes: Record<string, string>;
  schoolName: string;
  grade: string;
  dateOfBirth: string;
  gender: string;
  priorExperience: string;
  allergies: string;
  notes: string;
}

const EMPTY: FormState = {
  courseId: "",
  startDate: "",
  daysPerWeek: null,
  days: [],
  dayTimes: {},
  schoolName: "",
  grade: "",
  dateOfBirth: "",
  gender: "",
  priorExperience: "",
  allergies: "",
  notes: "",
};

function fromApi(p: ApiChildSchedulePreference): FormState {
  return {
    courseId: p.courseId ?? "",
    startDate: p.preferredStartDate ?? "",
    daysPerWeek: p.daysPerWeek,
    days: p.preferredDays,
    dayTimes: p.dayTimes,
    schoolName: p.schoolName ?? "",
    grade: p.grade ?? "",
    dateOfBirth: p.dateOfBirth ?? "",
    gender: p.gender ?? "",
    priorExperience: p.priorExperience ?? "",
    allergies: p.allergies ?? "",
    notes: p.notes ?? "",
  };
}

/**
 * Opens from the child's name on the parent dashboard: the child already exists (the counsellor
 * created them), so this only collects what the centre still needs — preferred class days and
 * times, start date, school, course — and saves it onto that same child. No second child record.
 */
export function ChildDetailsDialog({
  childId,
  childName,
  open,
  onOpenChange,
  onSaved,
}: {
  childId: string;
  childName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (saved: ApiChildSchedulePreference) => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: courses } = useApiData(() => listCourseOptions(), [], undefined, { cacheKey: "course-options" });
  // Group classes run 4–8 PM, individual 10 AM–10 PM, every 15 minutes (client requirement).
  const timeOptions = timeOptionsFor(courses.find((c) => c.id === form.courseId)?.type);
  const firstName = childName.split(" ")[0];

  // Re-load every time it opens (or the child changes) so a second child never shows the first's answers.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setForm(EMPTY);
    getChildSchedulePreference(childId)
      .then((p) => {
        if (!cancelled) setForm(fromApi(p));
      })
      .catch((err) => {
        if (!cancelled) setError(userMessage(err, "Couldn't load the details. Please try again."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, childId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  function setDaysPerWeek(count: number) {
    setForm((f) => {
      const days = f.days.slice(0, count);
      return { ...f, daysPerWeek: count, days, dayTimes: Object.fromEntries(Object.entries(f.dayTimes).filter(([d]) => days.includes(d))) };
    });
    setError(null);
  }

  function toggleDay(day: string) {
    setForm((f) => {
      if (f.days.includes(day)) {
        return { ...f, days: f.days.filter((d) => d !== day), dayTimes: Object.fromEntries(Object.entries(f.dayTimes).filter(([d]) => d !== day)) };
      }
      if (f.daysPerWeek !== null && f.days.length >= f.daysPerWeek) return f;
      return { ...f, days: [...f.days, day] };
    });
    setError(null);
  }

  function validate(): string | null {
    if (!form.daysPerWeek) return "Select how many days a week you'd like classes.";
    if (form.days.length !== form.daysPerWeek)
      return `Choose exactly ${form.daysPerWeek} preferred day${form.daysPerWeek === 1 ? "" : "s"} (${form.days.length} selected).`;
    if (form.days.some((d) => !form.dayTimes[d])) return "Choose a preferred time for each selected day.";
    if (!form.startDate) return "Choose the date you'd like classes to start from.";
    if (!form.courseId) return "Choose the course.";
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const ordered = SCHEDULE_DAYS.filter((d) => form.days.includes(d));
      const saved = await saveChildSchedulePreference(childId, {
        courseId: form.courseId || null,
        preferredStartDate: form.startDate || null,
        daysPerWeek: form.daysPerWeek!,
        preferredDays: ordered,
        dayTimes: Object.fromEntries(ordered.map((d) => [d, form.dayTimes[d]])),
        schoolName: form.schoolName.trim() || null,
        grade: form.grade.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        priorExperience: form.priorExperience.trim() || null,
        allergies: form.allergies.trim() || null,
        notes: form.notes.trim() || null,
      });
      toast({ variant: "success", title: "Details saved", description: `Thanks — we'll use this to set up ${firstName}'s class schedule.` });
      onSaved?.(saved);
      onOpenChange(false);
    } catch (err) {
      setError(userMessage(err, "Couldn't save the details. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{firstName}'s class details</DialogTitle>
          <DialogDescription>
            Tell us when {firstName} would like classes and a few details. {childName}'s name and your contact details are already with us — no need to add them again.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label>
                Course <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.courseId}
                onValueChange={(v) => {
                  // Switching between a group and an individual course changes the allowed hours;
                  // drop any picked time that's no longer offered so it can't be submitted unseen.
                  const allowed = new Set(timeOptionsFor(courses.find((c) => c.id === v)?.type).map((t) => t.value));
                  setForm((f) => ({
                    ...f,
                    courseId: v,
                    dayTimes: Object.fromEntries(Object.entries(f.dayTimes).filter(([, t]) => allowed.has(t))),
                  }));
                }}
              >
                <SelectTrigger aria-label="Course">
                  <SelectValue placeholder="Select the course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="child-start-date">
                Start classes from <span className="text-destructive">*</span>
              </Label>
              <Input
                id="child-start-date"
                type="date"
                value={form.startDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set("startDate", e.target.value)}
                className="max-w-[200px]"
              />
            </div>

            <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <legend className="px-1 text-sm font-semibold text-foreground">Preferred class days &amp; timings</legend>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium leading-none text-foreground/90">
                  How many days per week? <span className="text-destructive">*</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_PER_WEEK_OPTIONS.map((n) => (
                    <Button key={n} type="button" variant="pill" size="pill" aria-pressed={form.daysPerWeek === n} onClick={() => setDaysPerWeek(n)}>
                      {n} day{n === 1 ? "" : "s"}
                    </Button>
                  ))}
                </div>
              </div>

              {form.daysPerWeek !== null && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium leading-none text-foreground/90">
                    Preferred days ({form.days.length} of {form.daysPerWeek} chosen)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SCHEDULE_DAYS.map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant="pill"
                        size="pill"
                        aria-pressed={form.days.includes(d)}
                        disabled={!form.days.includes(d) && form.days.length >= form.daysPerWeek!}
                        onClick={() => toggleDay(d)}
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {form.days.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium leading-none text-foreground/90">Preferred time for each day</span>
                  {SCHEDULE_DAYS.filter((d) => form.days.includes(d)).map((d) => (
                    <div key={d} className="flex items-center gap-3">
                      <span className="w-12 text-sm font-semibold text-foreground">{d}</span>
                      <Select value={form.dayTimes[d] ?? ""} onValueChange={(v) => set("dayTimes", { ...form.dayTimes, [d]: v })}>
                        <SelectTrigger aria-label={`Preferred time on ${d}`} className="max-w-[200px]">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeOptions.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="child-school">School name</Label>
                <Input id="child-school" value={form.schoolName} onChange={(e) => set("schoolName", e.target.value)} maxLength={200} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="child-grade">Grade / class</Label>
                <Input id="child-grade" value={form.grade} onChange={(e) => set("grade", e.target.value)} maxLength={50} placeholder="e.g. Grade 2" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="child-dob">Date of birth</Label>
                <Input
                  id="child-dob"
                  type="date"
                  value={form.dateOfBirth}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger aria-label="Gender">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="child-prior">Any prior experience with this subject? (optional)</Label>
              <Textarea id="child-prior" rows={2} value={form.priorExperience} onChange={(e) => set("priorExperience", e.target.value)} maxLength={1000} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="child-allergies">Allergies or medical notes (optional)</Label>
              <Textarea id="child-allergies" rows={2} value={form.allergies} onChange={(e) => set("allergies", e.target.value)} maxLength={1000} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="child-notes">Anything else we should know? (optional)</Label>
              <Textarea id="child-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={2000} />
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
