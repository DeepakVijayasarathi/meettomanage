import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, Clock3, PartyPopper, TrendingUp, UserPlus, UserRound } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeeStatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { COURSES } from "@/data/courses";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  getParentDashboard,
  listMyEnrollmentForms,
  type ApiEnrollmentForm,
  type ApiParentDashboard,
} from "@/api/parentPortal";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";

export default function ParentAddChild() {
  const [form, setForm] = useState({ name: "", age: "", grade: "", gender: "", courseInterest: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API mode: the real family roster + any enrollments still under review.
  const { data: dash } = useApiData<ApiParentDashboard | null>(() => getParentDashboard(), null, null);
  const { data: myForms } = useApiData<ApiEnrollmentForm[]>(() => listMyEnrollmentForms(), []);

  // In API mode a child is added through the real enrollment form (reviewed and approved
  // by the team) — never through this demo-only quick-add with its sample data.
  if (apiEnabled()) {
    const children = dash?.children ?? [];
    const awaiting = myForms.filter((f) => f.status === "Submitted" || f.status === "Rejected");

    return (
      <div>
        <PageHeader
          title="Add Child"
          description="Your family's enrolled children, enrollments under review, and adding a sibling."
          actions={
            <Button asChild>
              <Link to="/parent/enrollment">
                <UserPlus className="h-4 w-4" /> Add a child
              </Link>
            </Button>
          }
        />

        {children.length === 0 && awaiting.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title="No children yet"
            description="Add your first child through the enrollment form — once our team approves it, they'll appear here and on your dashboard."
            action={
              <Button asChild>
                <Link to="/parent/enrollment">
                  Start Enrollment <CheckCircle2 className="h-4 w-4" />
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-6">
            {children.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Enrolled children ({children.length})
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {children.map((child, index) => {
                    const color = CHART_PALETTE[index % CHART_PALETTE.length];
                    return (
                      <Card key={child.childId} className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                              style={{ backgroundColor: `${color}22`, color }}
                            >
                              {getInitials(child.name)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">{child.name}</p>
                              <p className="text-xs text-muted-foreground">{child.academicLevel ?? "Level not set yet"}</p>
                            </div>
                          </div>
                          <FeeStatusBadge status={child.feeStatus} />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <CheckCircle2 className="h-3 w-3" /> Completed
                            </p>
                            <p className="mt-0.5 font-semibold text-foreground">{child.classesCompleted} classes</p>
                          </div>
                          <div>
                            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <CalendarClock className="h-3 w-3" /> Remaining
                            </p>
                            <p className="mt-0.5 font-semibold text-foreground">{child.classesRemaining} classes</p>
                          </div>
                          <div>
                            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                              <TrendingUp className="h-3 w-3" /> Attendance
                            </p>
                            <p className="mt-0.5 font-semibold text-foreground">{child.attendancePercent}%</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {awaiting.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Awaiting approval ({awaiting.length})
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {awaiting.map((pendingForm) => {
                    let answers: Record<string, unknown> = {};
                    try {
                      answers = JSON.parse(pendingForm.formDataJson) as Record<string, unknown>;
                    } catch {
                      /* malformed answers still render */
                    }
                    const name = typeof answers.childName === "string" && answers.childName ? answers.childName : "(name pending)";
                    const rejected = pendingForm.status === "Rejected";
                    return (
                      <Card
                        key={pendingForm.id}
                        className={cn("p-5", rejected ? "border-destructive/40 bg-destructive/5" : "border-warning/40 bg-warning/5")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={cn(
                                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                                rejected ? "bg-destructive/10 text-destructive" : "bg-warning/20 text-warning-foreground"
                              )}
                            >
                              <Clock3 className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">{name}</p>
                              <p className="text-xs text-muted-foreground">
                                Submitted {pendingForm.submittedAtUtc ? formatDate(pendingForm.submittedAtUtc, "long") : "—"}
                              </p>
                            </div>
                          </div>
                          <Badge variant={rejected ? "destructive" : "warning"}>{rejected ? "Needs changes" : "Pending approval"}</Badge>
                        </div>
                        {rejected && (
                          <Button size="sm" asChild className="mt-4">
                            <Link to="/parent/enrollment">Edit &amp; resubmit</Link>
                          </Button>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const courseOptions = COURSES.filter((c) => c.type !== "demo" && c.status === "active");

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // required blocks a truly empty field but not a whitespace-only one.
    if (!form.name.trim() || !form.grade.trim()) {
      setError("Enter the child's name and grade.");
      return;
    }
    setError(null);
    setSubmitted(true);
  }

  if (submitted) {
    const displayName = form.name.trim() || "Your child";
    return (
      <div>
        <PageHeader title="Add Child" description="Enroll a sibling under your account." />
        <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
            <PartyPopper className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-bold text-foreground">{displayName} has been added!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome to The Reader Nest family. To get {form.name.trim() ? form.name.trim() : "them"} started, we just need a quick
            enrollment form — grade, contact details and course interest.
          </p>
          <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">
            You're in demo mode — the next screen continues with our sample learner{" "}
            <span className="font-semibold">Kabir Kapoor</span> instead of {displayName}, so you can see the full enrollment flow
            without it needing a real backend.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/parent/enrollment?childId=c-3">
                Continue with demo learner <CheckCircle2 className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/parent">Back to Dashboard</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Add Child" description="Add a sibling to your account — you'll complete their enrollment right after." />
      <Card className="mx-auto mt-6 max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Child details
          </CardTitle>
          <CardDescription>We'll use this to set up their profile and suggest the right course.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Child's full name</Label>
                <Input id="name" required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Anaya Kapoor" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min={2}
                  max={18}
                  required
                  value={form.age}
                  onChange={(e) => update("age", e.target.value)}
                  placeholder="e.g. 6"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="grade">Grade</Label>
                <Input id="grade" required value={form.grade} onChange={(e) => update("grade", e.target.value)} placeholder="e.g. Grade 1" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gender">Gender</Label>
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
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course">Course interest</Label>
              <Select value={form.courseInterest} onValueChange={(v) => update("courseInterest", v)}>
                <SelectTrigger id="course">
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
            </div>
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="mt-2">
              <CheckCircle2 className="h-4 w-4" /> Add child
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
