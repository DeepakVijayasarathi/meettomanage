import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, checked, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    checked={checked}
    className={cn(
      // Visual box stays 18x18 (unchanged, so the dense 72-cell permission matrix and every
      // other consumer keeps its current layout) but the tappable area is enlarged to 24x24
      // via an invisible ::before, meeting WCAG 2.2 SC 2.5.8's minimum target size. A pseudo-
      // element still dispatches clicks to its host, so this needs no extra JS.
      "peer relative h-[18px] w-[18px] shrink-0 rounded-[5px] border border-input shadow-sm before:absolute before:-inset-[3px] before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary/50 data-[state=indeterminate]:border-primary data-[state=indeterminate]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
      {checked === "indeterminate" ? <Minus className="h-3 w-3" /> : <Check className="h-3.5 w-3.5" />}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
