import { cn } from "@/lib/utils";

/** A phone around a real app screenshot: dark bezel, a small camera pill and a deep soft shadow. */
export function Phone({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[14%/6.5%] border-[4px] border-[#1C1917] bg-[#FAFAFA] shadow-[0_22px_40px_-20px_rgba(28,25,23,0.35),0_6px_14px_-8px_rgba(28,25,23,0.25)] sm:border-[5px]", className)}>
      <div aria-hidden="true" className="relative h-5 sm:h-6">
        <span className="absolute start-1/2 top-1.5 h-2 w-[30%] -translate-x-1/2 rounded-full bg-[#1C1917] sm:h-2.5" />
      </div>
      <img src={src.replace(".webp", "-390.webp")} srcSet={`${src.replace(".webp", "-390.webp")} 390w, ${src} 780w`} sizes="(min-width: 1024px) 170px, (min-width: 600px) 160px, 30vw" alt={alt} width={780} height={1688} loading="lazy" decoding="async" className="block h-auto w-full" />
    </div>
  );
}
