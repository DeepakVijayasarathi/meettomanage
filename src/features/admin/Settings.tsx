import { useState } from "react";
import { Bell, Building2, CheckCircle2, Globe2, Palette, Plug, Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CHART_PALETTE } from "@/lib/roles";

const SWATCHES = ["#1F6FE0", "#57B33B", "#17A9C9", "#F08A1D", "#8B5CF6", "#F53BA6", "#EAB308", "#0D9488"];

export default function AdminSettings() {
  const [brandColor, setBrandColor] = useState("#1F6FE0");
  const [accentColor, setAccentColor] = useState("#57B33B");
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({
    feeReminders: true,
    leaveRequests: true,
    lowAttendance: false,
    weeklyDigest: true,
  });

  function saveAll() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Settings & Branding"
        description="White-label branding, domain, notification preferences and integrations for The Reader Nest."
        actions={
          <Button onClick={saveAll}>
            {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        }
      />

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
                <Input id="org-name" defaultValue="The Reader Nest" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="org-domain">Custom domain</Label>
                <div className="relative">
                  <Globe2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="org-domain" defaultValue="app.thereadernest.com" className="pl-9" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="org-email">Support email</Label>
                <Input id="org-email" defaultValue="support@thereadernest.com" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="org-phone">Support phone</Label>
                <Input id="org-phone" defaultValue="+91 98200 00000" />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="org-timezone">Timezone</Label>
                <Input id="org-timezone" defaultValue="Asia/Kolkata (GMT +5:30)" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Logo & Colors</CardTitle>
              <CardDescription>Customize how The Reader Nest looks across every portal. Changes here are preview-only.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 p-2">
                  <img src="/logo.png" alt="The Reader Nest logo" className="h-full w-full object-contain" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Logo preview</p>
                  <p className="text-xs text-muted-foreground">PNG or SVG, minimum 256×256px, transparent background recommended.</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Upload New Logo
                  </Button>
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
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background"
                    />
                    <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-32 font-mono text-sm" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => setBrandColor(hex)}
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
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background"
                    />
                    <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-32 font-mono text-sm" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CHART_PALETTE.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => setAccentColor(hex)}
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
              {[
                { key: "feeReminders" as const, label: "Fee payment reminders", description: "Get notified when a parent's fee becomes due or overdue." },
                { key: "leaveRequests" as const, label: "Teacher leave requests", description: "Get notified when a teacher submits a leave request." },
                { key: "lowAttendance" as const, label: "Low attendance alerts", description: "Get notified when a batch's attendance drops below 75%." },
                { key: "weeklyDigest" as const, label: "Weekly summary digest", description: "Receive a weekly email summarizing enrollments and revenue." },
              ].map((item, i) => (
                <div key={item.key}>
                  {i > 0 && <Separator className="my-1" />}
                  <div className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key]}
                      onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, [item.key]: checked }))}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>Connected Integrations</CardTitle>
              <CardDescription>Third-party services connected to your platform.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {[
                { name: "Razorpay", desc: "Payment gateway — Phonics department", connected: true, color: CHART_PALETTE[0] },
                { name: "Cashfree", desc: "Payment gateway — Maths department", connected: true, color: CHART_PALETTE[4] },
                { name: "Zoom", desc: "Live classroom video conferencing", connected: true, color: CHART_PALETTE[2] },
                { name: "WhatsApp Business API", desc: "Parent communication and reminders", connected: false, color: CHART_PALETTE[1] },
                { name: "Google Calendar", desc: "Sync academic calendar with teacher calendars", connected: false, color: CHART_PALETTE[6] },
              ].map((integration, i) => (
                <div key={integration.name}>
                  {i > 0 && <Separator className="my-1" />}
                  <div className="flex items-center justify-between gap-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold"
                        style={{ backgroundColor: `${integration.color}1A`, color: integration.color }}
                      >
                        {integration.name[0]}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{integration.name}</p>
                        <p className="text-xs text-muted-foreground">{integration.desc}</p>
                      </div>
                    </div>
                    <Button variant={integration.connected ? "outline" : "default"} size="sm">
                      {integration.connected ? "Manage" : "Connect"}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
