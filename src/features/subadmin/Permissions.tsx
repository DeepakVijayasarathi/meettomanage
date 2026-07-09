import { Check, Lock, Mail, Minus, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSession } from "@/state/session";
import { getInitials, formatDate, cn } from "@/lib/utils";
import { SUB_ADMINS } from "@/data/users";
import {
  ACTIONS,
  MODULES,
  MODULE_META,
  PERMISSIONS,
  accessLevelFor,
  FULL_ACCESS_MODULES,
  VIEW_ONLY_MODULES,
  NO_ACCESS_MODULES,
} from "./data";

const ADMIN_CONTACT = "Ananya Rao";

const LEVEL_BADGE: Record<ReturnType<typeof accessLevelFor>, string> = {
  full: "bg-success/15 text-success",
  view: "bg-primary/10 text-primary",
  none: "bg-muted text-muted-foreground",
};

const LEVEL_LABEL: Record<ReturnType<typeof accessLevelFor>, string> = {
  full: "Full access",
  view: "View only",
  none: "No access",
};

export default function SubAdminPermissions() {
  const { userName } = useSession();
  const profile = SUB_ADMINS.find((s) => s.name === userName) ?? SUB_ADMINS[0];

  return (
    <div>
      <PageHeader
        eyebrow="Access Control · Read-only"
        title="My Permissions"
        description="This is exactly what your Admin has granted you — a fixed, read-only record. Sub Admins cannot edit their own permissions."
      />

      {/* Profile + summary strip */}
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11">
              <AvatarFallback style={{ backgroundColor: `${profile.avatarColor}22`, color: profile.avatarColor }} className="text-sm font-bold">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">{profile.name}</p>
              <p className="text-xs text-muted-foreground">{profile.email} &middot; Sub Admin since {formatDate(profile.joinedOn, "long")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", LEVEL_BADGE.full)}>
              {FULL_ACCESS_MODULES.length} full access
            </span>
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", LEVEL_BADGE.view)}>
              {VIEW_ONLY_MODULES.length} view only
            </span>
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", LEVEL_BADGE.none)}>
              {NO_ACCESS_MODULES.length} no access
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Matrix */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-[18px] w-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Module &times; Action matrix</p>
              <p className="text-xs text-muted-foreground">A checkmark means the action is granted. A dash means it isn't.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Module</th>
                  {ACTIONS.map((action) => (
                    <th key={action} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {action}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((mod) => {
                  const meta = MODULE_META[mod];
                  const level = accessLevelFor(mod);
                  const locked = level === "none";
                  return (
                    <tr key={mod} className={cn("border-b border-border last:border-0", locked && "bg-muted/30")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-lg"
                            style={{
                              backgroundColor: locked ? "hsl(var(--muted))" : `${meta.color}1A`,
                              color: locked ? "hsl(var(--muted-foreground))" : meta.color,
                            }}
                          >
                            {locked ? <Lock className="h-3.5 w-3.5" /> : <meta.icon className="h-3.5 w-3.5" />}
                          </span>
                          <div>
                            <p className={cn("font-semibold", locked ? "text-muted-foreground" : "text-foreground")}>{mod}</p>
                            <p className="text-[11px] text-muted-foreground">{meta.blurb}</p>
                          </div>
                        </div>
                      </td>
                      {locked ? (
                        <td colSpan={ACTIONS.length} className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                            <Lock className="h-3.5 w-3.5" />
                            Locked — contact your Admin to request access to {mod}
                          </div>
                        </td>
                      ) : (
                        ACTIONS.map((action) => {
                          const granted = PERMISSIONS[mod][action];
                          return (
                            <td key={action} className="px-4 py-3 text-center">
                              {granted ? (
                                <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success">
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                              ) : (
                                <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
                                  <Minus className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              This matrix is configured by your Admin from the main Admin Portal. It updates automatically whenever your access changes —
              there is nothing to save here.
            </p>
            <Button variant="outline" size="sm" className="shrink-0" disabled title="Use your organization's usual channel to reach your Admin">
              <Mail className="h-3.5 w-3.5" />
              Contact {ADMIN_CONTACT}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
