import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, Clock, ShieldAlert, UserX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listSessions, toFrontendSession } from "@/api/sessions";
import { listLeave, toFrontendLeave } from "@/api/academicOps";
import { SESSIONS } from "@/data/sessions";
import { LEAVE_REQUESTS } from "@/data/leaves";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import type { ClassSession, LeaveRequest } from "@/types";

interface AttentionItem {
  id: string;
  tone: "destructive" | "warning";
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Leave-vs-calendar conflicts and unresolved no-shows. Per client feedback this
 * lives with the Parent Relationship Manager (not the coordinator). Loads its own
 * real sessions + leave (mock fallback in demo mode).
 */
export function ScheduleConflictsPanel() {
  const { data: sessions } = useApiData<ClassSession[]>(() => listSessions().then((s) => s.map(toFrontendSession)), SESSIONS);
  const { data: leaves } = useApiData<LeaveRequest[]>(() => listLeave().then((l) => l.map(toFrontendLeave)), LEAVE_REQUESTS);
  const items = useMemo(() => {
    // Computed inside the memo (not as a render-scoped variable) so `new Date()`
    // creating a fresh object identity every render doesn't defeat this useMemo —
    // it was previously in the dependency array, forcing a recompute every render.
    const now = apiEnabled() ? new Date() : new Date("2026-07-09T12:00:00");
    const out: AttentionItem[] = [];
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    leaves.filter((l) => l.status === "approved").forEach((l) => {
      const clash = sessions.find((s) => s.teacherId === l.teacherId && s.date === l.date && s.status === "scheduled");
      if (clash) {
        out.push({
          id: `approved-${l.id}`,
          tone: "destructive",
          icon: AlertTriangle,
          title: `${l.teacherName} is on approved leave, but "${clash.title}" is still scheduled`,
          description: `${formatDate(l.date, "long")} · ${clash.startTime} — update the calendar or assign a substitute.`,
        });
      }
    });

    leaves.filter((l) => l.status === "pending").forEach((l) => {
      const clash = sessions.find((s) => s.teacherId === l.teacherId && s.date === l.date && s.status === "scheduled");
      if (clash) {
        out.push({
          id: `pending-${l.id}`,
          tone: "warning",
          icon: Clock,
          title: `${l.teacherName}'s leave request is pending approval`,
          description: `Requested for ${formatDate(l.date, "long")}, overlapping "${clash.title}" at ${clash.startTime}.`,
        });
      }
    });

    leaves.filter((l) => l.status === "blocked").forEach((l) => {
      out.push({
        id: `blocked-${l.id}`,
        tone: "warning",
        icon: ShieldAlert,
        title: `${l.teacherName}'s late leave request was auto-blocked`,
        description: `Only ${l.hoursBeforeSession}h notice for "${l.session}" on ${formatDate(l.date, "long")} — confirm coverage.`,
      });
    });

    sessions
      .filter((s) => s.status === "noshow" && isWithinInterval(parseISO(s.date), { start: weekStart, end: weekEnd }))
      .forEach((s) => {
        out.push({
          id: `noshow-${s.id}`,
          tone: "destructive",
          icon: UserX,
          title: `"${s.title}" was marked No-Show`,
          description: `${formatDate(s.date, "long")} · ${s.startTime} with ${s.teacherName} — needs a reschedule or parent follow-up.`,
        });
      });

    return out;
  }, [sessions, leaves]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conflicts &amp; Attention Needed</CardTitle>
        <CardDescription>Leave requests and no-shows that clash with the live calendar</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing needs attention"
            description="No leave conflicts or unresolved no-shows right now — the calendar is fully in sync."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={
                  item.tone === "destructive"
                    ? "flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4"
                    : "flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4"
                }
              >
                <span
                  className={
                    item.tone === "destructive"
                      ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive"
                      : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning-foreground"
                  }
                >
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/subadmin/reports">Open reports</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
