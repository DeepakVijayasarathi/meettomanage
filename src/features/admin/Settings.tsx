import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Globe2,
  ListTree,
  Mail,
  MessageCircle,
  Palette,
  Pencil,
  Plug,
  Plus,
  Puzzle,
  Save,
  Trash2,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, hexToHslTriple } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { getSettings, toSettingsMap, updateSettings, type SettingCategory, type UpdateSettingItem } from "@/api/settings";
import { getBrand, setBrand } from "@/lib/branding";
import {
  createMenuItem,
  deleteMenuItem,
  listMenuItems,
  MENU_ICONS,
  resolveMenuIcon,
  updateMenuItem,
  type ApiMenuItem,
  type SaveMenuItemRequest,
} from "@/api/menus";
import {
  createIntegration,
  deleteIntegration,
  listIntegrations,
  updateIntegration,
  type ApiIntegration,
  type IntegrationCategory as IntegrationCategoryName,
  type SaveIntegrationRequest,
} from "@/api/integrations";

const SWATCHES = ["#1F6FE0", "#57B33B", "#17A9C9", "#F08A1D", "#8B5CF6", "#F53BA6", "#EAB308", "#0D9488"];

const PORTALS = ["admin", "teacher", "parent", "subadmin", "admission", "coordinator", "management", "student"] as const;

/** Every DB-backed setting the screen edits, with its category and visibility. */
const SETTING_META: Record<string, { category: SettingCategory; isPublic?: boolean; fallback: string }> = {
  "org.name": { category: "General", isPublic: true, fallback: "The Reader Nest" },
  "org.domain": { category: "General", fallback: "app.thereadernest.com" },
  "org.supportEmail": { category: "General", fallback: "support@thereadernest.com" },
  "org.supportPhone": { category: "General", fallback: "+91 98200 00000" },
  "org.timezone": { category: "General", fallback: "Asia/Kolkata (GMT +5:30)" },
  "brand.name": { category: "Branding", isPublic: true, fallback: "The Reader Nest" },
  "brand.logoUrl": { category: "Branding", isPublic: true, fallback: "" },
  "brand.primaryColor": { category: "Branding", isPublic: true, fallback: "#1F6FE0" },
  "brand.accentColor": { category: "Branding", isPublic: true, fallback: "#57B33B" },
  "notify.feeReminders": { category: "Notifications", fallback: "true" },
  "notify.leaveRequests": { category: "Notifications", fallback: "true" },
  "notify.lowAttendance": { category: "Notifications", fallback: "false" },
  "notify.weeklyDigest": { category: "Notifications", fallback: "true" },
};

const NOTIFICATION_ROWS = [
  { key: "notify.feeReminders", label: "Fee payment reminders", description: "Get notified when a parent's fee becomes due or overdue." },
  { key: "notify.leaveRequests", label: "Teacher leave requests", description: "Get notified when a teacher submits a leave request." },
  { key: "notify.lowAttendance", label: "Low attendance alerts", description: "Get notified when a batch's attendance drops below 75%." },
  { key: "notify.weeklyDigest", label: "Weekly summary digest", description: "Receive a weekly email summarizing enrollments and revenue." },
] as const;

function defaultValues(): Record<string, string> {
  return Object.fromEntries(Object.entries(SETTING_META).map(([key, meta]) => [key, meta.fallback]));
}

const EMPTY_MENU_FORM: SaveMenuItemRequest = {
  portal: "admin",
  section: null,
  sectionOrder: 0,
  label: "",
  path: "",
  icon: "LayoutDashboard",
  sortOrder: 0,
  isActive: true,
};

export default function AdminSettings() {
  const [values, setValues] = useState<Record<string, string>>(defaultValues);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: apiSettings } = useApiData(getSettings, []);

  useEffect(() => {
    if (apiSettings.length === 0) return;
    const map = toSettingsMap(apiSettings);
    setValues((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(SETTING_META)) {
        if (map[key] != null) next[key] = map[key]!;
      }
      return next;
    });
  }, [apiSettings]);

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function saveAll() {
    setError(null);
    if (apiEnabled()) {
      setSaving(true);
      try {
        const items: UpdateSettingItem[] = Object.entries(SETTING_META).map(([key, meta]) => ({
          key,
          value: values[key] ?? meta.fallback,
          category: meta.category,
          isPublic: meta.isPublic ?? false,
        }));
        await updateSettings(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save settings.");
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    // Apply the new brand live without a reload
    setBrand({
      ...getBrand(),
      name: values["brand.name"] || "The Reader Nest",
      logoUrl: values["brand.logoUrl"] || undefined,
      primaryHsl: hexToHslTriple(values["brand.primaryColor"] || "#1F6FE0"),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  const brandColor = values["brand.primaryColor"];
  const accentColor = values["brand.accentColor"];

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Settings & Branding"
        description="White-label branding, domain, notification preferences, sidebar menus and integrations — stored in the database."
        actions={
          <Button onClick={saveAll} disabled={saving}>
            {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
          </Button>
        }
      />

      {error && <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general" className="gap-1.5">
            <Building2 className="h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-1.5">
            <Palette className="h-4 w-4" /> Branding
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="menus" className="gap-1.5">
            <ListTree className="h-4 w-4" /> Menus
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5">
            <Plug className="h-4 w-4" /> Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Basic information about your academy.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="org-name">Academy name</Label>
                <Input id="org-name" value={values["org.name"]} onChange={(e) => setValue("org.name", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="org-domain">Custom domain</Label>
                <div className="relative">
                  <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="org-domain" value={values["org.domain"]} onChange={(e) => setValue("org.domain", e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="org-email">Support email</Label>
                <Input id="org-email" value={values["org.supportEmail"]} onChange={(e) => setValue("org.supportEmail", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="org-phone">Support phone</Label>
                <Input id="org-phone" value={values["org.supportPhone"]} onChange={(e) => setValue("org.supportPhone", e.target.value)} />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="org-timezone">Timezone</Label>
                <Input id="org-timezone" value={values["org.timezone"]} onChange={(e) => setValue("org.timezone", e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Logo & Colors</CardTitle>
              <CardDescription>
                {apiEnabled()
                  ? "Customize how the platform looks across every portal. Saved to the database and applied everywhere, including the login screen."
                  : "Customize how the platform looks across every portal. Demo mode: changes apply to this session only."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="brand-name">Brand name</Label>
                  <Input id="brand-name" value={values["brand.name"]} onChange={(e) => setValue("brand.name", e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="brand-logo">Logo URL</Label>
                  <Input
                    id="brand-logo"
                    placeholder="https://cdn.example.com/logo.png (empty = built-in mark)"
                    value={values["brand.logoUrl"]}
                    onChange={(e) => setValue("brand.logoUrl", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-2">
                  <img src={values["brand.logoUrl"] || "/logo.png"} alt="Brand logo" className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Logo preview</p>
                  <p className="text-xs text-muted-foreground">PNG or SVG, minimum 256×256px, transparent background recommended.</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <Label>Primary brand color</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setValue("brand.primaryColor", e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background"
                    />
                    <Input
                      value={brandColor}
                      onChange={(e) => setValue("brand.primaryColor", e.target.value)}
                      className="w-32 font-mono text-sm"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => setValue("brand.primaryColor", hex)}
                        className={cn(
                          "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                          brandColor === hex ? "border-foreground" : "border-transparent"
                        )}
                        style={{ backgroundColor: hex }}
                        aria-label={`Use ${hex} as brand color`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Accent color</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setValue("brand.accentColor", e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setValue("brand.accentColor", e.target.value)}
                      className="w-32 font-mono text-sm"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CHART_PALETTE.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => setValue("brand.accentColor", hex)}
                        className={cn(
                          "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                          accentColor === hex ? "border-foreground" : "border-transparent"
                        )}
                        style={{ backgroundColor: hex }}
                        aria-label={`Use ${hex} as accent color`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live Preview</p>
                <div className="flex items-center gap-3">
                  <span className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: brandColor }}>
                    Primary Button
                  </span>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}>
                    Accent Badge
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control which system events trigger admin notifications.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {NOTIFICATION_ROWS.map((item, i) => (
                <div key={item.key}>
                  {i > 0 && <Separator className="my-1" />}
                  <div className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={values[item.key] === "true"}
                      onCheckedChange={(checked) => setValue(item.key, checked ? "true" : "false")}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menus">
          <MenuManager />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** DB-backed sidebar menu manager: per-portal item list with add/edit/delete. */
function MenuManager() {
  const [portal, setPortal] = useState<string>("admin");
  const [items, setItems] = useState<ApiMenuItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SaveMenuItemRequest | null>(null);

  const iconNames = useMemo(() => Object.keys(MENU_ICONS).sort(), []);

  async function reload(nextPortal = portal) {
    if (!apiEnabled()) return;
    try {
      setItems(await listMenuItems(nextPortal));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load menu items.");
    }
  }

  useEffect(() => {
    void reload(portal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal]);

  function startAdd() {
    const maxSection = items.reduce((max, i) => Math.max(max, i.sectionOrder), 0);
    setEditingId(null);
    setForm({ ...EMPTY_MENU_FORM, portal, sectionOrder: maxSection });
  }

  function startEdit(item: ApiMenuItem) {
    setEditingId(item.id);
    setForm({
      portal: item.portal,
      section: item.section,
      sectionOrder: item.sectionOrder,
      label: item.label,
      path: item.path,
      icon: item.icon,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
      requiredModule: item.requiredModule,
    });
  }

  async function submitForm() {
    if (!form) return;
    setBusy(true);
    try {
      if (editingId) await updateMenuItem(editingId, form);
      else await createMenuItem(form);
      setForm(null);
      setEditingId(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the menu item.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: ApiMenuItem) {
    setBusy(true);
    try {
      await deleteMenuItem(item.id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the menu item.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(item: ApiMenuItem) {
    setBusy(true);
    try {
      await updateMenuItem(item.id, {
        portal: item.portal,
        section: item.section,
        sectionOrder: item.sectionOrder,
        label: item.label,
        path: item.path,
        icon: item.icon,
        sortOrder: item.sortOrder,
        isActive: !item.isActive,
        requiredModule: item.requiredModule,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the menu item.");
    } finally {
      setBusy(false);
    }
  }

  if (!apiEnabled()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sidebar Menus</CardTitle>
          <CardDescription>
            Menus are maintained in the database. Connect the API (VITE_API_BASE_URL) to manage them; demo mode uses the built-in navigation.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Sidebar Menus</CardTitle>
          <CardDescription>Per-portal navigation items served from the database. Inactive items stay configured but are hidden.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={portal} onValueChange={setPortal}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PORTALS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p[0].toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={startAdd}>
            <Plus className="h-3.5 w-3.5" /> Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{error}</p>}

        {form && (
          <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-1.5">
              <Label>Label</Label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Courses" />
            </div>
            <div className="grid gap-1.5">
              <Label>Path</Label>
              <Input value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} placeholder={`/${portal}/…`} />
            </div>
            <div className="grid gap-1.5">
              <Label>Section</Label>
              <Input
                value={form.section ?? ""}
                onChange={(e) => setForm({ ...form, section: e.target.value || null })}
                placeholder="Empty = top block"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Icon</Label>
              <Select value={form.icon} onValueChange={(icon) => setForm({ ...form, icon })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {iconNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Section order</Label>
              <Input
                type="number"
                value={form.sectionOrder}
                onChange={(e) => setForm({ ...form, sectionOrder: Number(e.target.value) })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Item order</Label>
              <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch checked={form.isActive} onCheckedChange={(isActive) => setForm({ ...form, isActive })} />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setForm(null);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={submitForm} disabled={busy}>
                {editingId ? "Update Item" : "Add Item"}
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Section</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Label</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Path</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const Icon = resolveMenuIcon(item.icon);
                return (
                  <tr key={item.id} className={cn("border-b border-border last:border-0 hover:bg-muted/30", !item.isActive && "opacity-50")}>
                    <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.section ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {item.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.path}</td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                      {item.sectionOrder}.{item.sortOrder}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Switch checked={item.isActive} onCheckedChange={() => toggleActive(item)} disabled={busy} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(item)} disabled={busy}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No menu items configured for this portal yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Changes take effect the next time a portal sidebar loads. The frontend falls back to its built-in navigation if a portal has no items.
        </p>
      </CardContent>
    </Card>
  );
}

const CATEGORY_META: Record<IntegrationCategoryName, { label: string; icon: LucideIcon; color: string }> = {
  Email: { label: "Email", icon: Mail, color: CHART_PALETTE[0] },
  Messaging: { label: "Messaging", icon: MessageCircle, color: CHART_PALETTE[1] },
  PaymentGateway: { label: "Payment Gateways", icon: CreditCard, color: CHART_PALETTE[4] },
  VideoConferencing: { label: "Video Conferencing", icon: Video, color: CHART_PALETTE[2] },
  Other: { label: "Other", icon: Puzzle, color: CHART_PALETTE[6] },
};

const CATEGORY_ORDER: IntegrationCategoryName[] = ["Email", "Messaging", "PaymentGateway", "VideoConferencing", "Other"];

type ConfigRow = { key: string; value: string };

/** Mirrors the backend's IsSecretField heuristic so a Razorpay/Cashfree key or secret is masked while typing, not just on read. */
const SECRET_FIELD_HINTS = ["secret", "key", "token", "password"];
function isSecretField(fieldName: string): boolean {
  const lower = fieldName.toLowerCase();
  return SECRET_FIELD_HINTS.some((hint) => lower.includes(hint));
}

function configToRows(config: Record<string, string | null>): ConfigRow[] {
  const rows = Object.entries(config).map(([key, value]) => ({ key, value: value ?? "" }));
  return rows.length > 0 ? rows : [{ key: "", value: "" }];
}

function rowsToConfig(rows: ConfigRow[]): Record<string, string | null> {
  return Object.fromEntries(rows.filter((r) => r.key.trim().length > 0).map((r) => [r.key.trim(), r.value]));
}

const EMPTY_INTEGRATION_FORM: SaveIntegrationRequest = {
  key: "",
  name: "",
  category: "Other",
  description: "",
  isEnabled: false,
  config: {},
};

/**
 * DB-backed integrations master: Email, WhatsApp, Razorpay, Cashfree, Zoom, Jitsi Meet and any
 * custom ones the admin adds. Exported so the Sub Admin portal's own Integrations page
 * (`src/features/subadmin/Integrations.tsx`, shown only with Settings access) can reuse the
 * exact same editor rather than duplicating it — one implementation, gated by permission
 * rather than by which portal you're in.
 */
export function IntegrationsManager() {
  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<SaveIntegrationRequest | null>(null);
  const [configRows, setConfigRows] = useState<ConfigRow[]>([]);
  const [revealedRows, setRevealedRows] = useState<Set<number>>(new Set());

  async function reload() {
    if (!apiEnabled()) return;
    try {
      setIntegrations(await listIntegrations());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load integrations.");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(integration: ApiIntegration) {
    setEditingId(integration.id);
    setIsNew(false);
    setForm({
      key: integration.key,
      name: integration.name,
      category: integration.category,
      description: integration.description ?? "",
      isEnabled: integration.isEnabled,
      config: integration.config,
    });
    setConfigRows(configToRows(integration.config));
    setRevealedRows(new Set());
  }

  function startNew() {
    setEditingId(null);
    setIsNew(true);
    setForm({ ...EMPTY_INTEGRATION_FORM });
    setConfigRows([{ key: "", value: "" }]);
    setRevealedRows(new Set());
  }

  function cancelEdit() {
    setEditingId(null);
    setIsNew(false);
    setForm(null);
    setRevealedRows(new Set());
  }

  function toggleRevealed(index: number) {
    setRevealedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function toggleEnabled(integration: ApiIntegration) {
    setBusy(true);
    try {
      await updateIntegration(integration.id, {
        key: integration.key,
        name: integration.name,
        category: integration.category,
        description: integration.description,
        isEnabled: !integration.isEnabled,
        config: integration.config,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the integration.");
    } finally {
      setBusy(false);
    }
  }

  async function submitForm() {
    if (!form) return;
    setBusy(true);
    try {
      const request: SaveIntegrationRequest = { ...form, config: rowsToConfig(configRows) };
      if (isNew) await createIntegration(request);
      else if (editingId) await updateIntegration(editingId, request);
      cancelEdit();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the integration.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(integration: ApiIntegration) {
    setBusy(true);
    try {
      await deleteIntegration(integration.id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the integration.");
    } finally {
      setBusy(false);
    }
  }

  if (!apiEnabled()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connected Integrations</CardTitle>
          <CardDescription>
            Integrations are maintained in the database. Connect the API (VITE_API_BASE_URL) to manage them.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: integrations.filter((i) => i.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Connected Integrations</CardTitle>
          <CardDescription>
            Master list of third-party services — Email, WhatsApp, Razorpay, Cashfree, Zoom, Jitsi Meet and any custom ones you add.
          </CardDescription>
        </div>
        <Button size="sm" onClick={startNew}>
          <Plus className="h-3.5 w-3.5" /> Add Integration
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{error}</p>}

        {form && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Key</Label>
              <Input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="e.g. sms-gateway"
                disabled={!isNew}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. SMS Gateway" />
            </div>
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(category: IntegrationCategoryName) => setForm({ ...form, category })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_META[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Input
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What this integration is for"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="mb-1.5 flex items-center justify-between">
                <Label>Configuration fields</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfigRows([...configRows, { key: "", value: "" }])}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" /> Add field
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {configRows.map((row, i) => {
                  const secret = isSecretField(row.key);
                  const revealed = revealedRows.has(i);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={row.key}
                        onChange={(e) => setConfigRows(configRows.map((r, ri) => (ri === i ? { ...r, key: e.target.value } : r)))}
                        placeholder="field name, e.g. apiKey"
                        className="w-48 font-mono text-xs"
                      />
                      <div className="relative flex-1">
                        <Input
                          type={secret && !revealed ? "password" : "text"}
                          value={row.value}
                          onChange={(e) => setConfigRows(configRows.map((r, ri) => (ri === i ? { ...r, value: e.target.value } : r)))}
                          placeholder="value"
                          className={cn(secret && "pr-9")}
                          autoComplete="off"
                        />
                        {secret && (
                          <button
                            type="button"
                            onClick={() => toggleRevealed(i)}
                            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                            aria-label={revealed ? "Hide value" : "Show value"}
                          >
                            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => setConfigRows(configRows.filter((_, ri) => ri !== i))}
                      >
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Fields named with "key", "secret", "token" or "password" (e.g. Razorpay's keyId/keySecret) are masked while typing.
              </p>
            </div>

            <div className="flex items-center gap-2 pb-1">
              <Switch checked={form.isEnabled} onCheckedChange={(isEnabled) => setForm({ ...form, isEnabled })} />
              <span className="text-sm text-muted-foreground">Enabled</span>
            </div>
            <div className="flex items-end justify-end gap-2 sm:col-span-2">
              <Button variant="outline" size="sm" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={submitForm} disabled={busy || !form.key || !form.name}>
                {isNew ? "Create Integration" : "Save Changes"}
              </Button>
            </div>
          </div>
        )}

        {loaded && grouped.length === 0 && !form && (
          <p className="py-8 text-center text-sm text-muted-foreground">No integrations configured yet.</p>
        )}

        {grouped.map(({ category, items }) => {
          const meta = CATEGORY_META[category];
          const Icon = meta.icon;
          return (
            <div key={category}>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3.5 w-3.5" /> {meta.label}
              </p>
              <div className="flex flex-col gap-1 rounded-xl border border-border">
                {items.map((integration, i) => (
                  <div key={integration.id}>
                    {i > 0 && <Separator />}
                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
                          style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                        >
                          {integration.name[0]}
                        </span>
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            {integration.name}
                            {integration.isSystem && <span className="text-[10px] font-normal uppercase text-muted-foreground">system</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{integration.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={integration.isEnabled} onCheckedChange={() => toggleEnabled(integration)} disabled={busy} />
                        <Button variant="outline" size="sm" onClick={() => startEdit(integration)}>
                          <Pencil className="h-3.5 w-3.5" /> Configure
                        </Button>
                        {!integration.isSystem && (
                          <Button variant="ghost" size="sm" onClick={() => remove(integration)} disabled={busy}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
