import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  Settings2,
  ShieldAlert,
  StickyNote,
  Trash2,
  Video,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { cn, formatCurrency, hexToHslTriple } from "@/lib/utils";
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
import { PERMISSION_MODULES } from "@/api/permissions";
import {
  createIntegration,
  deleteIntegration,
  listIntegrations,
  updateIntegration,
  type ApiIntegration,
  type IntegrationCategory as IntegrationCategoryName,
  type SaveIntegrationRequest,
} from "@/api/integrations";
import { listPayoutRates, savePayoutRate, type ApiPayoutRate } from "@/api/payouts";
import { listTeacherOptions } from "@/api/batches";

const SWATCHES = CHART_PALETTE;

const PORTALS = ["admin", "teacher", "parent", "subadmin", "admission", "coordinator", "management", "student"] as const;

/** Key the floating notes widget (FloatingNotes.tsx) reads via /api/settings/public. */
const WIDGET_NOTES_KEY = "widgets.floatingNotes.enabledPortals";

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
  [WIDGET_NOTES_KEY]: { category: "Widgets", isPublic: true, fallback: JSON.stringify(PORTALS) },
};

/** Parses the JSON portal-key array stored under WIDGET_NOTES_KEY; malformed/missing → none enabled. */
function parsePortalList(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

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
  requiredModule: null,
};

/**
 * Menus, Payroll and Integrations each manage and persist their own state as you
 * edit — the header "Save Changes" button doesn't touch them. It used to appear
 * on every tab regardless, so saving a menu label (already auto-saved) and then
 * clicking the header button implied a save that had nothing to do with what
 * was just changed. Gating it to only the tabs it actually affects keeps there
 * from ever being two different, contradictory ideas of "saved" on screen.
 */
const HEADER_SAVE_TABS = new Set(["general", "branding", "notifications", "widgets"]);

/** Every tab this screen renders — used to reject an unknown ?tab= deep link. */
const SETTINGS_TABS = new Set([
  "general",
  "branding",
  "notifications",
  "widgets",
  "menus",
  "payroll",
  "integrations",
]);

export default function AdminSettings() {
  const [values, setValues] = useState<Record<string, string>>(defaultValues);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deep-linkable tabs: other screens (e.g. Teacher Payouts) can send admins straight
  // to a specific tab via /admin/settings?tab=payroll. The value is checked against the
  // real tab list — an unknown one (typo, or a link from an older build) matched no
  // TabsContent and rendered a settings page with no active tab, no panel and no Save
  // button at all, with nothing on screen explaining why.
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const requested = searchParams.get("tab");
    return requested && SETTINGS_TABS.has(requested) ? requested : "general";
  });
  function changeTab(tab: string) {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
  }

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
        description="White-label branding, domain, notification preferences, sidebar menus, teacher payout rates and integrations — stored in the database."
        actions={
          HEADER_SAVE_TABS.has(activeTab) ? (
            <Button onClick={saveAll} disabled={saving}>
              {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">This tab saves each change automatically.</p>
          )
        }
      />

      {error && <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{error}</p>}

      <Tabs value={activeTab} onValueChange={changeTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-y-1.5">
          <TabsTrigger value="general" className="gap-1.5">
            <Building2 className="h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-1.5">
            <Palette className="h-4 w-4" /> Branding
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="widgets" className="gap-1.5">
            <StickyNote className="h-4 w-4" /> Widgets
          </TabsTrigger>
          <span className="mx-1 h-6 w-px shrink-0 self-center bg-border" aria-hidden />
          <TabsTrigger value="menus" className="gap-1.5">
            <ListTree className="h-4 w-4" /> Menus
          </TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5">
            <Wallet className="h-4 w-4" /> Payroll
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5">
            <Plug className="h-4 w-4" /> Integrations
          </TabsTrigger>
        </TabsList>
        <p className="mb-4 mt-2 text-xs text-muted-foreground">
          <ShieldAlert className="mr-1 inline h-3 w-3 align-[-1px] text-warning" />
          Payroll and Integrations hold live payout rates and payment-gateway credentials — double-check before changing them.
        </p>

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
                          "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
                          "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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

        <TabsContent value="payroll">
          <PayoutRatesManager />
        </TabsContent>

        <TabsContent value="integrations" className="flex flex-col gap-6">
          <JitsiRecordingSettings />
          <IntegrationsManager />
        </TabsContent>

        <TabsContent value="widgets">
          <Card>
            <CardHeader>
              <CardTitle>Floating Notes Widget</CardTitle>
              <CardDescription>
                Choose which portals show the personal floating notes bubble. Each signed-in user's notes are private
                to them — this only controls whether the widget appears at all.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {PORTALS.map((portal, i) => {
                const enabledPortals = parsePortalList(values[WIDGET_NOTES_KEY]);
                const checked = enabledPortals.includes(portal);
                return (
                  <div key={portal}>
                    {i > 0 && <Separator className="my-1" />}
                    <div className="flex items-center justify-between gap-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{portal[0].toUpperCase() + portal.slice(1)}</p>
                      <Switch
                        checked={checked}
                        onCheckedChange={(next) => {
                          const nextList = next ? [...enabledPortals, portal] : enabledPortals.filter((p) => p !== portal);
                          setValue(WIDGET_NOTES_KEY, JSON.stringify(nextList));
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
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
  const [deleteTarget, setDeleteTarget] = useState<ApiMenuItem | null>(null);

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
        {error && <p className="mb-3 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">{error}</p>}

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
              <Label>Required module</Label>
              <Select
                value={form.requiredModule ?? "__none"}
                onValueChange={(v) =>
                  setForm({ ...form, requiredModule: v === "__none" ? null : (v as SaveMenuItemRequest["requiredModule"]) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Unassigned — visible to everyone</SelectItem>
                  {PERMISSION_MODULES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Section</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Required Module</TableHead>
                <TableHead className="text-center">Order</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const Icon = resolveMenuIcon(item.icon);
                return (
                  <TableRow key={item.id} className={cn(!item.isActive && "opacity-50")}>
                    <TableCell className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.section ?? "—"}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {item.label}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.path}</TableCell>
                    <TableCell>
                      {item.requiredModule ? (
                        <Badge variant="secondary">
                          {PERMISSION_MODULES.find((m) => m.value === item.requiredModule)?.label ?? item.requiredModule}
                        </Badge>
                      ) : (
                        <Badge variant="muted">Unassigned — everyone</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {item.sectionOrder}.{item.sortOrder}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={item.isActive} onCheckedChange={() => toggleActive(item)} disabled={busy} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEdit(item)} aria-label={`Edit ${item.label}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} disabled={busy} aria-label={`Delete ${item.label}`}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No menu items configured for this portal yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Changes take effect the next time a portal sidebar loads. The frontend falls back to its built-in navigation if a portal has no items.
        </p>
      </CardContent>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.label}"?`}
        description="This removes it from every sidebar it appears on immediately. If nothing else covers that path, it becomes unreachable from navigation until re-added."
        confirmLabel="Delete Item"
        destructive
        onConfirm={() => (deleteTarget ? remove(deleteTarget) : undefined)}
      />
    </Card>
  );
}

/** Sentinel for the centre-wide default rate card (a null TeacherProfileId in the API). */
const DEFAULT_RATE_CARD = "__default";

type RateCardRow = {
  key: string;
  label: string;
  rates: Partial<Record<30 | 45 | 60, number>>;
  penaltyPercent: number;
};

/** Groups the flat rate rows into one summary row per card (default + each teacher). */
function buildRateCardRows(allRates: ApiPayoutRate[]): RateCardRow[] {
  const map = new Map<string, RateCardRow>();
  // listPayoutRates() orders newest-EffectiveFrom-first within each teacher+duration
  // group, so the first row seen per (card, duration) here is always the live one.
  for (const rate of allRates) {
    const key = rate.teacherProfileId ?? DEFAULT_RATE_CARD;
    let row = map.get(key);
    if (!row) {
      row = { key, label: rate.teacherName, rates: {}, penaltyPercent: rate.teacherNoShowPenaltyPercent };
      map.set(key, row);
    }
    const duration = rate.durationMinutes as 30 | 45 | 60;
    if (row.rates[duration] === undefined) {
      row.rates[duration] = rate.ratePerSession;
    }
  }
  return [...map.values()].sort((a, b) => (a.key === DEFAULT_RATE_CARD ? -1 : b.key === DEFAULT_RATE_CARD ? 1 : a.label.localeCompare(b.label)));
}

/**
 * Teacher payout rate cards (WBS p.31 "tutor payout rules" / "Penalty configuration"):
 * per-session rates by class duration and the teacher no-show penalty. A card with no
 * teacher is the centre-wide default that pays anyone without their own card; a
 * teacher's own card overrides it for that teacher only.
 */
function PayoutRatesManager() {
  const [allRates, setAllRates] = useState<ApiPayoutRate[]>([]);
  const [loaded, setLoaded] = useState(!apiEnabled());
  const [error, setError] = useState<string | null>(null);

  const { data: teacherOptions } = useApiData(
    () => listTeacherOptions().then((list) => list.map((t) => ({ id: t.teacherProfileId, name: t.fullName }))),
    []
  );

  async function reload() {
    if (!apiEnabled()) return;
    try {
      setAllRates(await listPayoutRates());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payout rate cards.");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTeacherId, setDialogTeacherId] = useState<string>(DEFAULT_RATE_CARD);
  const [rates, setRates] = useState<Record<30 | 45 | 60, number>>({ 30: 900, 45: 1100, 60: 1400 });
  const [penaltyPercent, setPenaltyPercent] = useState(100);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const cardRows = useMemo(() => buildRateCardRows(allRates), [allRates]);

  function openDialog(cardKey: string) {
    setDialogTeacherId(cardKey);
    setSaved(false);
    setDialogOpen(true);
  }

  // Prefill from whatever's already loaded for this card — no extra round trip.
  useEffect(() => {
    if (!dialogOpen) return;
    const rows = allRates.filter((r) => (r.teacherProfileId ?? DEFAULT_RATE_CARD) === dialogTeacherId);
    setRates((prev) => {
      const next = { ...prev };
      for (const duration of [30, 45, 60] as const) {
        const current = rows.find((r) => r.durationMinutes === duration);
        if (current) next[duration] = current.ratePerSession;
      }
      return next;
    });
    setPenaltyPercent(rows[0]?.teacherNoShowPenaltyPercent ?? 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, dialogTeacherId]);

  async function handleSave() {
    if (!apiEnabled()) {
      setSaved(true);
      return;
    }
    setSaving(true);
    setError(null);
    const today = new Date().toISOString().slice(0, 10);
    try {
      await Promise.all(
        ([30, 45, 60] as const).map((duration) =>
          savePayoutRate({
            teacherProfileId: dialogTeacherId === DEFAULT_RATE_CARD ? undefined : dialogTeacherId,
            durationMinutes: duration,
            ratePerSession: rates[duration],
            teacherNoShowPenaltyPercent: penaltyPercent,
            effectiveFrom: today,
          })
        )
      );
      setSaved(true);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the rate card.");
    } finally {
      setSaving(false);
    }
  }

  if (!apiEnabled()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teacher Payout Rates</CardTitle>
          <CardDescription>
            Rate cards are maintained in the database. Connect the API (VITE_API_BASE_URL) to manage them; demo mode has no payout data.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Teacher Payout Rates</CardTitle>
          <CardDescription>
            Per-session rates by class duration, plus the teacher no-show penalty. The default card pays any teacher
            without rates of their own; a teacher's own card overrides it just for them.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => openDialog(DEFAULT_RATE_CARD)}>
          <Plus className="h-3.5 w-3.5" /> Add Rate Card
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">{error}</p>}

        {!loaded ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : cardRows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No rate cards configured yet"
            description="Set up the default rate card first — it pays every teacher until they have a card of their own."
            action={
              <Button size="sm" onClick={() => openDialog(DEFAULT_RATE_CARD)}>
                <Plus className="h-3.5 w-3.5" /> Configure Default Rate Card
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col">
            {cardRows.map((row, i) => (
              <div key={row.key}>
                {i > 0 && <Separator className="my-1" />}
                <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {row.key === DEFAULT_RATE_CARD ? "All teachers (default)" : row.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      30-min {formatCurrency(row.rates[30] ?? 0)} · 45-min {formatCurrency(row.rates[45] ?? 0)} · 60-min{" "}
                      {formatCurrency(row.rates[60] ?? 0)} · No-show penalty {row.penaltyPercent}%
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openDialog(row.key)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          {dialogOpen && (
            <>
              <DialogHeader>
                <DialogTitle>Configure Rate Card</DialogTitle>
                <DialogDescription>Set per-session payout rates by class duration and the no-show penalty.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label>Applies to</Label>
                  <Select value={dialogTeacherId} onValueChange={setDialogTeacherId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT_RATE_CARD}>All teachers (default rate card)</SelectItem>
                      {teacherOptions.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {([30, 45, 60] as const).map((duration) => (
                  <div key={duration} className="grid gap-1.5">
                    <Label htmlFor={`payroll-rate-${duration}`}>{duration}-minute session rate (₹)</Label>
                    <Input
                      id={`payroll-rate-${duration}`}
                      type="number"
                      value={rates[duration]}
                      onChange={(e) => setRates((prev) => ({ ...prev, [duration]: Number(e.target.value) }))}
                    />
                  </div>
                ))}
                <div className="grid gap-1.5">
                  <Label htmlFor="payroll-noshow-penalty">No-show penalty (% of session rate)</Label>
                  <Input
                    id="payroll-noshow-penalty"
                    type="number"
                    min={0}
                    max={300}
                    value={penaltyPercent}
                    onChange={(e) => setPenaltyPercent(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deducted when a session is marked teacher no-show: 100 deducts the full session rate, 0 disables the deduction.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saved ? <CheckCircle2 className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
                  {saving ? "Saving…" : saved ? "Saved!" : "Save Rate Card"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
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

/**
 * Credentials each payment gateway's adapter requires to run live (see
 * RazorpayGateway/CashfreeGateway.IsConfigured). Aliases mirror the field names
 * the adapters also accept, so an existing "razorpayKey" row counts as keyId.
 */
const GATEWAY_REQUIRED_FIELDS: Record<string, { field: string; label: string; aliases: string[] }[]> = {
  razorpay: [
    { field: "keyId", label: "Key Id", aliases: ["keyid", "razorpaykey", "apikey"] },
    { field: "keySecret", label: "Key Secret", aliases: ["razorpaysecret", "secret", "apisecret"] },
  ],
  cashfree: [
    { field: "appId", label: "App Id", aliases: [] },
    { field: "secretKey", label: "Secret Key", aliases: [] },
  ],
};

function requiredFieldsFor(integrationKey: string) {
  return GATEWAY_REQUIRED_FIELDS[integrationKey.trim().toLowerCase()] ?? [];
}

function rowSatisfies(row: ConfigRow, spec: { field: string; aliases: string[] }): boolean {
  const key = row.key.trim().toLowerCase();
  return key === spec.field.toLowerCase() || spec.aliases.includes(key);
}

/** Pre-adds empty rows for a gateway's required credentials so they can't be missed. */
function withRequiredRows(integrationKey: string, rows: ConfigRow[]): ConfigRow[] {
  const missing = requiredFieldsFor(integrationKey).filter((spec) => !rows.some((row) => rowSatisfies(row, spec)));
  if (missing.length === 0) return rows;
  const base = rows.length === 1 && rows[0].key === "" && rows[0].value === "" ? [] : rows;
  return [...base, ...missing.map((spec) => ({ key: spec.field, value: "" }))];
}

/** Required credentials that are absent or blank — the gateway can't go live without them. */
function missingRequiredFields(integrationKey: string, rows: ConfigRow[]): string[] {
  return requiredFieldsFor(integrationKey)
    .filter((spec) => !rows.some((row) => rowSatisfies(row, spec) && row.value.trim().length > 0))
    .map((spec) => `${spec.label} (${spec.field})`);
}

/**
 * Razorpay Key IDs always start with "rzp_test_"/"rzp_live_"; anything else in the
 * keyId field (most commonly the secret pasted twice) guarantees a 401 at payment time.
 */
function configFormatWarning(integrationKey: string, rows: ConfigRow[]): string | null {
  if (integrationKey.trim().toLowerCase() !== "razorpay") return null;
  const keyIdSpec = GATEWAY_REQUIRED_FIELDS.razorpay[0];
  const keyIdRow = rows.find((row) => rowSatisfies(row, keyIdSpec) && row.value.trim().length > 0);
  if (keyIdRow && !keyIdRow.value.trim().startsWith("rzp_")) {
    return `The value in "${keyIdRow.key.trim()}" doesn't look like a Razorpay Key Id — it should start with rzp_test_ or rzp_live_. If you pasted the Key Secret there, payments will fail with a 401.`;
  }
  return null;
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

const EMPTY_JITSI_FORM = { domain: "", appId: "", appSecret: "", autoRecord: true };

/**
 * Purpose-built form for the one integration every class actually depends on, instead of
 * making an admin edit "domain"/"appId"/"appSecret"/"autoRecord" as raw key-value rows in
 * the generic editor below. Reads/writes the exact same `Integration` row (key="jitsi") via
 * the same create/update API — this is a friendlier front end for that data, not a separate
 * config store. autoRecord is stored as the string "true"/"false" because Integration.config
 * is Dictionary<string,string> end to end (see JITSI_ARCHITECTURE.md / SessionService.ReadAutoRecordEnabled).
 */
function JitsiRecordingSettings() {
  const [integration, setIntegration] = useState<ApiIntegration | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(EMPTY_JITSI_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [revealSecret, setRevealSecret] = useState(false);

  async function reload() {
    if (!apiEnabled()) return;
    try {
      const all = await listIntegrations();
      const jitsi = all.find((i) => i.key.trim().toLowerCase() === "jitsi") ?? null;
      setIntegration(jitsi);
      setForm({
        domain: jitsi?.config.domain ?? "",
        appId: jitsi?.config.appId ?? "",
        appSecret: jitsi?.config.appSecret ?? "",
        autoRecord: jitsi ? (jitsi.config.autoRecord ?? "true") !== "false" : true,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Jitsi settings.");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const request: SaveIntegrationRequest = {
        key: "jitsi",
        name: integration?.name ?? "Jitsi Meet",
        category: "VideoConferencing",
        description: integration?.description ?? "Self-hosted Jitsi Meet for live classes and recordings.",
        isEnabled: integration?.isEnabled ?? true,
        config: {
          domain: form.domain.trim(),
          appId: form.appId.trim(),
          appSecret: form.appSecret,
          autoRecord: form.autoRecord ? "true" : "false",
        },
      };
      if (integration) await updateIntegration(integration.id, request);
      else await createIntegration(request);
      await reload();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save Jitsi settings.");
    } finally {
      setBusy(false);
    }
  }

  if (!apiEnabled()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jitsi Meet &amp; Recording</CardTitle>
          <CardDescription>Connect the API (VITE_API_BASE_URL) to manage the live classroom domain and auto-record.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" /> Jitsi Meet &amp; Recording
        </CardTitle>
        <CardDescription>
          The self-hosted Jitsi deployment every live class and recording runs through — one place for the domain and
          the auto-record toggle, instead of raw config rows.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">{error}</p>}
        {saved && !error && <p className="rounded-lg bg-success/10 px-3 py-2 text-xs font-medium text-success">Saved.</p>}

        {!loaded ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Domain</Label>
              <Input
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                placeholder="e.g. thereadernest.co.in"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Bare host only, no https:// — this is where JitsiLive embeds the classroom and where Jibri (recording)
                is deployed.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>App Id</Label>
              <Input
                value={form.appId}
                onChange={(e) => setForm({ ...form, appId: e.target.value })}
                placeholder="Optional — only for JWT-secured rooms"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>App Secret</Label>
              <div className="relative">
                <Input
                  type={revealSecret ? "text" : "password"}
                  value={form.appSecret}
                  onChange={(e) => setForm({ ...form, appSecret: e.target.value })}
                  placeholder="Optional — only for JWT-secured rooms"
                  autoComplete="off"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setRevealSecret((r) => !r)}
                  className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={revealSecret ? "Hide value" : "Show value"}
                >
                  {revealSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3 sm:col-span-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Auto-record every class</p>
                <p className="text-xs text-muted-foreground">
                  On: recording starts automatically when the teacher joins. Off: teachers use the manual "Recording"
                  button on My Classes instead.
                </p>
              </div>
              <Switch checked={form.autoRecord} onCheckedChange={(autoRecord) => setForm({ ...form, autoRecord })} />
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={busy || !loaded || !form.domain.trim()}>
            <Save className="h-3.5 w-3.5" /> Save Jitsi Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

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
  const [deleteTarget, setDeleteTarget] = useState<ApiIntegration | null>(null);

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
    setConfigRows(withRequiredRows(integration.key, configToRows(integration.config)));
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
        {error && <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">{error}</p>}

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
              {missingRequiredFields(form.key, configRows).length > 0 && (
                <p className="mt-1.5 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-medium text-warning-foreground">
                  {form.name || form.key} can't process live payments yet — missing:{" "}
                  {missingRequiredFields(form.key, configRows).join(", ")}. Parents who pick this gateway will see a
                  "not fully configured" message until these are filled in.
                </p>
              )}
              {configFormatWarning(form.key, configRows) && (
                <p className="mt-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                  {configFormatWarning(form.key, configRows)}
                </p>
              )}
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
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(integration)} disabled={busy}>
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
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description={
          deleteTarget?.isEnabled
            ? "This integration is currently enabled — anything using it (payments, notifications, meeting links) stops working immediately. This can't be undone."
            : "This can't be undone."
        }
        confirmLabel="Delete Integration"
        destructive
        onConfirm={() => (deleteTarget ? remove(deleteTarget) : undefined)}
      />
    </Card>
  );
}
