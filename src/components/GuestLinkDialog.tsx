import { useEffect, useState } from "react";
import { Link2, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createGuestLink, listGuestLinkStudents, type ApiGuestLinkStudent } from "@/api/sessions";
import type { ClassSession } from "@/types";
import { userMessage } from "@/lib/api";

interface GuestLinkDialogProps {
  session: ClassSession;
  onClose: () => void;
}

/**
 * "Copy Guest Link" popup, shared across the RM (subadmin), Admin, and Coordinator Sessions/
 * Calendar screens (2026-09-15 client request — see Documentation/Client_Feedback_2026-09-15_
 * RM-Emergency-Class-Link.md, §10 "Final scope"): a quick way to hand a live class's join link
 * to a parent, grandparent or caretaker who can't log in themselves.
 *
 * Two link shapes, both minted via createGuestLink and both pointing at the public /guest-join
 * bridge page (never straight at Jitsi):
 *  - Pick a student: the link auto-fills their name, skips Jitsi's prejoin screen entirely, and
 *    marks their attendance the moment it's opened.
 *  - "Generic guest link": nobody's bound — the person opening it types their own name at
 *    prejoin, and attendance isn't marked automatically (the teacher marks it by hand).
 */
export function GuestLinkDialog({ session, onClose }: GuestLinkDialogProps) {
  const { toast } = useToast();
  const [students, setStudents] = useState<ApiGuestLinkStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // The childId being copied right now, or "" for the generic (no-student) link, or null when idle.
  const [copyingId, setCopyingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    listGuestLinkStudents(session.id)
      .then((data) => {
        if (!cancelled) setStudents(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(userMessage(err, "Couldn't load this batch's students."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session.id]);

  async function copyLink(childId?: string) {
    setCopyingId(childId ?? "");
    try {
      const url = await createGuestLink(session.id, childId);
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable in this browser");
      }
      await navigator.clipboard.writeText(url);
      toast({
        variant: "success",
        title: "Guest link copied",
        description: childId
          ? "Joins straight into the class as that student and marks their attendance automatically."
          : "The person joining will be asked to type their own name — mark attendance manually for them afterward.",
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't create the guest link",
        description: err instanceof Error ? userMessage(err) : undefined,
      });
    } finally {
      setCopyingId(null);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Copy Guest Link</DialogTitle>
          <DialogDescription>
            "{session.title}" — for a parent, grandparent or caretaker who can't log in themselves.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Generic guest link</p>
              <p className="text-xs text-muted-foreground">No student selected — they type their own name; mark attendance manually.</p>
            </div>
            <Button variant="outline" size="sm" disabled={copyingId !== null} onClick={() => copyLink(undefined)}>
              {copyingId === "" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
              Copy
            </Button>
          </div>

          {loading && <p className="py-4 text-center text-sm text-muted-foreground">Loading students…</p>}
          {loadError && <p className="text-sm font-medium text-destructive">{loadError}</p>}
          {!loading && !loadError && students.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No students enrolled in this batch yet.</p>
          )}
          {!loading && students.length > 0 && (
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {students.map((s) => (
                <div key={s.childId} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{s.childName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.parentName}
                        {s.parentPhone ? ` · ${s.parentPhone}` : ""}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" disabled={copyingId !== null} onClick={() => copyLink(s.childId)}>
                    {copyingId === s.childId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                    Copy
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
