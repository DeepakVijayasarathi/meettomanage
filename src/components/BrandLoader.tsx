import { cn } from "@/lib/utils";

/** The app's loading mark: the handshake logo inside a slowly turning ring of orange and navy arcs, with three bouncing dots
 *  beneath it. It holds still for visitors who ask for reduced motion, and announces itself to screen readers as "Loading". */
export function BrandLoader({ size = 120, label = "Loading", className }: { size?: number; label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center gap-5", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <div aria-hidden="true" className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.22),transparent_68%)] blur-md" />
        <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 h-full w-full motion-safe:animate-[spin_2.6s_linear_infinite]">
          <defs>
            <linearGradient id="loader-orange" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FDBA74" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>
          {/* two orange arcs and two navy arcs, like the logo's two figures */}
          <g fill="none" strokeWidth="5" strokeLinecap="round">
            <path d="M50 6 A44 44 0 0 1 90 32" stroke="url(#loader-orange)" />
            <path d="M94 56 A44 44 0 0 1 70 88" stroke="#1E293B" />
            <path d="M50 94 A44 44 0 0 1 10 68" stroke="url(#loader-orange)" />
            <path d="M6 44 A44 44 0 0 1 30 12" stroke="#1E293B" />
          </g>
        </svg>
        <img src="/logo-icon-128.webp" alt="" width={128} height={128} className="absolute inset-[22%] h-[56%] w-[56%] object-contain drop-shadow-[0_6px_14px_rgba(234,88,12,0.35)]" />
      </div>
      <div aria-hidden="true" className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-2.5 w-2.5 rounded-full bg-[#EA580C] shadow-[0_0_10px_rgba(249,115,22,0.6)] motion-safe:animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
