import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "./styles";
import { TOPIC_STYLES, formatDate, topicOf, type BlogTopic } from "./blogTopics";

export function TopicChip({ topic, className }: { topic: BlogTopic; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] rtl:tracking-normal", TOPIC_STYLES[topic].chip, className)}>
      {topic}
    </span>
  );
}

const BLOG_IMAGES: Record<string, string> = {
  "signs-academy-outgrown-spreadsheets": "/blog/signs-academy-outgrown-spreadsheets.webp",
  "demo-booking-to-enrolled-family": "/blog/demo-booking-to-enrolled-family.webp",
  "automatic-fee-suspension-payment-conversations": "/blog/automatic-fee-suspension-payment-conversations.webp",
};

export function blogImage(slug: string): string | undefined {
  return BLOG_IMAGES[slug];
}

/** Editorial artwork when available, with the topic treatment as a fallback. */
export function PostCover({ topic, slug, title, className, large }: { topic: BlogTopic; slug?: string; title?: string; className?: string; large?: boolean }) {
  const { icon: Icon, gradient } = TOPIC_STYLES[topic];
  const image = slug ? blogImage(slug) : undefined;
  if (image) {
    return (
      <div className={cn("relative overflow-hidden bg-[#111827]", className)}>
        <img
          src={image}
          alt={title ? `Illustration for ${title}` : ""}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading={large ? "eager" : "lazy"}
          decoding="async"
        />
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: gradient }} aria-hidden>
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-black/10 blur-2xl" />
      <div className="relative flex h-full items-center justify-center">
        <span className={cn("flex items-center justify-center bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm", large ? "h-24 w-24" : "h-16 w-16")}>
          <Icon className={large ? "h-11 w-11" : "h-8 w-8"} strokeWidth={1.75} />
        </span>
      </div>
    </div>
  );
}

interface CardPost {
  slug: string;
  title: string;
  excerpt: string;
  readMinutes: number;
  publishedAtUtc: string;
}

/** The standard post card: cover, topic, title, excerpt, date and read time. */
export function PostCard({ post, readMinutes }: { post: CardPost; readMinutes: (n: number) => string }) {
  const topic = topicOf(post);
  return (
    <Link
      to={`/blog/${post.slug}`}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-3xl border border-[#EDE6DF] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04),0_14px_30px_-22px_rgba(28,25,23,0.25)] transition-all duration-200 hover:-translate-y-1 hover:border-[#F97316]/40 hover:shadow-[0_18px_40px_-18px_rgba(17,17,17,0.25)]",
        FOCUS_RING
      )}
    >
      <PostCover topic={topic} slug={post.slug} title={post.title} className="h-40" />
      <div className="flex flex-1 flex-col p-6">
        <TopicChip topic={topic} className="self-start" />
        <h3 className="font-display mt-4 text-xl font-extrabold leading-snug tracking-[-0.02em] text-[#111] group-hover:text-[#C2410C] rtl:tracking-normal">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#5B6472]">{post.excerpt}</p>
        <p className="mt-auto flex items-center gap-1.5 pt-5 text-xs font-semibold text-[#6B7280]">
          {formatDate(post.publishedAtUtc)} <span aria-hidden>·</span>
          <Clock className="h-3.5 w-3.5" /> {readMinutes(post.readMinutes)}
        </p>
      </div>
    </Link>
  );
}
