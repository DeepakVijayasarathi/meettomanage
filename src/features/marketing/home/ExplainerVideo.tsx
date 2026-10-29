import { useState } from "react";
import { Play } from "lucide-react";

const VIDEO_ID = "wIadR73CVus";

/** The product walkthrough, hosted on YouTube. Until the visitor presses play only a thumbnail and a button are on the page,
 *  so no YouTube script, cookie or request for the player is made. Pressing play swaps in the privacy-friendly embed and starts it. */
export function ExplainerVideo({ title }: { title: string }) {
  const [playing, setPlaying] = useState(false);
  const [thumb, setThumb] = useState(`https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`);

  return (
    <div className="relative aspect-video overflow-hidden bg-[#0B1220]">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`${title}: play video`}
          className="group absolute inset-0 flex items-center justify-center focus-visible:outline focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-[#FDBA74]"
        >
          <img
            src={thumb}
            onError={() => setThumb(`https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`)}
            alt=""
            width={1280}
            height={720}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/55 via-transparent to-transparent transition-colors group-hover:from-[#0B1220]/65" />
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#EA580C] text-white shadow-[0_0_0_8px_rgba(255,255,255,0.9),0_24px_50px_-10px_rgba(194,65,12,0.8)] transition-transform duration-300 group-hover:scale-110">
            <Play className="h-9 w-9 translate-x-0.5 rtl:-translate-x-0.5 rtl:-scale-x-100" fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}
