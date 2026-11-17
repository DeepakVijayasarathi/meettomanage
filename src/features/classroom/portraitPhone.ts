/** A phone (touch screen, narrow) currently held upright. */
export function isPortraitPhone(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(orientation: portrait) and (max-width: 600px) and (pointer: coarse)").matches
  );
}
