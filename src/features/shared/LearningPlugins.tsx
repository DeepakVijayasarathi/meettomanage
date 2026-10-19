import { useMemo, useState } from "react";
import { BookOpen, Gamepad2, Heart, Printer, Search, Sparkles, Volume2, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LEARNING_PLUGINS, LEARNING_PLUGIN_CATEGORIES, type LearningPlugin } from "@/data/learningPlugins";
import { apiEnabled } from "@/lib/api";
import { useSession } from "@/state/session";

const CHALLENGES = [
  "Explain one idea in your own words.",
  "Find three examples around you.",
  "Show the answer without speaking.",
  "Teach this idea to a partner in 30 seconds.",
  "Create a quick example and ask someone to solve it.",
];

function typeLabel(type: LearningPlugin["type"]) {
  return type === "both" ? "Game + resource" : type === "game" ? "Interactive game" : "Teaching resource";
}

export default function LearningPlugins() {
  const { hasPermission } = useSession();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [type, setType] = useState<"all" | LearningPlugin["type"]>("all");
  const [selected, setSelected] = useState<LearningPlugin | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [challenge, setChallenge] = useState(0);

  const filtered = useMemo(() => LEARNING_PLUGINS.filter((plugin) => {
    const matchesQuery = `${plugin.name} ${plugin.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "All" || plugin.category === category;
    const matchesType = type === "all" || plugin.type === type || (type !== "both" && plugin.type === "both");
    return matchesQuery && matchesCategory && matchesType;
  }), [query, category, type]);

  if (apiEnabled() && !hasPermission("LearningPlugins", "View")) {
    return <div className="rounded-2xl border bg-card p-8"><h1 className="text-xl font-semibold">Learning Plugins</h1><p className="mt-2 text-sm text-muted-foreground">You do not have permission to open learning games and resources. Ask an administrator to grant Learning Plugins view access in Roles &amp; Permissions.</p></div>;
  }

  function open(plugin: LearningPlugin) {
    setSelected(plugin);
    setChallenge(Math.floor(Math.random() * CHALLENGES.length));
  }

  function speak() {
    if (!selected || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${selected.name}. ${CHALLENGES[challenge]}`);
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  function toggleFavorite(id: string) {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Games & resources"
        title="Learning Games & Activities"
        description={`${LEARNING_PLUGINS.length} ready-to-launch games and teaching resources across 10 skill areas. Open any plugin during a class or use its printable activity guide.`}
      />

      <div className="mb-5 grid gap-3 rounded-2xl border bg-card p-4 shadow-sm md:grid-cols-[1fr_auto_auto]">
        <label className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search games and resources…" className="pl-9" />
          {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear search"><X className="h-4 w-4" /></button>}
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 max-w-full rounded-md border bg-background px-3 text-sm">
          <option>All</option>{LEARNING_PLUGIN_CATEGORIES.map((name) => <option key={name}>{name}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="all">All types</option><option value="game">Games</option><option value="resource">Resources</option><option value="both">Game + resource</option>
        </select>
      </div>

      <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground"><span>{filtered.length} plugins</span><span>{favorites.size} favourites</span></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((plugin) => (
          <article key={plugin.id} className="group relative flex min-h-48 flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <button onClick={() => toggleFavorite(plugin.id)} className="absolute right-4 top-4 rounded-full p-2 hover:bg-muted" aria-label={`${favorites.has(plugin.id) ? "Remove" : "Add"} favourite`}>
              <Heart className={`h-4 w-4 ${favorites.has(plugin.id) ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}`} />
            </button>
            <span className="mb-3 text-3xl" aria-hidden="true">{plugin.emoji}</span>
            <p className="mb-1 pr-8 text-lg font-bold text-foreground">{plugin.name}</p>
            <p className="mb-4 line-clamp-1 text-xs text-muted-foreground">{plugin.category}</p>
            <div className="mt-auto flex items-center justify-between gap-2">
              <Badge variant="secondary" className="gap-1">{plugin.type === "resource" ? <BookOpen className="h-3 w-3" /> : <Gamepad2 className="h-3 w-3" />}{typeLabel(plugin.type)}</Badge>
              <Button size="sm" onClick={() => open(plugin)}>Open</Button>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-xl print:max-w-none print:border-0 print:shadow-none">
          {selected && <>
            <DialogHeader>
              <div className="text-4xl" aria-hidden="true">{selected.emoji}</div>
              <DialogTitle className="text-2xl">{selected.name}</DialogTitle>
              <DialogDescription>{selected.category} · {typeLabel(selected.type)}</DialogDescription>
            </DialogHeader>
            {(selected.type === "game" || selected.type === "both") && (
              <section className="rounded-2xl bg-primary/10 p-5 text-center">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Quick-play challenge</p>
                <p className="text-xl font-bold text-foreground">{CHALLENGES[challenge]}</p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button variant="outline" onClick={speak}><Volume2 className="h-4 w-4" /> Hear it</Button>
                  <Button onClick={() => setChallenge((challenge + 1) % CHALLENGES.length)}><Sparkles className="h-4 w-4" /> Next challenge</Button>
                </div>
              </section>
            )}
            {(selected.type === "resource" || selected.type === "both") && (
              <section className="rounded-2xl border p-5">
                <h3 className="font-bold">Ready-to-use activity guide</h3>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>Introduce <strong className="text-foreground">{selected.name}</strong> with one simple example.</li>
                  <li>Model the skill, then let learners practise in pairs.</li>
                  <li>Use the quick-play challenge as a five-minute check for understanding.</li>
                  <li>Ask each learner to reflect: “What did I learn, and what will I practise next?”</li>
                </ol>
                <Button variant="outline" className="mt-4" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print activity guide</Button>
              </section>
            )}
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

