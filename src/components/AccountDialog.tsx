import { useEffect, useState } from "react";
import { Check, Copy, Video } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiEnabled } from "@/lib/api";
import { useSession } from "@/state/session";
import { buildPersonalMeetingUrl, getMyAccount, getMyMeetingRoom, updateMyAccount } from "@/api/account";
import { getCalendarFeedUrl } from "@/api/sessions";

const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Europe/London", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];

/**
 * Self-service Account dialog opened from the Topbar (Profile / Preferences) for
 * every role. Profile edits name/phone/timezone; Preferences exposes the personal
 * meeting link and calendar-sync URL. Demo mode shows the session name read-only.
 */
export function AccountDialog({
  open,
  onOpenChange,
  initialTab = "profile",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "profile" | "preferences";
}) {
  const { userName, setUserName, setTimeZoneId: setSessionTimeZoneId } = useSession();
  const live = apiEnabled();

  const [tab, setTab] = useState(initialTab);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [timeZoneId, setTimeZoneId] = useState("Asia/Kolkata");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaved(false);
    if (!live) {
      const [f, ...r] = userName.split(" ");
      setFirstName(f ?? "");
      setLastName(r.join(" "));
      setEmail("demo@thereadernest.com");
      setRole("Demo");
      return;
    }
    setLoading(true);
    getMyAccount()
      .then((a) => {
        setFirstName(a.firstName);
        setLastName(a.lastName);
        setEmail(a.email);
        setRole(a.role);
        setPhone(a.phone ?? "");
        setTimeZoneId(a.timeZoneId || "Asia/Kolkata");
      })
      .catch(() => setError("Couldn't load your account."))
      .finally(() => setLoading(false));
  }, [open, live, userName]);

  async function save() {
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }
    if (!live) {
      setUserName(`${firstName} ${lastName}`.trim());
      onOpenChange(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMyAccount({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        timeZoneId,
      });
      setUserName(updated.fullName);
      // Takes effect immediately in this tab (every session time on screen converts
      // against it) rather than only on the next login or page load.
      setSessionTimeZoneId(updated.timeZoneId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  }

  async function copy(kind: "meeting" | "calendar") {
    try {
      const url = kind === "meeting" ? buildPersonalMeetingUrl(await getMyMeetingRoom()) : await getCalendarFeedUrl();
      await navigator.clipboard.writeText(url);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setError("Couldn't fetch the link.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>My Account</DialogTitle>
          <DialogDescription>Manage your profile details and preferences.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "profile" | "preferences")}>
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
            <TabsTrigger value="preferences" className="flex-1">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acc-first">First name</Label>
                <Input id="acc-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} placeholder="e.g. Priya" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acc-last">Last name</Label>
                <Input id="acc-last" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} placeholder="e.g. Kapoor" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-email">Email</Label>
              <Input id="acc-email" value={email} readOnly className="bg-muted/50" />
              <p className="text-xs text-muted-foreground">{role ? `Signed in as ${role}` : ""}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-phone">Phone</Label>
              <Input id="acc-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" disabled={loading} />
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-tz">Timezone</Label>
              <Select value={timeZoneId} onValueChange={setTimeZoneId}>
                <SelectTrigger id="acc-tz">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Class times and reminders show in this zone.</p>
            </div>

            {live && (
              <div className="flex flex-col gap-2">
                <Label>Quick links</Label>
                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => copy("meeting")}>
                  {copied === "meeting" ? <Check className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
                  {copied === "meeting" ? "Personal meeting link copied" : "Copy my personal meeting link"}
                </Button>
                <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => copy("calendar")}>
                  {copied === "calendar" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === "calendar" ? "Calendar sync link copied" : "Copy my calendar sync link"}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
