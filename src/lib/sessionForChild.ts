import type { ClassSession } from "@/types";

/**
 * Whether a class belongs to `childId` in a family's portal. A batch class carries the family's
 * children in it (childIds). A demo has no child link, so it used to show under EVERY child --
 * reported live: one sibling (Tanvik) saw the other's (Laksh's) classes. A demo now shows only
 * under the child named on its booking, when that name matches one of the family's children.
 */
export function sessionBelongsToChild(
  session: ClassSession,
  childId: string,
  familyChildren: { id: string; name: string }[]
): boolean {
  if (session.childIds.length > 0) return session.childIds.includes(childId);
  const demoName = session.demoChildName?.trim().toLowerCase();
  if (!demoName) return true;
  const firstWord = (n: string) => n.trim().toLowerCase().split(/\s+/)[0] ?? "";
  const match = familyChildren.find(
    (c) => c.name.trim().toLowerCase() === demoName || firstWord(c.name) === firstWord(demoName)
  );
  // Booked for a child we can't match to anyone in the family: keep showing it (never hide a
  // family's own demo by accident).
  return match ? match.id === childId : true;
}
