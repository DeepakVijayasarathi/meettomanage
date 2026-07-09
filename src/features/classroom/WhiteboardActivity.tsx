import { useEffect, useState } from "react";
import { PartyPopper, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FruitItem {
  id: string;
  emoji: string;
  letter: string;
}

const ITEMS: FruitItem[] = [
  { id: "apple", emoji: "🍎", letter: "A" },
  { id: "banana", emoji: "🍌", letter: "B" },
  { id: "grapes", emoji: "🍇", letter: "G" },
  { id: "orange", emoji: "🍊", letter: "O" },
];

interface WhiteboardActivityProps {
  onClose: () => void;
  onAllMatched?: () => void;
}

/** Small drag-and-drop mini activity demoing an interactive layer over the whiteboard:
 * drag each fruit onto the box showing its matching first letter. */
export default function WhiteboardActivity({ onClose, onAllMatched }: WhiteboardActivityProps) {
  const [matched, setMatched] = useState<Record<string, boolean>>({});
  const [shake, setShake] = useState<string | null>(null);
  const allMatched = ITEMS.every((item) => matched[item.id]);

  useEffect(() => {
    if (allMatched) onAllMatched?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatched]);

  function handleDrop(e: React.DragEvent<HTMLDivElement>, letter: string) {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    const item = ITEMS.find((i) => i.id === itemId);
    if (!item || matched[itemId]) return;
    if (item.letter === letter) {
      setMatched((prev) => ({ ...prev, [itemId]: true }));
    } else {
      setShake(itemId);
      setTimeout(() => setShake(null), 450);
    }
  }

  return (
    <div className="absolute inset-x-4 top-4 z-20 rounded-2xl border border-border bg-card/95 p-4 shadow-pop backdrop-blur animate-pop-in sm:inset-x-10">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold">🎯 Drag the fruit to its matching first letter</p>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {allMatched ? (
        <div className="flex items-center justify-center gap-2 py-4 text-success">
          <PartyPopper className="h-5 w-5" />
          <p className="text-sm font-semibold">All matched — great job!</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap justify-center gap-3">
            {ITEMS.filter((item) => !matched[item.id]).map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
                className={cn(
                  "cursor-grab select-none rounded-xl bg-muted p-2.5 text-3xl leading-none transition active:cursor-grabbing",
                  shake === item.id && "animate-[wiggle_0.45s_ease-in-out] ring-2 ring-destructive"
                )}
              >
                {item.emoji}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {ITEMS.map((item) => (
              <div
                key={item.letter}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, item.letter)}
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed text-lg font-bold transition-colors",
                  matched[item.id] ? "border-success bg-success/10 text-success" : "border-border text-muted-foreground"
                )}
              >
                {matched[item.id] ? item.emoji : item.letter}
              </div>
            ))}
          </div>
        </>
      )}
      <style>{`
        @keyframes wiggle { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
      `}</style>
    </div>
  );
}
