import { useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SUB_ADMINS } from "@/data/users";
import { getInitials, cn } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { getPermissions, setPermissions, type ApiPermission, type PermissionModuleName } from "@/api/permissions";

const MODULES = ["Users", "Courses", "Batches", "Calendar", "Billing", "Reports", "Resources"] as const;
const ACTIONS = ["View", "Add", "Edit", "Delete", "Approve"] as const;

type Module = (typeof MODULES)[number];
type Action = (typeof ACTIONS)[number];
type Matrix = Record<Module, Record<Action, boolean>>;

// Maps this screen's display modules to the backend's PermissionModule enum
const MODULE_TO_API: Record<Module, PermissionModuleName> = {
  Users: "UserManagement",
  Courses: "CourseBatchManagement",
  Batches: "CourseBatchManagement",
  Calendar: "SessionCalendarManagement",
  Billing: "BillingFinance",
  Reports: "ReportsAnalytics",
  Resources: "ContentAccessManagement",
};

function apiPermissionsToMatrix(permissions: ApiPermission[]): Matrix {
  const matrix = {} as Matrix;
  MODULES.forEach((mod) => {
    const apiModule = MODULE_TO_API[mod];
    const grant = permissions.find((p) => p.module === apiModule);
    matrix[mod] = {
      View: grant?.canView ?? false,
      Add: grant?.canCreate ?? false,
      Edit: grant?.canEdit ?? false,
      Delete: grant?.canDelete ?? false,
      Approve: grant?.canApprove ?? false,
    };
  });
  return matrix;
}

function matrixToApiPermissions(matrix: Matrix): ApiPermission[] {
  // Collapse Courses+Batches (same backend module) by OR-ing their flags
  const byApiModule = new Map<PermissionModuleName, ApiPermission>();
  MODULES.forEach((mod) => {
    const apiModule = MODULE_TO_API[mod];
    const row = matrix[mod];
    const existing = byApiModule.get(apiModule);
    byApiModule.set(apiModule, {
      module: apiModule,
      canView: (existing?.canView ?? false) || row.View,
      canCreate: (existing?.canCreate ?? false) || row.Add,
      canEdit: (existing?.canEdit ?? false) || row.Edit,
      canDelete: (existing?.canDelete ?? false) || row.Delete,
      canApprove: (existing?.canApprove ?? false) || row.Approve,
    });
  });
  return Array.from(byApiModule.values());
}

function defaultMatrix(seed: number): Matrix {
  const matrix = {} as Matrix;
  MODULES.forEach((mod, mi) => {
    matrix[mod] = {} as Record<Action, boolean>;
    ACTIONS.forEach((action, ai) => {
      // Seed a plausible default: View always on, Delete/Approve sparse, varies per profile
      const base = action === "View" ? true : (mi + ai + seed) % 3 !== 0;
      matrix[mod][action] = action === "Delete" ? (mi + seed) % 2 === 0 && base : base;
    });
  });
  return matrix;
}

export default function AdminPermissions() {
  const [activeId, setActiveId] = useState(SUB_ADMINS[0].id);
  const [matrices, setMatrices] = useState<Record<string, Matrix>>(() =>
    Object.fromEntries(SUB_ADMINS.map((s, i) => [s.id, defaultMatrix(i)]))
  );
  const [savedTick, setSavedTick] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Sub-admins in demo mode carry mock ids (sa-1, sa-2); the API expects real
  // Guids, so this screen only calls the permissions endpoints once those
  // sub-admin accounts exist as real users (Sprint 1 follow-up: replace
  // SUB_ADMINS with a live sub-admin list wired the same way as Users.tsx).
  useEffect(() => {
    if (!apiEnabled()) return;
    let cancelled = false;
    getPermissions(activeId)
      .then((permissions) => {
        if (!cancelled) setMatrices((prev) => ({ ...prev, [activeId]: apiPermissionsToMatrix(permissions) }));
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Could not load permissions.");
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const activeSubAdmin = SUB_ADMINS.find((s) => s.id === activeId) ?? SUB_ADMINS[0];
  const matrix = matrices[activeId];

  const grantedCount = useMemo(() => {
    let count = 0;
    MODULES.forEach((m) => ACTIONS.forEach((a) => matrix[m][a] && count++));
    return count;
  }, [matrix]);

  function toggle(mod: Module, action: Action) {
    setMatrices((prev) => ({
      ...prev,
      [activeId]: {
        ...prev[activeId],
        [mod]: { ...prev[activeId][mod], [action]: !prev[activeId][mod][action] },
      },
    }));
  }

  function toggleRow(mod: Module) {
    const allOn = ACTIONS.every((a) => matrix[mod][a]);
    setMatrices((prev) => ({
      ...prev,
      [activeId]: {
        ...prev[activeId],
        [mod]: Object.fromEntries(ACTIONS.map((a) => [a, !allOn])) as Record<Action, boolean>,
      },
    }));
  }

  function resetProfile() {
    const idx = SUB_ADMINS.findIndex((s) => s.id === activeId);
    setMatrices((prev) => ({ ...prev, [activeId]: defaultMatrix(idx) }));
  }

  async function saveProfile() {
    if (!apiEnabled()) {
      setSavedTick(Date.now());
      setTimeout(() => setSavedTick(null), 2200);
      return;
    }

    setSaving(true);
    try {
      await setPermissions(activeId, matrixToApiPermissions(matrix));
      setSavedTick(Date.now());
      setTimeout(() => setSavedTick(null), 2200);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not save permissions.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Access Control"
        title="Roles & Permissions"
        description="Configure module-level permissions for each sub-admin profile."
      />

      <Tabs value={activeId} onValueChange={setActiveId}>
        <TabsList>
          {SUB_ADMINS.map((s) => (
            <TabsTrigger key={s.id} value={s.id} className="gap-2">
              <Avatar className="h-5 w-5">
                <AvatarFallback style={{ backgroundColor: `${s.avatarColor}22`, color: s.avatarColor }} className="text-[10px]">
                  {getInitials(s.name)}
                </AvatarFallback>
              </Avatar>
              {s.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {SUB_ADMINS.map((s) => (
          <TabsContent key={s.id} value={s.id}>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${s.avatarColor}1A`, color: s.avatarColor }}
                  >
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <CardTitle>{s.name}</CardTitle>
                    <CardDescription>{s.email}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {grantedCount} / {MODULES.length * ACTIONS.length} granted
                  </span>
                  <Button variant="outline" size="sm" onClick={resetProfile}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                  <Button size="sm" onClick={saveProfile} disabled={saving}>
                    {savedTick ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                    {saving ? "Saving…" : savedTick ? "Saved" : "Save Changes"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
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
                      {MODULES.map((mod, mi) => (
                        <tr key={mod} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleRow(mod)}
                              className="flex items-center gap-2.5 text-left font-semibold text-foreground hover:text-primary"
                            >
                              <span
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
                                style={{
                                  backgroundColor: `${CHART_PALETTE[mi % CHART_PALETTE.length]}1A`,
                                  color: CHART_PALETTE[mi % CHART_PALETTE.length],
                                }}
                              >
                                {mod[0]}
                              </span>
                              {mod}
                            </button>
                          </td>
                          {ACTIONS.map((action) => (
                            <td key={action} className="px-4 py-3 text-center">
                              <Checkbox
                                checked={matrix[mod][action]}
                                onCheckedChange={() => toggle(mod, action)}
                                className={cn("mx-auto", action === "View" && "opacity-90")}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {apiEnabled()
                    ? "Click a module name to toggle every action in that row."
                    : "Click a module name to toggle every action in that row. Changes are local to this session and are not persisted."}
                </p>
                {apiEnabled() && loadError && (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{loadError}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
