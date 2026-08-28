import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, UserRound } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/state/session";
import { getChildById } from "@/data/children";
import { COURSES } from "@/data/courses";
import { cn } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useBrand } from "@/lib/branding";
import { useApiData } from "@/api/hooks";
import { listCourseOptions } from "@/api/courses";
import { submitEnrollmentForm } from "@/api/parentPortal";
import { getMyAccount } from "@/api/account";

const STEPS = ["Student Details", "Parent & Contact", "Course & Consent"] as const;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** 10 local digits, or up to 13 with a country code (e.g. +91 98765 43210). */
function phoneError(value: string, label: string): string | undefined {
  if (!value.trim()) return `${label} is required.`;
  if (/[^\d\s()+-]/.test(value.trim())) return `${label} can only contain digits, spaces, + ( ) -.`;
  const digits = phoneDigits(value);
  if (digits.length < 10 || digits.length > 13) return `Enter a valid ${label.toLowerCase()} (10 digits, or up to 13 with country code).`;
  return undefined;
}

interface EnrollmentForm {
  // Student
  childName: string;
  dob: string;
  grade: string;
  gender: string;
  schoolName: string;
  priorExperience: string;
  // Parent & contact
  parentName: string;
  relationship: string;
  parentPhone: string;
  parentEmail: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  address: string;
  // Course & consent
  courseInterest: string;
  preferredDays: string[];
  preferredTime: string;
  allergies: string;
  notes: string;
  consent: boolean;
}

export default function ParentEnrollment() {
  const brand = useBrand();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { activeChildId, setActiveChildId, markEnrollmentComplete, userName, children: sessionChildren } = useSession();
  const usingApi = apiEnabled();

  const childId = params.get("childId") || activeChildId;
  // Real roster in API mode (the mock lookup is demo-only); the form itself registers
  // the child server-side, so in API mode it renders even before any child exists.
  const mockChild = usingApi ? undefined : getChildById(childId);
  const sessionChild = usingApi ? sessionChildren.find((c) => c.id === childId) ?? sessionChildren[0] : undefined;
  const child = usingApi
    ? sessionChild
      ? { id: sessionChild.id, name: sessionChild.name, grade: "", courseId: "" }
      : undefined
    : mockChild
      ? { id: mockChild.id, name: mockChild.name, grade: mockChild.grade, courseId: mockChild.courseId }
      : undefined;
  const childFirstName = child?.name.split(" ")[0];

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EnrollmentForm>({
    childName: child?.name ?? "",
    dob: "",
    grade: child?.grade ?? "",
    gender: "",
    schoolName: "",
    priorExperience: "",
    parentName: userName !== "Guest" ? userName : "",
    relationship: "",
    parentPhone: "",
    parentEmail: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    address: "",
    courseInterest: child?.courseId ?? "",
    preferredDays: [],
    preferredTime: "",
    allergies: "",
    notes: "",
    consent: false,
  });

  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => navigate("/parent"), 1800);
    return () => clearTimeout(t);
  }, [submitted, navigate]);

  // Parent / guardian name, contact number and email come from the signed-in
  // parent's own account — filled automatically, still editable. Only blank
  // fields are filled so nothing a parent already typed gets overwritten.
  useEffect(() => {
    if (!usingApi) return;
    let cancelled = false;
    getMyAccount()
      .then((account) => {
        if (cancelled) return;
        setForm((f) => ({
          ...f,
          parentName: f.parentName || account.fullName,
          parentPhone: f.parentPhone || account.phone || "",
          parentEmail: f.parentEmail || account.email,
        }));
      })
      .catch(() => {
        /* form still works, just without prefill */
      });
    return () => {
      cancelled = true;
    };
  }, [usingApi]);

  // Real course catalogue in API mode; the mock list is demo-only.
  const { data: apiCourseOptions } = useApiData(() => listCourseOptions(), []);
  const courseOptions = useMemo(
    () =>
      usingApi
        ? apiCourseOptions.map((c) => ({ id: c.id, label: c.name }))
        : COURSES.filter((c) => c.type !== "demo" && c.status === "active").map((c) => ({ id: c.id, label: `${c.name} · ${c.category}` })),
    [usingApi, apiCourseOptions]
  );

  type FieldErrors = Partial<Record<keyof EnrollmentForm, string>>;
  const [errors, setErrors] = useState<FieldErrors>({});

  function update<K extends keyof EnrollmentForm>(key: K, value: EnrollmentForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // A field's error clears the moment the parent edits it.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  function validateStep(target: number): FieldErrors {
    const next: FieldErrors = {};
    if (target === 0) {
      if (form.childName.trim().length < 2) next.childName = "Enter the student's full name.";
      if (!form.dob) {
        next.dob = "Date of birth is required.";
      } else {
        const dob = new Date(form.dob);
        const ageYears = (Date.now() - dob.getTime()) / (365.25 * 86400_000);
        if (Number.isNaN(dob.getTime()) || ageYears < 0) next.dob = "Date of birth must be in the past.";
        else if (ageYears < 1 || ageYears > 18) next.dob = "The student's age must be between 1 and 18.";
      }
      if (!form.gender) next.gender = "Select a gender.";
      if (!form.grade.trim()) next.grade = "Grade / class is required.";
      if (!form.schoolName.trim()) next.schoolName = "Current school is required.";
    } else if (target === 1) {
      if (form.parentName.trim().length < 2) next.parentName = "Parent / guardian name is required.";
      if (!form.relationship) next.relationship = "Select your relationship to the student.";
      const parentPhoneError = phoneError(form.parentPhone, "Contact number");
      if (parentPhoneError) next.parentPhone = parentPhoneError;
      if (!EMAIL_RE.test(form.parentEmail.trim())) next.parentEmail = "Enter a valid email address.";
      if (form.emergencyContactName.trim().length < 2) next.emergencyContactName = "Emergency contact name is required.";
      const emergencyPhoneError = phoneError(form.emergencyContactPhone, "Emergency contact number");
      if (emergencyPhoneError) next.emergencyContactPhone = emergencyPhoneError;
      else if (!parentPhoneError && phoneDigits(form.emergencyContactPhone) === phoneDigits(form.parentPhone))
        next.emergencyContactPhone = "The emergency contact should be a different number from your own.";
      if (form.address.trim().length < 10) next.address = "Enter the full home address (street, city, PIN).";
    } else {
      if (!form.courseInterest) next.courseInterest = "Select a course to continue.";
      if (!form.consent) next.consent = "Please confirm the details and give consent to submit.";
    }
    return next;
  }

  function handleNext() {
    const stepErrors = validateStep(step);
    setErrors(stepErrors);
    if (Object.values(stepErrors).some(Boolean)) return;
    setStep((s) => s + 1);
  }

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      preferredDays: f.preferredDays.includes(day) ? f.preferredDays.filter((d) => d !== day) : [...f.preferredDays, day],
    }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Re-validate every step on submit — Back-and-edit can invalidate an earlier one.
    for (const target of [0, 1, 2]) {
      const stepErrors = validateStep(target);
      if (Object.values(stepErrors).some(Boolean)) {
        setErrors(stepErrors);
        setStep(target);
        return;
      }
    }

    if (apiEnabled()) {
      setSubmitting(true);
      setError(null);
      // Answers travel as a JSON document keyed by field id (client-configurable schema).
      submitEnrollmentForm({ ...form })
        .then(() => {
          markEnrollmentComplete(childId);
          setActiveChildId(childId);
          setSubmitted(true);
        })
        .catch((err: Error) => setError(err.message || "Could not submit the form. Please try again."))
        .finally(() => setSubmitting(false));
      return;
    }

    markEnrollmentComplete(childId);
    setActiveChildId(childId);
    setSubmitted(true);
  }

  if (!usingApi && !child) {
    return (
      <div>
        <PageHeader title="Child Enrollment Form" description="Mandatory before accessing the parent dashboard." />
        <EmptyState
          icon={UserRound}
          title="No child found"
          description="Add a child to your account first to start their enrollment."
          action={
            <Button asChild>
              <Link to="/parent/add-child">Add child</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // Falls back to the typed name (required by step 1) when there's no roster child yet.
  const displayFirstName = childFirstName ?? (form.childName.trim().split(" ")[0] || "Your child");

  if (submitted) {
    return (
      <div>
        <PageHeader title="Child Enrollment Form" description="Mandatory before accessing the parent dashboard." />
        <Card className="mx-auto mt-10 max-w-lg p-6 text-center sm:p-8">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-bold text-foreground">{displayFirstName}'s enrollment is complete!</h2>
          <p className="mt-2 text-sm text-muted-foreground">Taking you to the dashboard…</p>
          <Button className="mt-6 !bg-brand-green !text-white hover:!bg-brand-greenDark" onClick={() => navigate("/parent")}>
            Go to Dashboard now
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Mandatory before dashboard access"
        title={childFirstName ? `Complete ${childFirstName}'s Enrollment` : "Complete Your Child's Enrollment"}
        description="A few quick details unlock classes, attendance, resources and billing for this child."
      />

      <Card className="mx-auto max-w-2xl">
        <CardHeader className="gap-3">
          <div aria-live="polite" className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>
              Step {step + 1} of {STEPS.length}
            </span>
            <span>{STEPS[step]}</span>
          </div>
          <Progress value={((step + 1) / STEPS.length) * 100} />
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {step === 0 && (
              <div className="flex flex-col gap-4">
                <Field label="Student's full name" htmlFor="childName" required error={errors.childName}>
                  <Input
                    id="childName"
                    required
                    value={form.childName}
                    onChange={(e) => update("childName", e.target.value)}
                    placeholder="e.g. Aarav Kapoor"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Date of birth" htmlFor="dob" required error={errors.dob}>
                    <Input id="dob" type="date" required value={form.dob} onChange={(e) => update("dob", e.target.value)} />
                  </Field>
                  <Field label="Gender" htmlFor="gender" required error={errors.gender}>
                    <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Grade / class" htmlFor="grade" required error={errors.grade}>
                    <Input
                      id="grade"
                      required
                      value={form.grade}
                      onChange={(e) => update("grade", e.target.value)}
                      placeholder="e.g. Pre-K, Grade 2"
                    />
                  </Field>
                  <Field label="Current school" htmlFor="schoolName" required error={errors.schoolName}>
                    <Input
                      id="schoolName"
                      required
                      value={form.schoolName}
                      onChange={(e) => update("schoolName", e.target.value)}
                      placeholder="e.g. Green Valley School"
                    />
                  </Field>
                </div>
                <Field label="Prior experience in this subject" htmlFor="priorExperience">
                  <Select value={form.priorExperience} onValueChange={(v) => update("priorExperience", v)}>
                    <SelectTrigger id="priorExperience">
                      <SelectValue placeholder="Select level (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Complete beginner</SelectItem>
                      <SelectItem value="some">Some exposure</SelectItem>
                      <SelectItem value="confident">Confident / advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Parent / guardian name" htmlFor="parentName" required error={errors.parentName}>
                    <Input
                      id="parentName"
                      required
                      value={form.parentName}
                      onChange={(e) => update("parentName", e.target.value)}
                      placeholder="e.g. Priya Kapoor"
                    />
                  </Field>
                  <Field label="Relationship to student" htmlFor="relationship" required error={errors.relationship}>
                    <Select value={form.relationship} onValueChange={(v) => update("relationship", v)}>
                      <SelectTrigger id="relationship">
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mother">Mother</SelectItem>
                        <SelectItem value="father">Father</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Contact number" htmlFor="parentPhone" required error={errors.parentPhone}>
                    <Input
                      id="parentPhone"
                      required
                      value={form.parentPhone}
                      onChange={(e) => update("parentPhone", e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </Field>
                  <Field label="Email" htmlFor="parentEmail" required error={errors.parentEmail}>
                    <Input
                      id="parentEmail"
                      type="email"
                      required
                      value={form.parentEmail}
                      onChange={(e) => update("parentEmail", e.target.value)}
                      placeholder="you@email.com"
                    />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Emergency contact name" htmlFor="emergencyContactName" required error={errors.emergencyContactName}>
                    <Input
                      id="emergencyContactName"
                      required
                      value={form.emergencyContactName}
                      onChange={(e) => update("emergencyContactName", e.target.value)}
                      placeholder="Another guardian / relative"
                    />
                  </Field>
                  <Field label="Emergency contact number" htmlFor="emergencyContactPhone" required error={errors.emergencyContactPhone}>
                    <Input
                      id="emergencyContactPhone"
                      required
                      value={form.emergencyContactPhone}
                      onChange={(e) => update("emergencyContactPhone", e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </Field>
                </div>
                <Field label="Home address" htmlFor="address" required error={errors.address}>
                  <Textarea
                    id="address"
                    required
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    placeholder="Street, city, state, PIN"
                  />
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-4">
                <Field label="Course of interest" htmlFor="courseInterest" required error={errors.courseInterest}>
                  <Select value={form.courseInterest} onValueChange={(v) => update("courseInterest", v)}>
                    <SelectTrigger id="courseInterest">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courseOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <fieldset className="flex flex-col gap-1.5">
                  <legend className="text-sm font-medium leading-none text-foreground/90">Preferred class days</legend>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS.map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant="pill"
                        size="pill"
                        aria-pressed={form.preferredDays.includes(d)}
                        onClick={() => toggleDay(d)}
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </fieldset>

                <Field label="Preferred time slot" htmlFor="preferredTime">
                  <Select value={form.preferredTime} onValueChange={(v) => update("preferredTime", v)}>
                    <SelectTrigger id="preferredTime">
                      <SelectValue placeholder="Select a time slot (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (8am–12pm)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12pm–4pm)</SelectItem>
                      <SelectItem value="evening">Evening (4pm–8pm)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Allergies or medical notes (optional)" htmlFor="allergies">
                  <Textarea
                    id="allergies"
                    value={form.allergies}
                    onChange={(e) => update("allergies", e.target.value)}
                    placeholder="e.g. None, or specify allergies"
                  />
                </Field>
                <Field label="Anything else we should know? (optional)" htmlFor="notes">
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="Learning style, prior experience, goals…"
                  />
                </Field>

                <label
                  className={cn(
                    "flex items-start gap-3 rounded-lg border bg-muted/30 p-3",
                    errors.consent ? "border-destructive" : "border-border"
                  )}
                >
                  <Checkbox
                    id="consent"
                    checked={form.consent}
                    onCheckedChange={(v) => update("consent", v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-muted-foreground">
                    I confirm the details above are correct, and I consent to my child attending online classes that may be
                    recorded for learning and quality purposes, per {brand.name}'s terms.
                  </span>
                </label>
                {errors.consent && <p className="text-xs font-medium text-destructive">{errors.consent}</p>}
              </div>
            )}

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <div className="mt-2 flex items-center justify-between gap-3">
              <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNext} className="!bg-brand-green !text-white hover:!bg-brand-greenDark">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={submitting}
                  className="!bg-brand-green !text-white hover:!bg-brand-greenDark"
                >
                  <CheckCircle2 className="h-4 w-4" /> {submitting ? "Submitting…" : "Submit & Unlock Dashboard"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className={cn(error && "text-destructive")}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {/* role="alert" so a screen reader announces the failure on Next/Submit — the
          errors appear well below the button that triggered them and were otherwise
          silent (matching how Login and Store already announce their errors). */}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
