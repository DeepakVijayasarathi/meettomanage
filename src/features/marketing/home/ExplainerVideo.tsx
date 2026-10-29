import { useRef, useState } from "react";
import { Play } from "lucide-react";

/** Click-to-play product walkthrough (a real screen recording), 16:9. Nothing loads until play. */
export function ExplainerVideo() {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function handlePlay() {
    setPlaying(true);
    void videoRef.current?.play();
  }

  return (
    <div className="relative aspect-video overflow-hidden bg-[#0B1220]">
      <video
        ref={videoRef}
        src="/videos/demovedio.mp4"
        poster="/videos/demovedio-poster.jpg"
        className="h-full w-full object-cover"
        controls={playing}
        loop
        playsInline
        preload="none"
        aria-label="Meet to Manage product walkthrough"
      />
      {!playing && (
        <button
          type="button"
          onClick={handlePlay}
          aria-label="Play the product walkthrough video"
          className="group absolute inset-0 flex items-center justify-center bg-[#0B1220]/25 transition-colors hover:bg-[#0B1220]/40 focus-visible:outline focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-[#FDBA74]"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-[#C2410C] shadow-2xl transition-transform group-hover:scale-110">
            <Play className="h-7 w-7 translate-x-0.5 rtl:-translate-x-0.5 rtl:-scale-x-100" fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}
