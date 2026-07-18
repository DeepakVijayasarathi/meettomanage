import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { PERMISSION_MODULES, type ApiPermission, type PermissionModuleName } from "@/api/permissions";

export const PERMISSION_ACTIONS = [
  { key: "canView", label: "View" },
  { key: "canCreate", label: "Create" },
  { key: "canEdit", label: "Edit" },
  { key: "canDelete", label: "Delete" },
  { key: "canApprove", label: "Approve" },
] as const;

export type PermissionActionKey = (typeof PERMISSION_ACTIONS)[number]["key"];

/** Tri-state for a select-all checkbox: fully on, fully off, or a mix. */
function triState(values: boolean[]): boolean | "indeterminate" {
  if (values.length === 0) return false;
  if (values.every(Boolean)) return true;
  if (values.every((v) => !v)) return false;
  return "indeterminate";
}

interface PermissionMatrixProps {
  /** Must cover every PERMISSION_MODULES entry — pass through expandPermissions() first. */
  permissions: ApiPermission[];
  /** Real menu labels gated by each module, e.g. { BillingFinance: ["Admin — Billing & Finance", "Admission — Payment Tracking"] }. */
  menusByModule?: Partial<Record<PermissionModuleName, string[]>>;
  onToggle: (module: PermissionModuleName, action: PermissionActionKey) => void;
  onToggleRow: (module: PermissionModuleName) => void;
  onToggleColumn: (action: PermissionActionKey) => void;
  onToggleAll: () => void;
}

/**
 * Every module (all 11 — the full backend PermissionModule enum, not a hand-picked
 * subset) with View/Create/Edit/Delete/Approve toggles, and — since a module is what
 * the backend actually enforces, not an individual menu item — a caption under each
 * module name listing which real sidebar menus, across every portal, that grant
 * governs. This is the one editor behind every place permissions are managed: a Sub
 * Admin's individual grant, and every role preset (including Teacher/Parent/Admission
 * Team's own default grants), so "who can see/do what" stays defined in exactly one
 * screen for every login type.
 */
export function PermissionMatrix({ permissions, menusByModule, onToggle, onToggleRow, onToggleColumn, onToggleAll }: PermissionMatrixProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  checked={triState(permissions.flatMap((p) => PERMISSION_ACTIONS.map((a) => p[a.key])))}
                  onCheckedChange={onToggleAll}
                  aria-label="Select all permissions"
                />
                Module
              </div>
            </th>
            {PERMISSION_ACTIONS.map((action) => (
              <th key={action.key} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <div className="flex flex-col items-center gap-1.5">
                  <Checkbox
                    checked={triState(permissions.map((p) => p[action.key]))}
                    onCheckedChange={() => onToggleColumn(action.key)}
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
            const grant = permissions.find((p) => p.module === mod.value)!;
            const menus = menusByModule?.[mod.value] ?? [];
            return (
              <tr key={mod.value} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      checked={triState(PERMISSION_ACTIONS.map((a) => grant[a.key]))}
                      onCheckedChange={() => onToggleRow(mod.value)}
                      aria-label={`Select all ${mod.label}`}
                      className="mt-0.5"
                    />
                    <button onClick={() => onToggleRow(mod.value)} className="text-left">
                      <span className="flex items-center gap-2.5 font-semibold text-foreground hover:text-primary">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                          style={{
                            backgroundColor: `${CHART_PALETTE[mi % CHART_PALETTE.length]}1A`,
                            color: CHART_PALETTE[mi % CHART_PALETTE.length],
                          }}
                        >
                          {mod.label[0]}
                        </span>
                        {mod.label}
                      </span>
                      <span className="mt-0.5 block pl-9 text-xs font-normal text-muted-foreground">
                        {menus.length > 0 ? `Menus: ${menus.join(", ")}` : "No menu currently depends on this module"}
                      </span>
                    </button>
                  </div>
                </td>
                {PERMISSION_ACTIONS.map((action) => (
                  <td key={action.key} className="px-4 py-3 text-center align-top">
                    <Checkbox
                      checked={grant[action.key]}
                      onCheckedChange={() => onToggle(mod.value, action.key)}
                      className={cn("mx-auto", action.key === "canView" && "opacity-90")}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
