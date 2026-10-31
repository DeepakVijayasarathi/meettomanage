import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep { id: string; tag: string; title: string; body: string; image: string }

const STEPS: TourStep[] = [
  { id: "dashboard", tag: "Admin", title: "See the whole academy at a glance", body: "Students, enrolments, revenue, conversion and batch occupancy update in one dashboard, and anything waiting for approval is called out at the top.", image: "/docs/admin-dashboard.jpg" },
  { id: "courses", tag: "Academics", title: "Set up courses once", body: "Create courses under departments with pricing and descriptions. Batches, invoices and the parent app all draw from them.", image: "/docs/admin-courses.jpg" },
  { id: "batches", tag: "Academics", title: "Group learners into batches", body: "Give each batch a teacher, a schedule, a capacity and a payment plan. Families are assigned to a batch at enrolment.", image: "/docs/admin-batches.jpg" },
  { id: "calendar", tag: "Scheduling", title: "Plan the timetable on one calendar", body: "Sessions, holidays and events sit on a single board. Double-booked teachers and rooms are flagged before the class runs.", image: "/docs/admin-calendar.jpg" },
  { id: "sessions", tag: "Scheduling", title: "Run live classes from Sessions", body: "Schedule, reschedule or cancel a class. Teachers join the live classroom from here, and attendance is recorded as students join.", image: "/docs/admin-sessions.jpg" },
  { id: "billing", tag: "Finance", title: "Collect fees without chasing", body: "Invoices, online payments through Razorpay or Cashfree, cash confirmations, refunds and receipts are handled in one place.", image: "/docs/admin-billing.jpg" },
  { id: "reports", tag: "Insights", title: "Know what is working", body: "Reports on enrolment, attendance, revenue and teacher performance, ready to filter and export.", image: "/docs/admin-reports.jpg" },
];

const WATERMARK = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='150'><text x='20' y='90' transform='rotate(-24 130 75)' font-family='sans-serif' font-size='15' font-weight='700' fill='%23000' fill-opacity='0.07'>Meet to Manage · Demo</text></svg>\")";

/** A screenshot that is awkward to save or copy: a background image rather than an <img>, a transparent shield above it
 *  that swallows right-click and drag, a watermark, and a blur while the tab is hidden, the window is unfocused or
 *  Print Screen is pressed. This deters casual capture only: no web page can stop an OS-level screenshot. */
function ProtectedShot({ src, alt }: { src: string; alt: string }) {
  const [obscured, setObscured] = useState(false);

  useEffect(() => {
    const hide = () => setObscured(true);
    const show = () => setObscured(document.visibilityState === "visible" && document.hasFocus() ? false : true);
    const onKey = (e: KeyboardEvent) => {
      const printScreen = e.key === "PrintScreen";
      const snip = e.shiftKey && (e.metaKey || e.ctrlKey) && ["s", "S", "3", "4", "5"].includes(e.key);
      const save = (e.ctrlKey || e.metaKey) && ["s", "p", "S", "P"].includes(e.key);
      if (!printScreen && !snip && !save) return;
      e.preventDefault();
      setObscured(true);
      if (printScreen) void navigator.clipboard?.writeText("").catch(() => {});
      window.setTimeout(show, 1500);
    };
    document.addEventListener("visibilitychange", show);
    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      document.removeEventListener("visibilitychange", show);
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  const block = (e: React.SyntheticEvent) => e.preventDefault();
  return (
    <div
      role="img"
      aria-label={alt}
      data-obscured={obscured}
      onContextMenu={block}
      onDragStart={block}
      onCopy={block}
      className="tour-shot relative aspect-[8/5] w-full overflow-hidden rounded-xl bg-[#F5EFE8]"
    >
      <div className="tour-shot-img absolute inset-0 bg-cover bg-top transition-[filter] duration-200" style={{ backgroundImage: `url(${src})` }} />
      <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: WATERMARK }} onContextMenu={block} onDragStart={block} />
    </div>
  );
}

export function ProductTour() {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const step = STEPS[i];
  const go = useCallback((n: number) => setI(Math.min(STEPS.length - 1, Math.max(0, n))), []);

  return (
    <section
      id="product-tour"
      ref={ref}
      tabIndex={-1}
      aria-label="Product tour"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(i + 1);
        if (e.key === "ArrowLeft") go(i - 1);
      }}
      className="scroll-mt-24 rounded-3xl border border-[#EFE3D7] bg-gradient-to-b from-[#FFF6EE] to-white p-5 outline-none sm:p-8"
    >
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#C2410C]">Product tour · {i + 1} of {STEPS.length}</p>
      <h2 className="font-display mt-2 text-[clamp(1.5rem,2.8vw,2.1rem)] font-extrabold tracking-[-0.03em]">Take a two-minute tour</h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <ol className="order-2 flex flex-row gap-2 overflow-x-auto lg:order-1 lg:flex-col lg:overflow-visible">
          {STEPS.map((s, n) => (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => go(n)}
                aria-current={n === i ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start text-sm transition-colors",
                  n === i ? "border-[#C2410C] bg-white font-bold text-[#1C1917] shadow-sm" : "border-transparent text-[#57534E] hover:bg-white",
                )}
              >
                <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold", n === i ? "bg-[#C2410C] text-white" : "bg-[#EFE3D7] text-[#57534E]")}>{n + 1}</span>
                <span className="whitespace-nowrap lg:whitespace-normal">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="order-1 min-w-0 lg:order-2">
          <div className="rounded-2xl border border-[#EFE3D7] bg-white p-2 shadow-[0_24px_48px_-28px_rgba(120,53,15,0.45)]">
            <div className="flex items-center gap-1.5 px-2 pb-2 pt-1" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F87171]" /><span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" /><span className="h-2.5 w-2.5 rounded-full bg-[#4ADE80]" />
            </div>
            <ProtectedShot key={step.id} src={step.image} alt={`${step.title}: screenshot of the ${step.tag} area`} />
          </div>
          <div className="mt-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="rounded-full bg-[#FFE6D0] px-2.5 py-0.5 text-xs font-bold text-[#9A3412]">{step.tag}</span>
              <h3 className="font-display mt-2 text-xl font-extrabold tracking-[-0.02em]">{step.title}</h3>
              <p className="mt-1.5 max-w-[560px] text-[15px] leading-relaxed text-[#57534E]">{step.body}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous step" className="grid h-10 w-10 place-items-center rounded-full border border-[#EFE3D7] bg-white disabled:opacity-40"><ArrowLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => go(i + 1)} disabled={i === STEPS.length - 1} aria-label="Next step" className="grid h-10 w-10 place-items-center rounded-full bg-[#C2410C] text-white disabled:opacity-40"><ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
