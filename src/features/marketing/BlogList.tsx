import { PricingLink } from "./PricingLink";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, Loader2 } from "lucide-react";
import { Seo } from "@/components/Seo";
import { InlineAlert } from "@/components/InlineAlert";
import { EmptyState } from "@/components/EmptyState";
import { useLightBrandScope } from "@/lib/theme";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MarketingHero } from "./MarketingHero";
import { MarketingFooter } from "./MarketingFooter";
import { MarketingNav } from "./MarketingNav";
import { ARROW_LINK, CTA_ORANGE, FOCUS_RING } from "./styles";
import { PostCard, PostCover, TopicChip } from "./blogMeta";
import { TOPIC_ORDER, formatDate, topicOf, type BlogTopic } from "./blogTopics";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listBlogPosts, type ApiBlogPostSummary } from "@/api/marketing";
import { DEMO_BLOG_SUMMARIES } from "@/data/blogPosts";
import { trackMarketingEvent } from "@/lib/analytics";

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
    all: "All",
    latest: "Latest",
    filterAria: "Filter posts by topic",
    ctaHeading: "See it running in your own academy",
    ctaSub: "A free 30-minute walkthrough of scheduling, admissions and billing working together — no payment details required.",
    requestDemo: "Book a free demo",
    rights: (year: number) => `© ${year} Meet to Manage. All rights reserved.`,
    buyerEyebrow: "Start with your biggest problem",
    buyerHeading: "Practical guides that lead to a working system",
    buyerIntro: "Choose the outcome you need. Each path starts with an honest guide and ends with the matching Meet to Manage workflow.",
    readGuide: "Read the guide",
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
    all: "الكل",
    latest: "الأحدث",
    filterAria: "تصفية المقالات حسب الموضوع",
    ctaHeading: "شاهدها وهي تعمل في أكاديميتك",
    ctaSub: "جولة مجانية مدتها 30 دقيقة في الجدولة والقبول والفوترة معًا — دون الحاجة لبيانات دفع.",
    requestDemo: "احجز عرضًا مجانيًا",
    rights: (year: number) => `© ${year} Meet to Manage. جميع الحقوق محفوظة.`,
    buyerEyebrow: "ابدأ بأكبر مشكلة تواجهك",
    buyerHeading: "أدلة عملية تقود إلى نظام متكامل",
    buyerIntro: "اختر النتيجة التي تحتاجها. يبدأ كل مسار بدليل عملي وينتهي بسير العمل المناسب في Meet to Manage.",
    readGuide: "اقرأ الدليل",
  },
};

const BUYER_PATHS = [
  {
    analyticsKey: "admissions",
    en: { label: "Improve admissions", title: "Stop losing enquiries after the first message", body: "Learn the complete enquiry, demo and follow-up workflow, then see the admission CRM that keeps the next action visible.", solutionLabel: "Explore admission CRM" },
    ar: { label: "حسّن القبول", title: "لا تفقد الاستفسارات بعد الرسالة الأولى", body: "تعرّف على سير عمل الاستفسار والعرض التجريبي والمتابعة، ثم شاهد نظام القبول الذي يُظهر الإجراء التالي بوضوح.", solutionLabel: "استكشف نظام القبول" },
    article: "/blog/admissions-crm-for-coaching-centres-the-complete-workflow",
    solution: "/solutions/coaching-centre-admission-crm",
  },
  {
    analyticsKey: "billing",
    en: { label: "Collect fees", title: "Replace manual reminders and fee spreadsheets", body: "Use the buyer guide to plan invoices, reminders and payment tracking before comparing the built-in fee workflow.", solutionLabel: "Explore fee management" },
    ar: { label: "حصّل الرسوم", title: "استبدل التذكيرات اليدوية وجداول الرسوم", body: "استخدم دليل الشراء لتخطيط الفواتير والتذكيرات وتتبع المدفوعات، ثم قارن سير عمل الرسوم المدمج.", solutionLabel: "استكشف إدارة الرسوم" },
    article: "/blog/fee-management-software-for-coaching-institutes-a-buyer-guide",
    solution: "/solutions/fee-management-software-for-coaching-centres",
  },
  {
    analyticsKey: "platform",
    en: { label: "Choose software", title: "Know what to check before buying a platform", body: "Work through the practical software checklist, then see how classes, attendance, admissions and fees connect.", solutionLabel: "Explore centre management" },
    ar: { label: "اختر البرنامج", title: "اعرف ما يجب التحقق منه قبل شراء منصة", body: "راجع قائمة التحقق العملية، ثم شاهد كيف ترتبط الحصص والحضور والقبول والرسوم معاً.", solutionLabel: "استكشف إدارة المركز" },
    article: "/blog/online-coaching-software-checklist",
    solution: "/solutions/tuition-centre-management-software",
  },
] as const;

function BuyerPathsSection({ lang }: { lang: keyof typeof T }) {
  const copy = T[lang];
  return (
    <section aria-labelledby="buyer-paths-heading" className="mb-12">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#C2410C]">{copy.buyerEyebrow}</p>
        <h2 id="buyer-paths-heading" className="font-display mt-3 text-[clamp(1.6rem,3vw,2.35rem)] font-extrabold tracking-[-0.025em] text-[#111]">{copy.buyerHeading}</h2>
        <p className="mt-3 leading-relaxed text-[#5B6472]">{copy.buyerIntro}</p>
      </div>
      <div className="mt-7 grid gap-5 lg:grid-cols-3">
        {BUYER_PATHS.map((path) => {
          const text = path[lang];
          return (
            <article key={path.analyticsKey} className="flex flex-col rounded-2xl border border-[#EDE6DF] bg-[#FFFBF7] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#C2410C]">{text.label}</p>
              <h3 className="font-display mt-3 text-xl font-extrabold leading-snug text-[#111]">{text.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-[#5B6472]">{text.body}</p>
              <div className="mt-5 flex flex-col gap-2">
                <Link to={path.article} className="inline-flex items-center gap-2 text-sm font-bold text-[#111] hover:text-[#C2410C]">{copy.readGuide} <ArrowRight className="h-4 w-4" /></Link>
                <Link
                  to={path.solution}
                  onClick={() => trackMarketingEvent("content_cta_clicked", "/blog", `blog-card:${path.analyticsKey}`)}
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#C2410C]"
                >
                  {text.solutionLabel} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function BlogList() {
  useLightBrandScope();
  const live = apiEnabled();
  const [lang] = useLang();
  const t = T[lang];
  const { data: posts, loading, error, reload } = useApiData<ApiBlogPostSummary[]>(() => listBlogPosts(), DEMO_BLOG_SUMMARIES);
  const sorted = [...posts].sort((a, b) => b.publishedAtUtc.localeCompare(a.publishedAtUtc));
  const [topic, setTopic] = useState<BlogTopic | null>(null);
  const topics = TOPIC_ORDER.filter((tp) => sorted.some((p) => topicOf(p) === tp));
  const visible = topic ? sorted.filter((p) => topicOf(p) === topic) : sorted;
  const [featured, ...rest] = visible;

  return (
    <div className="theme-light-scope marketing-square min-h-screen bg-white text-[#171B22]">
      <Seo
        pageKey="blog"
        title="Academy Growth & Management Blog | Meet to Manage"
        description="Practical guides for coaching centres and online academies on admissions, fee collection, scheduling, parent communication and student retention."
        path="/blog"
      />

      <MarketingNav />

      <MarketingHero eyebrow={t.eyebrow} title={t.heading} sub={t.sub} />

      <section className="mx-auto max-w-[1200px] px-5 py-[clamp(40px,5vw,72px)]">
        <BuyerPathsSection lang={lang} />
        <div className="mb-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[#F0D4BD] bg-[#FFF6EE] p-6 sm:flex-row sm:items-center">
          <div><h2 className="font-display text-lg font-extrabold text-[#1C1917]">Put the process into practice.</h2><p className="mt-1 text-sm leading-relaxed text-[#625A53]">Free fee-tracker and teacher-handover templates, with examples and instructions.</p></div>
          <Link to="/resources" className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[#C2410C]">Browse free templates <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </div>
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
          <EmptyState className="rounded-3xl" icon={BookOpen} title={t.emptyTitle} description={t.emptyDescription} />
        ) : (
          <>
            {topics.length > 1 && (
              <div role="group" aria-label={t.filterAria} className="mb-10 flex flex-wrap justify-center gap-2">
                {[null, ...topics].map((tp) => (
                  <button
                    key={tp ?? "all"}
                    type="button"
                    onClick={() => setTopic(tp)}
                    aria-pressed={topic === tp}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                      FOCUS_RING,
                      topic === tp ? "border-[#111] bg-[#111] text-white" : "border-[#D9E1F0] bg-white text-[#333] hover:border-[#F97316] hover:text-[#C2410C]"
                    )}
                  >
                    {tp ?? t.all}
                  </button>
                ))}
              </div>
            )}

            {featured && (
              <Link
                to={`/blog/${featured.slug}`}
                className={cn(
                  "group grid overflow-hidden rounded-3xl border border-[#EDE6DF] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04),0_14px_30px_-22px_rgba(28,25,23,0.25)] transition-shadow hover:shadow-[0_24px_60px_-24px_rgba(17,17,17,0.3)] lg:grid-cols-2",
                  FOCUS_RING
                )}
              >
                <PostCover topic={topicOf(featured)} slug={featured.slug} title={featured.title} large className="min-h-[220px] lg:min-h-[340px]" />
                <div className="flex flex-col justify-center p-7 sm:p-10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-[#111] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white rtl:tracking-normal">{t.latest}</span>
                    <TopicChip topic={topicOf(featured)} />
                  </div>
                  <h2 className="font-display mt-5 text-[clamp(1.625rem,2.8vw,2.375rem)] font-extrabold leading-[1.15] tracking-[-0.02em] text-[#111] group-hover:text-[#C2410C] rtl:tracking-normal">
                    {featured.title}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-[#444]">{featured.excerpt}</p>
                  <p className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-[#6B7280]">
                    {formatDate(featured.publishedAtUtc)} <span aria-hidden>·</span>
                    <Clock className="h-3.5 w-3.5" /> {t.readMinutes(featured.readMinutes)}
                  </p>
                  <span className={cn(ARROW_LINK, "mt-4 self-start")}>
                    {t.readMore} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" />
                  </span>
                </div>
              </Link>
            )}

            {rest.length > 0 && (
              <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <PostCard key={post.slug} post={post} readMinutes={t.readMinutes} />
                ))}
              </div>
            )}

            <div className="relative mt-16 overflow-hidden rounded-3xl bg-[#0D1024] px-6 py-12 text-center text-white sm:px-12">
              <div
                className="absolute inset-0 opacity-60"
                style={{ background: "radial-gradient(50% 80% at 0% 0%, rgba(249,115,22,0.35), transparent 70%), radial-gradient(50% 80% at 100% 100%, rgba(124,92,252,0.4), transparent 70%)" }}
                aria-hidden
              />
              <div className="relative">
                <h2 className="font-display text-[clamp(1.5rem,2.6vw,2.25rem)] font-extrabold leading-tight tracking-[-0.02em] rtl:tracking-normal">{t.ctaHeading}</h2>
                <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-white/80">{t.ctaSub}</p>
                <Link to="/get-started" className={cn(CTA_ORANGE, "mt-7")}>
                  {t.requestDemo} <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
                </Link>
                <div><PricingLink className="text-white/80 hover:text-white focus-visible:outline-white" /></div>
              </div>
            </div>
          </>
        )}
      </section>

      <MarketingFooter />
    </div>
  );
}
