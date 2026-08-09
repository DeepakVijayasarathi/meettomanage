import { useEffect, useMemo, useState } from "react";
import { Check, Plus, RotateCcw, Save, ShieldCheck, Trash2, UserCog, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PermissionMatrix, PERMISSION_ACTIONS, type PermissionActionKey } from "@/components/PermissionMatrix";
import { SUB_ADMINS } from "@/data/users";
import { getInitials, cn } from "@/lib/utils";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listUsers, toAppUser } from "@/api/users";
import {
  getPermissions,
  setPermissions,
  emptyPermissions,
  expandPermissions,
  PERMISSION_MODULES,
  type ApiPermission,
  type PermissionModuleName,
} from "@/api/permissions";
import { applyRoleToUser, createRole, deleteRole, listRoles, updateRole, type ApiRole } from "@/api/roles";
import { listMenuItems, groupMenusByModule, type ApiMenuItem } from "@/api/menus";

const TOTAL_GRANTS = PERMISSION_MODULES.length * PERMISSION_ACTIONS.length;

/** Plausible demo defaults: View mostly on, Delete/Approve sparse, varies per profile. */
function defaultPermissions(seed: number): ApiPermission[] {
  return PERMISSION_MODULES.map((mod, mi) => {
    const base = (mi + seed) % 3 !== 0;
    return {
      module: mod.value,
      canView: true,
      canCreate: base,
      canEdit: base,
      canDelete: (mi + seed) % 2 === 0 && base,
      canApprove: (mi + seed + 1) % 3 === 0 && base,
    };
  });
}

/** Only modules with at least one grant are persisted — the matrix stays sparse in the DB. */
function toSparsePermissions(permissions: ApiPermission[]): ApiPermission[] {
  return permissions.filter((p) => p.canView || p.canCreate || p.canEdit || p.canDelete || p.canApprove);
}

export default function AdminPermissions() {
  // Every real sidebar menu across every portal, grouped by the module that gates it —
  // fetched once here and handed to both tabs so "which menus does this module control"
  // is answered identically wherever a permission matrix is edited.
  const [menusByModule, setMenusByModule] = useState<Partial<Record<PermissionModuleName, string[]>>>({});

  useEffect(() => {
    if (!apiEnabled()) return;
    listMenuItems()
      .then((items: ApiMenuItem[]) => setMenusByModule(groupMenusByModule(items)))
      .catch(() => {
        /* captions just stay empty */
      });
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Access Control"
        title="Roles & Permissions"
        description="Manage every module — and the real menus each one controls — per relationship manager, and maintain reusable role presets that also drive Teacher, Parent and Admission Team access."
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
          <SubAdminMatrix menusByModule={menusByModule} />
        </TabsContent>
        <TabsContent value="roles">
          <RolePresets menusByModule={menusByModule} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface MenusByModuleProp {
  menusByModule: Partial<Record<PermissionModuleName, string[]>>;
}

function SubAdminMatrix({ menusByModule }: MenusByModuleProp) {
  const { data: subAdmins, loading: loadingSubAdmins } = useApiData(
    () => listUsers({ role: "SubAdmin" }).then((r) => r.items.map(toAppUser)),
    SUB_ADMINS
  );

  const [activeId, setActiveId] = useState(subAdmins[0]?.id ?? "");
  const [matrices, setMatrices] = useState<Record<string, ApiPermission[]>>(() =>
    Object.fromEntries(subAdmins.map((s, i) => [s.id, defaultPermissions(i)]))
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
        if (!next[s.id]) next[s.id] = defaultPermissions(i);
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
        if (!cancelled) setMatrices((prev) => ({ ...prev, [activeId]: expandPermissions(permissions) }));
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
    return matrix.reduce((count, p) => count + PERMISSION_ACTIONS.filter((a) => p[a.key]).length, 0);
  }, [matrix]);

  function updateMatrix(updater: (rows: ApiPermission[]) => ApiPermission[]) {
    setMatrices((prev) => ({ ...prev, [activeId]: updater(prev[activeId]) }));
  }

  function toggle(module: PermissionModuleName, action: PermissionActionKey) {
    updateMatrix((rows) => rows.map((p) => (p.module === module ? { ...p, [action]: !p[action] } : p)));
  }

  function toggleRow(module: PermissionModuleName) {
    const grant = matrix.find((p) => p.module === module)!;
    const allOn = PERMISSION_ACTIONS.every((a) => grant[a.key]);
    updateMatrix((rows) =>
      rows.map((p) => (p.module === module ? { ...p, ...Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a.key, !allOn])) } : p))
    );
  }

  function toggleColumn(action: PermissionActionKey) {
    const allOn = matrix.every((p) => p[action]);
    updateMatrix((rows) => rows.map((p) => ({ ...p, [action]: !allOn })));
  }

  function toggleAll() {
    const allOn = matrix.every((p) => PERMISSION_ACTIONS.every((a) => p[a.key]));
    updateMatrix((rows) => rows.map((p) => ({ ...p, ...Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a.key, !allOn])) })));
  }

  function resetProfile() {
    const idx = subAdmins.findIndex((s) => s.id === activeId);
    setMatrices((prev) => ({ ...prev, [activeId]: defaultPermissions(idx) }));
  }

  async function applyPreset(roleName: string) {
    const preset = presets.find((p) => p.name === roleName);
    if (!preset) return;

    if (apiEnabled()) {
      try {
        await applyRoleToUser(activeId, roleName);
        setMatrices((prev) => ({ ...prev, [activeId]: expandPermissions(preset.permissions) }));
        setLoadError(null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not apply the preset.");
      }
    } else {
      setMatrices((prev) => ({ ...prev, [activeId]: expandPermissions(preset.permissions) }));
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
      await setPermissions(activeId, toSparsePermissions(matrix));
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
                  {grantedCount} / {TOTAL_GRANTS} granted
                </span>
                {presets.length > 0 && (
                  <Select value="" onValueChange={applyPreset}>
                    <SelectTrigger className="h-9 w-40">
                      <span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold">
                        <Wand2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Apply preset…</span>
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
              <PermissionMatrix
                permissions={matrix}
                menusByModule={menusByModule}
                onToggle={toggle}
                onToggleRow={toggleRow}
                onToggleColumn={toggleColumn}
                onToggleAll={toggleAll}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                {apiEnabled()
                  ? "Click a module name to toggle every action in that row. A module with no menu listed under it isn't currently used by any screen."
                  : "Click a module name to toggle every action in that row. Changes are local to this session and are not persisted."}
              </p>
              {apiEnabled() && loadError && (
                <p className="mt-2 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">{loadError}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}

type RoleDraft = { name: string; displayName: string; description: string; defaultRoute: string; permissions: ApiPermission[] };

/**
 * DB-maintained permission roles: create, edit the matrix, delete (non-system).
 * This is the single place that also defines what a Teacher, Parent or Admission
 * Team login can do by default — those three fixed-portal roles resolve their
 * permission claims from the matching system role here at login time, so editing
 * the "teacher"/"parent"/"admission" preset changes real access for every account
 * of that type immediately, the same way it does for a Sub Admin preset.
 */
function RolePresets({ menusByModule }: MenusByModuleProp) {
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
    setDraft({ name: "", displayName: "", description: "", defaultRoute: "", permissions: emptyPermissions() });
  }

  function togglePermission(module: PermissionModuleName, action: PermissionActionKey) {
    if (!draft) return;
    setDraft({
      ...draft,
      permissions: draft.permissions.map((p) => (p.module === module ? { ...p, [action]: !p[action] } : p)),
    });
  }

  function toggleModuleRow(module: PermissionModuleName) {
    if (!draft) return;
    const grant = draft.permissions.find((p) => p.module === module)!;
    const allOn = PERMISSION_ACTIONS.every((a) => grant[a.key]);
    setDraft({
      ...draft,
      permissions: draft.permissions.map((p) =>
        p.module === module
          ? { ...p, ...Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a.key, !allOn])) }
          : p
      ),
    });
  }

  function toggleActionColumn(action: PermissionActionKey) {
    if (!draft) return;
    const allOn = draft.permissions.every((p) => p[action]);
    setDraft({ ...draft, permissions: draft.permissions.map((p) => ({ ...p, [action]: !allOn })) });
  }

  function toggleAllPermissions() {
    if (!draft) return;
    const allOn = draft.permissions.every((p) => PERMISSION_ACTIONS.every((a) => p[a.key]));
    setDraft({
      ...draft,
      permissions: draft.permissions.map((p) => ({
        ...p,
        ...Object.fromEntries(PERMISSION_ACTIONS.map((a) => [a.key, !allOn])),
      })),
    });
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const permissions = toSparsePermissions(draft.permissions);
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
            Reusable permission matrices stored in the database — including Teacher, Parent and Admission Team's own default
            access. Apply a preset to a relationship manager from the Relationship Managers tab.
          </CardDescription>
        </div>
        <Button size="sm" onClick={startNew}>
          <Plus className="h-3.5 w-3.5" /> New Role
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">{error}</p>}

        <div className="mb-4 flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => selectRole(role)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
              For the Teacher/Parent/Admission system roles this field is informational only — those logins keep their fixed
              portal home.
            </p>

            <PermissionMatrix
              permissions={draft.permissions}
              menusByModule={menusByModule}
              onToggle={togglePermission}
              onToggleRow={toggleModuleRow}
              onToggleColumn={toggleActionColumn}
              onToggleAll={toggleAllPermissions}
            />

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
