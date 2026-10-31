import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/** "Live meetings are free" banner, linking to the live class page. English only, like the other recent marketing blocks. */
export function OpenSourceStrip({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto max-w-[1000px]", className)}>
      <Link to="/solutions/live-class-software-for-institutes" className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]">
        <img
          src="/images/live-meetings-free.webp"
          srcSet="/images/live-meetings-free-1000.webp 1000w, /images/live-meetings-free.webp 2000w"
          sizes="(min-width: 1040px) 1000px, 100vw"
          alt="Live meetings are free: live classes, recording, attendance and fee payments in one platform. See how it works."
          width={2000}
          height={668}
          loading="lazy"
          decoding="async"
          className="h-auto w-full rounded-2xl"
        />
      </Link>
    </div>
  );
}
