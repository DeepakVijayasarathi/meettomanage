/**
 * One readable line for the menus a module unlocks. The raw list repeats the same page once
 * per role that has it ("Admin — Users, itadmin — Users, Sub Admin — Users"), which turned each
 * row into a paragraph; this keeps each page once, shows the first few, and leaves the full
 * list for a hover tooltip.
 */
export function summarizeMenus(menus: string[]): { text: string; full: string } {
  const labels = [...new Set(menus.map((m) => m.replace(/^.*? — /, "").trim()).filter(Boolean))];
  const shown = labels.slice(0, 4);
  const rest = labels.length - shown.length;
  return {
    text: `Menus: ${shown.join(", ")}${rest > 0 ? ` +${rest} more` : ""}`,
    full: `Menus: ${menus.join(", ")}`,
  };
}
