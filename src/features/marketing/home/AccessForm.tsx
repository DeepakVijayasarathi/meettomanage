import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN_PRIMARY } from "../MarketingNav";
import type { HomeCopy } from "./copy";
import { isValidContact } from "./contactValidation";

/** The hero's one-field "get access" form. It hands the visitor's email or mobile number to the demo booking page,
 *  which prefills it, so the first step is a single field and a single button. */
export function AccessForm({ c, watch }: { c: HomeCopy["hero"]["form"]; watch: { label: string; cta: string } }) {
  const navigate = useNavigate();
  const [contact, setContact] = useState("");
  const [error, setError] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = contact.trim().slice(0, 120);
    if (value && !isValidContact(value)) {
      setError(true);
      return;
    }
    setError(false);
    navigate(value ? `/get-started?contact=${encodeURIComponent(value)}` : "/get-started");
  }

  return (
    <div className="mx-fade-up" style={{ animationDelay: "0.7s" }}>
      <form onSubmit={submit} className="flex max-w-[560px] flex-col gap-2 rounded-[20px] border border-[#E6C9B3] bg-white p-2 shadow-[0_8px_28px_-16px_rgba(134,65,24,0.25)] transition-shadow focus-within:border-[#EA580C] focus-within:ring-4 focus-within:ring-[#EA580C]/10 sm:flex-row">
        <label htmlFor="hero-contact" className="sr-only">{c.label}</label>
        <input
          id="hero-contact"
          name="contact"
          type="text"
          inputMode="email"
          autoComplete="email"
          value={contact}
          onChange={(e) => { setContact(e.target.value); if (error) setError(false); }}
          placeholder={c.placeholder}
          aria-describedby={error ? "hero-contact-error hero-contact-note" : "hero-contact-note"}
          aria-invalid={error}
          className="h-12 min-w-0 w-full rounded-xl border-0 bg-transparent px-3 text-sm text-[#1C1917] placeholder:text-[#817369] focus:outline-none sm:flex-1"
        />
        <button type="submit" className={cn(BTN_PRIMARY, "group h-12 shrink-0 !rounded-xl px-5 text-[13px] shadow-[0_4px_12px_-5px_rgba(194,65,12,0.5)]")}>
          {watch.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100" />
        </button>
      </form>
      {error && <p id="hero-contact-error" role="alert" className="mt-2 text-sm font-semibold text-[#B91C1C]">{c.invalid}</p>}
      <p id="hero-contact-note" className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[#786B60]">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A88970]" />{c.note}
      </p>
      <a href="#walkthrough" className="group mt-5 inline-flex items-center gap-2.5 rounded-full text-sm font-bold text-[#9A3412] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]">
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#F0C6A6] bg-white transition-colors group-hover:bg-[#FFEDD9]"><Play aria-hidden="true" className="ms-0.5 h-3 w-3" fill="currentColor" /></span>{watch.label}
      </a>
    </div>
  );
}
