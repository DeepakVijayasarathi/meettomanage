import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Clock, Link2, Linkedin, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Seo } from "@/components/Seo";
import { EmptyState } from "@/components/EmptyState";
import { useLightBrandScope } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CTA_ORANGE, EYEBROW, FOCUS_RING, HERO_BG } from "./styles";
import { PostCard, TopicChip } from "./blogMeta";
import { formatDate, topicOf } from "./blogTopics";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { getBlogPost, listBlogPosts, type ApiBlogPostDetail, type ApiBlogPostSummary } from "@/api/marketing";
import { DEMO_BLOG_SUMMARIES, getDemoBlogPost } from "@/data/blogPosts";

const WHATSAPP_URL = "https://wa.me/919344773231";

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
    byline: "By the Meet to Manage team",
    onThisPage: "On this page",
    sideHeading: "Run your academy from one place",
    sideSub: "Live classes, admissions, billing and reports — see it in a free 30-minute demo.",
    sideCta: "Book a free demo",
    whatsapp: "Or chat on WhatsApp",
    share: "Share this post",
    copyLink: "Copy link",
    copied: "Link copied",
    progressAria: "Reading progress",
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
    byline: "بقلم فريق Meet to Manage",
    onThisPage: "في هذه الصفحة",
    sideHeading: "أدر أكاديميتك من مكان واحد",
    sideSub: "حصص مباشرة وقبول وفوترة وتقارير — شاهدها في عرض مجاني مدته 30 دقيقة.",
    sideCta: "احجز عرضًا مجانيًا",
    whatsapp: "أو تحدّث عبر واتساب",
    share: "شارك هذه المقالة",
    copyLink: "نسخ الرابط",
    copied: "تم نسخ الرابط",
    progressAria: "تقدّم القراءة",
    rights: (year: number) => `© ${year} Meet to Manage. جميع الحقوق محفوظة.`,
  },
};

type Block = { kind: "heading"; text: string; id: string } | { kind: "list"; items: string[] } | { kind: "text"; text: string };

const BULLET = /^[•-]\s+/;

/**
 * Markdown-lite: a blank line starts a new block, "## " starts a heading, and a block whose
 * lines all start with "- " or "• " is a list (consecutive list blocks merge into one list).
 * Inline, **bold** is supported — see renderInline.
 */
function parseMarkdownLite(content: string): Block[] {
  const blocks: Block[] = [];
  const usedIds = new Set<string>();
  for (const raw of content.split(/\n{2,}/)) {
    const block = raw.trim();
    if (!block) continue;
    if (block.startsWith("## ")) {
      const text = block.slice(3).trim();
      const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
      let id = base;
      for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
      usedIds.add(id);
      blocks.push({ kind: "heading", text, id });
      continue;
    }
    const lines = block.split("\n").map((l) => l.trim());
    if (lines.every((l) => BULLET.test(l))) {
      const items = lines.map((l) => l.replace(BULLET, ""));
      const last = blocks[blocks.length - 1];
      if (last?.kind === "list") last.items.push(...items);
      else blocks.push({ kind: "list", items });
      continue;
    }
    blocks.push({ kind: "text", text: lines.join(" ") });
  }
  return blocks;
}

const INLINE = /(\*\*[^*]+\*\*|meettomanage\.cloud\/get-started|\+91 93447 73231)/g;
const INLINE_LINK = "font-semibold text-[#C2410C] underline decoration-[#F97316]/40 underline-offset-4 hover:decoration-[#C2410C]";

/** **bold**, plus the demo URL and WhatsApp number posts close with, become real formatting/links. */
function renderInline(text: string): ReactNode {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i} className="font-bold text-[#111]">{part.slice(2, -2)}</strong>;
    }
    if (part === "meettomanage.cloud/get-started") {
      return <Link key={i} to="/get-started" className={INLINE_LINK}>{part}</Link>;
    }
    if (part === "+91 93447 73231") {
      return <a key={i} href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={INLINE_LINK}>{part}</a>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/** 0–1 share of the page scrolled, for the reading-progress bar. */
function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return progress;
}

const SHARE_BUTTON = `flex h-10 w-10 items-center justify-center border border-[#D9E1F0] bg-white text-[#333] transition-colors hover:border-[#F97316] hover:text-[#C2410C] ${FOCUS_RING}`;
const DARK_GLOW =
  "radial-gradient(50% 80% at 0% 0%, rgba(249,115,22,0.35), transparent 70%), radial-gradient(50% 80% at 100% 100%, rgba(124,92,252,0.4), transparent 70%)";

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

  const more = otherPosts.filter((p) => p.slug !== slug).slice(0, 3);
  const blocks = useMemo(() => (post ? parseMarkdownLite(post.content) : []), [post]);
  const headings = blocks.filter((b): b is Extract<Block, { kind: "heading" }> => b.kind === "heading");
  const firstTextIndex = blocks.findIndex((b) => b.kind === "text");
  const topic = post ? topicOf({ slug, title: post.title }) : null;
  const progress = useScrollProgress();
  const [copied, setCopied] = useState(false);
  const pageUrl = `${window.location.origin}/blog/${slug}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure context, permissions) — nothing useful to show.
    }
  }

  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-white text-[#171B22]">
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

      <div
        className="fixed inset-x-0 top-0 z-40 h-1 origin-left bg-[linear-gradient(90deg,#F97316_0%,#F53BA6_55%,#7C5CFC_100%)] rtl:origin-right"
        style={{ transform: `scaleX(${progress})` }}
        role="progressbar"
        aria-label={t.progressAria}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      />

      <header className="sticky top-0 z-30 border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Meet to Manage home">
            <Logo wordmarkClassName="mix-blend-multiply" />
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

      {post && topic && (
        <section className="border-b border-[#F1E6DC]" style={{ background: HERO_BG }}>
          <div className="mx-auto max-w-[860px] px-5 py-[clamp(48px,6vw,88px)] text-center">
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#5B6472]">
              <TopicChip topic={topic} />
              <span>{formatDate(post.publishedAtUtc)}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {t.readMinutes(post.readMinutes)}
              </span>
            </div>
            <h1 className="font-display mx-auto mt-6 max-w-[24ch] text-[clamp(2rem,4.2vw,3.5rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#111] rtl:tracking-normal">
              {post.title}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[clamp(1rem,1.4vw,1.1875rem)] leading-relaxed text-[#444]">{post.excerpt}</p>
            <p className="mt-6 text-sm font-semibold text-[#5B6472]">{t.byline}</p>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-[1160px] px-5 py-[clamp(40px,5vw,72px)]">
        {loading ? (
          <div className="flex justify-center py-16 text-[#5B6472]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !post ? (
          <EmptyState
            className="mx-auto max-w-[760px] rounded-none"
            icon={AlertCircle}
            title={t.notFoundTitle}
            description={live && error ? t.notFoundLoadError(error) : t.notFoundMoved}
          />
        ) : (
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_300px]">
            <article className="min-w-0 max-w-[720px]">
              <div className="flex flex-col gap-6">
                {blocks.map((block, i) =>
                  block.kind === "heading" ? (
                    <h2
                      key={i}
                      id={block.id}
                      className="font-display mt-6 flex scroll-mt-24 items-start gap-3 text-[clamp(1.375rem,2vw,1.75rem)] font-extrabold leading-tight tracking-[-0.02em] text-[#111] first:mt-0 rtl:tracking-normal"
                    >
                      <span className="mt-[0.2em] h-[0.9em] w-1 shrink-0 bg-[linear-gradient(180deg,#F97316,#F53BA6)]" aria-hidden />
                      {block.text}
                    </h2>
                  ) : block.kind === "list" ? (
                    <ul key={i} className="flex flex-col gap-3 border border-[#F1E6DC] bg-[#FFFBF7] p-5 sm:p-6">
                      {block.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3 text-[clamp(1rem,1.3vw,1.0625rem)] leading-[1.65] text-[#333]">
                          <span className="mt-[0.25em] flex h-5 w-5 shrink-0 items-center justify-center bg-[#EA580C] text-white">
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </span>
                          <span>{renderInline(item)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p
                      key={i}
                      className={
                        i === firstTextIndex
                          ? "text-[clamp(1.125rem,1.6vw,1.3125rem)] leading-[1.7] text-[#1F2430]"
                          : "text-[clamp(1rem,1.3vw,1.125rem)] leading-[1.8] text-[#333]"
                      }
                    >
                      {renderInline(block.text)}
                    </p>
                  )
                )}
              </div>

              <div className="mt-12 flex flex-wrap items-center gap-3 border-y border-[#E6EAF2] py-5">
                <span className="me-2 text-sm font-bold text-[#111]">{t.share}</span>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${pageUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className={SHARE_BUTTON}
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className={SHARE_BUTTON}
                >
                  <Linkedin className="h-4 w-4" />
                </a>
                <button type="button" onClick={copyLink} aria-label={t.copyLink} className={SHARE_BUTTON}>
                  {copied ? <Check className="h-4 w-4 text-[#16A34A]" /> : <Link2 className="h-4 w-4" />}
                </button>
                {copied && (
                  <span className="text-xs font-semibold text-[#16A34A]" role="status">
                    {t.copied}
                  </span>
                )}
              </div>

              <div className="relative mt-12 overflow-hidden bg-[#0D1024] px-6 py-12 text-center text-white sm:px-12">
                <div className="absolute inset-0 opacity-60" style={{ background: DARK_GLOW }} aria-hidden />
                <div className="relative">
                  <h3 className="font-display text-[clamp(1.5rem,2.4vw,2.125rem)] font-extrabold leading-tight tracking-[-0.02em] rtl:tracking-normal">{t.ctaHeading}</h3>
                  <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-white/80">{t.ctaSub}</p>
                  <Link to="/get-started" className={cn(CTA_ORANGE, "mt-7")}>
                    {t.requestDemo} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                  </Link>
                </div>
              </div>
            </article>

            <aside className="hidden lg:block">
              <div className="sticky top-24 flex flex-col gap-6">
                {headings.length > 1 && (
                  <nav aria-label={t.onThisPage} className="border border-[#E6EAF2] p-5">
                    <p className={EYEBROW}>{t.onThisPage}</p>
                    <ul className="mt-3 flex flex-col">
                      {headings.map((h) => (
                        <li key={h.id}>
                          <a
                            href={`#${h.id}`}
                            className={cn(
                              "block border-s-2 border-transparent py-1.5 ps-3 text-sm leading-snug text-[#5B6472] hover:border-[#F97316] hover:text-[#111]",
                              FOCUS_RING
                            )}
                          >
                            {h.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
                <div className="relative overflow-hidden bg-[#0D1024] p-6 text-white">
                  <div className="absolute inset-0 opacity-70" style={{ background: DARK_GLOW }} aria-hidden />
                  <div className="relative">
                    <p className="font-display text-lg font-extrabold leading-snug">{t.sideHeading}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/75">{t.sideSub}</p>
                    <Link to="/get-started" className={cn(CTA_ORANGE, "mt-5 w-full min-w-0 px-4 py-3 text-sm")}>
                      {t.sideCta}
                    </Link>
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" /> {t.whatsapp}
                    </a>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {more.length > 0 && (
        <section className="border-t border-[#F1E6DC] bg-[#FFFBF7] py-[clamp(48px,6vw,80px)]">
          <div className="mx-auto max-w-[1160px] px-5">
            <p className={EYEBROW}>{t.moreFromBlog}</p>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((p) => (
                <PostCard key={p.slug} post={p} readMinutes={t.readMinutes} />
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="border-t border-black/10 bg-[#F5F6F9] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-start">
          <Logo imgClassName="h-11 w-11" wordmarkClassName="mix-blend-multiply" />
          <p className="text-xs font-medium text-[#5B6472]">{t.rights(new Date().getFullYear())}</p>
        </div>
      </footer>
    </div>
  );
}
