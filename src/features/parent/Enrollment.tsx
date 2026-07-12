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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/state/session";
import { getChildById } from "@/data/children";
import { COURSES } from "@/data/courses";
import { apiEnabled } from "@/lib/api";
import { submitEnrollmentForm } from "@/api/parentPortal";

const STEPS = ["Child Details", "Family & Contact", "Course & Notes"] as const;

interface EnrollmentForm {
  childName: string;
  dob: string;
  grade: string;
  gender: string;
  schoolName: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  courseInterest: string;
  allergies: string;
  notes: string;
}

export default function ParentEnrollment() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { activeChildId, setActiveChildId, markEnrollmentComplete, userName } = useSession();

  const childId = params.get("childId") || activeChildId;
  const child = getChildById(childId);

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<EnrollmentForm>({
    childName: child?.name ?? "",
    dob: "",
    grade: child?.grade ?? "",
    gender: "",
    schoolName: "",
    parentName: userName !== "Guest" ? userName : "",
    parentPhone: "",
    parentEmail: "",
    address: "",
    courseInterest: child?.courseId ?? "",
    allergies: "",
    notes: "",
  });

  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => navigate("/parent"), 1800);
    return () => clearTimeout(t);
  }, [submitted, navigate]);

  const courseOptions = useMemo(() => COURSES.filter((c) => c.type !== "demo" && c.status === "active"), []);

  function update<K extends keyof EnrollmentForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (apiEnabled()) {
      // Answers travel as a JSON document; the field list is client-configurable
      // (docs/ENROLLMENT_FORM_FIELDS.md) so no schema coupling here
      submitEnrollmentForm({ ...form }).then(() => {
        markEnrollmentComplete(childId);
        setActiveChildId(childId);
        setSubmitted(true);
      });
      return;
    }

    markEnrollmentComplete(childId);
    setActiveChildId(childId);
    setSubmitted(true);
  }

  const canContinue =
    step === 0
      ? Boolean(form.childName.trim() && form.dob && form.grade.trim() && form.gender)
      : step === 1
        ? Boolean(form.schoolName.trim() && form.parentName.trim() && form.parentPhone.trim() && form.address.trim())
        : Boolean(form.courseInterest);

  if (!child) {
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

  if (submitted) {
    return (
      <div>
        <PageHeader title="Child Enrollment Form" description="Mandatory before accessing the parent dashboard." />
        <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-bold text-foreground">{child.name.split(" ")[0]}'s enrollment is complete!</h2>
          <p className="mt-2 text-sm text-muted-foreground">Taking you to {child.name.split(" ")[0]}'s dashboard…</p>
          <Button className="mt-6" onClick={() => navigate("/parent")}>
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
        title={`Complete ${child.name.split(" ")[0]}'s Enrollment`}
        description="A few quick details unlock classes, attendance, resources and billing for this child."
      />

      <Card className="mx-auto max-w-2xl">
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Child's full name" htmlFor="childName">
                    <Input id="childName" required value={form.childName} onChange={(e) => update("childName", e.target.value)} />
                  </Field>
                  <Field label="Date of birth" htmlFor="dob">
                    <Input id="dob" type="date" required value={form.dob} onChange={(e) => update("dob", e.target.value)} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Grade" htmlFor="grade">
                    <Input
                      id="grade"
                      required
                      value={form.grade}
                      onChange={(e) => update("grade", e.target.value)}
                      placeholder="e.g. Pre-K, Grade 2"
                    />
                  </Field>
                  <Field label="Gender" htmlFor="gender">
                    <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col gap-4">
                <Field label="Current school name" htmlFor="schoolName">
                  <Input
                    id="schoolName"
                    required
                    value={form.schoolName}
                    onChange={(e) => update("schoolName", e.target.value)}
                    placeholder="e.g. Green Valley School"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Parent / guardian name" htmlFor="parentName">
                    <Input id="parentName" required value={form.parentName} onChange={(e) => update("parentName", e.target.value)} />
                  </Field>
                  <Field label="Contact number" htmlFor="parentPhone">
                    <Input
                      id="parentPhone"
                      required
                      value={form.parentPhone}
                      onChange={(e) => update("parentPhone", e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </Field>
                </div>
                <Field label="Email" htmlFor="parentEmail">
                  <Input
                    id="parentEmail"
                    type="email"
                    value={form.parentEmail}
                    onChange={(e) => update("parentEmail", e.target.value)}
                    placeholder="you@email.com"
                  />
                </Field>
                <Field label="Home address" htmlFor="address">
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
                <Field label="Course interest" htmlFor="courseInterest">
                  <Select value={form.courseInterest} onValueChange={(v) => update("courseInterest", v)}>
                    <SelectTrigger id="courseInterest">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courseOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} · {c.category}
                        </SelectItem>
                      ))}
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
              </div>
            )}

            <div className="mt-2 flex items-center justify-between">
              <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={!canContinue}>
                  <CheckCircle2 className="h-4 w-4" /> Submit &amp; Unlock Dashboard
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
