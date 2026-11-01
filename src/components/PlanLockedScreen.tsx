import { Link } from "react-router-dom";
import { ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Shown instead of a page whose module the academy's plan doesn't include (e.g. Billing on Free). */
export function PlanLockedScreen({ label }: { label: string }) {
  return (
    <Card className="mx-auto mt-6 max-w-xl">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-10">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold">{label} isn't in your plan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Upgrade your plan to unlock {label.toLowerCase()} and the rest of the paid modules. Everything you've set up stays as it is.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/admin/subscription">See plans <ArrowRight className="ms-1 h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/admin">Back to dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
