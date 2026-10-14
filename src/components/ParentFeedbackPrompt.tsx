import { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getPendingParentFeedback, submitParentFeedback, type ApiPendingParentFeedback } from "@/api/parentFeedback";

const RATING_WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
// "Maybe later" only hides the popup for this browser session; it returns at the next login
// until the parent rates, since one rating per demo / course is the whole point.
const SNOOZE_KEY = "trn.parentFeedbackSnoozed";

function snoozedKeys(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SNOOZE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function keyOf(p: ApiPendingParentFeedback): string {
  return p.kind === "Demo" ? `demo:${p.demoBookingId}` : `course:${p.batchId}:${p.childId}`;
}

/**
 * One-question popup shown to a parent after a demo class, and again once their child's course is
 * finished: a star rating and an optional comment. Admin and Admission read the results on the
 * Parent Feedback page. Mounted once in the parent portal shell.
 */
export function ParentFeedbackPrompt() {
  const { toast } = useToast();
  const [current, setCurrent] = useState<ApiPendingParentFeedback | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!apiEnabled()) return; // demo mode has no real classes to rate
    let cancelled = false;
    getPendingParentFeedback()
      .then((items) => {
        if (cancelled) return;
        const snoozed = snoozedKeys();
        setCurrent(items.find((p) => !snoozed.includes(keyOf(p))) ?? null);
      })
      .catch(() => {
        /* a prompt is never worth an error screen */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!current) return null;

  const isDemo = current.kind === "Demo";
  const shown = hover || rating;

  function later() {
    try {
      sessionStorage.setItem(SNOOZE_KEY, JSON.stringify([...snoozedKeys(), keyOf(current!)]));
    } catch {
      /* storage blocked -- it just reappears on the next visit */
    }
    setCurrent(null);
  }

  async function submit() {
    if (!current || rating === 0) return;
    setSubmitting(true);
    try {
      await submitParentFeedback(current, rating, comment);
      toast({ variant: "success", title: "Thank you for your feedback!" });
      setCurrent(null);
      setRating(0);
      setComment("");
    } catch (err) {
      toast({ variant: "error", title: "Couldn't send feedback", description: userMessage(err, "Please try again.") });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && later()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isDemo ? `How was the demo class for ${current.childName}?` : `How was ${current.courseName ?? "the course"} for ${current.childName}?`}
          </DialogTitle>
          <DialogDescription>
            {isDemo ? "Tap a star — it takes five seconds and helps us improve." : "Congratulations on completing the course! Your rating helps us do better."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2 py-2">
          <div className="flex gap-1.5" role="radiogroup" aria-label="Rating out of 5" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onMouseEnter={() => setHover(n)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(0)}
                onClick={() => setRating(n)}
                className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Star className={cn("h-9 w-9", n <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
              </button>
            ))}
          </div>
          <p className="h-5 text-sm font-medium text-muted-foreground" aria-live="polite">
            {RATING_WORDS[shown]}
          </p>
        </div>

        <Textarea
          rows={3}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Anything you'd like to tell us? (optional)"
        />

        <DialogFooter className="flex-wrap">
          <Button variant="ghost" onClick={later} disabled={submitting}>
            Maybe later
          </Button>
          <Button onClick={submit} disabled={rating === 0 || submitting}>
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
