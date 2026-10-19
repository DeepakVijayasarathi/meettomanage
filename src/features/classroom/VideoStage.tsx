import { useEffect, useRef, useState } from "react";
import type { Participant } from "@/types";
import VideoTile from "./VideoTile";

interface VideoStageProps {
  participants: Participant[];
  boardAccess: Record<string, boolean>;
  selfId?: string;
  pinnedId: string | null;
  onTogglePin: (id: string) => void;
}

/**
 * Picks the column count that makes 16:9 tiles as large as possible for the stage's current
 * size — the same "fill the screen" behaviour as Meet/Zoom's gallery, rather than a fixed
 * 2×2 that leaves big empty bands on wide or tall screens.
 */
function bestColumns(count: number, width: number, height: number, gap: number) {
  let best = { cols: 1, area: 0 };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const cellW = (width - gap * (cols - 1)) / cols;
    const cellH = (height - gap * (rows - 1)) / rows;
    const tileW = Math.min(cellW, (cellH * 16) / 9);
    const area = tileW * ((tileW * 9) / 16);
    if (area > best.area) best = { cols, area };
  }
  return best.cols;
}

export default function VideoStage({ participants, boardAccess, selfId, pinnedId, onTogglePin }: VideoStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1200, height: 700 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const tile = (p: Participant, compact = false) => (
    <VideoTile
      key={p.id}
      participant={p}
      isSelf={p.id === selfId}
      canDrawBoard={Boolean(boardAccess[p.id])}
      pinned={p.id === pinnedId}
      onTogglePin={() => onTogglePin(p.id)}
      compact={compact}
    />
  );

  const pinned = participants.find((p) => p.id === pinnedId);
  if (pinned) {
    const others = participants.filter((p) => p.id !== pinned.id);
    return (
      <div ref={ref} className="flex h-full flex-col gap-2 p-2 md:flex-row">
        <div className="min-h-0 flex-1">{tile(pinned)}</div>
        {others.length > 0 && (
          <div className="flex h-28 shrink-0 gap-2 overflow-x-auto md:h-auto md:w-56 md:flex-col md:overflow-y-auto md:overflow-x-hidden">
            {others.map((p) => (
              <div key={p.id} className="aspect-video h-full shrink-0 md:h-auto md:w-full">
                {tile(p, true)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const gap = 8;
  const width = size.width - 16;
  const height = size.height - 16;
  const cols = bestColumns(participants.length, width, height, gap);
  const rows = Math.ceil(participants.length / cols);
  const tileW = Math.max(0, Math.min((width - gap * (cols - 1)) / cols, (((height - gap * (rows - 1)) / rows) * 16) / 9));

  // Fixed-size 16:9 tiles in a centred wrap, so an uneven last row sits in the middle like Meet.
  return (
    <div ref={ref} className="flex h-full flex-wrap content-center items-center justify-center p-2" style={{ gap }}>
      {participants.map((p) => (
        <div key={p.id} style={{ width: tileW, height: (tileW * 9) / 16 }}>
          {tile(p)}
        </div>
      ))}
    </div>
  );
}
