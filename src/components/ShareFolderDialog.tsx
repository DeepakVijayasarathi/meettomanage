import { useEffect, useMemo, useState } from "react";
import { Layers, Loader2, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { userMessage } from "@/lib/api";
import { listStudents } from "@/api/users";
import { listBatches, type ApiBatch } from "@/api/batches";
import { listFolderAccess, listFolderBatchAccess, setFolderAccess, setFolderBatchAccess } from "@/api/resourceFolders";

interface ParentOption {
  id: string;
  name: string;
  children: string;
}

/**
 * Chooses who a folder is shared with: any number of batches (every parent with a child enrolled in
 * one sees the folder, including parents who enrol later) and/or individual parents. Whoever is added
 * can view and download everything in the folder and its subfolders; the files are never uploaded
 * again. Only opened for staff who can edit Content Access.
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
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [initialBatches, setInitialBatches] = useState<Set<string>>(new Set());
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());
  const [batchQuery, setBatchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setQuery("");
    Promise.all([listStudents(), listFolderAccess(folderId), listBatches(), listFolderBatchAccess(folderId)])
      .then(([students, access, allBatches, batchAccess]) => {
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

        // Same idea for batches: one already shared with but no longer listed (e.g. archived) must still show.
        const shown = new Map(allBatches.map((b) => [b.id, b]));
        for (const a of batchAccess) {
          if (!shown.has(a.batchId)) {
            shown.set(a.batchId, { id: a.batchId, name: a.batchName, courseName: a.courseName ?? "" } as ApiBatch);
          }
        }
        setBatches([...shown.values()].sort((a, b) => a.name.localeCompare(b.name)));
        const currentBatches = new Set(batchAccess.map((a) => a.batchId));
        setInitialBatches(currentBatches);
        setSelectedBatches(new Set(currentBatches));
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

  const filteredBatches = useMemo(() => {
    const q = batchQuery.trim().toLowerCase();
    return q ? batches.filter((b) => b.name.toLowerCase().includes(q) || (b.courseName ?? "").toLowerCase().includes(q)) : batches;
  }, [batches, batchQuery]);

  const batchesToAdd = [...selectedBatches].filter((id) => !initialBatches.has(id));
  const batchesToRemove = [...initialBatches].filter((id) => !selectedBatches.has(id));
  const allBatchesShownSelected = filteredBatches.length > 0 && filteredBatches.every((b) => selectedBatches.has(b.id));

  function toggleBatch(id: string) {
    setSelectedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllBatchesShown() {
    setSelectedBatches((prev) => {
      const next = new Set(prev);
      for (const b of filteredBatches) {
        if (allBatchesShownSelected) next.delete(b.id);
        else next.add(b.id);
      }
      return next;
    });
  }

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
      if (toAdd.length > 0 || toRemove.length > 0) await setFolderAccess(folderId, toAdd, toRemove);
      if (batchesToAdd.length > 0 || batchesToRemove.length > 0) await setFolderBatchAccess(folderId, batchesToAdd, batchesToRemove);
      const parts = [
        selectedBatches.size > 0 ? `${selectedBatches.size} batch${selectedBatches.size === 1 ? "" : "es"}` : null,
        selected.size > 0 ? `${selected.size} parent${selected.size === 1 ? "" : "s"}` : null,
      ].filter(Boolean);
      toast({
        variant: "success",
        title: "Sharing updated",
        description: parts.length > 0 ? `“${folderName}” is now shared with ${parts.join(" and ")}.` : `“${folderName}” is no longer shared.`,
      });
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
            Everyone you choose can view and download everything in this folder, including subfolders. Share with as many batches or parents as you like — the files are only uploaded once.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="batches">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="batches" className="gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Batches{selectedBatches.size > 0 ? ` (${selectedBatches.size})` : ""}
            </TabsTrigger>
            <TabsTrigger value="parents" className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> Parents{selected.size > 0 ? ` (${selected.size})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="batches" className="mt-3 grid gap-3">
            <p className="text-xs text-muted-foreground">
              Every parent with a child enrolled in a ticked batch gets access — including parents who enrol later, so new enrolments need no extra step.
            </p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search batch or course…" value={batchQuery} onChange={(e) => setBatchQuery(e.target.value)} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button type="button" className="font-semibold text-primary hover:underline disabled:opacity-50" onClick={toggleAllBatchesShown} disabled={filteredBatches.length === 0}>
                {allBatchesShownSelected ? "Unselect" : "Select"} all {batchQuery ? "shown" : ""} ({filteredBatches.length})
              </button>
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" /> {selectedBatches.size} selected
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border">
              {loading ? (
                <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading batches…
                </p>
              ) : filteredBatches.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No batches match.</p>
              ) : (
                <ul className="divide-y">
                  {filteredBatches.map((b) => (
                    <li key={b.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
                        <Checkbox checked={selectedBatches.has(b.id)} onCheckedChange={() => toggleBatch(b.id)} aria-label={`Share with batch ${b.name}`} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">{b.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {[b.courseName, typeof b.enrolledCount === "number" ? `${b.enrolledCount} enrolled` : null].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="parents" className="mt-3 grid gap-3">
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

            <div className="max-h-64 overflow-y-auto rounded-lg border">
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
          </TabsContent>
        </Tabs>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <DialogFooter className="flex-wrap items-center">
          <span className="mr-auto text-xs text-muted-foreground">
            {toAdd.length + batchesToAdd.length > 0 && `+${toAdd.length + batchesToAdd.length} to share`}{" "}
            {toRemove.length + batchesToRemove.length > 0 && `−${toRemove.length + batchesToRemove.length} to remove`}
          </span>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || loading || (toAdd.length === 0 && toRemove.length === 0 && batchesToAdd.length === 0 && batchesToRemove.length === 0)}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
