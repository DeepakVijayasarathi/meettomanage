import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NavSection } from "@/lib/nav";

/** Fired by the account menu's "Product tour" item. */
export const START_TOUR_EVENT = "m2m:start-tour";

/** What each menu item is for, keyed by its sidebar label. Anything not listed falls back to a generic line. */
const HELP: Record<string, string> = {
  Dashboard: "Your home page: the numbers and alerts that matter today.",
  "Overall Dashboard": "Your home page: the numbers and alerts that matter today.",
  "Executive Overview": "A business-level summary of enrolments, revenue and performance.",
  "Founder Dashboard": "The whole business in one view, with every admin control behind it.",
  "My Learning": "Classes, stars and achievements in one friendly screen.",
  Courses: "Create courses with pricing and descriptions. Batches, invoices and the parent app use them.",
  Departments: "Group courses into departments, each with its own payment account.",
  Batches: "Group learners with a teacher, schedule, capacity and payment plan.",
  "Academic Calendar": "Sessions, holidays and events on one calendar, with clash warnings.",
  Sessions: "Schedule, reschedule or cancel live classes and open the live classroom.",
  Recordings: "Watch and manage recordings of live classes.",
  "Quiz Bank": "Reusable questions teachers launch as live quizzes.",
  "Activity Bank": "Reusable whiteboard activities for class.",
  "Learning Games & Activities": "A catalogue of learning games and resources to use in class.",
  Users: "Add, edit, import and export parents, students, teachers and staff.",
  "Search Users": "Find anyone and open their details quickly.",
  "Roles & Permissions": "Decide who can view or edit each part of the product.",
  "Enrollment Review": "Review and approve enrolment requests.",
  "Store Inquiries": "Leads from the public course catalogue.",
  "Parent Feedback": "Ratings and comments parents leave after classes.",
  "Parent Tickets": "The support queue for parent questions, with threaded replies.",
  "Leave Management": "Request or approve leave.",
  "Staff Leave": "Approve leave requests from staff.",
  "My Leave": "Apply for your own leave and track approval.",
  "Teacher Availability": "When each teacher is free, used for scheduling and demos.",
  "Content & Resources": "Upload files, organise folders and share them with batches.",
  Resources: "Files and notes shared with you.",
  "Billing & Finance": "Invoices, payments, receipts, refunds and cash confirmations.",
  "Packages & Subscriptions": "Fee packages families buy for a course or batch.",
  "Payment Gateway Mapping": "Connect each department to its Razorpay or Cashfree account.",
  "Teacher Payouts": "Calculate and track what teachers are paid.",
  "Payout Approvals": "Approve or reject payouts before they are paid.",
  "Fee Suspension": "Pause class access for overdue fees and restore it on payment.",
  "My Subscription": "Your academy's plan, usage and billing.",
  "Reports & Analytics": "Enrolment, attendance, revenue and performance reports.",
  "AI Insights": "Plain-language summaries and suggestions from your data.",
  "Bulk Email": "Send a message to a chosen group.",
  "Bulk Email History": "Every message sent, and to whom.",
  "Email Templates": "Edit the wording of system emails.",
  "Progress Reports": "Create and send student progress reports.",
  "Doubt Chatbot": "Set up the assistant that answers questions.",
  "Settings & Branding": "Logo, colours, payment methods and integrations.",
  "Server Monitoring": "Health of servers and services.",
  "Class Session Logs": "Joins, leaves and recording events for each class.",
  "My Classes": "Your sessions. Use Start Class to open the live classroom.",
  "My Students": "Students in your batches.",
  "Attendance & Records": "Attendance from live-class joins, with corrections.",
  "Demo Feedback": "Feedback on demo classes for the admission team.",
  "Student Doubts": "Questions from students waiting for your answer.",
  "My Payout": "Earnings by class and payout history.",
  "Schedule & Live Class": "Your child's timetable and the Join button.",
  "Student View": "The child-friendly learning screen.",
  "Mito AI Companion": "A friendly AI helper for lesson questions.",
  "Payments & Billing": "Invoices, pay online, declare cash and download receipts.",
  "Notifications & Reports": "Reminders, alerts and progress reports.",
  "Help & Support": "Raise a ticket and follow the reply.",
  "Add Child": "Add another child to this account.",
  "My Permissions": "What your account can view or edit.",
  Integrations: "Payment and messaging connections.",
  "Assigned Reports": "Reports shared with you.",
  "Audit Log": "Who changed what, and when.",
  "Demo Scheduling": "Incoming demo requests: set the date and time.",
  "Teacher Assignment": "Choose the teacher for each demo.",
  "Conversion Board": "Move each family from demo to enrolled.",
  "Leads & Parents": "Leads, contacts and notes.",
  "Payment Tracking": "Payment links, status and cash confirmation.",
  Reports: "Reports for your area.",
  "Revenue & Courses": "Revenue by course and collection status.",
  "Teacher & Batch Performance": "Attendance, ratings and outcomes by teacher and batch.",
  "Management Reports": "Executive reports to review and download.",
  "Class Logs": "Joins, leaves and recording events for each class.",
  "Parent Relationship": "Parent follow-up and support.",
};

interface TourStop { key: string; label: string; to?: string; text: string }

interface Props {
  role: string;
  roleLabel: string;
  sections: NavSection[];
  /** Makes the menu visible for the tour (expands the rail, opens the mobile drawer). */
  onPrepare: () => void;
  onFinish: () => void;
}

const doneKey = (role: string) => `m2m-tour-done:${role}`;

function readDone(role: string): boolean {
  try { return localStorage.getItem(doneKey(role)) === "1"; } catch { return true; }
}
function writeDone(role: string) {
  try { localStorage.setItem(doneKey(role), "1"); } catch { /* storage unavailable: the tour just offers itself again next time */ }
}

export function AppTour({ role, roleLabel, sections, onPrepare, onFinish }: Props) {
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const stops: TourStop[] = [
    { key: "intro", label: `Welcome to the ${roleLabel}`, text: "This short tour walks through every item in your menu so you know where things are. Use the arrow keys or the buttons, and press Esc to leave." },
    ...sections.flatMap((s) => s.items.map((item) => ({
      key: item.to,
      to: item.to,
      label: item.label,
      text: `${s.title ? `${s.title}. ` : ""}${HELP[item.label] ?? `Open ${item.label}.`}`,
    }))),
    { key: "outro", label: "You are all set", text: "You can replay this tour any time from the account menu, under Product tour." },
  ];
  const stop = stops[Math.min(i, stops.length - 1)];
  // The shell passes inline callbacks (new identity each render); read them through a ref so start/close stay stable.
  const cb = useRef({ onPrepare, onFinish });
  cb.current = { onPrepare, onFinish };

  const start = useCallback(() => { cb.current.onPrepare(); setI(0); setActive(true); }, []);
  const close = useCallback(() => { setActive(false); writeDone(role); cb.current.onFinish(); }, [role]);

  useEffect(() => {
    const on = () => start();
    window.addEventListener(START_TOUR_EVENT, on);
    return () => window.removeEventListener(START_TOUR_EVENT, on);
  }, [start]);

  // First visit for this role: offer the tour once the menu has loaded, on wide screens only.
  const stopCount = stops.length;
  useEffect(() => {
    if (readDone(role) || stopCount < 3 || !window.matchMedia?.("(min-width: 1024px)").matches) return;
    const t = window.setTimeout(start, 1200);
    return () => window.clearTimeout(t);
  }, [role, stopCount, start]);

  useLayoutEffect(() => {
    if (!active) return;
    const measure = () => {
      const el = stop.to ? document.querySelector<HTMLElement>(`[data-tour="${CSS.escape(stop.to)}"]`) : null;
      if (el) { el.scrollIntoView({ block: "nearest" }); setRect(el.getBoundingClientRect()); } else setRect(null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, stop.to, i]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") setI((n) => Math.min(stops.length - 1, n + 1));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, stops.length]);

  if (!active) return null;
  const last = i >= stops.length - 1;
  const CARD_W = 340;
  const cardStyle: React.CSSProperties = rect
    ? { left: Math.min(rect.right + 16, window.innerWidth - CARD_W - 12), top: Math.max(12, Math.min(rect.top - 8, window.innerHeight - 230)) }
    : { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Product tour">
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-lg ring-2 ring-white transition-all duration-200"
          style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8, boxShadow: "0 0 0 9999px rgba(8,12,24,0.62)" }}
        />
      ) : <div aria-hidden="true" className="absolute inset-0 bg-[rgba(8,12,24,0.62)]" />}
      <div className="absolute w-[min(340px,calc(100vw-24px))] rounded-2xl bg-card p-5 text-card-foreground shadow-2xl" style={cardStyle}>
        <button type="button" onClick={close} aria-label="Close tour" className="absolute end-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Step {i + 1} of {stops.length}</p>
        <h3 className="mt-1 pe-6 text-base font-bold">{stop.label}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{stop.text}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={close}>{last ? "Close" : "Skip tour"}</Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button size="sm" onClick={() => (last ? close() : setI(i + 1))}>{last ? "Done" : <>Next <ArrowRight className="h-4 w-4" /></>}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
