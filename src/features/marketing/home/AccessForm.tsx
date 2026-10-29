import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";
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
      <form onSubmit={submit} className="mx-auto flex max-w-[560px] flex-col gap-3 sm:flex-row lg:mx-0">
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
          className="h-14 min-w-0 w-full !rounded-xl sm:flex-1 border border-[#D9C9BA] bg-white px-4 text-base text-[#1C1917] shadow-sm placeholder:text-[#6B6560] focus:border-[#C2410C] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/30"
        />
        <button type="submit" className={cn(BTN_PRIMARY, "h-14 px-7 text-[15px]")}>
          {watch.cta} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
        </button>
      </form>
      {error && <p id="hero-contact-error" role="alert" className="mt-2 text-sm font-semibold text-[#B91C1C]">{c.invalid}</p>}
      <p id="hero-contact-note" className="mt-3 text-sm font-medium text-[#57534E]">
        {c.note}{" "}
        <a href="#walkthrough" className="inline-flex items-center gap-1 font-bold text-[#C2410C] underline underline-offset-4">
          <Play className="h-3 w-3" fill="currentColor" /> {watch.label}
        </a>
      </p>
    </div>
  );
}
