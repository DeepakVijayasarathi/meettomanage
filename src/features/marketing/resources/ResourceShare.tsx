import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

export function ResourceShare({ title, slug }: { title: string; slug: string }) {
  const [status, setStatus] = useState("");
  const [manualLink, setManualLink] = useState("");
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const url = new URL(`https://meettomanage.cloud/resources/${slug}`);
  url.searchParams.set("utm_source", "resource_share");
  url.searchParams.set("utm_medium", "referral");
  url.searchParams.set("utm_campaign", "free_templates");

  function record(method: string) {
    try { window.gtag?.("event", "resource_share", { resource_slug: slug, method }); } catch { /* Sharing does not depend on analytics. */ }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url.href);
      setManualLink("");
      setStatus("Link copied. Ready to share.");
      record("copy_link");
    } catch {
      setManualLink(url.href);
      setStatus("Select and copy the link below.");
    }
  }

  async function share() {
    try {
      await navigator.share({ title, text: "A free coaching centre template from Meet to Manage.", url: url.href });
      setStatus("Sharing completed.");
      record("native_share");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      await copy();
    }
  }

  const button = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#E7CCB7] bg-white px-3 py-2 text-xs font-bold text-[#9A3412] hover:bg-[#FFF0E3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]";
  return <div className="mt-6 border-t border-[#EEDACB] pt-5">
    <p className="text-xs font-bold text-[#4F453D]">Useful for another academy?</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={() => void copy()} className={button}>{status.startsWith("Link copied") ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}Copy link</button>
      {canShare && <button type="button" onClick={() => void share()} className={button}><Share2 aria-hidden="true" className="h-3.5 w-3.5" />Share</button>}
    </div>
    <p role="status" aria-live="polite" className="mt-2 min-h-4 text-xs leading-relaxed text-[#786B60]">{status}</p>
    {manualLink && <input aria-label="Resource link to copy" value={manualLink} readOnly onFocus={e => e.currentTarget.select()} className="mt-2 w-full min-w-0 rounded-lg border border-[#E7CCB7] bg-white p-2 text-xs text-[#625A53] focus:outline-[#C2410C]" />}
  </div>;
}
