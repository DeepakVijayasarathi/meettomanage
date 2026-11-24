import { useState, type FormEvent } from "react";
import { MessageCircle, Sparkles } from "lucide-react";
import { askWebinarQuestion } from "@/api/webinars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WebinarAssistant({ slug, canRegister, suggestions }: {
  slug: string;
  canRegister: boolean;
  suggestions: readonly { question: string; answer: string }[];
}) {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [reply, setReply] = useState("");
  const [pending, setPending] = useState(false);

  async function ask(value: string) {
    const trimmed = value.trim();
    if (pending || !trimmed || trimmed.length > 600) return;
    setAsked(trimmed);
    setReply("");
    setQuestion("");
    setPending(true);
    try {
      const response = await askWebinarQuestion(slug, trimmed);
      setReply(response.reply);
    } catch {
      const known = suggestions.find((item) => item.question.toLowerCase() === trimmed.toLowerCase());
      setReply(known?.answer ?? "The assistant is temporarily unavailable. You can check the FAQ or ask the webinar team during the live Q&A.");
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <section aria-labelledby="webinar-assistant" className="rounded-2xl border border-[#F0D4BE] bg-[#FFF6EE] p-5 sm:p-6">
      <h2 id="webinar-assistant" className="flex items-center gap-2 text-xl font-bold"><Sparkles className="h-5 w-5 shrink-0 text-[#A8441B]" aria-hidden /> Webinar AI assistant</h2>
      <p className="mt-2 leading-relaxed text-[#5F4A40]">Ask about the agenda, who should attend, or how to RSVP.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map(({ question: prompt }) => (
          <button key={prompt} type="button" disabled={pending} onClick={() => void ask(prompt)} className="rounded-lg border border-[#E7C7B4] bg-white px-3 py-2 text-left text-sm font-semibold text-[#813B20] hover:bg-[#FFF0E4] disabled:opacity-60">{prompt}</button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-4 space-y-2">
        <Label htmlFor="webinar-question">Your question</Label>
        <div className="flex gap-2">
          <Input id="webinar-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={600} placeholder="How do I join?" className="min-w-0 border-[#E7C7B4] bg-white text-base" required />
          <Button type="submit" disabled={pending || !question.trim()} className="shrink-0 bg-[#B53B0C] text-white hover:bg-[#913009]"><MessageCircle className="h-4 w-4" aria-hidden /> Ask</Button>
        </div>
      </form>
      <div aria-live="polite" aria-busy={pending}>
        {pending && <p className="mt-3 text-sm text-[#5F4A40]">Looking up your answer…</p>}
        {reply && <div className="mt-4 rounded-xl border border-[#F0D4BE] bg-white p-4">
          <p className="break-words font-semibold">{asked}</p>
          <p className="mt-2 whitespace-pre-line break-words leading-relaxed text-[#5F4A40]">{reply}</p>
        </div>}
      </div>
      {canRegister && <a href="#webinar-registration" className="mt-4 inline-flex min-h-10 items-center font-bold text-[#813B20] underline underline-offset-4">RSVP for the webinar</a>}
    </section>
  );
}
