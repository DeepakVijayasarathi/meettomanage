import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Seo } from "@/components/Seo";
import { InlineAlert } from "@/components/InlineAlert";
import { EmptyState } from "@/components/EmptyState";
import { useLightBrandScope } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MarketingHero } from "./MarketingHero";
import { ARROW_LINK } from "./styles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listBlogPosts, type ApiBlogPostSummary } from "@/api/marketing";
import { DEMO_BLOG_SUMMARIES } from "@/data/blogPosts";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/** Page chrome only — the posts themselves (title/excerpt/body, from listBlogPosts()/
 *  DEMO_BLOG_SUMMARIES and BlogPost.tsx) are real editorial content, not UI copy, and stay
 *  English-only here rather than getting a machine translation of substantive written
 *  articles. */
const T = {
  en: {
    backHome: "Back home",
    signIn: "Sign In",
    eyebrow: "Blog",
    heading: "Notes on running a modern academy",
    sub: "Practical thinking on admissions, billing, scheduling and the everyday friction of running classes at scale.",
    loadError: (err: string) => `Couldn't load posts (${err}).`,
    retry: "Retry",
    emptyTitle: "No posts published yet",
    emptyDescription: "Check back soon — we're working on the first one.",
    readMinutes: (n: number) => `${n} min read`,
    readMore: "Read more",
    rights: (year: number) => `© ${year} Meet to Manage. All rights reserved.`,
  },
  ar: {
    backHome: "العودة للرئيسية",
    signIn: "تسجيل الدخول",
    eyebrow: "المدونة",
    heading: "ملاحظات حول إدارة أكاديمية حديثة",
    sub: "أفكار عملية حول القبول والفوترة والجدولة والاحتكاك اليومي في إدارة الحصص على نطاق واسع.",
    loadError: (err: string) => `تعذّر تحميل المقالات (${err}).`,
    retry: "إعادة المحاولة",
    emptyTitle: "لا توجد مقالات منشورة بعد",
    emptyDescription: "تفقّد الصفحة قريبًا — نعمل على أول مقالة.",
    readMinutes: (n: number) => `${n} دقيقة قراءة`,
    readMore: "اقرأ المزيد",
    rights: (year: number) => `© ${year} Meet to Manage. جميع الحقوق محفوظة.`,
  },
};

export default function BlogList() {
  useLightBrandScope();
  const live = apiEnabled();
  const [lang] = useLang();
  const t = T[lang];
  const { data: posts, loading, error, reload } = useApiData<ApiBlogPostSummary[]>(() => listBlogPosts(), DEMO_BLOG_SUMMARIES);
  const sorted = [...posts].sort((a, b) => b.publishedAtUtc.localeCompare(a.publishedAtUtc));

  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="blog"
        title="Blog — Meet to Manage"
        description="Practical notes on running a modern academy: admissions, billing automation, scheduling and more."
        path="/blog"
      />

      <header className="sticky top-0 z-30 border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Meet to Manage home">
            <Logo wordmarkClassName="mix-blend-multiply" />
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageToggle className="hidden sm:inline-flex" />
            {/* Text label collapses to an icon-only button below `sm` — there isn't room for
                both this and Sign In as full-width buttons, but a visitor should still get an
                explicit way back to the homepage, not just an implicit logo tap. */}
            <Button asChild variant="ghost" size="icon" className="sm:hidden" aria-label={t.backHome}>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {t.backHome}
              </Link>
            </Button>
            <Button asChild className="!bg-[#EA580C] !text-white hover:!bg-[#C2410C]">
              <Link to="/login">
                {t.signIn} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex justify-center border-t border-black/5 py-1.5 sm:hidden">
          <LanguageToggle />
        </div>
      </header>

      <MarketingHero eyebrow={t.eyebrow} title={t.heading} sub={t.sub} />

      <section className="mx-auto max-w-[870px] px-5 py-[clamp(48px,6vw,88px)]">
        {live && error && (
          <InlineAlert variant="warning" className="mb-8">
            {t.loadError(error)}{" "}
            <button type="button" className="underline" onClick={() => reload()}>
              {t.retry}
            </button>
          </InlineAlert>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-[#5B6472]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState className="rounded-none" icon={BookOpen} title={t.emptyTitle} description={t.emptyDescription} />
        ) : (
          <div className="divide-y divide-[#D9E1F0]">
            {sorted.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="group block py-9 first:pt-0">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#6B7280] rtl:tracking-normal">
                  {formatDate(post.publishedAtUtc)} · {t.readMinutes(post.readMinutes)}
                </p>
                <h2 className="font-display mt-3 text-[clamp(1.5rem,2.4vw,2.125rem)] font-extrabold leading-tight tracking-[-0.02em] text-[#111] group-hover:text-[#C2410C] rtl:tracking-normal">
                  {post.title}
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#333]">{post.excerpt}</p>
                <span className={cn(ARROW_LINK, "mt-5")}>
                  {t.readMore} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-black/10 bg-[#F5F6F9] py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-start">
          <Logo imgClassName="h-11 w-11" wordmarkClassName="mix-blend-multiply" />
          <p className="text-xs font-medium text-[#5B6472]">{t.rights(new Date().getFullYear())}</p>
        </div>
      </footer>
    </div>
  );
}
