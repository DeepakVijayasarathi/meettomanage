import { useEffect, useMemo, useState } from "react";
import { Check, Plus, RotateCcw, Save, ShieldCheck, Trash2, UserCog, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUB_ADMINS } from "@/data/users";
import { getInitials, cn } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listUsers, toAppUser } from "@/api/users";
import { getPermissions, setPermissions, PERMISSION_MODULES, type ApiPermission, type PermissionModuleName } from "@/api/permissions";
import { applyRoleToUser, createRole, deleteRole, listRoles, updateRole, type ApiRole } from "@/api/roles";
import { listMenuItems, type ApiMenuItem } from "@/api/menus";

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

/** Tri-state for a select-all checkbox: fully on, fully off, or a mix. */
function triState(values: boolean[]): boolean | "indeterminate" {
  if (values.length === 0) return false;
  if (values.every(Boolean)) return true;
  if (values.every((v) => !v)) return false;
  return "indeterminate";
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
  return (
    <div>
      <PageHeader
        eyebrow="Access Control"
        title="Roles & Permissions"
        description="Configure module-level permissions per relationship manager and maintain reusable role presets in the database."
      />

      <Tabs defaultValue="subadmins">
        <TabsList>
          <TabsTrigger value="subadmins" className="gap-1.5">
            <UserCog className="h-4 w-4" /> Relationship Managers
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Role Presets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subadmins">
          <SubAdminMatrix />
        </TabsContent>
        <TabsContent value="roles">
          <RolePresets />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SubAdminMatrix() {
  const { data: subAdmins, loading: loadingSubAdmins } = useApiData(
    () => listUsers({ role: "SubAdmin" }).then((r) => r.items.map(toAppUser)),
    SUB_ADMINS
  );

  const [activeId, setActiveId] = useState(subAdmins[0]?.id ?? "");
  const [matrices, setMatrices] = useState<Record<string, Matrix>>(() =>
    Object.fromEntries(subAdmins.map((s, i) => [s.id, defaultMatrix(i)]))
  );
  const [savedTick, setSavedTick] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [presets, setPresets] = useState<ApiRole[]>([]);

  // Re-anchor once the real sub-admin list arrives (fallback mock ids like
  // "sa-1" won't be present in it), and seed a fresh matrix for anyone new.
  useEffect(() => {
    if (subAdmins.length === 0) return;
    setMatrices((prev) => {
      const next = { ...prev };
      subAdmins.forEach((s, i) => {
        if (!next[s.id]) next[s.id] = defaultMatrix(i);
      });
      return next;
    });
    setActiveId((prev) => (subAdmins.some((s) => s.id === prev) ? prev : subAdmins[0].id));
  }, [subAdmins]);

  useEffect(() => {
    if (!apiEnabled() || !activeId) return;
    // Wait for the real sub-admin list: activeId briefly holds the mock
    // fallback's id (e.g. "sa-1") for a render or two while it resolves —
    // checking membership (not just the loading flag) closes that race,
    // since the re-anchor effect above corrects activeId one render later.
    if (loadingSubAdmins || !subAdmins.some((s) => s.id === activeId)) return;
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
  }, [activeId, loadingSubAdmins, subAdmins]);

  useEffect(() => {
    if (!apiEnabled()) return;
    listRoles()
      .then(setPresets)
      .catch(() => {
        /* preset dropdown just stays empty */
      });
  }, []);

  const matrix = matrices[activeId];

  const grantedCount = useMemo(() => {
    if (!matrix) return 0;
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

  function toggleColumn(action: Action) {
    const allOn = MODULES.every((m) => matrix[m][action]);
    setMatrices((prev) => ({
      ...prev,
      [activeId]: Object.fromEntries(
        MODULES.map((m) => [m, { ...prev[activeId][m], [action]: !allOn }])
      ) as Matrix,
    }));
  }

  function toggleAll() {
    const allOn = MODULES.every((m) => ACTIONS.every((a) => matrix[m][a]));
    setMatrices((prev) => ({
      ...prev,
      [activeId]: Object.fromEntries(
        MODULES.map((m) => [m, Object.fromEntries(ACTIONS.map((a) => [a, !allOn])) as Record<Action, boolean>])
      ) as Matrix,
    }));
  }

  function resetProfile() {
    const idx = subAdmins.findIndex((s) => s.id === activeId);
    setMatrices((prev) => ({ ...prev, [activeId]: defaultMatrix(idx) }));
  }

  async function applyPreset(roleName: string) {
    const preset = presets.find((p) => p.name === roleName);
    if (!preset) return;

    if (apiEnabled()) {
      try {
        await applyRoleToUser(activeId, roleName);
        setMatrices((prev) => ({ ...prev, [activeId]: apiPermissionsToMatrix(preset.permissions) }));
        setLoadError(null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not apply the preset.");
      }
    } else {
      setMatrices((prev) => ({ ...prev, [activeId]: apiPermissionsToMatrix(preset.permissions) }));
    }
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

  if (subAdmins.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {loadingSubAdmins ? "Loading relationship managers…" : "No relationship manager accounts yet. Create one from the Users page first."}
        </CardContent>
      </Card>
    );
  }

  if (!matrix) return null;

  return (
    <Tabs value={activeId} onValueChange={setActiveId}>
      <TabsList>
        {subAdmins.map((s) => (
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

      {subAdmins.map((s) => (
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
                {presets.length > 0 && (
                  <Select value="" onValueChange={applyPreset}>
                    <SelectTrigger className="h-9 w-40">
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <Wand2 className="h-3.5 w-3.5" /> Apply preset…
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {presets.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
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
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            checked={triState(MODULES.flatMap((m) => ACTIONS.map((a) => matrix[m][a])))}
                            onCheckedChange={toggleAll}
                            aria-label="Select all permissions"
                          />
                          Module
                        </div>
                      </th>
                      {ACTIONS.map((action) => (
                        <th key={action} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <div className="flex flex-col items-center gap-1.5">
                            <Checkbox
                              checked={triState(MODULES.map((m) => matrix[m][action]))}
                              onCheckedChange={() => toggleColumn(action)}
                              aria-label={`Select all ${action}`}
                            />
                            {action}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map((mod, mi) => (
                      <tr key={mod} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Checkbox
                              checked={triState(ACTIONS.map((a) => matrix[mod][a]))}
                              onCheckedChange={() => toggleRow(mod)}
                              aria-label={`Select all ${mod}`}
                            />
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
                          </div>
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
  );
}

const ROLE_ACTIONS = [
  { key: "canView", label: "View" },
  { key: "canCreate", label: "Add" },
  { key: "canEdit", label: "Edit" },
  { key: "canDelete", label: "Delete" },
  { key: "canApprove", label: "Approve" },
] as const;

type RoleActionKey = (typeof ROLE_ACTIONS)[number]["key"];

function emptyRolePermissions(): ApiPermission[] {
  return PERMISSION_MODULES.map((m) => ({
    module: m.value,
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canApprove: false,
  }));
}

/** Aligns a role's sparse permission rows onto the full module list for editing. */
function expandPermissions(permissions: ApiPermission[]): ApiPermission[] {
  return PERMISSION_MODULES.map((m) => {
    const grant = permissions.find((p) => p.module === m.value);
    return grant ? { ...grant } : { module: m.value, canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false };
  });
}

type RoleDraft = { name: string; displayName: string; description: string; defaultRoute: string; permissions: ApiPermission[] };

/** DB-maintained permission roles: create, edit the matrix, delete (non-system). */
function RolePresets() {
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RoleDraft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState<number | null>(null);
  const [subadminRoutes, setSubadminRoutes] = useState<ApiMenuItem[]>([]);

  async function reload(selectId?: string | null) {
    try {
      const list = await listRoles();
      setRoles(list);
      const target = selectId ?? selectedId ?? list[0]?.id ?? null;
      const role = list.find((r) => r.id === target) ?? list[0];
      setSelectedId(role?.id ?? null);
      setDraft(
        role
          ? {
              name: role.name,
              displayName: role.displayName,
              description: role.description ?? "",
              defaultRoute: role.defaultRoute ?? "",
              permissions: expandPermissions(role.permissions),
            }
          : null
      );
      setIsNew(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load roles.");
    }
  }

  useEffect(() => {
    if (!apiEnabled()) return;
    void reload(null);
    listMenuItems("subadmin")
      .then(setSubadminRoutes)
      .catch(() => {
        /* default-route dropdown just stays empty */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRole = roles.find((r) => r.id === selectedId) ?? null;

  function selectRole(role: ApiRole) {
    setSelectedId(role.id);
    setIsNew(false);
    setDraft({
      name: role.name,
      displayName: role.displayName,
      description: role.description ?? "",
      defaultRoute: role.defaultRoute ?? "",
      permissions: expandPermissions(role.permissions),
    });
  }

  function startNew() {
    setSelectedId(null);
    setIsNew(true);
    setDraft({ name: "", displayName: "", description: "", defaultRoute: "", permissions: emptyRolePermissions() });
  }

  function togglePermission(module: PermissionModuleName, action: RoleActionKey) {
    if (!draft) return;
    setDraft({
      ...draft,
      permissions: draft.permissions.map((p) => (p.module === module ? { ...p, [action]: !p[action] } : p)),
    });
  }

  function toggleModuleRow(module: PermissionModuleName) {
    if (!draft) return;
    const grant = draft.permissions.find((p) => p.module === module)!;
    const allOn = ROLE_ACTIONS.every((a) => grant[a.key]);
    setDraft({
      ...draft,
      permissions: draft.permissions.map((p) =>
        p.module === module
          ? { ...p, ...Object.fromEntries(ROLE_ACTIONS.map((a) => [a.key, !allOn])) }
          : p
      ),
    });
  }

  function toggleActionColumn(action: RoleActionKey) {
    if (!draft) return;
    const allOn = draft.permissions.every((p) => p[action]);
    setDraft({ ...draft, permissions: draft.permissions.map((p) => ({ ...p, [action]: !allOn })) });
  }

  function toggleAllPermissions() {
    if (!draft) return;
    const allOn = draft.permissions.every((p) => ROLE_ACTIONS.every((a) => p[a.key]));
    setDraft({
      ...draft,
      permissions: draft.permissions.map((p) => ({
        ...p,
        ...Object.fromEntries(ROLE_ACTIONS.map((a) => [a.key, !allOn])),
      })),
    });
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      // Only persist modules with at least one grant; the matrix stays sparse in the DB
      const permissions = draft.permissions.filter((p) => p.canView || p.canCreate || p.canEdit || p.canDelete || p.canApprove);
      const request = {
        name: draft.name,
        displayName: draft.displayName,
        description: draft.description || null,
        defaultRoute: draft.defaultRoute || null,
        permissions,
      };
      if (isNew) {
        const created = await createRole(request);
        await reload(created.id);
      } else if (selectedRole) {
        await updateRole(selectedRole.id, request);
        await reload(selectedRole.id);
      }
      setSavedTick(Date.now());
      setTimeout(() => setSavedTick(null), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the role.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selectedRole || selectedRole.isSystem) return;
    setBusy(true);
    setError(null);
    try {
      await deleteRole(selectedRole.id);
      await reload(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the role.");
    } finally {
      setBusy(false);
    }
  }

  if (!apiEnabled()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Role Presets</CardTitle>
          <CardDescription>
            Permission roles are maintained in the database. Connect the API (VITE_API_BASE_URL) to manage them.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Role Presets</CardTitle>
          <CardDescription>
            Reusable permission matrices stored in the database. Apply one to a relationship manager from the Relationship Managers tab.
          </CardDescription>
        </div>
        <Button size="sm" onClick={startNew}>
          <Plus className="h-3.5 w-3.5" /> New Role
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{error}</p>}

        <div className="mb-4 flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => selectRole(role)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                selectedId === role.id && !isNew
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {role.displayName}
              {role.isSystem && <span className="ml-1.5 text-[10px] uppercase opacity-60">system</span>}
            </button>
          ))}
          {isNew && (
            <span className="rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              New role…
            </span>
          )}
        </div>

        {draft && (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-1.5">
                <Label>Identifier</Label>
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. finance-officer"
                  disabled={!isNew && (selectedRole?.isSystem ?? false)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Display name</Label>
                <Input
                  value={draft.displayName}
                  onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                  placeholder="e.g. Finance Officer"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Description</Label>
                <Input
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="What this role is for"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Default landing page</Label>
                <Select
                  value={draft.defaultRoute || "__none"}
                  onValueChange={(v) => setDraft({ ...draft, defaultRoute: v === "__none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Relationship Manager dashboard (default)</SelectItem>
                    {subadminRoutes.map((item) => (
                      <SelectItem key={item.id} value={item.path}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              A Relationship Manager assigned this role lands here right after signing in, instead of the generic dashboard.
            </p>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          checked={triState(draft.permissions.flatMap((p) => ROLE_ACTIONS.map((a) => p[a.key])))}
                          onCheckedChange={toggleAllPermissions}
                          aria-label="Select all permissions"
                        />
                        Module
                      </div>
                    </th>
                    {ROLE_ACTIONS.map((action) => (
                      <th key={action.key} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <div className="flex flex-col items-center gap-1.5">
                          <Checkbox
                            checked={triState(draft.permissions.map((p) => p[action.key]))}
                            onCheckedChange={() => toggleActionColumn(action.key)}
                            aria-label={`Select all ${action.label}`}
                          />
                          {action.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MODULES.map((mod, mi) => {
                    const grant = draft.permissions.find((p) => p.module === mod.value)!;
                    return (
                      <tr key={mod.value} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Checkbox
                              checked={triState(ROLE_ACTIONS.map((a) => grant[a.key]))}
                              onCheckedChange={() => toggleModuleRow(mod.value)}
                              aria-label={`Select all ${mod.label}`}
                            />
                            <span className="flex items-center gap-2.5 font-semibold text-foreground">
                              <span
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
                                style={{
                                  backgroundColor: `${CHART_PALETTE[mi % CHART_PALETTE.length]}1A`,
                                  color: CHART_PALETTE[mi % CHART_PALETTE.length],
                                }}
                              >
                                {mod.label[0]}
                              </span>
                              {mod.label}
                            </span>
                          </div>
                        </td>
                        {ROLE_ACTIONS.map((action) => (
                          <td key={action.key} className="px-4 py-3 text-center">
                            <Checkbox checked={grant[action.key]} onCheckedChange={() => togglePermission(mod.value, action.key)} className="mx-auto" />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                {selectedRole && !isNew && !selectedRole.isSystem && (
                  <Button variant="outline" size="sm" onClick={remove} disabled={busy}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" /> Delete Role
                  </Button>
                )}
                {selectedRole?.isSystem && !isNew && (
                  <p className="text-xs text-muted-foreground">System role: the matrix can be edited, but it cannot be renamed or deleted.</p>
                )}
              </div>
              <Button size="sm" onClick={save} disabled={busy || !draft.name || !draft.displayName}>
                {savedTick ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                {busy ? "Saving…" : savedTick ? "Saved" : isNew ? "Create Role" : "Save Role"}
              </Button>
            </div>
          </>
        )}

        {!draft && roles.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No roles configured yet. Create the first one.</p>
        )}
      </CardContent>
    </Card>
  );
}
