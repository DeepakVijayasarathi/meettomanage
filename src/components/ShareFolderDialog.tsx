import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { userMessage } from "@/lib/api";
import { listStudents } from "@/api/users";
import { listFolderAccess, setFolderAccess } from "@/api/resourceFolders";

interface ParentOption {
  id: string;
  name: string;
  children: string;
}

/**
 * Chooses which parents a folder is shared with. A parent added here can view and download
 * everything in the folder and its subfolders; there is no limit on how many parents, and the same
 * files are never uploaded again. Only opened for staff who can edit Content Access.
 */
export function ShareFolderDialog({
  folderId,
  folderName,
  open,
  onOpenChange,
  onSaved,
}: {
  folderId: string;
  folderName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setQuery("");
    Promise.all([listStudents(), listFolderAccess(folderId)])
      .then(([students, access]) => {
        if (cancelled) return;
        // One row per parent (a parent with two children appears once, listing both names).
        const byParent = new Map<string, ParentOption>();
        for (const s of students) {
          const existing = byParent.get(s.parentId);
          if (existing) existing.children += `, ${s.name}`;
          else byParent.set(s.parentId, { id: s.parentId, name: s.parentName ?? "Parent", children: s.name });
        }
        // A parent already shared with but no longer in the students list must still show, so they can be removed.
        for (const a of access) {
          if (!byParent.has(a.parentProfileId)) byParent.set(a.parentProfileId, { id: a.parentProfileId, name: a.parentName, children: a.childNames });
        }
        setParents([...byParent.values()].sort((a, b) => a.name.localeCompare(b.name)));
        const current = new Set(access.map((a) => a.parentProfileId));
        setInitial(current);
        setSelected(new Set(current));
      })
      .catch((err) => !cancelled && setError(userMessage(err, "Could not load parents.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, folderId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? parents.filter((p) => p.name.toLowerCase().includes(q) || p.children.toLowerCase().includes(q)) : parents;
  }, [parents, query]);

  const toAdd = [...selected].filter((id) => !initial.has(id));
  const toRemove = [...initial].filter((id) => !selected.has(id));
  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of filtered) {
        if (allFilteredSelected) next.delete(p.id);
        else next.add(p.id);
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await setFolderAccess(folderId, toAdd, toRemove);
      toast({ variant: "success", title: "Sharing updated", description: `“${folderName}” is now shared with ${selected.size} parent${selected.size === 1 ? "" : "s"}.` });
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(userMessage(err, "Could not update sharing."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share “{folderName}”</DialogTitle>
          <DialogDescription>
            Every parent you tick can view and download everything in this folder, including subfolders. Share with as many as you like — the files are only uploaded once.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search parent or child…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button type="button" className="font-semibold text-primary hover:underline disabled:opacity-50" onClick={toggleAllFiltered} disabled={filtered.length === 0}>
            {allFilteredSelected ? "Unselect" : "Select"} all {query ? "shown" : ""} ({filtered.length})
          </button>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {selected.size} selected
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-lg border">
          {loading ? (
            <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading parents…
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No parents match.</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
                    <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} aria-label={`Share with ${p.name}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{p.children}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <DialogFooter className="flex-wrap items-center">
          <span className="mr-auto text-xs text-muted-foreground">
            {toAdd.length > 0 && `+${toAdd.length} to share`} {toRemove.length > 0 && `−${toRemove.length} to remove`}
          </span>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || loading || (toAdd.length === 0 && toRemove.length === 0)}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
