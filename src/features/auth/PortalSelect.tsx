import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ROLE_META, ROLE_ORDER } from "@/lib/roles";
import { useSession } from "@/state/session";
import { cn } from "@/lib/utils";

export default function PortalSelect() {
  const navigate = useNavigate();
  const { setRole } = useSession();

  return (
    <div className="min-h-screen bg-muted/30 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col items-center text-center">
          <Logo className="mb-6" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Choose a portal to explore</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            The Reader Nest ships as eight role-based portals on one platform. Admin, Teacher and Parent are fully built
            in this release — the rest are staged next.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLE_ORDER.map((r) => {
            const meta = ROLE_META[r];
            return (
              <Card
                key={r}
                onClick={() => {
                  setRole(r);
                  navigate(meta.homePath);
                }}
                className={cn(
                  "group flex cursor-pointer flex-col gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-pop"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: meta.hex }}
                  >
                    <meta.icon className="h-5.5 w-5.5" />
                  </span>
                  {meta.available ? (
                    <Badge variant="success">Live</Badge>
                  ) : (
                    <Badge variant="muted" className="gap-1">
                      <Sparkles className="h-3 w-3" /> Preview
                    </Badge>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{meta.label}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{meta.description}</p>
                </div>
                <span className="mt-auto flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Enter portal <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Card>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Prefer signing in normally? <a href="/login" className="font-semibold text-primary hover:underline">Back to login</a>
        </p>
      </div>
    </div>
  );
}
