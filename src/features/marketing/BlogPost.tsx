import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Seo } from "@/components/Seo";
import { EmptyState } from "@/components/EmptyState";
import { useLightBrandScope } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { getBlogPost, listBlogPosts, type ApiBlogPostDetail, type ApiBlogPostSummary } from "@/api/marketing";
import { DEMO_BLOG_SUMMARIES, getDemoBlogPost } from "@/data/blogPosts";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/** Page chrome only — the post itself (title/content/excerpt, from getBlogPost()/
 *  getDemoBlogPost()) is real editorial content and stays English-only here, same boundary
 *  as BlogList.tsx. */
const T = {
  en: {
    allPosts: "All posts",
    readMinutes: (n: number) => `${n} min read`,
    notFoundTitle: "Couldn't find that post",
    notFoundLoadError: (err: string) => `Couldn't load this post (${err}).`,
    notFoundMoved: "It may have been unpublished or moved.",
    ctaHeading: "See it running in your own academy",
    ctaSub: "A platform demo shows you exactly how scheduling, billing and admissions work together.",
    requestDemo: "Request a Demo",
    moreFromBlog: "More from the blog",
    rights: (year: number) => `© ${year} Meet to Manage. All rights reserved.`,
  },
  ar: {
    allPosts: "كل المقالات",
    readMinutes: (n: number) => `${n} دقيقة قراءة`,
    notFoundTitle: "تعذّر العثور على هذه المقالة",
    notFoundLoadError: (err: string) => `تعذّر تحميل هذه المقالة (${err}).`,
    notFoundMoved: "ربما أُلغي نشرها أو نُقلت.",
    ctaHeading: "شاهدها وهي تعمل في أكاديميتك",
    ctaSub: "يوضّح لك العرض التوضيحي للمنصة بالضبط كيف تعمل الجدولة والفوترة والقبول معًا.",
    requestDemo: "اطلب عرضًا توضيحيًا",
    moreFromBlog: "المزيد من المدونة",
    rights: (year: number) => `© ${year} Meet to Manage. جميع الحقوق محفوظة.`,
  },
};

/** A blank line starts a new block; a block starting with "## " is a heading. */
function parseMarkdownLite(content: string): { heading?: string; text?: string }[] {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => (block.startsWith("## ") ? { heading: block.slice(3).trim() } : { text: block }));
}

export default function BlogPost() {
  useLightBrandScope();
  const { slug = "" } = useParams<{ slug: string }>();
  const live = apiEnabled();
  const [lang] = useLang();
  const t = T[lang];

  // useApiData fetches once per mount and only re-runs on an explicit reload() — clicking
  // between posts changes `slug` without remounting this component (same route element),
  // so it's a poor fit here. Plain state that re-derives/re-fetches whenever `slug` changes
  // works correctly in both demo and live mode instead.
  const [post, setPost] = useState<ApiBlogPostDetail | null>(() => (live ? null : getDemoBlogPost(slug) ?? null));
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!live) {
      setPost(getDemoBlogPost(slug) ?? null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getBlogPost(slug)
      .then((p) => {
        if (!cancelled) {
          setPost(p);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Request failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, live]);

  const { data: otherPosts } = useApiData<ApiBlogPostSummary[]>(() => listBlogPosts(), DEMO_BLOG_SUMMARIES);

  const more = otherPosts.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <div className="theme-light-scope min-h-screen bg-white text-[#171B22]">
      {/* Always renders — previously only rendered once `post` loaded, so a crawler hitting
          this route directly (or the loading/not-found states) got no meta tags at all,
          just index.html's site-wide defaults for every /blog/:slug URL. */}
      {post ? (
        <Seo title={`${post.title} — Meet to Manage Blog`} description={post.excerpt} path={`/blog/${slug}`} type="article" />
      ) : (
        <Seo
          title="Blog — Meet to Manage"
          description="Practical notes on running a modern academy: admissions, billing automation and scheduling."
          path={`/blog/${slug}`}
        />
      )}

      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Meet to Manage home">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button asChild variant="ghost">
              <Link to="/blog">
                <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {t.allPosts}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-14">
        {loading ? (
          <div className="flex justify-center py-16 text-[#5B6472]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !post ? (
          <EmptyState
            icon={AlertCircle}
            title={t.notFoundTitle}
            description={live && error ? t.notFoundLoadError(error) : t.notFoundMoved}
          />
        ) : (
          <>
            <p className="text-xs font-medium text-[#5B6472]">
              {formatDate(post.publishedAtUtc)} · {t.readMinutes(post.readMinutes)}
            </p>
            <h1 className="font-display mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{post.title}</h1>

            <div className="mt-10 flex flex-col gap-4">
              {parseMarkdownLite(post.content).map((block, i) =>
                block.heading ? (
                  <h2 key={i} className="font-display mt-4 text-xl font-bold tracking-tight text-[#171B22] first:mt-0">
                    {block.heading}
                  </h2>
                ) : (
                  <p key={i} className="text-base leading-relaxed text-[#5B6472]">
                    {block.text}
                  </p>
                )
              )}
            </div>

            <div className="mt-14 rounded-2xl border border-black/10 bg-[#F5F6F9] px-6 py-8 text-center">
              <h3 className="font-display text-lg font-bold text-[#171B22]">{t.ctaHeading}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#5B6472]">{t.ctaSub}</p>
              <Button asChild size="lg" className="mt-5 !bg-[#F97316] !text-white hover:!bg-[#EA580C]">
                <Link to="/get-started">{t.requestDemo}</Link>
              </Button>
            </div>
          </>
        )}

        {more.length > 0 && (
          <div className="mt-16 border-t border-black/10 pt-10">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">{t.moreFromBlog}</p>
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {more.map((p) => (
                <Link key={p.slug} to={`/blog/${p.slug}`} className="group">
                  <h4 className="font-display text-base font-bold text-[#171B22] group-hover:text-[#EA580C]">{p.title}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#5B6472]">{p.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      <footer className="border-t border-black/10 bg-[#F5F6F9] py-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-start">
          <Logo imgClassName="h-11 w-11" />
          <p className="text-xs font-medium text-[#5B6472]">{t.rights(new Date().getFullYear())}</p>
        </div>
      </footer>
    </div>
  );
}
