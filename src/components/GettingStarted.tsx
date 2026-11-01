import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Circle, Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/api/hooks";
import { getOnboardingStatus, type OnboardingStatus } from "@/api/onboarding";
import { apiEnabled } from "@/lib/api";
import { sessionTenantCode, tenantPath } from "@/lib/tenantPath";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
  body: string;
  to: string;
  cta: string;
  done: (s: OnboardingStatus) => boolean;
}

/** The path from an empty academy to its first live class; each step ticks itself off from real data. */
const STEPS: Step[] = [
  { id: "course", title: "Add your first course", body: "What you teach, its length and price.", to: "/admin/courses", cta: "Add course", done: (s) => s.courses > 0 },
  { id: "teacher", title: "Add a teacher", body: "They get their own login and class schedule.", to: "/admin/users", cta: "Add teacher", done: (s) => s.teachers > 0 },
  { id: "batch", title: "Create a batch", body: "Group students under a course and a teacher.", to: "/admin/batches", cta: "Create batch", done: (s) => s.batches > 0 },
  { id: "family", title: "Invite your first family", body: "Add a parent; they enrol their child and you approve it in Enrollment Review.", to: "/admin/users", cta: "Add parent", done: (s) => s.parents > 0 },
  { id: "schedule", title: "Schedule a class", body: "It appears on the teacher's and parents' schedules.", to: "/admin/sessions", cta: "Schedule", done: (s) => s.sessionsScheduled > 0 },
  { id: "live", title: "Run your first live class", body: "Start it from Sessions or the teacher's portal.", to: "/admin/sessions", cta: "Open sessions", done: (s) => s.sessionsCompleted > 0 },
];

const hideKey = () => `trn.gettingStartedHidden:${sessionTenantCode() ?? tenantPath()}`;

/**
 * "Get started" checklist on the admin dashboard. Disappears once every step is done, and can be
 * hidden (remembered per academy in this browser). Reports whether it is showing, so the dashboard
 * can fall back to its plain "no activity yet" note.
 */
export function GettingStarted({ onVisibility }: { onVisibility?: (visible: boolean) => void }) {
  const { data, loading, error } = useApiData<OnboardingStatus | null>(
    () => (apiEnabled() ? getOnboardingStatus() : Promise.resolve(null)),
    null,
    null,
  );
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem(hideKey()) === "1"; } catch { return false; }
  });

  const doneCount = data ? STEPS.filter((s) => s.done(data)).length : 0;
  const visible = !loading && !error && !!data && !hidden && doneCount < STEPS.length;
  useEffect(() => { onVisibility?.(visible); }, [visible, onVisibility]);
  if (!visible || !data) return null;

  const next = STEPS.find((s) => !s.done(data));
  const hide = () => {
    setHidden(true);
    try { localStorage.setItem(hideKey(), "1"); } catch { /* storage blocked: hidden for this visit only */ }
  };

  return (
    <section aria-labelledby="getting-started" className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-4 ring-primary/5">
          <Rocket className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="getting-started" className="text-base font-semibold text-foreground">Get your academy running</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{doneCount} of {STEPS.length} steps done. Your dashboard numbers fill in as you go.</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/10" aria-hidden="true">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(doneCount / STEPS.length) * 100}%` }} />
          </div>
        </div>
        <button type="button" onClick={hide} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Hide the getting started checklist">
          <X className="h-4 w-4" />
        </button>
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step) => {
          const done = step.done(data);
          const isNext = step.id === next?.id;
          return (
            <li key={step.id} className={cn("flex items-start gap-3 rounded-lg border bg-card p-3", isNext ? "border-primary/40 shadow-sm" : "border-border")}>
              {done ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />}
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-semibold", done ? "text-muted-foreground line-through" : "text-foreground")}>{step.title}</p>
                {!done && <p className="mt-0.5 text-xs text-muted-foreground">{step.body}</p>}
                {!done && isNext && (
                  <Button asChild size="sm" className="mt-2 h-8">
                    <Link to={step.to}>{step.cta} <ArrowRight className="ms-1 h-3.5 w-3.5" /></Link>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
