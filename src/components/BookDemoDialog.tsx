import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookDemoForm } from "@/components/BookDemoForm";

interface BookDemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Public "Book a free demo" dialog — thin chrome around BookDemoForm. Rendering the
 * form only while `open` is true remounts it fresh on every open, which is also how
 * it resets to a clean state each time (no shared unmount/reset bookkeeping needed).
 */
export function BookDemoDialog({ open, onOpenChange }: BookDemoDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setConfirmed(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        {!confirmed && (
          <DialogHeader>
            <DialogTitle>Book a free demo class</DialogTitle>
            <DialogDescription>
              Pick a time that works for you — we'll match you with a teacher and send the join link by email.
            </DialogDescription>
          </DialogHeader>
        )}
        {open && <BookDemoForm onDone={() => onOpenChange(false)} onConfirmedChange={setConfirmed} />}
      </DialogContent>
    </Dialog>
  );
}
