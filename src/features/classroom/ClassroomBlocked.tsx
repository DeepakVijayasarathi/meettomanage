import { RefreshCw } from "lucide-react";
import { describeBlockedClass } from "./blockedClassCopy";
import { Button } from "@/components/ui/button";

/**
 * Full-page state for a live class that can't be joined right now. The backend answers a join
 * request with a specific reason (not found / not open yet / already ended / not your class),
 * and it used to be shown as a small toast-sized box holding the raw server text ("ClassSession with
 * id '...' was not found.") on an otherwise empty page, with no way forward. This says what is
 * actually going on in plain words and offers the next step.
 */
export default function ClassroomBlocked({
  message,
  status,
  backLabel,
  onBack,
  onRetry,
}: {
  message: string;
  status?: number | null;
  /** Where "back" goes, e.g. "Go to my schedule". Omitted when there is nowhere sensible to send them. */
  backLabel?: string;
  onBack?: () => void;
  onRetry: () => void;
}) {
  const copy = describeBlockedClass(message, status);
  const Icon = copy.icon;
  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto px-5 py-8">
      <div role="alert" className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-call-ink/10 bg-call-ink/5 px-6 py-8 text-center shadow-2xl shadow-black/10 backdrop-blur-md sm:px-8">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange/15 text-brand-orange-ink ring-8 ring-brand-orange/5">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-call-ink">{copy.title}</h1>
          <p className="text-sm leading-relaxed text-call-ink/70">{copy.body}</p>
        </div>
        <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          {onBack && backLabel && (
            <Button onClick={onBack} className="sm:min-w-[9rem]">
              {backLabel}
            </Button>
          )}
          {copy.canRetry && (
            <Button variant="outline" onClick={onRetry} className="gap-1.5 border-call-ink/20 bg-transparent text-call-ink hover:bg-call-ink/10 hover:text-call-ink sm:min-w-[9rem]">
              <RefreshCw className="h-4 w-4" /> Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
