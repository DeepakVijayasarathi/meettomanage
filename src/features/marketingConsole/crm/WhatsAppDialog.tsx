import { useEffect, useState } from "react";
import { Ban, Copy, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { InlineAlert } from "@/components/InlineAlert";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled } from "@/lib/api";
import { optOutCrmLead } from "@/api/crm";
import { getMarketingLeadRecommendation, logMarketingLeadActivity, updatePlatformDemoRequest, type ApiPlatformDemoRequest } from "@/api/marketing";

const MARKETING_MESSAGE_FOOTER = `Website: https://meettomanage.cloud
Demo video: https://www.youtube.com/watch?v=wIadR73CVus

Looking forward to connecting!

Best regards,
Meet to Manage team`;

/** Adds the standard sales footer once, including to AI messages from older API deployments. */
function withMarketingFooter(message: string) {
  const clean = message.trim();
  return clean.includes("https://www.youtube.com/watch?v=wIadR73CVus") ? clean : `${clean}\n\n${MARKETING_MESSAGE_FOOTER}`;
}

const TEMPLATES: { key: string; label: string; text: (l: ApiPlatformDemoRequest) => string }[] = [
  { key: "outreach", label: "First outreach", text: (l) => `Hi ${l.fullName}, I’m reaching out from Meet to Manage. We help academies like ${l.academyName} manage enquiries, classes, attendance, fees and parent updates in one place. Would you be open to a brief 10-minute call to see whether it could help your team? If this isn’t relevant, let me know and I won’t follow up.` },
  { key: "outreach-follow-up", label: "Outreach follow-up", text: (l) => `Hi ${l.fullName}, I’m following up on my earlier message about Meet to Manage for ${l.academyName}. Would a brief platform walkthrough be useful, or would you prefer that I close the loop?` },
  { key: "follow-up", label: "Initial follow-up", text: (l) => `Hi ${l.fullName}, thank you for your interest in Meet to Manage for ${l.academyName}. I’m following up about your platform demo request. When would be a convenient time to speak?` },
  { key: "demo", label: "Demo reminder", text: (l) => `Hi ${l.fullName}, this is a reminder about your Meet to Manage demo for ${l.academyName}. Please let me know a suitable date and time, and I’ll arrange it for you.` },
  { key: "pricing", label: "Pricing qualification", text: (l) => `Hi ${l.fullName}, thank you for considering Meet to Manage for ${l.academyName}. I can help you understand the plans and recommend the right setup based on your students, teachers and branches. May I ask how many students you currently manage?` },
  { key: "trial", label: "Trial nudge", text: (l) => `Hi ${l.fullName}, how is the Meet to Manage trial going for ${l.academyName}? If it helps, I can set up your first batch and fee plan with you on a quick call.` },
  { key: "checkin", label: "No-response check-in", text: (l) => `Hi ${l.fullName}, I wanted to check whether you still need help evaluating Meet to Manage for ${l.academyName}. I’m happy to answer questions or arrange a quick demo.` },
];

function isOutboundLead(lead: ApiPlatformDemoRequest) {
  // Website enquiries carry a visitor ID even when attribution says Google, Instagram, etc.
  if (lead.visitorId || lead.landingPath) return false;
  const source = (lead.source ?? "").trim().toLowerCase();
  if (!source) return false;
  return !["direct", "website", "website chat assistant", "chat", "get-started", "demo request"].includes(source);
}

export function whatsappLink(phone: string, message: string) {
  let number = phone.replace(/\D/g, "");
  if (number.length === 10) number = `91${number}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Prepare a WhatsApp message from a template, open it, and record it on the lead (contacted + next follow-up). */
export function WhatsAppDialog({ lead, onOpenChange, onTracked }: { lead: ApiPlatformDemoRequest | null; onOpenChange: (open: boolean) => void; onTracked?: () => void }) {
  const { toast } = useToast();
  const [template, setTemplate] = useState("follow-up");
  const [message, setMessage] = useState("");
  const [days, setDays] = useState(2);
  const [generating, setGenerating] = useState(false);
  const [aiPowered, setAiPowered] = useState<boolean | null>(null);
  const [opened, setOpened] = useState(false);
  const [repeatConfirmed, setRepeatConfirmed] = useState(false);
  const [confirmOptOut, setConfirmOptOut] = useState(false);

  useEffect(() => {
    if (!lead) return;
    const outbound = isOutboundLead(lead);
    const t = lead.stage === "Trial" || lead.stage === "ActiveTrial"
      ? "trial"
      : outbound && (lead.stage ?? "New") === "New" && !lead.lastContactedAtUtc
        ? "outreach"
        : outbound
          ? "outreach-follow-up"
          : "follow-up";
    setTemplate(t); setMessage(withMarketingFooter(TEMPLATES.find((x) => x.key === t)!.text(lead))); setDays(2); setAiPowered(null); setOpened(false); setRepeatConfirmed(false); setConfirmOptOut(false);
  }, [lead]);

  function pick(key: string) { if (!lead) return; setTemplate(key); setMessage(withMarketingFooter(TEMPLATES.find((x) => x.key === key)!.text(lead))); setAiPowered(null); }

  async function generateMessage() {
    if (!lead || generating) return;
    setGenerating(true);
    try {
      const suggestion = await getMarketingLeadRecommendation(lead.id);
      setMessage(withMarketingFooter(suggestion.suggestedMessage));
      setTemplate("");
      setAiPowered(suggestion.aiPowered);
      toast({ variant: "success", title: suggestion.aiPowered ? "AI message ready" : "Suggested message ready", description: "Review or edit it before opening WhatsApp." });
    } catch (err) {
      toast({ variant: "error", title: "Couldn't write the message", description: err instanceof Error ? err.message : undefined });
    } finally {
      setGenerating(false);
    }
  }

  async function openDraft() {
    if (!lead || !message.trim()) return;
    const finalMessage = withMarketingFooter(message);
    window.open(whatsappLink(lead.phone, finalMessage), "_blank", "noopener,noreferrer");
    setOpened(true);
    if (apiEnabled()) {
      try {
        await logMarketingLeadActivity(lead.id, { type: "WhatsApp opened", detail: `Draft opened in WhatsApp; sending is not yet confirmed.\n\n${finalMessage}` });
      } catch (err) {
        toast({ variant: "error", title: "WhatsApp opened, but the draft couldn't be logged", description: err instanceof Error ? err.message : undefined });
      }
    }
  }

  async function confirmSent() {
    if (!lead || !message.trim()) return;
    const finalMessage = withMarketingFooter(message);
    const next = new Date(); next.setDate(next.getDate() + days); next.setHours(10, 0, 0, 0);
    try {
      if (apiEnabled()) {
        await updatePlatformDemoRequest(lead.id, { status: "Contacted", nextFollowUpAtUtc: next.toISOString() });
        await logMarketingLeadActivity(lead.id, { type: "WhatsApp sent (confirmed)", detail: finalMessage });
      }
      toast({ variant: "success", title: "WhatsApp send recorded", description: "The lead and next follow-up were updated." });
      onTracked?.();
      onOpenChange(false);
    } catch (err) {
      toast({ variant: "error", title: "The send could not be recorded", description: err instanceof Error ? err.message : "Try again. Your WhatsApp message is unaffected." });
    }
  }

  async function optOut() {
    if (!lead) return;
    try {
      await optOutCrmLead(lead.id);
      toast({ variant: "success", title: "Do Not Contact enabled", description: "Open tasks were cancelled and the next follow-up was cleared." });
      onTracked?.();
      onOpenChange(false);
    } catch (err) {
      toast({ variant: "error", title: "Could not enable Do Not Contact", description: err instanceof Error ? err.message : "Try again." });
      throw err;
    }
  }

  const doNotContact = lead?.stage === "Lost" && lead.lostReason?.toLowerCase() === "do not contact";
  const lastContactedMs = lead?.lastContactedAtUtc ? new Date(lead.lastContactedAtUtc).getTime() : 0;
  const contactedRecently = lastContactedMs > Date.now() - 24 * 60 * 60 * 1000;
  const hoursSinceContact = contactedRecently ? Math.max(1, Math.round((Date.now() - lastContactedMs) / 3_600_000)) : null;

  return (
    <Dialog open={lead !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" />WhatsApp follow-up</DialogTitle>
          <DialogDescription>{lead ? `${lead.fullName} · ${lead.phone} · ${lead.academyName}` : ""}</DialogDescription>
        </DialogHeader>
        {doNotContact ? (
          <InlineAlert variant="error" bordered>This lead is marked Do Not Contact. Outreach, AI drafts and follow-up scheduling are blocked until a manager deliberately reopens the lead after receiving permission.</InlineAlert>
        ) : <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant={template === "" ? "default" : "outline"} disabled={generating || !apiEnabled()} onClick={() => void generateMessage()}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Write with AI
            </Button>
            {TEMPLATES.map((t) => <Button key={t.key} size="sm" variant={template === t.key ? "default" : "outline"} onClick={() => pick(t.key)}>{t.label}</Button>)}
          </div>
          <label className="block space-y-1 text-sm"><span className="flex items-center justify-between gap-2 font-medium"><span>Message (edit before opening)</span>{aiPowered !== null && <span className="text-xs font-normal text-muted-foreground">{aiPowered ? "AI-personalised" : "Safe fallback"}</span>}</span><Textarea rows={7} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
          <label className="block space-y-1 text-sm"><span className="font-medium">Next follow-up</span>
            <select className="h-10 w-full rounded-md border bg-background px-3" value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={1}>Tomorrow at 10:00</option><option value={2}>In 2 days at 10:00</option><option value={3}>In 3 days at 10:00</option><option value={7}>In 1 week at 10:00</option>
            </select>
          </label>
          {contactedRecently && <InlineAlert variant="warning"><label className="flex cursor-pointer items-start gap-2"><input className="mt-0.5" type="checkbox" checked={repeatConfirmed} onChange={(e) => setRepeatConfirmed(e.target.checked)} /><span>This lead was contacted about {hoursSinceContact} hour{hoursSinceContact === 1 ? "" : "s"} ago. Confirm that another message is appropriate.</span></label></InlineAlert>}
          {opened ? <InlineAlert variant="success" bordered>WhatsApp was opened, but the free link cannot detect whether you pressed Send. Return here and confirm only after the message was sent.</InlineAlert> : <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Opening WhatsApp records only that the draft was opened. The lead is marked contacted and the next follow-up is scheduled only after you confirm that you pressed Send.</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmOptOut(true)}><Ban className="h-4 w-4" />Do not contact</Button>
            <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(withMarketingFooter(message)); toast({ variant: "success", title: "Message copied" }); }}><Copy className="h-4 w-4" />Copy</Button>
            {opened ? <Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => void confirmSent()}><MessageCircle className="h-4 w-4" />I sent it — record</Button> : <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={!message.trim() || (contactedRecently && !repeatConfirmed)} onClick={() => void openDraft()}><MessageCircle className="h-4 w-4" />Open WhatsApp</Button>}
          </div>
        </div>}
      </DialogContent>
      <ConfirmDialog open={confirmOptOut} onOpenChange={setConfirmOptOut} title="Mark this lead Do Not Contact?" description="This marks the lead lost, cancels every open follow-up task, clears the next follow-up and blocks AI or WhatsApp outreach until a manager deliberately reopens it." confirmLabel="Mark Do Not Contact" destructive onConfirm={optOut} />
    </Dialog>
  );
}
