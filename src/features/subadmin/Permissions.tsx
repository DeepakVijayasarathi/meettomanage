import { useEffect, useState } from "react";
import { Check, Lock, Mail, Minus, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/state/session";
import { getInitials, formatDate, cn } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { SUB_ADMINS } from "@/data/users";
import { CHART_PALETTE } from "@/lib/roles";
import { PERMISSION_MODULES, PERMISSION_ACTIONS_LABELS, type PermissionModuleName } from "@/api/permissions";
import { listMenuItems, groupMenusByModule } from "@/api/menus";
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

/** Live view: does the signed-in user's own claim set (from login/`/api/auth/me`) grant this? */
function isGranted(permissions: string[], role: string | null, module: PermissionModuleName, action: string): boolean {
  if (role === "admin") return true;
  return permissions.includes(`${module}:${action}`);
}

export default function SubAdminPermissions() {
  const { userName, role, permissions } = useSession();
  const [menusByModule, setMenusByModule] = useState<Partial<Record<PermissionModuleName, string[]>>>({});

  useEffect(() => {
    if (!apiEnabled()) return;
    listMenuItems()
      .then((items) => setMenusByModule(groupMenusByModule(items)))
      .catch(() => {
        /* captions just stay empty */
      });
  }, []);

  if (apiEnabled()) {
    const fullCount = PERMISSION_MODULES.filter((m) => PERMISSION_ACTIONS_LABELS.some((a) => a !== "View" && isGranted(permissions, role, m.value, a))).length;
    const viewOnlyCount = PERMISSION_MODULES.filter(
      (m) => isGranted(permissions, role, m.value, "View") && !PERMISSION_ACTIONS_LABELS.some((a) => a !== "View" && isGranted(permissions, role, m.value, a))
    ).length;
    const noAccessCount = PERMISSION_MODULES.length - fullCount - viewOnlyCount;

    return (
      <div>
        <PageHeader
          eyebrow="Access Control · Read-only"
          title="My Permissions"
          description="This is exactly what your Admin has granted you — a fixed, read-only record, live from your account. Relationship Managers cannot edit their own permissions."
        />

        <Card className="mb-6">
          <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11">
                <AvatarFallback className="text-sm font-bold">{getInitials(userName)}</AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold text-foreground">{userName}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">{fullCount} full access</Badge>
              <Badge>{viewOnlyCount} view only</Badge>
              <Badge variant="muted">{noAccessCount} no access</Badge>
            </div>
          </CardContent>
        </Card>

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

            {/* Mobile: the desktop table's min-w-[720px] (module column + 5 action columns)
                scrolled almost entirely off a phone screen with no visual hint it was
                scrollable, landing on a view that showed only the module names with every
                actual grant/no-grant mark invisible off-canvas — the same bug the shared,
                editable PermissionMatrix component already fixed with a card fallback below
                sm; this read-only view is a separate hand-rolled table, so it needs its own. */}
            <div className="flex flex-col gap-3 sm:hidden">
              {PERMISSION_MODULES.map((mod, mi) => {
                const menus = menusByModule[mod.value] ?? [];
                const locked = !isGranted(permissions, role, mod.value, "View");
                return (
                  <div key={mod.value} className={cn("rounded-xl border border-border p-4", locked && "bg-muted/30")}>
                    <div className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                        style={{
                          backgroundColor: locked ? "hsl(var(--muted))" : `${CHART_PALETTE[mi % CHART_PALETTE.length]}1A`,
                          color: locked ? "hsl(var(--muted-foreground))" : CHART_PALETTE[mi % CHART_PALETTE.length],
                        }}
                      >
                        {locked ? <Lock className="h-3.5 w-3.5" /> : mod.label[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("font-semibold", locked ? "text-muted-foreground" : "text-foreground")}>{mod.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {menus.length > 0 ? `Menus: ${menus.join(", ")}` : "No menu currently depends on this module"}
                        </p>
                      </div>
                    </div>
                    {locked ? (
                      <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        Locked — contact your Admin to request access to {mod.label}
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-3 gap-x-2 gap-y-2.5 border-t border-border pt-3">
                        {PERMISSION_ACTIONS_LABELS.map((action) => {
                          const granted = isGranted(permissions, role, mod.value, action);
                          return (
                            <div key={action} className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                              {granted ? (
                                <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                              ) : (
                                <Minus className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                              )}
                              {action}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Module</th>
                    {PERMISSION_ACTIONS_LABELS.map((action) => (
                      <th key={action} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MODULES.map((mod, mi) => {
                    const menus = menusByModule[mod.value] ?? [];
                    const locked = !isGranted(permissions, role, mod.value, "View");
                    return (
                      <tr key={mod.value} className={cn("border-b border-border last:border-0", locked && "bg-muted/30")}>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2.5">
                            <span
                              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                              style={{
                                backgroundColor: locked ? "hsl(var(--muted))" : `${CHART_PALETTE[mi % CHART_PALETTE.length]}1A`,
                                color: locked ? "hsl(var(--muted-foreground))" : CHART_PALETTE[mi % CHART_PALETTE.length],
                              }}
                            >
                              {locked ? <Lock className="h-3.5 w-3.5" /> : mod.label[0]}
                            </span>
                            <div>
                              <p className={cn("font-semibold", locked ? "text-muted-foreground" : "text-foreground")}>{mod.label}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {menus.length > 0 ? `Menus: ${menus.join(", ")}` : "No menu currently depends on this module"}
                              </p>
                            </div>
                          </div>
                        </td>
                        {locked ? (
                          <td colSpan={PERMISSION_ACTIONS_LABELS.length} className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                              <Lock className="h-3.5 w-3.5" />
                              Locked — contact your Admin to request access to {mod.label}
                            </div>
                          </td>
                        ) : (
                          PERMISSION_ACTIONS_LABELS.map((action) => {
                            const granted = isGranted(permissions, role, mod.value, action);
                            return (
                              <td key={action} className="px-4 py-3 text-center">
                                {granted ? (
                                  <span
                                    className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success"
                                    role="img"
                                    aria-label={`${action} granted for ${mod.label}`}
                                  >
                                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                  </span>
                                ) : (
                                  <span
                                    className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground/60"
                                    role="img"
                                    aria-label={`${action} not granted for ${mod.label}`}
                                  >
                                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
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
                This matrix is configured by your Admin from Roles &amp; Permissions. It updates automatically whenever your access
                changes — there is nothing to save here.
              </p>
              <Button variant="outline" size="sm" className="shrink-0" disabled title="Use your organization's usual channel to reach your Admin">
                <Mail className="h-3.5 w-3.5" />
                Contact your Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Demo mode: no backend configured, keep the original fixed mock persona/grants.
  const profile = SUB_ADMINS.find((s) => s.name === userName) ?? SUB_ADMINS[0];

  return (
    <div>
      <PageHeader
        eyebrow="Access Control · Read-only"
        title="My Permissions"
        description="This is exactly what your Admin has granted you — a fixed, read-only record. Relationship Managers cannot edit their own permissions."
      />

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
              <p className="text-xs text-muted-foreground">{profile.email} &middot; Relationship Manager since {formatDate(profile.joinedOn, "long")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">{FULL_ACCESS_MODULES.length} full access</Badge>
            <Badge>{VIEW_ONLY_MODULES.length} view only</Badge>
            <Badge variant="muted">{NO_ACCESS_MODULES.length} no access</Badge>
          </div>
        </CardContent>
      </Card>

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

          {/* Same mobile card fallback as the API-mode matrix above — this demo-mode table
              is a separate hand-rolled copy with its own MODULES/ACTIONS/PERMISSIONS data
              shape, so it needs its own version of the fallback rather than sharing markup. */}
          <div className="flex flex-col gap-3 sm:hidden">
            {MODULES.map((mod) => {
              const meta = MODULE_META[mod];
              const level = accessLevelFor(mod);
              const locked = level === "none";
              return (
                <div key={mod} className={cn("rounded-xl border border-border p-4", locked && "bg-muted/30")}>
                  <div className="flex items-start gap-2.5">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: locked ? "hsl(var(--muted))" : `${meta.color}1A`,
                        color: locked ? "hsl(var(--muted-foreground))" : meta.color,
                      }}
                    >
                      {locked ? <Lock className="h-3.5 w-3.5" /> : <meta.icon className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-semibold", locked ? "text-muted-foreground" : "text-foreground")}>{mod}</p>
                      <p className="text-[11px] text-muted-foreground">{meta.blurb}</p>
                    </div>
                  </div>
                  {locked ? (
                    <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      Locked — contact your Admin to request access to {mod}
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-x-2 gap-y-2.5 border-t border-border pt-3">
                      {ACTIONS.map((action) => {
                        const granted = PERMISSIONS[mod][action];
                        return (
                          <div key={action} className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                            {granted ? (
                              <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                            ) : (
                              <Minus className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                            )}
                            {action}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
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
                                <span
                                  className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success"
                                  role="img"
                                  aria-label={`${action} granted for ${mod}`}
                                >
                                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                </span>
                              ) : (
                                <span
                                  className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground/60"
                                  role="img"
                                  aria-label={`${action} not granted for ${mod}`}
                                >
                                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
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
