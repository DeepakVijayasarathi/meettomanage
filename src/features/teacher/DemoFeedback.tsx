import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEMO_FEEDBACKS } from "@/data/feedback";
import { COURSES } from "@/data/courses";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listCourses } from "@/api/courses";
import {
  listMyDemoBookings,
  listMyDemoFeedback,
  submitDemoFeedback,
  toAwaitingFeedback,
  toFrontendFeedback,
} from "@/api/demoBookings";
import { cn, formatDate } from "@/lib/utils";
import type { CourseType, DemoFeedback } from "@/types";

const TEACHER_NAME = "Karan Mehta"; // maps to t-1 in this mock universe

interface FormState {
  academicLevel: string;
  strengths: string;
  improvementAreas: string;
  recommendedCourse: string;
  suggestedBatchType: CourseType;
  remarks: string;
}

const EMPTY_FORM: FormState = {
  academicLevel: "",
  strengths: "",
  improvementAreas: "",
  recommendedCourse: "",
  suggestedBatchType: "group",
  remarks: "",
};

const MOCK_FEEDBACKS = DEMO_FEEDBACKS.filter((f) => f.teacherName === TEACHER_NAME);
const MOCK_COURSE_OPTIONS = COURSES.filter((c) => c.type !== "demo").map((c) => ({ id: c.id, name: c.name }));

export default function TeacherDemoFeedback() {
  const { data: apiFeedbacks, reload } = useApiData(
    () =>
      Promise.all([listMyDemoBookings(), listMyDemoFeedback()]).then(([bookings, submittedItems]) => [
        ...bookings.filter((b) => b.conversionStatus === "DemoScheduled").map(toAwaitingFeedback),
        ...submittedItems.map(toFrontendFeedback),
      ]),
    MOCK_FEEDBACKS
  );
  const { data: courseOptions } = useApiData(
    () => listCourses().then((courses) => courses.map((c) => ({ id: c.id, name: c.name }))),
    MOCK_COURSE_OPTIONS
  );
  const [feedbacks, setFeedbacks] = useState<DemoFeedback[]>(MOCK_FEEDBACKS);
  useEffect(() => setFeedbacks(apiFeedbacks), [apiFeedbacks]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [justSubmitted, setJustSubmitted] = useState<string | null>(null);

  useEffect(() => {
    if (!justSubmitted) return;
    const timer = setTimeout(() => setJustSubmitted(null), 5000);
    return () => clearTimeout(timer);
  }, [justSubmitted]);

  const pending = feedbacks.filter((f) => !f.submitted);
  const submitted = feedbacks.filter((f) => f.submitted);
  const active = feedbacks.find((f) => f.id === activeId) ?? null;

  function openForm(feedback: DemoFeedback) {
    setActiveId(feedback.id);
    setForm({
      academicLevel: feedback.academicLevel,
      strengths: feedback.strengths,
      improvementAreas: feedback.improvementAreas,
      recommendedCourse: feedback.recommendedCourse,
      suggestedBatchType: feedback.suggestedBatchType,
      remarks: feedback.remarks,
    });
  }

  const isValid =
    form.academicLevel.trim().length > 0 &&
    form.strengths.trim().length > 0 &&
    form.improvementAreas.trim().length > 0 &&
    form.recommendedCourse.trim().length > 0;

  function handleSubmit() {
    if (!active || !isValid) return;

    if (apiEnabled()) {
      // The pending card's id is the demo booking id
      submitDemoFeedback(active.id, {
        academicLevel: form.academicLevel.trim(),
        strengths: form.strengths.trim(),
        improvementAreas: form.improvementAreas.trim(),
        recommendedCourseId: courseOptions.find((c) => c.name === form.recommendedCourse)?.id,
        suggestedBatchType: form.suggestedBatchType === "1:1" ? "Individual" : "Group",
        remarks: form.remarks.trim() || undefined,
      }).then(() => {
        reload();
        setJustSubmitted(active.childName);
      });
      setActiveId(null);
      setForm(EMPTY_FORM);
      return;
    }

    setFeedbacks((prev) => prev.map((f) => (f.id === active.id ? { ...f, ...form, submitted: true } : f)));
    setJustSubmitted(active.childName);
    setActiveId(null);
    setForm(EMPTY_FORM);
  }

  return (
    <div>
      <PageHeader
        title="Demo Feedback"
        description="Mandatory feedback after every demo class — helps the admission team place the child in the right batch."
        eyebrow="Teaching"
      />

      {justSubmitted && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-success/30 bg-success/10 p-4 text-sm font-medium text-success">
          <CheckCircle2 className="h-4 w-4" />
          Feedback for {justSubmitted} submitted successfully.
        </div>
      )}

      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/20 text-warning-foreground">
            <Clock className="h-4 w-4" />
          </span>
          <h2 className="text-base font-bold text-foreground">Pending ({pending.length})</h2>
        </div>

        {pending.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All caught up" description="You have no pending demo feedback forms right now." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pending.map((f) => (
              <Card key={f.id} className="border-warning/30">
                <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle>{f.childName}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Parent: {f.parentName}</p>
                  </div>
                  <Badge variant="warning">Pending</Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-0">
                  <p className="text-sm text-muted-foreground">Demo held on {formatDate(f.demoDate, "long")}</p>
                  <Button onClick={() => openForm(f)}>Complete feedback</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15 text-success">
            <ClipboardCheck className="h-4 w-4" />
          </span>
          <h2 className="text-base font-bold text-foreground">Submitted ({submitted.length})</h2>
        </div>

        {submitted.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No submitted feedback yet"
            description="Once you complete a demo feedback form, it will appear here for your records."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {submitted.map((f) => (
              <Card key={f.id}>
                <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle>{f.childName}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Parent: {f.parentName} · Demo on {formatDate(f.demoDate, "short")}</p>
                  </div>
                  <Badge variant="success">Submitted</Badge>
                </CardHeader>
                <CardContent className="flex flex-col gap-2.5 pt-0 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Academic Level</p>
                    <p className="text-foreground">{f.academicLevel}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Strengths</p>
                    <p className="text-foreground">{f.strengths}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Improvement Areas</p>
                    <p className="text-foreground">{f.improvementAreas}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge variant="outline" className="gap-1">
                      <GraduationCap className="h-3 w-3" /> {f.recommendedCourse}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" /> {f.suggestedBatchType === "1:1" ? "1:1 batch" : "Group batch"}
                    </Badge>
                  </div>
                  {f.remarks && <p className="text-muted-foreground">{f.remarks}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActiveId(null)}>
        <DialogContent className="max-w-lg">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>Demo Feedback — {active.childName}</DialogTitle>
                <DialogDescription>
                  Parent: {active.parentName} · Demo held on {formatDate(active.demoDate, "long")}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="academicLevel">
                    Academic Level <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="academicLevel"
                    placeholder="e.g. Pre-reader — recognizes 8 letter sounds"
                    value={form.academicLevel}
                    onChange={(e) => setForm((p) => ({ ...p, academicLevel: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="strengths">
                    Strengths <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="strengths"
                    placeholder="What did the child do well during the demo?"
                    value={form.strengths}
                    onChange={(e) => setForm((p) => ({ ...p, strengths: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="improvementAreas">
                    Improvement Areas <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="improvementAreas"
                    placeholder="What should the child work on?"
                    value={form.improvementAreas}
                    onChange={(e) => setForm((p) => ({ ...p, improvementAreas: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>
                      Recommended Course <span className="text-destructive">*</span>
                    </Label>
                    <Select value={form.recommendedCourse} onValueChange={(v) => setForm((p) => ({ ...p, recommendedCourse: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courseOptions.map((c) => (
                          <SelectItem key={c.id} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label>
                      Suggested Batch Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.suggestedBatchType}
                      onValueChange={(v) => setForm((p) => ({ ...p, suggestedBatchType: v as CourseType }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select batch type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="group">Group Batch</SelectItem>
                        <SelectItem value="1:1">1:1 (Personal)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="remarks">Remarks (optional)</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Any additional notes for the admission team"
                    value={form.remarks}
                    onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                  />
                </div>

                {!isValid && (
                  <p className={cn("text-xs font-medium text-muted-foreground")}>
                    Fields marked <span className="text-destructive">*</span> are required before you can submit.
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setActiveId(null)}>
                  Cancel
                </Button>
                <Button disabled={!isValid} onClick={handleSubmit}>
                  Submit Feedback
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
