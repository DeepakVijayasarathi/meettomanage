import { Link } from "react-router-dom";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LABEL = { en: "See plans and pricing", ar: "اطلع على الخطط والأسعار" };

/** A quiet text link to /pricing for the end-of-page call-to-action blocks, so every page hands visitors (and crawlers) the pricing page. */
export function PricingLink({ className }: { className?: string }) {
  const [lang] = useLang();
  return (
    <Link to="/pricing" className={cn("mt-4 inline-block text-sm font-semibold underline underline-offset-4 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4", className)}>
      {LABEL[lang]}
    </Link>
  );
}
