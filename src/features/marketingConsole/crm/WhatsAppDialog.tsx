import { useEffect, useState } from "react";
import { Copy, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled } from "@/lib/api";
import { getMarketingLeadRecommendation, logMarketingLeadActivity, updatePlatformDemoRequest, type ApiPlatformDemoRequest } from "@/api/marketing";

const TEMPLATES: { key: string; label: string; text: (l: ApiPlatformDemoRequest) => string }[] = [
  { key: "follow-up", label: "Initial follow-up", text: (l) => `Hi ${l.fullName}, thank you for your interest in Meet to Manage for ${l.academyName}. I’m following up about your platform demo request. When would be a convenient time to speak?` },
  { key: "demo", label: "Demo reminder", text: (l) => `Hi ${l.fullName}, this is a reminder about your Meet to Manage demo for ${l.academyName}. Please let me know a suitable date and time, and I’ll arrange it for you.` },
  { key: "pricing", label: "Pricing qualification", text: (l) => `Hi ${l.fullName}, thank you for considering Meet to Manage for ${l.academyName}. I can help you understand the plans and recommend the right setup based on your students, teachers and branches. May I ask how many students you currently manage?` },
  { key: "trial", label: "Trial nudge", text: (l) => `Hi ${l.fullName}, how is the Meet to Manage trial going for ${l.academyName}? If it helps, I can set up your first batch and fee plan with you on a quick call.` },
  { key: "checkin", label: "No-response check-in", text: (l) => `Hi ${l.fullName}, I wanted to check whether you still need help evaluating Meet to Manage for ${l.academyName}. I’m happy to answer questions or arrange a quick demo.` },
];

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

  useEffect(() => {
    if (!lead) return;
    const t = lead.stage === "Trial" || lead.stage === "ActiveTrial" ? "trial" : "follow-up";
    setTemplate(t); setMessage(TEMPLATES.find((x) => x.key === t)!.text(lead)); setDays(2); setAiPowered(null);
  }, [lead]);

  function pick(key: string) { if (!lead) return; setTemplate(key); setMessage(TEMPLATES.find((x) => x.key === key)!.text(lead)); setAiPowered(null); }

  async function generateMessage() {
    if (!lead || generating) return;
    setGenerating(true);
    try {
      const suggestion = await getMarketingLeadRecommendation(lead.id);
      setMessage(suggestion.suggestedMessage);
      setTemplate("");
      setAiPowered(suggestion.aiPowered);
      toast({ variant: "success", title: suggestion.aiPowered ? "AI message ready" : "Suggested message ready", description: "Review or edit it before opening WhatsApp." });
    } catch (err) {
      toast({ variant: "error", title: "Couldn't write the message", description: err instanceof Error ? err.message : undefined });
    } finally {
      setGenerating(false);
    }
  }

  async function openAndTrack() {
    if (!lead || !message.trim()) return;
    window.open(whatsappLink(lead.phone, message.trim()), "_blank", "noopener,noreferrer");
    if (apiEnabled()) {
      const next = new Date(); next.setDate(next.getDate() + days); next.setHours(10, 0, 0, 0);
      try {
        await updatePlatformDemoRequest(lead.id, { status: lead.status === "New" ? "Contacted" : lead.status, nextFollowUpAtUtc: next.toISOString() });
        await logMarketingLeadActivity(lead.id, { type: "WhatsApp sent", detail: message.trim() });
        toast({ variant: "success", title: "Message recorded on the lead" });
        onTracked?.();
      } catch (err) {
        toast({ variant: "error", title: "WhatsApp opened, but the lead couldn't be updated", description: err instanceof Error ? err.message : undefined });
      }
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={lead !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" />WhatsApp follow-up</DialogTitle>
          <DialogDescription>{lead ? `${lead.fullName} · ${lead.phone} · ${lead.academyName}` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Opening WhatsApp marks a new lead as contacted, schedules the follow-up and adds the message to the timeline. You still press Send inside WhatsApp.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(message); toast({ variant: "success", title: "Message copied" }); }}><Copy className="h-4 w-4" />Copy</Button>
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={!message.trim()} onClick={() => void openAndTrack()}><MessageCircle className="h-4 w-4" />Open WhatsApp and record</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
