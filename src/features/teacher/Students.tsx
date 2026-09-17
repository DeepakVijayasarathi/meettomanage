import { useEffect, useMemo, useState } from "react";
import { Users, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { InlineAlert } from "@/components/InlineAlert";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiEnabled } from "@/lib/api";
import { listMyStudents, type ApiTeacherStudent } from "@/api/batches";
import { CHILDREN } from "@/data/children";
import { BATCHES } from "@/data/batches";
import { getCourseById } from "@/data/courses";
import { getParentById } from "@/data/users";
import { formatDate } from "@/lib/utils";

/** A child hasn't attended regularly if they've missed a meaningful share of the sessions
 *  run since they enrolled — this threshold, not "any absence", is what the teacher feedback
 *  ("identify if a child was not attending regularly") actually needs flagged. */
function isIrregular(row: Pick<ApiTeacherStudent, "sessionsSinceEnrollment" | "attendedCount">): boolean {
  return row.sessionsSinceEnrollment >= 3 && row.attendedCount / row.sessionsSinceEnrollment < 0.7;
}

function buildDemoRows(): ApiTeacherStudent[] {
  const myBatches = BATCHES.filter((b) => b.teacherId === "t-1");
  return CHILDREN.filter((c) => myBatches.some((b) => b.id === c.batchId)).map((child) => {
    const batch = myBatches.find((b) => b.id === child.batchId)!;
    const course = getCourseById(batch.courseId);
    const parent = getParentById(child.parentId);
    const totalSessions = child.classesCompleted + child.classesRemaining;
    const attended = Math.round(((child.attendancePercent ?? 100) / 100) * child.classesCompleted);
    return {
      childId: child.id,
      childName: child.name,
      parentName: parent?.name ?? "—",
      academicLevel: child.grade,
      batchId: batch.id,
      batchName: batch.name,
      courseName: course?.name ?? "—",
      enrolledAtUtc: batch.startDate,
      totalSessions,
      completedSessions: child.classesCompleted,
      remainingSessions: child.classesRemaining,
      sessionsSinceEnrollment: child.classesCompleted,
      attendedCount: attended,
      lastAttendedAtUtc: null,
    };
  });
}

/**
 * "My Students" — teacher feedback: the previous LMS showed names/list of students being
 * handled separately, making it easy to track who's currently assigned, how many sessions
 * were remaining for each, and whether a child was falling behind on attendance. Nothing in
 * this app aggregated that before; a teacher's roster only ever existed implicitly, scattered
 * across each batch's own session list.
 */
export default function TeacherStudents() {
  const usingApi = apiEnabled();

  const [rows, setRows] = useState<ApiTeacherStudent[]>([]);
  const [loading, setLoading] = useState(usingApi);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usingApi) {
      setRows(buildDemoRows());
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listMyStudents()
      .then((result) => {
        if (!cancelled) setRows(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load your students.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [usingApi]);

  const headcount = useMemo(() => new Set(rows.map((r) => r.childId)).size, [rows]);

  return (
    <div>
      <PageHeader
        eyebrow="Teaching"
        title="My Students"
        description="Every child currently placed in one of your batches, with sessions remaining and attendance regularity."
      />

      {error && (
        <InlineAlert variant="warning" className="mt-4">
          Could not load your students ({error}).
        </InlineAlert>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading your students…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students yet"
          description="Once a child is placed in one of your batches, they'll show up here."
          className="mt-6"
        />
      ) : (
        <>
          <Card className="mt-6 flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold text-foreground">{headcount}</p>
              <p className="text-xs text-muted-foreground">
                student{headcount === 1 ? "" : "s"} currently across {new Set(rows.map((r) => r.batchId)).size} batch
                {new Set(rows.map((r) => r.batchId)).size === 1 ? "" : "es"}
              </p>
            </div>
          </Card>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => {
              const irregular = isIrregular(row);
              return (
                <Card key={`${row.childId}-${row.batchId}`} className="flex flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{row.childName}</p>
                      <p className="text-xs text-muted-foreground">Parent: {row.parentName}</p>
                    </div>
                    {irregular && (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Irregular
                      </Badge>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {row.batchName} · {row.courseName}
                  </p>
                  {row.academicLevel && <p className="mt-1 text-xs text-muted-foreground">{row.academicLevel}</p>}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Sessions remaining</span>
                    <span className="font-semibold text-foreground">{row.remainingSessions}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Attendance since enrolling</span>
                    <span className="font-semibold text-foreground">
                      {row.sessionsSinceEnrollment > 0
                        ? `${row.attendedCount}/${row.sessionsSinceEnrollment}`
                        : "No sessions yet"}
                    </span>
                  </div>
                  {row.lastAttendedAtUtc && (
                    <p className="mt-2 text-xs text-muted-foreground">Last attended {formatDate(row.lastAttendedAtUtc.slice(0, 10), "short")}</p>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
