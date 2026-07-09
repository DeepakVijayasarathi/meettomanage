import { Link } from "react-router-dom";
import { ArrowRight, ClipboardCheck, Clock, GraduationCap, Hourglass, Sparkles, Users2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMO_FEEDBACKS } from "@/data/feedback";
import { formatDate, formatNumber } from "@/lib/utils";

export default function AdmissionDemoFeedback() {
  const submitted = DEMO_FEEDBACKS.filter((f) => f.submitted);
  const pending = DEMO_FEEDBACKS.filter((f) => !f.submitted);

  return (
    <div>
      <PageHeader
        eyebrow="Pipeline"
        title="Demo Feedback"
        description="Review teacher-submitted demo feedback to guide follow-up and batch placement. Feedback is submitted by teachers only — this is a read-only view for the admission team."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Demo Feedback" value={formatNumber(DEMO_FEEDBACKS.length)} icon={Users2} tone="primary" />
        <KpiCard label="Submitted" value={formatNumber(submitted.length)} icon={ClipboardCheck} tone="success" />
        <KpiCard label="Awaiting Teacher" value={formatNumber(pending.length)} icon={Hourglass} tone="warning" />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/15 text-success">
            <ClipboardCheck className="h-4 w-4" />
          </span>
          <h2 className="text-base font-bold text-foreground">Submitted ({submitted.length})</h2>
        </div>

        {submitted.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="No feedback submitted yet" description="Teacher-submitted feedback will appear here after a demo class." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {submitted.map((f) => (
              <Card key={f.id}>
                <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle>{f.childName}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Parent: {f.parentName} · Demo by {f.teacherName} on {formatDate(f.demoDate, "short")}
                    </p>
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

                  <Button variant="soft" size="sm" className="mt-2 self-start" asChild>
                    <Link to="/admission/leads">
                      Start follow-up <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/20 text-warning-foreground">
            <Clock className="h-4 w-4" />
          </span>
          <h2 className="text-base font-bold text-foreground">Awaiting Teacher Feedback ({pending.length})</h2>
        </div>

        {pending.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="All caught up" description="Every completed demo has feedback on file." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pending.map((f) => (
              <Card key={f.id} className="border-warning/30 bg-warning/5">
                <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle>{f.childName}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Parent: {f.parentName} · Demo by {f.teacherName} on {formatDate(f.demoDate, "short")}
                    </p>
                  </div>
                  <Badge variant="warning">Awaiting</Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    {f.teacherName} hasn&apos;t submitted the mandatory post-demo feedback form yet. You&apos;ll be able to review academic
                    level, strengths, improvement areas and the recommended course as soon as it&apos;s in.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
