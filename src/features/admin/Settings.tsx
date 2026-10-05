import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, Building2, CalendarOff, CheckCircle2, CreditCard, Eye, EyeOff, Globe2, ListTree, Loader2, Mail, MessageCircle, Palette, Pencil, Plug, Plus, Puzzle, Save, Settings2, ShieldAlert, StickyNote, Trash2, type LucideIcon, Video, Wallet, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { cn, formatCurrency, hexToHslTriple, isValidEmail } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled, userMessage } from "@/lib/api";
import { getStorageStatus, startStorageSync, type ApiStorageStatus } from "@/api/storage";
import { useSession } from "@/state/session";
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
import { DEMO_PERMISSION_MODULES } from "@/api/permissions";
import { listPermissionModules } from "@/api/permissionModules";
import {
  createIntegration,
  deleteIntegration,
  listIntegrations,
  sendTestEmail,
  updateIntegration,
  type ApiIntegration,
  type IntegrationCategory as IntegrationCategoryName,
  type SaveIntegrationRequest,
} from "@/api/integrations";
import { listPayoutRates, savePayoutRate, type ApiPayoutRate } from "@/api/payouts";
import { listLeaveAllowances, saveLeaveAllowance, type ApiLeaveAllowance } from "@/api/academicOps";
import { listTeacherOptions } from "@/api/batches";

const SWATCHES = CHART_PALETTE;

const PORTALS = ["admin", "teacher", "parent", "subadmin", "admission", "coordinator", "management", "student"] as const;

/** Key the floating notes widget (FloatingNotes.tsx) reads via /api/settings/public. */
const WIDGET_NOTES_KEY = "widgets.floatingNotes.enabledPortals";

/** Key the "Ask a Doubt" chatbot widget (DoubtChatbot.tsx) reads via /api/settings/public. */
const WIDGET_CHATBOT_KEY = "widgets.doubtChatbot.enabledPortals";

/** Every DB-backed setting the screen edits, with its category and visibility. */
const SETTING_META: Record<string, { category: SettingCategory; isPublic?: boolean; fallback: string }> = {
  "org.name": { category: "General", isPublic: true, fallback: "The Reader Nest" },
  "org.domain": { category: "General", fallback: "app.thereadernest.com" },
  "org.supportEmail": { category: "General", fallback: "support@thereadernest.com" },
  "org.supportPhone": { category: "General", fallback: "+91 98200 00000" },
  "org.timezone": { category: "General", fallback: "Asia/Kolkata (GMT +5:30)" },
  // Printed on every generated invoice PDF (Admin Billing → Download PDF) — these were
  // fixed constants in the PDF generator until now; editing them here changes every
  // invoice generated from here on, with no code change or redeploy needed. No fallback
  // value here: this is real org-specific bank/GST/signatory data, which must live only
  // in the database (set once via this screen), never hardcoded in source.
  "invoice.accountNumber": { category: "General", fallback: "" },
  "invoice.ifscCode": { category: "General", fallback: "" },
  "invoice.branchName": { category: "General", fallback: "" },
  "invoice.gstNumber": { category: "General", fallback: "" },
  "invoice.accountName": { category: "General", fallback: "" },
  "invoice.contactEmail": { category: "General", fallback: "" },
  "invoice.signatoryName": { category: "General", fallback: "" },
  "invoice.signatoryTitle": { category: "General", fallback: "" },
  "brand.name": { category: "Branding", isPublic: true, fallback: "The Reader Nest" },
  "brand.logoUrl": { category: "Branding", isPublic: true, fallback: "" },
  "brand.primaryColor": { category: "Branding", isPublic: true, fallback: "#1F6FE0" },
  "brand.accentColor": { category: "Branding", isPublic: true, fallback: "#57B33B" },
  // No-show grace for the teacher payout pipeline -- was a fixed constant in
  // NoShowDetectionBackgroundService until now.
  "payroll.noShowGraceMinutes": { category: "General", fallback: "20" },
  "notify.feeReminders": { category: "Notifications", fallback: "true" },
  "billing.reminderDaysBeforeDue": { category: "Notifications", fallback: "3" },
  "billing.suspensionGraceDays": { category: "Notifications", fallback: "0" },
  // Admission & class policies. Public because the anonymous /pay page and the parent portal read
  // them (see lib/policies.ts); the API enforces the cancellation cut-off regardless.
  "admission.termsUrl": { category: "Notifications", isPublic: true, fallback: "" },
  "admission.termsText": { category: "Notifications", isPublic: true, fallback: "" },
  "parent.cancelCutoffMinutes": { category: "Notifications", isPublic: true, fallback: "60" },
  "notify.leaveRequests": { category: "Notifications", fallback: "true" },
  "notify.lowAttendance": { category: "Notifications", fallback: "false" },
  "notify.weeklyDigest": { category: "Notifications", fallback: "true" },
  [WIDGET_NOTES_KEY]: { category: "Widgets", isPublic: true, fallback: JSON.stringify(PORTALS) },
  [WIDGET_CHATBOT_KEY]: { category: "Widgets", isPublic: true, fallback: JSON.stringify(PORTALS) },
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
  "leave",
  "integrations",
]);

export default function AdminSettings() {
  const { toast } = useToast();
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
        const message = userMessage(err, "Could not save settings.");
        setError(message);
        setSaving(false);
        toast({ variant: "error", title: "Couldn't save settings", description: message });
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
    toast({ variant: "success", title: "Settings saved", description: "Your changes are live." });
  }

  const brandColor = values["brand.primaryColor"];
  const accentColor = values["brand.accentColor"];

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Settings & Branding"
        description="White-label branding, domain, notification preferences, sidebar menus, teacher payout rates, leave policy and integrations — stored in the database."
        actions={
          HEADER_SAVE_TABS.has(activeTab) ? (
            <Button onClick={saveAll} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">This tab saves each change automatically.</p>
          )
        }
      />

      {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}

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
          <TabsTrigger value="leave" className="gap-1.5">
            <CalendarOff className="h-4 w-4" /> Leave Policy
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5">
            <Plug className="h-4 w-4" /> Integrations
          </TabsTrigger>
        </TabsList>
        <p className="mb-4 mt-2 text-xs text-muted-foreground">
          <ShieldAlert className="mr-1 inline h-3 w-3 align-[-1px] text-warning-foreground" />
          Payroll and Integrations hold live payout rates and payment-gateway credentials — double-check before changing them. Leave Policy sets how many classes a teacher may self-cancel each month.
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

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>Bank, GST and signatory details printed on every generated invoice PDF.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="invoice-account-number">Account number</Label>
                <Input
                  id="invoice-account-number"
                  value={values["invoice.accountNumber"]}
                  onChange={(e) => setValue("invoice.accountNumber", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="invoice-ifsc">IFSC code</Label>
                <Input id="invoice-ifsc" value={values["invoice.ifscCode"]} onChange={(e) => setValue("invoice.ifscCode", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="invoice-branch">Branch name</Label>
                <Input
                  id="invoice-branch"
                  value={values["invoice.branchName"]}
                  onChange={(e) => setValue("invoice.branchName", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="invoice-gst">GST number</Label>
                <Input id="invoice-gst" value={values["invoice.gstNumber"]} onChange={(e) => setValue("invoice.gstNumber", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="invoice-account-name">Account name</Label>
                <Input
                  id="invoice-account-name"
                  value={values["invoice.accountName"]}
                  onChange={(e) => setValue("invoice.accountName", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="invoice-contact-email">Contact email (shown on invoice)</Label>
                <Input
                  id="invoice-contact-email"
                  value={values["invoice.contactEmail"]}
                  onChange={(e) => setValue("invoice.contactEmail", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="invoice-signatory-name">Signatory name</Label>
                <Input
                  id="invoice-signatory-name"
                  value={values["invoice.signatoryName"]}
                  onChange={(e) => setValue("invoice.signatoryName", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="invoice-signatory-title">Signatory title</Label>
                <Input
                  id="invoice-signatory-title"
                  value={values["invoice.signatoryTitle"]}
                  onChange={(e) => setValue("invoice.signatoryTitle", e.target.value)}
                />
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
                  <img src={values["brand.logoUrl"] || "/logo-icon.png"} alt="Brand logo" className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Logo preview</p>
                  <p className="text-xs text-muted-foreground">PNG or SVG, minimum 256×256px, transparent background recommended.</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="brand-primary-color">Primary brand color</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="brand-primary-color"
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
                  <Label htmlFor="brand-accent-color">Accent color</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="brand-accent-color"
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

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Fee Collection Timing</CardTitle>
              <CardDescription>
                These used to be fixed in code. Controls when a payment reminder goes out and how
                long an account can stay overdue before access is automatically suspended.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="billing-reminder-days">Payment reminder lead time (days)</Label>
                <Input
                  id="billing-reminder-days"
                  type="number"
                  min={0}
                  value={values["billing.reminderDaysBeforeDue"]}
                  onChange={(e) => setValue("billing.reminderDaysBeforeDue", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  A reminder email goes out once an invoice is within this many days of its due date (and daily while overdue).
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="billing-suspension-grace">Suspension grace period (days)</Label>
                <Input
                  id="billing-suspension-grace"
                  type="number"
                  min={0}
                  value={values["billing.suspensionGraceDays"]}
                  onChange={(e) => setValue("billing.suspensionGraceDays", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  How many days an invoice can stay overdue before the parent's account is automatically suspended. 0 = suspend as soon as it's overdue.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Admission &amp; Class Policies</CardTitle>
              <CardDescription>
                The Terms &amp; Conditions parents must accept before every payment, and how close to a class parents can still
                cancel it online.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="admission-terms-url">Terms &amp; Conditions link</Label>
                <Input
                  id="admission-terms-url"
                  type="url"
                  placeholder="https://…"
                  value={values["admission.termsUrl"]}
                  onChange={(e) => setValue("admission.termsUrl", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Shown as a link next to the "I accept" checkbox on every payment screen.</p>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="admission-terms-text">Terms &amp; Conditions text (optional)</Label>
                <Textarea
                  id="admission-terms-text"
                  rows={5}
                  maxLength={2000}
                  value={values["admission.termsText"]}
                  onChange={(e) => setValue("admission.termsText", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Optional short summary shown on the payment screen (up to 2000 characters). The full Terms &amp; Conditions are always linked from the payment screen at /terms.
                </p>
              </div>
              <div className="grid gap-1.5 sm:max-w-xs">
                <Label htmlFor="parent-cancel-cutoff">Class cancellation cut-off (minutes before class)</Label>
                <Input
                  id="parent-cancel-cutoff"
                  type="number"
                  min={0}
                  value={values["parent.cancelCutoffMinutes"]}
                  onChange={(e) => setValue("parent.cancelCutoffMinutes", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Parents can cancel or apply for leave until this many minutes before the class starts (60 = a 4:00 PM class can be
                  cancelled until 3:00 PM). After that the option is disabled.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menus">
          <MenuManager />
        </TabsContent>

        <TabsContent value="payroll" className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance &amp; No-Show Thresholds</CardTitle>
              <CardDescription>
                Any class that runs shorter than its scheduled duration is sent to Payout Approvals for an
                Admin / Management decision before its payout can be finalized.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="payroll-noshow-grace">No-show detection grace period (minutes)</Label>
                <Input
                  id="payroll-noshow-grace"
                  type="number"
                  min={1}
                  value={values["payroll.noShowGraceMinutes"]}
                  onChange={(e) => setValue("payroll.noShowGraceMinutes", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  How long after a session's scheduled start with nobody joined before it's auto-marked a no-show.
                </p>
              </div>
            </CardContent>
          </Card>
          <PayoutRatesManager />
        </TabsContent>

        <TabsContent value="leave" className="flex flex-col gap-6">
          <LeaveAllowanceManager />
        </TabsContent>

        <TabsContent value="integrations" className="flex flex-col gap-6">
          <JitsiRecordingSettings />
          <EmailDeliveryCheck />
          <StorageSyncCard />
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

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Ask a Doubt Chatbot Widget</CardTitle>
              <CardDescription>
                Choose which portals show the "Ask a Doubt" chatbot bubble. It answers common questions from the FAQ
                knowledge base (managed under Insights → Doubt Chatbot) and forwards anything it can't answer to a
                teacher — this only controls whether the widget appears at all.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {PORTALS.map((portal, i) => {
                const enabledPortals = parsePortalList(values[WIDGET_CHATBOT_KEY]);
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
                          setValue(WIDGET_CHATBOT_KEY, JSON.stringify(nextList));
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
  const { toast } = useToast();
  const [portal, setPortal] = useState<string>("admin");
  const [items, setItems] = useState<ApiMenuItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SaveMenuItemRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiMenuItem | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const iconNames = useMemo(() => Object.keys(MENU_ICONS).sort(), []);
  // The real, current module catalog (built-in + any Admin-defined custom ones) — a menu
  // item's gate isn't limited to the 12 built-ins any more.
  const { data: modules } = useApiData(
    () => listPermissionModules().then((list) => list.map((m) => ({ value: m.key, label: m.label }))),
    [...DEMO_PERMISSION_MODULES]
  );

  // Same reasoning as IntegrationsManager: the form renders above the (possibly long,
  // multi-section) item list, so editing an item further down opens a form the user
  // can't see without manually scrolling back up themselves.
  useEffect(() => {
    if (form) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [form]);

  async function reload(nextPortal = portal) {
    if (!apiEnabled()) return;
    try {
      setItems(await listMenuItems(nextPortal));
      setError(null);
    } catch (err) {
      setError(userMessage(err, "Could not load menu items."));
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
      toast({ variant: "success", title: editingId ? "Menu item updated" : "Menu item created" });
    } catch (err) {
      const message = userMessage(err, "Could not save the menu item.");
      setError(message);
      toast({ variant: "error", title: "Couldn't save menu item", description: message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: ApiMenuItem) {
    setBusy(true);
    try {
      await deleteMenuItem(item.id);
      await reload();
      toast({ variant: "success", title: `"${item.label}" removed` });
    } catch (err) {
      const message = userMessage(err, "Could not delete the menu item.");
      setError(message);
      toast({ variant: "error", title: "Couldn't delete menu item", description: message });
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
      setError(userMessage(err, "Could not update the menu item."));
    } finally {
      setBusy(false);
    }
  }

  if (!apiEnabled()) {
    return (
      <EmptyState
        icon={ListTree}
        title="Demo mode"
        description="Menus are maintained in the database. Connect the API (VITE_API_BASE_URL) to manage them; demo mode uses the built-in navigation."
      />
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
        {error && <InlineAlert variant="warning" className="mb-3">{error}</InlineAlert>}

        {form && (
          <div ref={formRef} className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4 scroll-mt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="menu-item-label">Label</Label>
              <Input id="menu-item-label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Courses" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="menu-item-path">Path</Label>
              <Input id="menu-item-path" value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} placeholder={`/${portal}/…`} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="menu-item-section">Section</Label>
              <Input
                id="menu-item-section"
                value={form.section ?? ""}
                onChange={(e) => setForm({ ...form, section: e.target.value || null })}
                placeholder="Empty = top block"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="menu-required-module-select">Required module</Label>
              <Select
                value={form.requiredModule ?? "__none"}
                onValueChange={(v) =>
                  setForm({ ...form, requiredModule: v === "__none" ? null : (v as SaveMenuItemRequest["requiredModule"]) })
                }
              >
                <SelectTrigger id="menu-required-module-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Unassigned — visible to everyone</SelectItem>
                  {modules.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="menu-icon-select">Icon</Label>
              <Select value={form.icon} onValueChange={(icon) => setForm({ ...form, icon })}>
                <SelectTrigger id="menu-icon-select">
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
              <Label htmlFor="menu-item-section-order">Section order</Label>
              <Input
                id="menu-item-section-order"
                type="number"
                value={form.sectionOrder}
                onChange={(e) => setForm({ ...form, sectionOrder: Number(e.target.value) })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="menu-item-sort-order">Item order</Label>
              <Input id="menu-item-sort-order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
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
                          {modules.find((m) => m.value === item.requiredModule)?.label ?? item.requiredModule}
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
  ratePerMinute: number;
  penaltyPercent: number;
};

/** One summary row per card (default + each teacher) -- priced per minute of a session's own scheduled duration. */
function buildRateCardRows(allRates: ApiPayoutRate[]): RateCardRow[] {
  const map = new Map<string, RateCardRow>();
  // listPayoutRates() orders newest-EffectiveFrom-first within each teacher group, so
  // the first row seen per card here is always the live one.
  for (const rate of allRates) {
    const key = rate.teacherProfileId ?? DEFAULT_RATE_CARD;
    if (!map.has(key)) {
      map.set(key, { key, label: rate.teacherName, ratePerMinute: rate.ratePerMinute, penaltyPercent: rate.teacherNoShowPenaltyPercent });
    }
  }
  return [...map.values()].sort((a, b) => (a.key === DEFAULT_RATE_CARD ? -1 : b.key === DEFAULT_RATE_CARD ? 1 : a.label.localeCompare(b.label)));
}

/**
 * Teacher payout rate cards (WBS p.31 "tutor payout rules" / "Penalty configuration"):
 * one per-minute rate (applied to a session's own scheduled duration) plus the teacher
 * no-show penalty. A card with no teacher is the centre-wide default that pays anyone
 * without their own card; a teacher's own card overrides it for that teacher only.
 */
function PayoutRatesManager() {
  const { toast } = useToast();
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
      setError(userMessage(err, "Could not load payout rate cards."));
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTeacherId, setDialogTeacherId] = useState<string>(DEFAULT_RATE_CARD);
  const [ratePerMinute, setRatePerMinute] = useState("0");
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
    const existing = cardRows.find((r) => r.key === dialogTeacherId);
    setRatePerMinute(existing ? String(existing.ratePerMinute) : "0");
    setPenaltyPercent(existing ? existing.penaltyPercent : 100);
  }, [dialogOpen, dialogTeacherId, cardRows]);

  const rateError =
    !Number.isFinite(Number(ratePerMinute)) || Number(ratePerMinute) < 0
      ? "Rate must be zero or a positive amount."
      : null;

  async function handleSave() {
    if (!apiEnabled()) {
      setSaved(true);
      return;
    }
    if (rateError) return;
    setSaving(true);
    setError(null);
    const today = new Date().toISOString().slice(0, 10);
    try {
      await savePayoutRate({
        teacherProfileId: dialogTeacherId === DEFAULT_RATE_CARD ? undefined : dialogTeacherId,
        ratePerMinute: Number(ratePerMinute) || 0,
        teacherNoShowPenaltyPercent: penaltyPercent,
        effectiveFrom: today,
      });
      setSaved(true);
      await reload();
      toast({ variant: "success", title: "Rate card saved" });
    } catch (err) {
      const message = userMessage(err, "Could not save the rate card.");
      setError(message);
      toast({ variant: "error", title: "Couldn't save the rate card", description: message });
    } finally {
      setSaving(false);
    }
  }

  if (!apiEnabled()) {
    return (
      <EmptyState
        icon={Wallet}
        title="Demo mode"
        description="Rate cards are maintained in the database. Connect the API (VITE_API_BASE_URL) to manage them; demo mode has no payout data."
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Teacher Payout Rates</CardTitle>
          <CardDescription>
            A rate per minute, applied to each session's own scheduled duration, plus the teacher no-show penalty.
            The default card pays any teacher without a rate of their own; a teacher's own card overrides it just
            for them.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => openDialog(DEFAULT_RATE_CARD)}>
          <Plus className="h-3.5 w-3.5" /> Add Rate Card
        </Button>
      </CardHeader>
      <CardContent>
        {error && <InlineAlert variant="warning" className="mb-3">{error}</InlineAlert>}

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
                      {formatCurrency(row.ratePerMinute)} per minute · No-show penalty {row.penaltyPercent}%
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
                <DialogDescription>Set the per-minute payout rate and the no-show penalty.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="rate-card-applies-to-select">Applies to</Label>
                  <Select value={dialogTeacherId} onValueChange={setDialogTeacherId}>
                    <SelectTrigger id="rate-card-applies-to-select">
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
                <div className="grid gap-1.5">
                  <Label htmlFor="rate-per-minute">Rate per minute (₹)</Label>
                  <Input
                    id="rate-per-minute"
                    type="number"
                    min={0}
                    value={ratePerMinute}
                    onChange={(e) => setRatePerMinute(e.target.value)}
                  />
                  {rateError && (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {rateError}
                    </p>
                  )}
                </div>
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
                <Button onClick={handleSave} disabled={saving || !!rateError}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
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

/** Sentinel for the centre-wide default allowance card (a null TeacherProfileId in the API) —
 *  same convention as PayoutRatesManager's DEFAULT_RATE_CARD above. */
const DEFAULT_ALLOWANCE_CARD = "__default";

type AllowanceCardRow = {
  key: string;
  label: string;
  monthlyAllowance: number;
};

function buildAllowanceCardRows(allowances: ApiLeaveAllowance[]): AllowanceCardRow[] {
  return allowances
    .map((a) => ({ key: a.teacherProfileId ?? DEFAULT_ALLOWANCE_CARD, label: a.teacherName, monthlyAllowance: a.monthlyAllowance }))
    .sort((a, b) => (a.key === DEFAULT_ALLOWANCE_CARD ? -1 : b.key === DEFAULT_ALLOWANCE_CARD ? 1 : a.label.localeCompare(b.label)));
}

/**
 * Class-wise-cancellation monthly allowance (WBS Round 2 feedback #23: "teachers have a
 * certain number of session cancellations allowed based on their total monthly sessions" —
 * client chose admin-configurable per teacher/role over a fixed formula). Same
 * default-plus-per-teacher-override shape as PayoutRatesManager above: a card with no
 * teacher is the centre-wide default that applies to anyone without their own card.
 */
function LeaveAllowanceManager() {
  const { toast } = useToast();
  const [allAllowances, setAllAllowances] = useState<ApiLeaveAllowance[]>([]);
  const [loaded, setLoaded] = useState(!apiEnabled());
  const [error, setError] = useState<string | null>(null);

  const { data: teacherOptions } = useApiData(
    () => listTeacherOptions().then((list) => list.map((t) => ({ id: t.teacherProfileId, name: t.fullName }))),
    []
  );

  async function reload() {
    if (!apiEnabled()) return;
    try {
      setAllAllowances(await listLeaveAllowances());
      setError(null);
    } catch (err) {
      setError(userMessage(err, "Could not load leave allowances."));
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTeacherId, setDialogTeacherId] = useState<string>(DEFAULT_ALLOWANCE_CARD);
  const [monthlyAllowance, setMonthlyAllowance] = useState("0");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const cardRows = useMemo(() => buildAllowanceCardRows(allAllowances), [allAllowances]);

  function openDialog(cardKey: string) {
    setDialogTeacherId(cardKey);
    setSaved(false);
    setDialogOpen(true);
  }

  useEffect(() => {
    if (!dialogOpen) return;
    const existing = cardRows.find((r) => r.key === dialogTeacherId);
    setMonthlyAllowance(existing ? String(existing.monthlyAllowance) : "0");
  }, [dialogOpen, dialogTeacherId, cardRows]);

  const allowanceError =
    !Number.isFinite(Number(monthlyAllowance)) || Number(monthlyAllowance) < 0
      ? "Allowance must be zero or a positive whole number."
      : null;

  async function handleSave() {
    if (!apiEnabled()) {
      setSaved(true);
      return;
    }
    if (allowanceError) return;
    setSaving(true);
    setError(null);
    try {
      await saveLeaveAllowance({
        teacherProfileId: dialogTeacherId === DEFAULT_ALLOWANCE_CARD ? undefined : dialogTeacherId,
        monthlyAllowance: Math.round(Number(monthlyAllowance)),
      });
      setSaved(true);
      await reload();
      toast({ variant: "success", title: "Leave allowance saved" });
    } catch (err) {
      const message = userMessage(err, "Could not save the leave allowance.");
      setError(message);
      toast({ variant: "error", title: "Couldn't save the leave allowance", description: message });
    } finally {
      setSaving(false);
    }
  }

  if (!apiEnabled()) {
    return (
      <EmptyState
        icon={CalendarOff}
        title="Demo mode"
        description="Leave allowances are maintained in the database. Connect the API (VITE_API_BASE_URL) to manage them; demo mode has no leave-allowance data."
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Class-Wise Cancellation Allowance</CardTitle>
          <CardDescription>
            How many individual classes a teacher may self-cancel per calendar month without a full leave review —
            within this limit, picking specific classes to cancel is approved instantly. The default card covers any
            teacher without an allowance of their own; a teacher's own card overrides it just for them.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => openDialog(DEFAULT_ALLOWANCE_CARD)}>
          <Plus className="h-3.5 w-3.5" /> Add Allowance
        </Button>
      </CardHeader>
      <CardContent>
        {error && <InlineAlert variant="warning" className="mb-3">{error}</InlineAlert>}

        {!loaded ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : cardRows.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title="No allowances configured yet"
            description="Set up the default allowance first — it applies to every teacher until they have one of their own. Until then, every class-wise request needs admin review."
            action={
              <Button size="sm" onClick={() => openDialog(DEFAULT_ALLOWANCE_CARD)}>
                <Plus className="h-3.5 w-3.5" /> Configure Default Allowance
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
                      {row.key === DEFAULT_ALLOWANCE_CARD ? "All teachers (default)" : row.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.monthlyAllowance} class{row.monthlyAllowance === 1 ? "" : "es"} per month
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
                <DialogTitle>Configure Cancellation Allowance</DialogTitle>
                <DialogDescription>Set how many classes may be self-cancelled per calendar month.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="allowance-applies-to-select">Applies to</Label>
                  <Select value={dialogTeacherId} onValueChange={setDialogTeacherId}>
                    <SelectTrigger id="allowance-applies-to-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT_ALLOWANCE_CARD}>All teachers (default allowance)</SelectItem>
                      {teacherOptions.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="monthly-allowance">Classes per month</Label>
                  <Input
                    id="monthly-allowance"
                    type="number"
                    min={0}
                    step={1}
                    value={monthlyAllowance}
                    onChange={(e) => setMonthlyAllowance(e.target.value)}
                  />
                  {allowanceError && (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {allowanceError}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || !!allowanceError}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
                  {saving ? "Saving…" : saved ? "Saved!" : "Save Allowance"}
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

const EMPTY_JITSI_FORM = { domain: "", appId: "", appSecret: "", autoRecord: true, defaultLobby: true };

/**
 * Purpose-built form for the one integration every class actually depends on, instead of
 * making an admin edit "domain"/"appId"/"appSecret"/"autoRecord" as raw key-value rows in
 * the generic editor below. Reads/writes the exact same `Integration` row (key="jitsi") via
 * the same create/update API — this is a friendlier front end for that data, not a separate
 * config store. autoRecord is stored as the string "true"/"false" because Integration.config
 * is Dictionary<string,string> end to end (see JITSI_ARCHITECTURE.md / SessionService.ReadAutoRecordEnabled).
 */
function JitsiRecordingSettings() {
  const { toast } = useToast();
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
        defaultLobby: jitsi ? (jitsi.config.defaultLobby ?? "true") !== "false" : true,
      });
      setError(null);
    } catch (err) {
      setError(userMessage(err, "Could not load Jitsi settings."));
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
          defaultLobby: form.defaultLobby ? "true" : "false",
        },
      };
      if (integration) await updateIntegration(integration.id, request);
      else await createIntegration(request);
      await reload();
      setSaved(true);
      toast({ variant: "success", title: "Jitsi settings saved" });
    } catch (err) {
      const message = userMessage(err, "Could not save Jitsi settings.");
      setError(message);
      toast({ variant: "error", title: "Couldn't save Jitsi settings", description: message });
    } finally {
      setBusy(false);
    }
  }

  if (!apiEnabled()) {
    return (
      <EmptyState
        icon={Video}
        title="Demo mode"
        description="Connect the API (VITE_API_BASE_URL) to manage the live classroom domain and auto-record."
      />
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
        {error && <InlineAlert variant="warning">{error}</InlineAlert>}
        {saved && !error && <InlineAlert variant="success">Saved.</InlineAlert>}

        {!loaded ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="jitsi-domain">Domain</Label>
              <Input
                id="jitsi-domain"
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
              <Label htmlFor="jitsi-app-id">App Id</Label>
              <Input
                id="jitsi-app-id"
                value={form.appId}
                onChange={(e) => setForm({ ...form, appId: e.target.value })}
                placeholder="Optional — only for JWT-secured rooms"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="jitsi-app-secret">App Secret</Label>
              <div className="relative">
                <Input
                  id="jitsi-app-secret"
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
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3 sm:col-span-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Start every class with the waiting room on</p>
                <p className="text-xs text-muted-foreground">
                  On: a student joining before the teacher waits to be let in, instead of landing in an unattended
                  room. Off: anyone can join directly the moment class opens — the teacher can still turn the waiting
                  room on mid-class from the call's own "Waiting Room" button either way.
                </p>
              </div>
              <Switch checked={form.defaultLobby} onCheckedChange={(defaultLobby) => setForm({ ...form, defaultLobby })} />
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
  const { hasPermission } = useSession();
  // Create/update/delete all require Settings:Edit server-side (IntegrationsController) --
  // this component is shared by the Admin portal (implicit full access) and the Sub Admin
  // Integrations page, which only gates the whole screen on Settings:View.
  const canEdit = hasPermission("Settings", "Edit");
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
  const formRef = useRef<HTMLDivElement>(null);

  // The edit form always renders above the (possibly long) grouped list, so clicking
  // "Configure" on an item further down opens a form the user can't see without
  // scrolling all the way back up themselves — nothing on screen even hints it opened.
  useEffect(() => {
    if (form) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [form]);

  async function reload() {
    if (!apiEnabled()) return;
    try {
      setIntegrations(await listIntegrations());
      setError(null);
    } catch (err) {
      setError(userMessage(err, "Could not load integrations."));
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
      setError(userMessage(err, "Could not update the integration."));
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
      setError(userMessage(err, "Could not save the integration."));
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
      setError(userMessage(err, "Could not delete the integration."));
    } finally {
      setBusy(false);
    }
  }

  if (!apiEnabled()) {
    return (
      <EmptyState
        icon={Plug}
        title="Demo mode"
        description="Integrations are maintained in the database. Connect the API (VITE_API_BASE_URL) to manage them."
      />
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
        {canEdit && (
          <Button size="sm" onClick={startNew}>
            <Plus className="h-3.5 w-3.5" /> Add Integration
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error && <InlineAlert variant="warning">{error}</InlineAlert>}

        {form && (
          <div ref={formRef} className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2 scroll-mt-4">
            <div className="grid gap-1.5">
              <Label htmlFor="integration-key">Key</Label>
              <Input
                id="integration-key"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="e.g. sms-gateway"
                disabled={!isNew}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="integration-name">Name</Label>
              <Input id="integration-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. SMS Gateway" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="integration-category-select">Category</Label>
              <Select value={form.category} onValueChange={(category: IntegrationCategoryName) => setForm({ ...form, category })}>
                <SelectTrigger id="integration-category-select">
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
              <Label htmlFor="integration-description">Description</Label>
              <Input
                id="integration-description"
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What this integration is for"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="mb-1.5 flex items-center justify-between">
                <Label id="integration-config-fields-label">Configuration fields</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfigRows([...configRows, { key: "", value: "" }])}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" /> Add field
                </Button>
              </div>
              <div className="flex flex-col gap-2" role="group" aria-labelledby="integration-config-fields-label">
                {configRows.map((row, i) => {
                  const secret = isSecretField(row.key);
                  const revealed = revealedRows.has(i);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={row.key}
                        onChange={(e) => setConfigRows(configRows.map((r, ri) => (ri === i ? { ...r, key: e.target.value } : r)))}
                        placeholder="field name, e.g. apiKey"
                        aria-label={`Configuration field ${i + 1} name`}
                        className="w-48 font-mono text-xs"
                      />
                      <div className="relative flex-1">
                        <Input
                          type={secret && !revealed ? "password" : "text"}
                          value={row.value}
                          onChange={(e) => setConfigRows(configRows.map((r, ri) => (ri === i ? { ...r, value: e.target.value } : r)))}
                          placeholder="value"
                          aria-label={`Configuration field ${i + 1} value`}
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
                <InlineAlert variant="warning" className="mt-1.5">
                  {form.name || form.key} can't process live payments yet — missing:{" "}
                  {missingRequiredFields(form.key, configRows).join(", ")}. Parents who pick this gateway will see a
                  "not fully configured" message until these are filled in.
                </InlineAlert>
              )}
              {configFormatWarning(form.key, configRows) && (
                <InlineAlert variant="error" className="mt-1.5">
                  {configFormatWarning(form.key, configRows)}
                </InlineAlert>
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
                        <Switch checked={integration.isEnabled} onCheckedChange={() => toggleEnabled(integration)} disabled={busy || !canEdit} />
                        {canEdit && (
                          <Button variant="outline" size="sm" onClick={() => startEdit(integration)}>
                            <Pencil className="h-3.5 w-3.5" /> Configure
                          </Button>
                        )}
                        {!integration.isSystem && canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(integration)}
                            disabled={busy}
                            aria-label={`Delete ${integration.name}`}
                          >
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

/**
 * "Check email delivery" — reported live: parents never received their PIN-reset emails and
 * nothing showed why (normal sending never reports a problem). Sends a real test email and shows
 * the exact reason when it can't be delivered.
 */
function EmailDeliveryCheck() {
  const { hasPermission } = useSession();
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  if (!apiEnabled() || !hasPermission("Settings", "Edit")) return null;

  async function run() {
    if (!isValidEmail(to.trim()) || busy) return;
    setBusy(true);
    setResult(null);
    try {
      setResult(await sendTestEmail(to.trim()));
    } catch (err) {
      setResult({ ok: false, message: userMessage(err, "Couldn't run the email check.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check email delivery</CardTitle>
        <CardDescription>
          Send a test email to any address (for example a Gmail you can open) to confirm that parents will receive
          PIN-reset links, logins and other emails. If something is wrong, you'll see exactly what.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input type="email" placeholder="name@gmail.com" value={to} onChange={(e) => setTo(e.target.value)} className="sm:max-w-sm" />
          <Button onClick={run} disabled={busy || !isValidEmail(to.trim())}>
            {busy ? "Sending…" : "Send test email"}
          </Button>
        </div>
        {result && (
          <p className={result.ok ? "text-sm font-medium text-success" : "text-sm font-medium text-destructive"}>{result.message}</p>
        )}
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Where uploaded resources and class presentations are kept (S3 or the server's own disk), and the
 * Sync buttons that copy every file across before switching Storage:Provider -- so moving storage
 * needs no command line. Copies only, never deletes; safe to press again.
 */
function StorageSyncCard() {
  const { hasPermission } = useSession();
  const canEdit = hasPermission("Settings", "Edit");
  const [status, setStatus] = useState<ApiStorageStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<"local" | "s3" | null>(null);
  const running = status?.sync?.running ?? false;

  useEffect(() => {
    if (!apiEnabled() || !hasPermission("Settings", "View")) return;
    let cancelled = false;
    const load = () =>
      getStorageStatus()
        .then((s) => !cancelled && (setStatus(s), setError(null)))
        .catch((err) => !cancelled && setError(userMessage(err, "Couldn't load the storage status.")));
    load();
    // Poll while a sync runs so the progress moves on its own.
    const id = running ? setInterval(load, 2000) : undefined;
    return () => {
      cancelled = true;
      if (id) clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  if (!apiEnabled() || !hasPermission("Settings", "View")) return null;

  async function sync(to: "local" | "s3") {
    setStarting(to);
    setError(null);
    try {
      const started = await startStorageSync(to);
      setStatus((s) => (s ? { ...s, sync: started } : s));
    } catch (err) {
      setError(userMessage(err, "Couldn't start the sync."));
    } finally {
      setStarting(null);
    }
  }

  const s = status?.sync;
  const done = s ? s.copied + s.skipped + s.failed : 0;
  const percent = s && s.total > 0 ? Math.round((done / s.total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>File storage</CardTitle>
        <CardDescription>
          Uploaded resources and class presentations are stored in{" "}
          <span className="font-semibold text-foreground">{status ? (status.provider === "Local" ? "this server's disk" : "S3 (object storage)") : "…"}</span>.
          Before switching, use Sync to copy every file across. Sync only copies — nothing is ever deleted — and files
          already copied are skipped, so it's safe to run again.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {status && (
          <p className="text-sm text-muted-foreground">
            On this server: {status.localFileCount} file{status.localFileCount === 1 ? "" : "s"} ({formatBytes(status.localBytes)})
            {status.localFreeBytes != null && ` · ${formatBytes(status.localFreeBytes)} free on the disk`}
            {!status.s3Configured && " · S3 isn't set up on this server, so there's nothing to sync with."}
          </p>
        )}
        {status && status.portalFiles > 0 && (() => {
          const missing = status.portalFiles - status.portalFilesOnServer;
          if (missing === 0) {
            return (
              <p className="text-sm font-medium text-success">
                Ready: all {status.portalFiles} files the portal uses are on this server.
              </p>
            );
          }
          return (
            <p className={cn("text-sm font-medium", status.provider === "Local" && !status.s3Configured ? "text-destructive" : "text-warning-foreground")}>
              {missing} of the {status.portalFiles} files the portal uses {missing === 1 ? "is" : "are"} not on this server yet
              {status.provider === "Local"
                ? status.s3Configured
                  ? " — they're opened from S3 for now. Run Sync S3 → this server to bring them over."
                  : " — and S3 isn't set up, so they can't be opened. Copy them to this server."
                : " — run Sync S3 → this server before switching to local storage."}
            </p>
          );
        })()}
        {status?.localFolderMounted === false && (
          <InlineAlert variant="error" bordered>
            The storage folder on this server ({status.localPath}) isn't connected to the server's disk, so files kept there
            would be lost on the next deploy. Syncing to this server is blocked until it is mounted
            {status.provider === "Local" && " — and new uploads are at risk right now"}.
          </InlineAlert>
        )}

        {canEdit && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => sync("local")} disabled={running || starting !== null || !status?.s3Configured}>
              {starting === "local" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sync S3 → this server
            </Button>
            <Button variant="outline" onClick={() => sync("s3")} disabled={running || starting !== null || !status?.s3Configured}>
              {starting === "s3" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sync this server → S3
            </Button>
          </div>
        )}

        {s && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <p className="font-medium text-foreground">
              {s.running ? "Syncing" : "Last sync"}: {s.to === "local" ? "S3 → this server" : "this server → S3"}
              {s.running && s.total > 0 && ` — ${done} of ${s.total} (${percent}%)`}
            </p>
            {s.running && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-label={`${percent}% done`}>
                <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
              </div>
            )}
            {!s.running && !s.error && (
              <p className={s.failed === 0 ? "font-medium text-success" : "font-medium text-destructive"}>
                {s.copied} copied ({formatBytes(s.copiedBytes)}), {s.skipped} already there, {s.failed} failed
                {s.failed === 0 ? " — all files are in place." : "."}
              </p>
            )}
            {s.ignored > 0 && (
              <p className="text-xs text-muted-foreground">
                {s.ignored} other item{s.ignored === 1 ? "" : "s"} in S3 (such as class recordings) aren't portal uploads and were
                left where they are.
              </p>
            )}
            {s.error && <p className="font-medium text-destructive">{s.error}</p>}
            {s.failedFiles.length > 0 && (
              <ul className="list-disc pl-5 text-xs text-muted-foreground">
                {s.failedFiles.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
