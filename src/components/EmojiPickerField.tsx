import { useState } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Curated, classroom-relevant set — not the full Unicode emoji table, which would make the
 *  picker an unscrollable wall of symbols with no relevance to what a matching/hotspot
 *  activity actually needs (fruit, animals, everyday objects a young child recognizes). */
const EMOJI_GROUPS: { label: string; emoji: string[] }[] = [
  { label: "Fruit & food", emoji: ["🍎", "🍌", "🍇", "🍊", "🍓", "🍉", "🍍", "🥝", "🥕", "🌽", "🍞", "🍕"] },
  { label: "Animals", emoji: ["🐶", "🐱", "🐭", "🐰", "🐻", "🦁", "🐯", "🐸", "🐷", "🐮", "🐔", "🐟", "🦋", "🐝", "🐢"] },
  { label: "Nature & weather", emoji: ["☀️", "🌙", "⭐", "☁️", "🌧️", "🌈", "🌳", "🌸", "🍂", "❄️"] },
  { label: "Everyday objects", emoji: ["👟", "🎈", "🚗", "🚢", "✈️", "🚲", "🏠", "📚", "✏️", "🎒", "⚽", "🎨", "🕐", "📱", "🔑"] },
  { label: "Faces & hands", emoji: ["😀", "😊", "😴", "😮", "👍", "👎", "👋", "🙌", "❤️", "🎉"] },
  { label: "Shapes & symbols", emoji: ["🔺", "🔵", "🟩", "⭐", "❤️", "➕", "➖", "✖️", "🔢", "🔤"] },
];

interface EmojiPickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
  className?: string;
}

/**
 * Emoji input with a click-to-browse picker — typing/pasting one directly still works (the
 * field stays a real text input), the popover just saves hunting through a system emoji
 * keyboard for something classroom-appropriate.
 */
export function EmojiPickerField({ value, onChange, className, ...aria }: EmojiPickerFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          placeholder="🍎"
          aria-label={aria["aria-label"]}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          className={cn("cursor-pointer text-center text-lg", className)}
        />
      </PopoverAnchor>
      <PopoverContent align="start" className="w-72 p-3" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
              <div className="grid grid-cols-8 gap-1">
                {group.emoji.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      onChange(e);
                      setOpen(false);
                    }}
                    aria-label={`Use ${e}`}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      value === e && "bg-primary/10 ring-1 ring-primary"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
