import { cn } from "@/lib/utils";

/** A phone around a real app screenshot: dark bezel, a small camera pill and a deep soft shadow. */
export function Phone({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[2.1rem] border-[6px] border-[#1C1917] bg-white shadow-[0_30px_60px_-20px_rgba(28,25,23,0.45),0_8px_20px_-8px_rgba(28,25,23,0.3)]", className)}>
      <span aria-hidden="true" className="absolute start-1/2 top-1.5 z-10 h-3.5 w-16 -translate-x-1/2 rounded-full bg-[#1C1917]" />
      <img src={src.replace(".webp", "-390.webp")} srcSet={`${src.replace(".webp", "-390.webp")} 390w, ${src} 780w`} sizes="(min-width: 1024px) 200px, 34vw" alt={alt} width={780} height={1688} loading="lazy" decoding="async" className="block h-auto w-full" />
    </div>
  );
}
