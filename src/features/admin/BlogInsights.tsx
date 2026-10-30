import { useState } from "react";
import { Lightbulb, Loader2, PenLine, Sparkles, TrendingUp, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineAlert } from "@/components/InlineAlert";
import { useApiData } from "@/api/hooks";
import { getMarketingContentPerformance, suggestBlogPosts, writeBlogDraft, type ApiMarketingBlogIdea, type ApiMarketingBlogIdeas, type ApiMarketingContentPerformance } from "@/api/marketing";
import { userMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const EMPTY: ApiMarketingContentPerformance = { days: 30, startDate: "", endDate: "", blogReaders: 0, posts: [] };
const WINDOWS = [30, 90] as const;

/**
 * Blog Posts → what readers engage with (and act on), plus AI ideas for the next posts.
 * `onDraft` opens the New Post form pre-filled — with just the outline, or with a full AI-written
 * draft. Nothing is saved or published automatically.
 */
export interface BlogDraftPrefill { title: string; excerpt?: string; content: string }

const outlineDraft = (idea: ApiMarketingBlogIdea): BlogDraftPrefill => ({
  title: idea.title,
  content: (idea.outline.length > 0 ? idea.outline : ["Introduction", "Main points", "Next steps"]).map((h) => `## ${h}\n\nWrite this section…`).join("\n\n"),
});

export function BlogInsights({ onDraft }: { onDraft: (draft: BlogDraftPrefill) => void }) {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const { data, loading, error } = useApiData(() => getMarketingContentPerformance(days), EMPTY, EMPTY, { cacheKey: `marketing-content-${days}`, ttlMs: 60_000 });
  const [ideas, setIdeas] = useState<ApiMarketingBlogIdeas | null>(null);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState<string | null>(null);
  const [writing, setWriting] = useState<number | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);

  async function write(idea: ApiMarketingBlogIdea, index: number) {
    setWriting(index);
    setWriteError(null);
    try {
      const draft = await writeBlogDraft(idea);
      if (!draft.aiPowered) setWriteError("AI is unavailable right now, so the draft only has the outline.");
      onDraft({ title: draft.title, excerpt: draft.excerpt, content: draft.content });
    } catch (err) {
      setWriteError(userMessage(err, "Couldn't write the draft right now."));
    } finally {
      setWriting(null);
    }
  }

  async function suggest() {
    setIdeasLoading(true);
    setIdeasError(null);
    try {
      setIdeas(await suggestBlogPosts(90));
    } catch (err) {
      setIdeasError(userMessage(err, "Couldn't get suggestions right now."));
    } finally {
      setIdeasLoading(false);
    }
  }

  const top = data.posts.slice(0, 8);
  const maxReaders = Math.max(1, ...top.map((p) => p.readers));
  const name = (p: { title: string | null; path: string }) => p.title ?? p.path.replace("/blog/", "");

  return (
    <div className="mb-6 grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-primary" />What readers like</CardTitle>
            <CardDescription>{data.blogReaders} blog readers · ranked by how many went on to pricing or a demo page</CardDescription>
          </div>
          <div role="group" aria-label="Period" className="inline-flex rounded-md border p-0.5">
            {WINDOWS.map((w) => (
              <button key={w} type="button" aria-pressed={days === w} onClick={() => setDays(w)}
                className={cn("rounded px-2 py-1 text-xs font-semibold", days === w ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                {w} days
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <InlineAlert variant="warning">Couldn't load reader stats ({error}).</InlineAlert>
          ) : loading && top.length === 0 ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : top.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blog readers in this period yet.</p>
          ) : (
            <div className="space-y-3">
              {top.map((p) => (
                <div key={p.path}>
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <a href={p.path} target="_blank" rel="noreferrer" className="line-clamp-1 font-medium hover:underline">{name(p)}</a>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {p.readers} {p.readers === 1 ? "reader" : "readers"}
                      {p.toBuyingPages > 0 && <span className="ml-1 font-semibold text-success">· {p.toBuyingPages} → pricing/demo</span>}
                      {p.bookedDemo > 0 && <span className="ml-1 font-semibold text-success">· {p.bookedDemo} booked</span>}
                    </span>
                  </div>
                  <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted" title={`${p.wentOn} of ${p.readers} read another page`}>
                    <div className="h-full bg-primary" style={{ width: `${(p.readers / maxReaders) * 100}%` }} />
                  </div>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">Small numbers — read these as early signals, not proof.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4 text-primary" />Next posts to write</CardTitle>
            <CardDescription>AI ideas from what readers act on and what visitors ask the chat (last 90 days).</CardDescription>
          </div>
          <Button size="sm" onClick={() => void suggest()} disabled={ideasLoading}>
            {ideasLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {ideas ? "Suggest again" : "Suggest"}
          </Button>
        </CardHeader>
        <CardContent>
          {ideasError && <InlineAlert variant="warning" className="mb-3">{ideasError}</InlineAlert>}
          {writeError && <InlineAlert variant="warning" className="mb-3">{writeError}</InlineAlert>}
          {!ideas && !ideasLoading && !ideasError && (
            <p className="text-sm text-muted-foreground">Click <b>Suggest</b> for five fresh post ideas, each with a search keyword, the reason, and an outline you can turn into a draft.</p>
          )}
          {ideas && ideas.ideas.length === 0 && <p className="text-sm text-muted-foreground">Not enough reader or chat data yet for suggestions.</p>}
          {ideas && ideas.ideas.length > 0 && (
            <div className="space-y-3">
              {!ideas.aiPowered && <p className="text-xs text-muted-foreground">AI is unavailable right now — these come from your measured data.</p>}
              {writing !== null && <p className="text-xs text-muted-foreground">Writing a full draft takes about 30–60 seconds…</p>}
              {ideas.ideas.map((idea, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium leading-snug">{idea.title}</p>
                    <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                      <Button size="sm" onClick={() => void write(idea, i)} disabled={writing !== null} title="AI writes the full post (about 1,000 words) as a draft for you to edit">
                        {writing === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}{writing === i ? "Writing…" : "Write with AI"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDraft(outlineDraft(idea))} disabled={writing !== null}><PenLine className="h-3.5 w-3.5" />Outline only</Button>
                    </div>
                  </div>
                  {idea.targetKeyword && <Badge variant="outline" className="mt-2 font-normal">🔎 {idea.targetKeyword}</Badge>}
                  {idea.why && <p className="mt-2 text-sm text-muted-foreground">{idea.why}</p>}
                  {idea.outline.length > 0 && (
                    <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-muted-foreground">
                      {idea.outline.map((h, j) => <li key={j}>{h}</li>)}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
