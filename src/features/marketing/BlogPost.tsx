import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Seo } from "@/components/Seo";
import { BookDemoDialog } from "@/components/BookDemoDialog";
import { useLightBrandScope } from "@/lib/theme";
import { BLOG_POSTS, getBlogPost } from "@/data/blogPosts";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogPost() {
  useLightBrandScope();
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPost(slug) : undefined;
  const [demoOpen, setDemoOpen] = useState(false);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  const more = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <div className="theme-light-scope min-h-screen bg-white text-[#171B22]">
      <Seo title={`${post.title} — Meet to Manage Blog`} description={post.excerpt} path={`/blog/${post.slug}`} type="article" />

      <header className="sticky top-0 z-30 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" aria-label="Meet to Manage home">
            <Logo />
          </Link>
          <Button asChild variant="ghost">
            <Link to="/blog">
              <ArrowLeft className="h-4 w-4" /> All posts
            </Link>
          </Button>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-xs font-medium text-[#5B6472]">
          {formatDate(post.date)} · {post.readMinutes} min read
        </p>
        <h1 className="font-display mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          {post.title}
        </h1>

        <div className="mt-10 flex flex-col gap-8">
          {post.sections.map((section, i) => (
            <div key={i}>
              {section.heading && (
                <h2 className="font-display text-xl font-bold tracking-tight text-[#171B22]">{section.heading}</h2>
              )}
              {section.paragraphs.map((p, j) => (
                <p key={j} className={`text-base leading-relaxed text-[#5B6472] ${section.heading ? "mt-3" : ""}`}>
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-black/10 bg-[#F5F6F9] px-6 py-8 text-center">
          <h3 className="font-display text-lg font-bold text-[#171B22]">See it running in your own academy</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#5B6472]">
            A free demo class shows you exactly how scheduling, billing and admissions work together.
          </p>
          <Button size="lg" className="mt-5 !bg-[#F97316] !text-white hover:!bg-[#EA580C]" onClick={() => setDemoOpen(true)}>
            Book a Demo
          </Button>
        </div>

        {more.length > 0 && (
          <div className="mt-16 border-t border-black/10 pt-10">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#EA580C]">More from the blog</p>
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
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row sm:text-left">
          <Logo imgClassName="h-7 w-7" />
          <p className="text-xs font-medium text-[#5B6472]">© {new Date().getFullYear()} Meet to Manage. All rights reserved.</p>
        </div>
      </footer>

      <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}
